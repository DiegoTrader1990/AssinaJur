/**
 * LABORATÓRIO ASSINAJUR — Leitura isolada do documento de identificação.
 *
 * Rota exclusiva do ambiente de laboratório (/lab/documento).
 * NÃO é utilizada pelo fluxo de assinatura nem pelo cadastro de clientes.
 *
 * Decisões desta fase:
 *  - Nenhuma imagem é persistida em disco, banco ou storage.
 *  - Nenhum conteúdo sensível (base64, nome, CPF) vai para log.
 *  - Exige sessão autenticada para não expor um proxy público de OCR.
 *
 * A implementação é uma cópia autônoma da estratégia Gemini Vision já adotada
 * pelo projeto. Foi duplicada de propósito: alterar/extrair a rota existente
 * (/api/clients/parse-document) mudaria um caminho que hoje funciona.
 */

import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { maskCpfCnpj } from '@/lib/formatters';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const GEMINI_MODELS = ['gemini-flash-latest', 'gemini-2.0-flash', 'gemini-1.5-flash'];

/** Limite defensivo por imagem (bytes) — evita uploads acidentais gigantes. */
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export type LabDocumentType = 'RG' | 'CNH';

interface LabExtraction {
  documentType: string;
  name: string;
  cpf: string;
  birthDate: string;
  documentNumber: string;
  issuingOrgan: string;
  motherName: string;
  fatherName: string;
}

const EMPTY_EXTRACTION: LabExtraction = {
  documentType: '',
  name: '',
  cpf: '',
  birthDate: '',
  documentNumber: '',
  issuingOrgan: '',
  motherName: '',
  fatherName: '',
};

function normaliseDate(value?: string): string {
  if (!value) return '';
  const clean = String(value).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) return clean;
  // Converte YYYY-MM-DD para o padrão brasileiro exibido no laboratório.
  const iso = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  return clean;
}

function pickString(value: unknown): string {
  if (typeof value !== 'string') return '';
  const clean = value.trim();
  // O modelo às vezes devolve marcadores textuais quando não encontra o campo.
  if (!clean || /^(n[ãa]o\s+identificad|não\s+consta|null|undefined|-{1,})/i.test(clean)) {
    return '';
  }
  return clean;
}

const PROMPT = `Você está lendo fotos de um documento de identificação brasileiro (RG ou CNH).
Pode haver duas imagens: a primeira é a FRENTE e a segunda é o VERSO.
As imagens podem estar rotacionadas. Examine-as em todas as orientações.

Extraia SOMENTE o que estiver realmente visível e legível nas imagens.
Se um campo não estiver visível ou você não tiver certeza, devolva string vazia "".
NUNCA invente, complete ou deduza dados que não estejam escritos no documento.

Devolva EXATAMENTE um objeto JSON válido, sem markdown e sem texto extra:

{
  "documentType": "RG ou CNH",
  "name": "Nome completo do titular",
  "cpf": "000.000.000-00",
  "birthDate": "DD/MM/AAAA",
  "documentNumber": "numero do RG ou numero de registro da CNH",
  "issuingOrgan": "orgao emissor e UF, ex: SSP/BA",
  "motherName": "nome da mae, se visivel",
  "fatherName": "nome do pai, se visivel"
}`;

async function readWithGeminiVision(
  images: { data: string; mimeType: string }[]
): Promise<{ parsed: LabExtraction | null; model: string | null; reason: string | null }> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY;
  if (!apiKey) {
    return { parsed: null, model: null, reason: 'GEMINI_API_KEY não configurada no ambiente.' };
  }

  const parts = [
    ...images.map((img) => ({
      inlineData: { mimeType: img.mimeType, data: img.data },
    })),
    { text: PROMPT },
  ];

  let lastReason: string | null = null;

  for (const modelName of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.1,
            response_mime_type: 'application/json',
          },
        }),
      });

      if (!res.ok) {
        // Registra apenas o status — nunca o corpo, que pode ecoar dados do documento.
        lastReason = `Modelo ${modelName} respondeu HTTP ${res.status}.`;
        continue;
      }

      const data = await res.json();
      const responseText: unknown = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof responseText !== 'string' || !responseText.trim()) {
        lastReason = `Modelo ${modelName} não devolveu conteúdo.`;
        continue;
      }

      const cleanJson = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const raw = JSON.parse(cleanJson) as Record<string, unknown>;

      const parsed: LabExtraction = {
        documentType: pickString(raw.documentType).toUpperCase(),
        name: pickString(raw.name),
        cpf: pickString(raw.cpf) ? maskCpfCnpj(pickString(raw.cpf)) : '',
        birthDate: normaliseDate(pickString(raw.birthDate)),
        documentNumber: pickString(raw.documentNumber),
        issuingOrgan: pickString(raw.issuingOrgan),
        motherName: pickString(raw.motherName),
        fatherName: pickString(raw.fatherName),
      };

      const foundAnything =
        parsed.name || parsed.cpf || parsed.documentNumber || parsed.birthDate;
      if (foundAnything) {
        return { parsed, model: modelName, reason: null };
      }

      lastReason = `Modelo ${modelName} não localizou campos legíveis.`;
    } catch {
      // Sem detalhes no log: a exceção pode conter trechos da resposta.
      lastReason = `Falha ao processar a resposta do modelo ${modelName}.`;
    }
  }

  return { parsed: null, model: null, reason: lastReason };
}

async function fileToInline(file: File): Promise<{ data: string; mimeType: string } | null> {
  if (!file || typeof file.arrayBuffer !== 'function') return null;
  if (file.size > MAX_IMAGE_BYTES) return null;

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!buffer.length) return null;

  const mimeType = file.type && file.type.startsWith('image/') ? file.type : 'image/jpeg';
  return { data: buffer.toString('base64'), mimeType };
}

export async function POST(req: Request) {
  try {
    // Protege o endpoint: sem isso, seria um proxy de OCR aberto na internet.
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        {
          error:
            'Faça login no AssinaJur neste mesmo endereço para executar a leitura no laboratório.',
          code: 'UNAUTHENTICATED',
        },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const frontFile = formData.get('front');
    const backFile = formData.get('back');

    if (!(frontFile instanceof File)) {
      return NextResponse.json(
        { error: 'A imagem da frente do documento não foi recebida.' },
        { status: 400 }
      );
    }

    const images: { data: string; mimeType: string }[] = [];
    const front = await fileToInline(frontFile);
    if (!front) {
      return NextResponse.json(
        { error: 'A imagem da frente é inválida ou excede o tamanho permitido.' },
        { status: 400 }
      );
    }
    images.push(front);

    if (backFile instanceof File) {
      const back = await fileToInline(backFile);
      if (back) images.push(back);
    }

    const startedAt = Date.now();
    const { parsed, model, reason } = await readWithGeminiVision(images);
    const elapsedMs = Date.now() - startedAt;

    if (!parsed) {
      return NextResponse.json({
        success: false,
        extracted: EMPTY_EXTRACTION,
        diagnostics: {
          model: null,
          elapsedMs,
          imagesSent: images.length,
          reason: reason || 'Não foi possível ler o documento nas imagens enviadas.',
        },
      });
    }

    return NextResponse.json({
      success: true,
      extracted: parsed,
      diagnostics: {
        model,
        elapsedMs,
        imagesSent: images.length,
        reason: null,
      },
    });
  } catch {
    // Mensagem genérica de propósito: erros brutos podem conter dados do documento.
    return NextResponse.json(
      { error: 'Erro ao processar a leitura do documento no laboratório.' },
      { status: 500 }
    );
  }
}
