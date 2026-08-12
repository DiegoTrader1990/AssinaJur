import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getFileBuffer, saveFile } from '@/lib/storage';
import { calculateHash } from '@/lib/pdfHash';

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

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Por favor, envie um arquivo em formato PDF.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const maxSizeBytes = 20 * 1024 * 1024;
    if (buffer.length === 0 || buffer.length > maxSizeBytes) {
      return NextResponse.json({ error: 'O PDF deve ter entre 1 byte e 20 MB.' }, { status: 400 });
    }
    if (buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
      return NextResponse.json({ error: 'O conteúdo enviado não corresponde a um arquivo PDF válido.' }, { status: 400 });
    }

    const hash = calculateHash(buffer);

    const storageRecord = await saveFile({
      officeId: user.officeId, // INJEÇÃO OBRIGATÓRIA DE TENANT
      uploadedBy: user.id,
      fileBuffer: buffer,
      originalName: file.name,
      mimeType: file.type || 'application/pdf',
    });

    return NextResponse.json({
      success: true,
      file: {
        id: storageRecord.id,
        name: storageRecord.originalName,
        sizeBytes: storageRecord.sizeBytes,
        hash,
      },
    });
  } catch (error: any) {
    console.error('Erro no upload de PDF:', error);
    return NextResponse.json({ error: 'Erro ao processar upload do PDF: ' + (error?.message || '') }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return new Response('Não autenticado', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('fileId');
    if (!fileId) {
      return new Response('fileId é obrigatório', { status: 400 });
    }

    const storageRecord = await prisma.storageFile.findFirst({
      where: { id: fileId, officeId: user.officeId },
    });
    if (searchParams.get('info') === 'true' && storageRecord) {
      const infoBuffer = await getFileBuffer(user.officeId, storageRecord.storageKey);
      if (!infoBuffer) return NextResponse.json({ error: 'Conteúdo não encontrado' }, { status: 404 });
      return NextResponse.json({
        file: {
          id: storageRecord.id,
          name: storageRecord.originalName,
          sizeBytes: storageRecord.sizeBytes,
          hash: calculateHash(infoBuffer),
        },
      });
    }
    if (!storageRecord) {
      return new Response('Arquivo não encontrado', { status: 404 });
    }

    const buffer = await getFileBuffer(user.officeId, storageRecord.storageKey);
    if (!buffer) {
      return new Response('Conteúdo não encontrado em disco', { status: 404 });
    }

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${storageRecord.originalName}"`,
      },
    });
  } catch (err: any) {
    console.error('Erro ao buscar arquivo no upload route:', err);
    return new Response('Erro ao carregar arquivo', { status: 500 });
  }
}
