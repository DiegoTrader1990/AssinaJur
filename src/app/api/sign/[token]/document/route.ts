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

    const buffer = await getFileBuffer(signer.document.officeId, signer.document.originalFile.storageKey);
    if (!buffer) {
      return NextResponse.json({ error: 'Arquivo do documento não encontrado no armazenamento.' }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${encodeURIComponent(signer.document.title)}.pdf"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: any) {
    console.error('Erro ao servir PDF do documento:', error);
    return NextResponse.json({ error: 'Erro ao carregar PDF do documento.' }, { status: 500 });
  }
}
