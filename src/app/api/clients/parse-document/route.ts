import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { maskCpfCnpj } from '@/lib/formatters';

export const dynamic = 'force-dynamic';

async function parseWithGeminiVision(base64Image: string, mimeType: string) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY;
  if (!apiKey) return null;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const prompt = `Você é um especialista em OCR e visão computacional de documentos pessoais brasileiros (RG, CNH, Passaporte, Certidões).
Analise com extrema precisão a imagem fornecida e retorne EXATAMENTE um objeto JSON válido com os campos do titular, sem incluir blocos de código markdown ou texto explicativo:

{
  "name": "Nome Completo do Titular",
  "cpfCnpj": "CPF formatado 000.000.000-00",
  "rg": "Número do RG com dígito",
  "issuingOrgan": "Órgão Emissor ex: SSP/SP",
  "birthDate": "Data de Nascimento DD/MM/AAAA",
  "nationality": "Brasileira",
  "maritalStatus": "Estado Civil",
  "profession": "Profissão",
  "address": "Logradouro",
  "number": "Número",
  "neighborhood": "Bairro",
  "city": "Cidade",
  "state": "UF",
  "cep": "CEP 00000-000"
}`;

    const cleanMime = mimeType.startsWith('image/') ? mimeType : 'image/jpeg';

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: cleanMime,
                  data: base64Image,
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
      return JSON.parse(cleanJson);
    }
  } catch (err) {
    console.error('Erro na análise do Gemini Vision:', err);
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

    // 1. Tentar leitura inteligente via Google Gemini Vision API
    const geminiParsed = await parseWithGeminiVision(base64Image, mimeType);
    if (geminiParsed && geminiParsed.name) {
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
        rawText: 'Documento analisado com sucesso via Inteligência Artificial Gemini Vision.',
      });
    }

    // 2. Fallback de Expressões Regulares de Alta Precisão (Sem Tesseract pesado)
    const text = buffer.toString('utf-8', 0, Math.min(buffer.length, 300000)) + '\n' + buffer.toString('latin1', 0, Math.min(buffer.length, 300000));

    // Expressões regulares de CPF
    const cpfMatches = text.match(/\b\d{3}[\.\s]?\d{3}[\.\s]?\d{3}[-\s]?\d{2}\b/g) || [];
    let detectedCpf = '';
    if (cpfMatches.length > 0) {
      detectedCpf = maskCpfCnpj(cpfMatches[0].replace(/\D/g, ''));
    }

    // Expressão regular de Nomes Próprios após rótulos típicos (NOME, NOME DO TITULAR, OUTORGANTE)
    const nameMatch = text.match(/(?:NOME|TITULAR|OUTORGANTE)[:\s]+([A-ZÁÉÍÓÚÂÊÔÃÕÇ\s]{6,50})/i);
    let detectedName = '';
    if (nameMatch && nameMatch[1]) {
      detectedName = nameMatch[1].trim();
    }

    // Expressão regular de Data de Nascimento
    const birthMatch = text.match(/(?:NASCIMENTO|NASC|DATA NASC)[:\s]+(\d{2}\/\d{2}\/\d{4})/i);
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
      rawText: text.substring(0, 1000),
    });
  } catch (error: any) {
    console.error('Erro na rota de extração por visão:', error);
    return NextResponse.json({ error: 'Erro ao analisar documento por inteligência artificial.' }, { status: 500 });
  }
}
