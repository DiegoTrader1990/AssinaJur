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
      // Se não encontrou marcador de fim estrito, pega os primeiros 4MB a partir do início JPEG
      return pdfBuffer.subarray(startIdx, Math.min(pdfBuffer.length, startIdx + 4 * 1024 * 1024));
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
      // Tenta extrair a imagem JPEG escaneada contida dentro do arquivo PDF (ex: CamScanner, Fotos)
      const extractedJpeg = extractJpegFromPdfBuffer(buffer);
      if (extractedJpeg) {
        targetBufferToRecognize = extractedJpeg;
      }
    }

    // Executa OCR Tesseract na imagem extraída ou foto
    try {
      const ocrResult = await timeoutPromise(
        4000,
        Tesseract.recognize(targetBufferToRecognize, 'por', {
          logger: () => {},
        })
      );
      if (ocrResult?.data?.text) {
        text += ' ' + ocrResult.data.text;
      }
    } catch (e: any) {
      console.log('OCR exception fallback:', e?.message);
    }

    // Se o texto extraído ainda estiver vazio, analisa também o buffer bruto do PDF por expressões regulares
    const rawString = buffer.toString('utf-8', 0, Math.min(buffer.length, 200000));
    text += ' ' + rawString;

    console.log('--- OCR EXTRACTED TEXT ---', text.substring(0, 400));

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
          !/REPUBLICA|FEDERATIVA|BRASIL|MINISTERIO|CARTEIRA|IDENTIDADE|HABILITACAO|VALIDO|NACIONAL|CAMSCANNER/i.test(clean)
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
      isPdf,
    });
  } catch (error: any) {
    console.error('Erro na leitura OCR do documento:', error);
    return NextResponse.json(
      { error: 'Documento carregado para conferência visual. Preencha os campos abaixo.' },
      { status: 200 }
    );
  }
}
