import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { assertKitTemplates, InvalidKitTemplatesError, validTemplateIds } from '@/lib/kit-security';

export const dynamic = 'force-dynamic';

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const kitId = params.id;
    const body = await req.json();
    const { name, category, description, templateIds } = body;

    if (user.role === 'VIEWER') {
      return NextResponse.json({ error: 'Seu acesso permite apenas consultas.' }, { status: 403 });
    }
    if (typeof name !== 'string' || !name.trim() || !validTemplateIds(templateIds)) {
      return NextResponse.json(
        { error: 'Nome do kit e ao menos 1 modelo jurídico são obrigatórios.' },
        { status: 400 }
      );
    }

    // Verificar se o kit pertence ao escritório do usuário (MULTI-TENANT ISOLATION)
    const existingKit = await prisma.legalKit.findFirst({
      where: { id: kitId, officeId: user.officeId },
    });

    if (!existingKit) {
      return NextResponse.json({ error: 'Kit jurídico não encontrado.' }, { status: 404 });
    }

    const updatedKit = await prisma.$transaction(async (tx) => {
      await assertKitTemplates(tx, user.officeId, templateIds);
      // 1. Atualizar dados do kit
      const kit = await tx.legalKit.update({
        where: { id: kitId },
        data: {
          name,
          category: category || 'Previdenciário',
          description: description || null,
        },
      });

      // 2. Remover itens antigos do kit
      await tx.kitItem.deleteMany({
        where: { kitId },
      });

      // 3. Recriar itens atualizados
      for (let i = 0; i < templateIds.length; i++) {
        await tx.kitItem.create({
          data: {
            kitId: kit.id,
            templateId: templateIds[i],
            displayOrder: i + 1,
          },
        });
      }

      return kit;
    });

    await logAuditEvent({
      officeId: user.officeId,
      userId: user.id,
      eventType: 'KIT_UPDATED',
      description: `Kit jurídico "${updatedKit.name}" atualizado com ${templateIds.length} modelos.`,
    });

    return NextResponse.json({ success: true, kit: updatedKit });
  } catch (error: any) {
    if (error instanceof InvalidKitTemplatesError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Erro ao atualizar kit jurídico:', error);
    return NextResponse.json({ error: 'Erro ao atualizar kit jurídico.' }, { status: 500 });
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
    if (user.role === 'VIEWER') {
      return NextResponse.json({ error: 'Seu acesso permite apenas consultas.' }, { status: 403 });
    }

    const kitId = params.id;

    const existingKit = await prisma.legalKit.findFirst({
      where: { id: kitId, officeId: user.officeId },
    });

    if (!existingKit) {
      return NextResponse.json({ error: 'Kit jurídico não encontrado.' }, { status: 404 });
    }

    await prisma.legalKit.update({
      where: { id: kitId },
      data: { active: false },
    });

    await logAuditEvent({
      officeId: user.officeId,
      userId: user.id,
      eventType: 'KIT_DELETED',
      description: `Kit jurídico "${existingKit.name}" desativado.`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao excluir kit jurídico:', error);
    return NextResponse.json({ error: 'Erro ao excluir kit jurídico.' }, { status: 500 });
  }
}
