import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { deleteFile } from '@/lib/storage';

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
        officeId: user.officeId, // INJEÇÃO RIGOROSA DO TENANT
      },
      include: {
        client: true,
        signers: {
          orderBy: { signatureOrder: 'asc' },
        },
        originalFile: true,
        signedFile: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        events: {
          include: {
            signer: { select: { id: true, name: true, role: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ document });
  } catch (error: any) {
    console.error('Erro ao buscar documento:', error);
    return NextResponse.json({ error: 'Erro ao carregar detalhes do documento.' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const body = await req.json();
    const action = body.action; // 'send' ou 'cancel'

    const document = await prisma.document.findFirst({
      where: {
        id: params.id,
        officeId: user.officeId,
      },
      include: { signers: true },
    });

    if (!document) {
      return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 });
    }

    if (action === 'send') {
      if (document.status === 'CONCLUIDO' || document.status === 'CANCELADO') {
        return NextResponse.json(
          { error: `Documento já está ${document.status.toLowerCase()} e não pode ser reenviado.` },
          { status: 400 }
        );
      }

      await prisma.document.update({
        where: { id: document.id },
        data: { status: 'ENVIADO' },
      });

      await prisma.documentEvent.create({
        data: {
          documentId: document.id,
          userId: user.id,
          eventType: 'LINK_SENT',
          description: `Link de assinatura ativado e enviado aos signatários por ${user.name}.`,
        },
      });

      await logAuditEvent({
        officeId: user.officeId,
        userId: user.id,
        eventType: 'DOCUMENT_SENT',
        description: `Links de assinatura do documento "${document.title}" disparados.`,
      });

      return NextResponse.json({
        success: true,
        message: 'Links de assinatura disponibilizados com sucesso!',
      });
    }

    if (action === 'cancel') {
      if (document.status === 'CONCLUIDO') {
        return NextResponse.json(
          { error: 'Documentos já concluídos não podem ser cancelados.' },
          { status: 400 }
        );
      }

      await prisma.document.update({
        where: { id: document.id },
        data: { status: 'CANCELADO' },
      });

      await prisma.documentEvent.create({
        data: {
          documentId: document.id,
          userId: user.id,
          eventType: 'DOCUMENT_CANCELLED',
          description: `Documento cancelado por ${user.name}.`,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Documento cancelado com sucesso.',
      });
    }

    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
  } catch (error: any) {
    console.error('Erro na ação do documento:', error);
    return NextResponse.json({ error: 'Erro ao processar ação no documento.' }, { status: 500 });
  }
}

// Exclusão permanente do documento. Não há restrição de status — inclusive documentos
// CONCLUÍDOS (já assinados) podem ser excluídos aqui, a pedido explícito do escritório;
// a interface é responsável por deixar claro que isso apaga o certificado de evidências
// e o histórico de assinatura de forma irreversível.
export async function DELETE(
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
        officeId: user.officeId, // INJEÇÃO RIGOROSA DO TENANT
      },
      include: { originalFile: true, signedFile: true },
    });

    if (!document) {
      return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 });
    }

    const documentTitle = document.title;
    const originalFileId = document.originalFileId;
    const signedFileId = document.signedFileId;
    const originalStorageKey = document.originalFile?.storageKey;
    const signedStorageKey = document.signedFile?.storageKey;

    // 1. Exclui o documento — signatários e trilha de eventos são removidos em cascata
    //    (onDelete: Cascade no schema.prisma).
    await prisma.document.delete({ where: { id: document.id } });

    // 2. Remove os registros StorageFile órfãos e os arquivos físicos correspondentes.
    const storageFileIds = [originalFileId, signedFileId].filter(Boolean) as string[];
    if (storageFileIds.length > 0) {
      await prisma.storageFile.deleteMany({ where: { id: { in: storageFileIds } } });
    }
    if (originalStorageKey) await deleteFile(originalStorageKey);
    if (signedStorageKey) await deleteFile(signedStorageKey);

    await logAuditEvent({
      officeId: user.officeId,
      userId: user.id,
      eventType: 'DOCUMENT_DELETED',
      description: `Documento "${documentTitle}" excluído permanentemente por ${user.name}.`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao excluir documento:', error);
    return NextResponse.json({ error: 'Erro ao excluir documento.' }, { status: 500 });
  }
}
