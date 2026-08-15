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
- isDocument é true APENAS se a imagem mostrar a frente ou verso de um documento brasileiro de identificação com foto (RG/CIN ou CNH), ou uma parte inequivocamente identificável dele.
- Não aceite mesa, parede, pessoa, paisagem, papel comum, tela de celular ou outro objeto, ainda que nítido.
- readable é true apenas se houver elementos e texto suficientes para conferência humana posterior.
- documentType deve ser RG, CNH, OUTRO ou NAO_IDENTIFICADO.
- confidence vai de 0 a 100.
- reason deve ser curta, em português, sem repetir dados pessoais que apareçam na foto.`;

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
        return NextResponse.json({ success: true, validation });
      } catch {
        // Tenta o próximo modelo compatível sem expor detalhes internos.
      }
    }

    return NextResponse.json({ error: 'A IA não conseguiu validar esta imagem agora.' }, { status: 502 });
  } catch {
    return NextResponse.json({ error: 'Não foi possível validar a imagem.' }, { status: 500 });
  }
}
