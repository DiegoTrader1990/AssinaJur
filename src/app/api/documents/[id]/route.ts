import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

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
