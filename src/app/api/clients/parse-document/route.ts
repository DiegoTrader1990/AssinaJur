import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import Tesseract from 'tesseract.js';
import { maskCpfCnpj } from '@/lib/formatters';

export const dynamic = 'force-dynamic';

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

    // Executa OCR com Tesseract em português
    const { data: { text } } = await Tesseract.recognize(buffer, 'por', {
      logger: (m) => console.log('Tesseract OCR Progress:', m.status, m.progress),
    });

    console.log('--- OCR RAW TEXT ---', text);

    // Regras de extração de padrões brasileiros (CPF, RG, Data Nasc, Órgão, Nome)
    const cpfMatch = text.match(/\b\d{3}[\.\s]?\d{3}[\.\s]?\d{3}[-\s]?\d{2}\b/);
    const rgMatch = text.match(/\b\d{1,2}[\.\s]?\d{3}[\.\s]?\d{3}[-\s]?[0-9X]\b/i);
    const birthDateMatch = text.match(/\b(0[1-9]|[12][0-9]|3[01])[\/\.-](0[1-9]|1[012])[\/\.-](19|20)\d\d\b/);
    const issuingMatch = text.match(/\b(SSP|DETRAN|IFP|SESP|POLICIA CIVIL|PC)[\/\s]?[A-Z]{2}\b/i);

    // Tentativa inteligente de encontrar o Nome da pessoa
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    let extractedName = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/NOME\b/i.test(line) && i + 1 < lines.length) {
        const candidate = lines[i + 1].replace(/[^a-zA-Z\s]/g, '').trim();
        if (candidate.length > 5 && candidate.split(' ').length >= 2) {
          extractedName = candidate;
          break;
        }
      }
    }

    if (!extractedName) {
      for (const line of lines) {
        const clean = line.replace(/[^a-zA-Z\s]/g, '').trim();
        if (
          clean.length > 8 &&
          clean.split(' ').length >= 2 &&
          !/REPUBLICA|FEDERATIVA|BRASIL|MINISTERIO|CARTEIRA|IDENTIDADE|HABILITACAO|VALIDO|NACIONAL/i.test(clean)
        ) {
          extractedName = clean;
          break;
        }
      }
    }

    // Formata os campos extraídos
    const rawCpf = cpfMatch ? cpfMatch[0].replace(/\D/g, '') : '';
    const formattedCpf = rawCpf ? maskCpfCnpj(rawCpf) : '';

    let formattedBirthDate = '';
    if (birthDateMatch) {
      const parts = birthDateMatch[0].split(/[\/\.-]/);
      if (parts.length === 3) {
        formattedBirthDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

    return NextResponse.json({
      success: true,
      extracted: {
        name: extractedName,
        cpfCnpj: formattedCpf,
        rg: rgMatch ? rgMatch[0].toUpperCase() : '',
        issuingOrgan: issuingMatch ? issuingMatch[0].toUpperCase() : 'SSP/SP',
        birthDate: formattedBirthDate,
      },
      rawText: text,
    });
  } catch (error: any) {
    console.error('Erro na leitura OCR do documento:', error);
    return NextResponse.json(
      { error: 'Não foi possível ler o documento automaticamente. Preencha os campos manualmente.' },
      { status: 500 }
    );
  }
}
