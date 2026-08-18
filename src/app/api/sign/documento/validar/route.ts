import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const GEMINI_MODELS = ['gemini-flash-latest', 'gemini-2.0-flash', 'gemini-1.5-flash'];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

type VisionValidation = {
  isDocument: boolean;
  documentType: 'RG' | 'CNH' | 'OUTRO' | 'NAO_IDENTIFICADO';
  readable: boolean;
  confidence: number;
  reason: string;
};

function normalizeValidation(value: unknown): VisionValidation | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  if (typeof item.isDocument !== 'boolean') return null;
  const type = String(item.documentType || 'NAO_IDENTIFICADO').toUpperCase();
  return {
    isDocument: item.isDocument,
    documentType: ['RG', 'CNH', 'OUTRO'].includes(type) ? (type as VisionValidation['documentType']) : 'NAO_IDENTIFICADO',
    readable: Boolean(item.readable),
    confidence: Math.max(0, Math.min(100, Number(item.confidence) || 0)),
    reason: String(item.reason || '').slice(0, 240),
  };
}

/**
 * Confirma, por IA, se a foto capturada realmente mostra um documento de
 * identificação (RG ou CNH) antes de avançar no fluxo real de assinatura.
 * Nunca é o único filtro: a qualidade da imagem já foi checada localmente na
 * câmera. Se a IA estiver indisponível ou sem chave configurada, a etapa
 * simplesmente não valida - o escritório confere manualmente depois.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const image = typeof body?.image === 'string' ? body.image : '';
    const match = image.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([a-z0-9+/=]+)$/i);
    if (!match) return NextResponse.json({ error: 'Imagem inválida.' }, { status: 400 });

    const [, mimeType, base64] = match;
    if (Buffer.byteLength(base64, 'base64') > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'A imagem é grande demais para validação.' }, { status: 413 });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Validação por IA não está configurada.' }, { status: 503 });

    const prompt = `Analise esta imagem somente para uma etapa de captura de documento.
Responda JSON puro, sem markdown, exatamente neste formato:
{"isDocument":true,"documentType":"RG","readable":true,"confidence":90,"reason":"..."}

Critérios:
- Priorize não rejeitar um documento verdadeiro por enquadramento, rotação, reflexo leve ou leitura parcial. isDocument deve ser true se houver evidência razoável de RG/CIN ou CNH, mesmo sem conseguir ler todos os dados.
- Considere como evidência: cartão laminado retangular, retrato, brasão, QR code, código de barras, campos estruturados, rótulos como NOME/CPF/RG/CNH, números de documento, assinatura ou diagramação típica de identidade.
- Um documento pode estar de cabeça para baixo, na vertical, parcialmente cortado ou ocupar apenas parte da moldura.
- Não aceite mesa, parede, pessoa, paisagem, papel comum, tela de celular ou outro objeto, ainda que nítido.
- readable é true se existir conteúdo suficiente para conferência humana; não marque isDocument como false apenas porque algum campo está pouco legível.
- documentType deve ser RG, CNH, OUTRO ou NAO_IDENTIFICADO.
- confidence vai de 0 a 100.
- reason deve ser curta, em português, sem repetir dados pessoais que apareçam na foto.`;

    let lastRejection: VisionValidation | null = null;
    for (const model of GEMINI_MODELS) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ inlineData: { mimeType, data: base64 } }, { text: prompt }] }],
            generationConfig: { temperature: 0, response_mime_type: 'application/json' },
          }),
        });
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) continue;
        const validation = normalizeValidation(JSON.parse(String(text).replace(/```json|```/gi, '').trim()));
        if (!validation) continue;
        // Uma única leitura negativa pode ser um falso negativo de enquadramento.
        // Pedimos uma segunda opinião aos modelos compatíveis antes de rejeitar.
        if (validation.isDocument && validation.confidence >= 55) {
          console.info('SIGN_DOCUMENT_VALIDATION', { accepted: true, type: validation.documentType, confidence: validation.confidence });
          return NextResponse.json({ success: true, validation });
        }
        lastRejection = validation;
      } catch {
        // Tenta o próximo modelo compatível sem expor detalhes internos.
      }
    }

    if (lastRejection) {
      console.info('SIGN_DOCUMENT_VALIDATION', { accepted: false, type: lastRejection.documentType, confidence: lastRejection.confidence });
      return NextResponse.json({ success: true, validation: lastRejection });
    }

    return NextResponse.json({ error: 'A IA não conseguiu validar esta imagem agora.' }, { status: 502 });
  } catch {
    return NextResponse.json({ error: 'Não foi possível validar a imagem.' }, { status: 500 });
  }
}
