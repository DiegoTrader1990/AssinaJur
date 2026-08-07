import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import Tesseract from 'tesseract.js';
import { maskCpfCnpj } from '@/lib/formatters';
import zlib from 'zlib';

export const dynamic = 'force-dynamic';

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

function decompressPdfStreams(pdfBuffer: Buffer): string {
  let decompressedText = '';
  try {
    const streamMatches = pdfBuffer.toString('latin1').split('stream');
    for (let i = 1; i < streamMatches.length; i++) {
      const streamData = streamMatches[i].split('endstream')[0];
      if (streamData) {
        try {
          const buf = Buffer.from(streamData, 'latin1');
          const unzipped = zlib.inflateSync(buf);
          decompressedText += ' ' + unzipped.toString('utf-8');
        } catch {
          // ignora falhas em streams não-zlib
        }
      }
    }
  } catch {
    /* fallback */
  }
  return decompressedText;
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
      text += ' ' + decompressPdfStreams(buffer);
      const extractedJpeg = extractJpegFromPdfBuffer(buffer);
      if (extractedJpeg) {
        targetBufferToRecognize = extractedJpeg;
      }
    }

    // Processa OCR Tesseract em português/inglês com tempo hábil de 15s
    try {
      const worker = await Tesseract.createWorker('por', 1, {
        logger: (m) => console.log('Tesseract OCR:', m.status, m.progress),
      });
      const ocrResult = await worker.recognize(targetBufferToRecognize);
      if (ocrResult?.data?.text) {
        text += '\n' + ocrResult.data.text;
      }
      await worker.terminate();
    } catch (e: any) {
      console.log('Tesseract Worker Exception:', e?.message);
    }

    text += '\n' + buffer.toString('utf-8', 0, Math.min(buffer.length, 300000));
    text += '\n' + buffer.toString('latin1', 0, Math.min(buffer.length, 300000));

    console.log('=== OCR RECOGNIZED TEXT ===\n', text);

    // 1. CPFs (formato 000.000.000-00 ou 11 dígitos sequenciais)
    const cpfMatches = text.match(/\b\d{3}[\.\s]?\d{3}[\.\s]?\d{3}[-\s]?\d{2}\b/g) || [];
    const raw11Digits = text.match(/\b\d{11}\b/g) || [];

    // 2. RGs (formato 00.000.000-0 ou 7-9 dígitos)
    const rgMatches = text.match(/\b\d{1,2}[\.\s]?\d{3}[\.\s]?\d{3}[-\s]?[0-9X]\b/gi) || [];

    // 3. Datas de Nascimento (DD-MM-YYYY, DD/MM/YYYY ou YYYY-MM-DD)
    const birthDateMatches = text.match(/\b(0[1-9]|[12][0-9]|3[01])[\/\.-](0[1-9]|1[012])[\/\.-](19|20)\d\d\b/g) || [];

    // 4. Órgãos expedidores e UFs
    const issuingMatches = text.match(/\b(SSP|DETRAN|IFP|SESP|PC|SSP\/[A-Z]{2}|SSP-[A-Z]{2})\b/i);
    const stateMatches = text.match(/\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/);

    // 5. Linhas de Nome
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 3);

    let extractedName = '';
    const reservedWords = /REPUBLICA|FEDERATIVA|BRASIL|MINISTERIO|CARTEIRA|IDENTIDADE|HABILITACAO|VALIDO|NACIONAL|CAMSCANNER|SECRETARIA|SEGURANCA|SSP|ESTADO|REGISTRO|GERAL|TITULAR|FILIACAO|DATA|NASCIMENTO|NATURALIDADE|DOC|ORIGEM|EXPEDICAO/i;

    // Tenta encontrar o nome após a palavra NOME ou em linhas com nomes completos
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/NOME\b/i.test(line) && i + 1 < lines.length) {
        const nextLine = lines[i + 1].replace(/[^a-zA-Z\sÀ-ÿ]/g, '').trim();
        if (nextLine.length >= 6 && nextLine.split(' ').length >= 2 && !reservedWords.test(nextLine)) {
          extractedName = nextLine;
          break;
        }
      }
    }

    if (!extractedName) {
      for (const line of lines) {
        const clean = line.replace(/[^a-zA-Z\sÀ-ÿ]/g, '').trim();
        const words = clean.split(/\s+/);
        if (words.length >= 2 && clean.length >= 8 && !reservedWords.test(clean)) {
          if (words.every((w) => w.length >= 2)) {
            extractedName = clean;
            break;
          }
        }
      }
    }

    // Discriminação entre CPF e RG
    let extractedCpf = '';
    let extractedRg = '';

    if (cpfMatches[0]) {
      extractedCpf = maskCpfCnpj(cpfMatches[0].replace(/\D/g, ''));
      if (cpfMatches[1]) {
        extractedRg = cpfMatches[1].toUpperCase();
      } else if (rgMatches[0]) {
        extractedRg = rgMatches[0].toUpperCase();
      }
    } else if (raw11Digits[0]) {
      extractedCpf = maskCpfCnpj(raw11Digits[0]);
      if (rgMatches[0]) {
        extractedRg = rgMatches[0].toUpperCase();
      }
    } else if (rgMatches[0]) {
      extractedRg = rgMatches[0].toUpperCase();
    }

    let formattedBirthDate = '';
    if (birthDateMatches[0]) {
      const parts = birthDateMatches[0].split(/[\/\.-]/);
      if (parts.length === 3) {
        formattedBirthDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

    let issuingOrgan = issuingMatches ? issuingMatches[0].toUpperCase() : '';
    if (!issuingOrgan && stateMatches) {
      issuingOrgan = `SSP/${stateMatches[0].toUpperCase()}`;
    }

    return NextResponse.json({
      success: true,
      extracted: {
        name: extractedName,
        cpfCnpj: extractedCpf,
        rg: extractedRg,
        issuingOrgan: issuingOrgan,
        birthDate: formattedBirthDate,
      },
      isPdf,
    });
  } catch (error: any) {
    console.error('Erro no parser de documentos:', error);
    return NextResponse.json(
      { error: 'Não foi possível extrair dados automaticamente. Preencha os campos abaixo.' },
      { status: 200 }
    );
  }
}
