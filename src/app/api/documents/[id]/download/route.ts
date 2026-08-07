import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { getFileBuffer } from '@/lib/storage';

import { generateFinalPdfCertificate } from '@/lib/pdfCertificate';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const document = await prisma.document.findFirst({
      where: {
        id: params.id,
        officeId: user.officeId, // TENANT ISOLATION
      },
      include: {
        originalFile: true,
        signedFile: true,
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 });
    }

    // Se o documento estiver concluído ou parcialmente assinado, tenta servir o PDF com Certificado.
    let fileToServe = document.signedFile;

    if (!fileToServe && (document.status === 'CONCLUIDO' || document.status === 'PARCIALMENTE_ASSINADO')) {
      try {
        const certRes = await generateFinalPdfCertificate(document.id);
        fileToServe = certRes.signedStorageFile as any;
      } catch (certErr) {
        console.error('Erro ao gerar certificado sob demanda:', certErr);
      }
    }

    if (!fileToServe) {
      fileToServe = document.originalFile;
    }

    if (!fileToServe) {
      return NextResponse.json({ error: 'Arquivo do documento não encontrado.' }, { status: 404 });
    }

    const fileBuffer = await getFileBuffer(user.officeId, fileToServe.storageKey);
    if (!fileBuffer) {
      return NextResponse.json({ error: 'Arquivo não encontrado no armazenamento.' }, { status: 404 });
    }

    // Convertido para Uint8Array puro: o tipo Buffer<ArrayBufferLike> do Node
    // não é aceito pelo tipo BodyInit do TypeScript ao rodar o build da Vercel.
    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileToServe.originalName)}"`,
      },
    });
  } catch (error: any) {
    console.error('Erro no download do documento:', error);
    return NextResponse.json({ error: 'Erro ao baixar arquivo.' }, { status: 500 });
  }
}
