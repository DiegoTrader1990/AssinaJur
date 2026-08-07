import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import Tesseract from 'tesseract.js';
import { maskCpfCnpj } from '@/lib/formatters';

export const dynamic = 'force-dynamic';

function timeoutPromise<T>(ms: number, promise: Promise<T>): Promise<T | null> {
  let timeoutId: any;
  const timeout = new Promise<null>((resolve) => {
    timeoutId = setTimeout(() => resolve(null), ms);
  });
  return Promise.race([promise, timeout]).then((result) => {
    clearTimeout(timeoutId);
    return result;
  });
}

function extractJpegFromPdfBuffer(pdfBuffer: Buffer): Buffer | null {
  try {
    const startIdx = pdfBuffer.indexOf(Buffer.from([0xff, 0xd8, 0xff]));
    if (startIdx !== -1) {
      const endIdx = pdfBuffer.indexOf(Buffer.from([0xff, 0xd9]), startIdx);
      if (endIdx !== -1) {
        return pdfBuffer.subarray(startIdx, endIdx + 2);
      }
      return pdfBuffer.subarray(startIdx, Math.min(pdfBuffer.length, startIdx + 5 * 1024 * 1024));
    }
  } catch {
    /* fallback */
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
    const fileName = file.name.toLowerCase();
    const mimeType = file.type.toLowerCase();
    const isPdf = fileName.endsWith('.pdf') || mimeType.includes('pdf');

    let text = '';
    let targetBufferToRecognize: any = buffer;

    if (isPdf) {
      const extractedJpeg = extractJpegFromPdfBuffer(buffer);
      if (extractedJpeg) {
        targetBufferToRecognize = extractedJpeg;
      }
    }

    // Executa OCR Tesseract com limite de 6.0s para máxima extração
    try {
      const ocrResult = await timeoutPromise(
        6000,
        Tesseract.recognize(targetBufferToRecognize, 'por', {
          logger: (m) => console.log('Tesseract progress:', m.status, m.progress),
        })
      );
      if (ocrResult?.data?.text) {
        text += '\n' + ocrResult.data.text;
      }
    } catch (e: any) {
      console.log('OCR Exception:', e?.message);
    }

    // fallback de leitura de strings puras
    text += '\n' + buffer.toString('utf-8', 0, Math.min(buffer.length, 300000));

    console.log('=== OCR RESULT TEXT ===\n', text);

    // Extração de padrões de CPF e RG (Ex: 15.420.774-86 ou 1542077486)
    const allNumbers = text.match(/\b\d{3}[\.\s]?\d{3}[\.\s]?\d{3}[-\s]?\d{2}\b/g) || [];
    const rawDigitsMatches = text.match(/\b\d{11}\b/g) || [];
    const birthDateMatches = text.match(/\b(0[1-9]|[12][0-9]|3[01])[\/\.-](0[1-9]|1[012])[\/\.-](19|20)\d\d\b/g) || [];
    const issuingMatches = text.match(/\b(SSP|DETRAN|IFP|SESP|PC|SSP\/[A-Z]{2}|SSP-[A-Z]{2})\b/i);
    const rgMatches = text.match(/\b\d{1,2}[\.\s]?\d{3}[\.\s]?\d{3}[-\s]?[0-9X]\b/gi) || [];

    // Nome Inteligente: Procura linhas com 2 ou mais palavras em maiúsculas sem palavras-chave do documento
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 4);

    let extractedName = '';
    const reservedWords = /REPUBLICA|FEDERATIVA|BRASIL|MINISTERIO|CARTEIRA|IDENTIDADE|HABILITACAO|VALIDO|NACIONAL|CAMSCANNER|SECRETARIA|SEGURANCA|SSP|ESTADO|REGISTRO|GERAL|TITULAR|FILIACAO|DATA|NASCIMENTO|NATURALIDADE|DOC|ORIGEM|EXPEDICAO/i;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/NOME\b/i.test(line) && i + 1 < lines.length) {
        const nextLine = lines[i + 1].replace(/[^a-zA-Z\s]/g, '').trim();
        if (nextLine.length > 5 && nextLine.split(' ').length >= 2 && !reservedWords.test(nextLine)) {
          extractedName = nextLine;
          break;
        }
      }
    }

    if (!extractedName) {
      for (const line of lines) {
        const clean = line.replace(/[^a-zA-Z\s]/g, '').trim();
        const words = clean.split(/\s+/);
        if (words.length >= 2 && clean.length >= 7 && !reservedWords.test(clean)) {
          // Garante que são palavras de nome (sem caracteres estranhos)
          if (words.every((w) => w.length >= 2)) {
            extractedName = clean;
            break;
          }
        }
      }
    }

    // CPF e RG formatting
    let rawCpf = allNumbers[0] ? allNumbers[0].replace(/\D/g, '') : '';
    if (!rawCpf && rawDigitsMatches[0]) {
      rawCpf = rawDigitsMatches[0];
    }

    const formattedCpf = rawCpf ? maskCpfCnpj(rawCpf) : '';
    const extractedRg = rgMatches[0] ? rgMatches[0].toUpperCase() : '';

    let formattedBirthDate = '';
    if (birthDateMatches[0]) {
      const parts = birthDateMatches[0].split(/[\/\.-]/);
      if (parts.length === 3) {
        formattedBirthDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

    return NextResponse.json({
      success: true,
      extracted: {
        name: extractedName,
        cpfCnpj: formattedCpf,
        rg: extractedRg,
        issuingOrgan: issuingMatches ? issuingMatches[0].toUpperCase() : 'SSP/BA',
        birthDate: formattedBirthDate,
      },
      isPdf,
    });
  } catch (error: any) {
    console.error('Erro na leitura OCR do documento:', error);
    return NextResponse.json(
      { error: 'Documento carregado para conferência visual.' },
      { status: 200 }
    );
  }
}
