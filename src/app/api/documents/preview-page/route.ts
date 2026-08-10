import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getFileBuffer } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return new Response('Não autenticado', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('fileId');
    const pageNum = Math.max(1, parseInt(searchParams.get('page') || '1', 10));

    if (!fileId) {
      return new Response('fileId é obrigatório', { status: 400 });
    }

    const storageRecord = await prisma.storageFile.findFirst({
      where: { id: fileId, officeId: user.officeId },
    });

    if (!storageRecord) {
      return new Response('Arquivo não encontrado', { status: 404 });
    }

    const pdfBuffer = await getFileBuffer(user.officeId, storageRecord.storageKey);
    if (!pdfBuffer) {
      return new Response('Conteúdo não encontrado em disco', { status: 404 });
    }

    // Renderizar página do PDF para PNG usando pdfjs-dist + @napi-rs/canvas no servidor
    // @ts-ignore
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const { createCanvas } = require('@napi-rs/canvas');

    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(pdfBuffer),
      verbosity: 0,
    });

    const pdfDoc = await loadingTask.promise;
    const totalPages = pdfDoc.numPages;

    if (searchParams.get('info') === 'true') {
      return NextResponse.json({ success: true, totalPages });
    }

    const targetPage = Math.min(pageNum, totalPages);
    const pdfPage = await pdfDoc.getPage(targetPage);
    const viewport = pdfPage.getViewport({ scale: 1.5 }); // Resolução HD (1.5x)

    const canvas = createCanvas(Math.round(viewport.width), Math.round(viewport.height));
    const context = canvas.getContext('2d');

    // Desenhar fundo branco para PDFs com fundo transparente
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, canvas.width, canvas.height);

    await pdfPage.render({
      canvasContext: context,
      viewport,
    }).promise;

    const pngBuffer = canvas.toBuffer('image/png');

    return new Response(new Uint8Array(pngBuffer), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
        'X-Total-Pages': String(totalPages),
      },
    });
  } catch (err: any) {
    console.error('Erro ao renderizar prévia da página no servidor:', err);
    return new Response('Erro ao renderizar prévia da página', { status: 500 });
  }
}
