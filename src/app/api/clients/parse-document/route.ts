import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { maskCpfCnpj } from '@/lib/formatters';

export const dynamic = 'force-dynamic';

const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-flash-latest'];

async function parseWithGeminiVision(base64Image: string, mimeType: string) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || process.env.NEXT_PUBLIC_GEMINI_KEY;
  if (!apiKey) return null;

  const cleanMime = mimeType && mimeType.startsWith('image/') ? mimeType : 'image/jpeg';
  const cleanBase64 = base64Image.replace(/^data:image\/(jpeg|jpg|png|webp);base64,/i, '').trim();

  const prompt = `Você é um especialista em visão computacional e OCR de documentos de identidade brasileiros (RG, CNH, Passaporte, Certidões).
Analise a imagem com máxima precisão e extraia os dados do titular. Retorne EXATAMENTE um objeto JSON válido, sem formatação markdown ou textos adicionais:

{
  "name": "Nome Completo do Titular",
  "cpfCnpj": "000.000.000-00",
  "rg": "Número do RG com dígito",
  "issuingOrgan": "Órgão Emissor ex: SSP/SP",
  "birthDate": "Data de Nascimento DD/MM/AAAA",
  "nationality": "Brasileira",
  "maritalStatus": "Estado Civil ex: Solteiro(a) ou Casado(a)",
  "profession": "Profissão",
  "address": "Logradouro",
  "number": "Número",
  "neighborhood": "Bairro",
  "city": "Cidade",
  "state": "UF",
  "cep": "00000-000"
}`;

  for (const modelName of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: cleanMime,
                    data: cleanBase64,
                  },
                },
                { text: prompt },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            response_mime_type: 'application/json',
          },
        }),
      });

      const data = await res.json();
      const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (responseText) {
        const cleanJson = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        if (parsed && (parsed.name || parsed.cpfCnpj || parsed.rg)) {
          console.log(`Leitura bem-sucedida com modelo ${modelName}`);
          return parsed;
        }
      }
    } catch (err) {
      console.error(`Erro no modelo ${modelName}:`, err);
    }
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const mimeType = file.type || 'image/jpeg';
    const base64Image = buffer.toString('base64');

    // 1. Processamento Inteligente por Visão Computacional (Gemini Flash)
    const geminiParsed = await parseWithGeminiVision(base64Image, mimeType);
    if (geminiParsed && (geminiParsed.name || geminiParsed.cpfCnpj)) {
      return NextResponse.json({
        success: true,
        extracted: {
          name: geminiParsed.name || '',
          cpfCnpj: geminiParsed.cpfCnpj ? maskCpfCnpj(geminiParsed.cpfCnpj) : '',
          rg: geminiParsed.rg || '',
          issuingOrgan: geminiParsed.issuingOrgan || '',
          birthDate: geminiParsed.birthDate || '',
          nationality: geminiParsed.nationality || 'Brasileira',
          maritalStatus: geminiParsed.maritalStatus || '',
          profession: geminiParsed.profession || '',
          phone: '',
          email: '',
          cep: geminiParsed.cep || '',
          address: geminiParsed.address || '',
          number: geminiParsed.number || '',
          neighborhood: geminiParsed.neighborhood || '',
          city: geminiParsed.city || '',
          state: geminiParsed.state || '',
        },
        rawText: 'Documento lido e extraído via Inteligência Artificial Gemini Vision.',
      });
    }

    // 2. Fallback de Leitura Estruturada
    const rawText = buffer.toString('utf-8', 0, Math.min(buffer.length, 300000)) + '\n' + buffer.toString('latin1', 0, Math.min(buffer.length, 300000));

    const cpfMatches = rawText.match(/\b\d{3}[\.\s]?\d{3}[\.\s]?\d{3}[-\s]?\d{2}\b/g) || [];
    let detectedCpf = '';
    if (cpfMatches.length > 0 && cpfMatches[0]) {
      detectedCpf = maskCpfCnpj(cpfMatches[0].replace(/\D/g, ''));
    }

    const nameMatch = rawText.match(/(?:NOME|TITULAR|OUTORGANTE)[:\s]+([A-ZÁÉÍÓÚÂÊÔÃÕÇ\s]{6,50})/i);
    let detectedName = '';
    if (nameMatch && nameMatch[1]) {
      detectedName = nameMatch[1].trim();
    }

    const birthMatch = rawText.match(/(?:NASCIMENTO|NASC|DATA NASC)[:\s]+(\d{2}\/\d{2}\/\d{4})/i);
    let detectedBirthDate = '';
    if (birthMatch && birthMatch[1]) {
      detectedBirthDate = birthMatch[1];
    }

    return NextResponse.json({
      success: true,
      extracted: {
        name: detectedName,
        cpfCnpj: detectedCpf,
        rg: '',
        issuingOrgan: '',
        birthDate: detectedBirthDate,
        nationality: 'Brasileira',
        maritalStatus: '',
        profession: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        state: '',
      },
      rawText: rawText.substring(0, 500),
    });
  } catch (error: any) {
    console.error('Erro na leitura do documento:', error);
    return NextResponse.json({ error: 'Erro ao processar leitura do documento.' }, { status: 500 });
  }
}
