import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { ensureClientQualificationTokens } from '@/lib/kitTemplateNormalization';

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

    const template = await prisma.template.findFirst({
      where: {
        id: params.id,
        officeId: user.officeId, // INJEÇÃO RIGOROSA DO TENANT
      },
    });

    if (!template) {
      return NextResponse.json({ error: 'Modelo não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error: any) {
    console.error('Erro ao buscar modelo:', error);
    return NextResponse.json({ error: 'Erro ao carregar detalhes do modelo.' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const existingTemplate = await prisma.template.findFirst({
      where: {
        id: params.id,
        officeId: user.officeId,
      },
    });

    if (!existingTemplate) {
      return NextResponse.json({ error: 'Modelo não encontrado.' }, { status: 404 });
    }

    const body = await req.json();

    const nextTitle = body.title ?? existingTemplate.title;
    const nextDocumentType = body.documentType ?? existingTemplate.documentType;
    const nextContentHtml = body.contentHtml === undefined
      ? existingTemplate.contentHtml
      : ensureClientQualificationTokens(body.contentHtml, nextTitle, nextDocumentType);

    const updatedTemplate = await prisma.template.update({
      where: { id: params.id },
      data: {
        title: nextTitle,
        category: body.category ?? existingTemplate.category,
        documentType: nextDocumentType,
        contentHtml: nextContentHtml,
        description: body.description ?? existingTemplate.description,
        version: existingTemplate.version + 1,
      },
    });

    await logAuditEvent({
      officeId: user.officeId,
      userId: user.id,
      eventType: 'TEMPLATE_UPDATED',
      description: `Modelo "${updatedTemplate.title}" atualizado para a versão ${updatedTemplate.version}.`,
    });

    return NextResponse.json({ success: true, template: updatedTemplate });
  } catch (error: any) {
    console.error('Erro ao atualizar modelo:', error);
    return NextResponse.json({ error: 'Erro ao salvar alterações do modelo.' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const template = await prisma.template.findFirst({
      where: { id: params.id, officeId: user.officeId },
    });

    if (!template) {
      return NextResponse.json({ error: 'Modelo não encontrado.' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Remover o vínculo do modelo dos kits existentes
      await tx.kitItem.deleteMany({
        where: { templateId: params.id },
      });

      // 2. Desativar o modelo
      await tx.template.update({
        where: { id: params.id },
        data: { active: false },
      });
    });

    await logAuditEvent({
      officeId: user.officeId,
      userId: user.id,
      eventType: 'TEMPLATE_DELETED',
      description: `Modelo de minuta "${template.title}" desativado.`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao excluir modelo:', error);
    return NextResponse.json({ error: 'Erro ao excluir modelo de minuta.' }, { status: 500 });
  }
}
