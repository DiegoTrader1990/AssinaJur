import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFileBuffer } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: { token: string } }
) {
  try {
    const signer = await prisma.signer.findUnique({
      where: { token: params.token },
      include: {
        document: {
          include: {
            originalFile: true,
          },
        },
      },
    });

    if (!signer || !signer.document || !signer.document.originalFile) {
      return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 });
    }

    const requestedDocumentId = new URL(req.url).searchParams.get('documentId');
    const requestedDocument = requestedDocumentId && requestedDocumentId !== signer.document.id
      ? await prisma.document.findFirst({
          where: {
            id: requestedDocumentId,
            officeId: signer.document.officeId,
            clientId: signer.document.clientId,
            kitBatchId: signer.document.kitBatchId || undefined,
          },
          include: { originalFile: true },
        })
      : signer.document;

    if (!requestedDocument?.originalFile || (requestedDocumentId && !signer.document.kitBatchId && requestedDocumentId !== signer.document.id)) {
      return NextResponse.json({ error: 'Documento não pertence a esta solicitação de assinatura.' }, { status: 403 });
    }

    const buffer = await getFileBuffer(signer.document.officeId, requestedDocument.originalFile.storageKey);
    if (!buffer) {
      return NextResponse.json({ error: 'Arquivo do documento não encontrado no armazenamento.' }, { status: 404 });
    }

    const mimeType = requestedDocument.originalFile.mimeType || 'application/pdf';

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': 'inline',
        'Content-Length': String(buffer.length),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*',
        'Content-Security-Policy': "frame-ancestors *",
      },
    });
  } catch (error: any) {
    console.error('Erro ao servir PDF do documento:', error);
    return NextResponse.json({ error: 'Erro ao carregar PDF do documento.' }, { status: 500 });
  }
}
