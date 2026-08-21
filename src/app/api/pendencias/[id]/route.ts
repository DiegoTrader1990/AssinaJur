import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Busca uma pendência específica com histórico completo
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const pendency = await prisma.clientPendency.findFirst({
      where: { id: params.id, officeId: user.officeId },
      include: {
        client: { select: { id: true, name: true, phone: true, whatsapp: true, cpfCnpj: true } },
        createdBy: { select: { id: true, name: true } },
        responsible: { select: { id: true, name: true } },
        resolvedBy: { select: { id: true, name: true } },
        history: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!pendency) {
      return NextResponse.json({ error: 'Acompanhamento não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ pendency });
  } catch (error: any) {
    console.error('Erro ao buscar pendência:', error);
    return NextResponse.json({ error: 'Erro ao buscar pendência.' }, { status: 500 });
  }
}

// Atualiza status, prazo, responsável, detalhes ou atua como concluir/reabrir
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const existing = await prisma.clientPendency.findFirst({
      where: { id: params.id, officeId: user.officeId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Acompanhamento não encontrado.' }, { status: 404 });
    }

    const body = await req.json();
    const updateData: any = {};
    const historyActions: any[] = [];

    // 1. Mudança de Status / Drag & Drop
    if (body.status && body.status !== existing.status) {
      updateData.status = body.status;
      historyActions.push({
        userId: user.id,
        action: 'STATUS_CHANGED',
        fromStatus: existing.status,
        toStatus: body.status,
        description: `Status alterado de "${existing.status}" para "${body.status}" por ${user.name}`,
      });
    }

    // 2. Conclusão ou Reabertura
    if (typeof body.resolved === 'boolean') {
      if (body.resolved) {
        updateData.resolvedAt = new Date();
        updateData.resolvedById = user.id;
        updateData.status = 'CONCLUIDO';
        historyActions.push({
          userId: user.id,
          action: 'COMPLETED',
          fromStatus: existing.status,
          toStatus: 'CONCLUIDO',
          description: `Acompanhamento concluído por ${user.name}`,
        });
      } else {
        updateData.resolvedAt = null;
        updateData.resolvedById = null;
        updateData.status = body.status || 'PARA_FAZER';
        historyActions.push({
          userId: user.id,
          action: 'REOPENED',
          fromStatus: 'CONCLUIDO',
          toStatus: updateData.status,
          description: `Acompanhamento reaberto por ${user.name}`,
        });
      }
    }

    // 3. Mudança de Responsável
    if (body.responsibleId !== undefined && body.responsibleId !== existing.responsibleId) {
      updateData.responsibleId = body.responsibleId || null;
      historyActions.push({
        userId: user.id,
        action: 'REASSIGNED',
        description: `Responsável alterado por ${user.name}`,
      });
    }

    // 4. Mudança de Prazo / Reagendamento
    if (body.dueDate !== undefined) {
      const newDueDate = body.dueDate ? new Date(body.dueDate) : null;
      updateData.dueDate = newDueDate;
      historyActions.push({
        userId: user.id,
        action: 'RESCHEDULED',
        description: newDueDate
          ? `Prazo reagendado para ${newDueDate.toLocaleDateString('pt-BR')} por ${user.name}`
          : `Prazo removido por ${user.name}`,
      });
    }

    // 5. Outros campos (title, description, category, priority, clientId)
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.clientId !== undefined) updateData.clientId = body.clientId || null;

    if (historyActions.length === 0 && Object.keys(updateData).length > 0) {
      historyActions.push({
        userId: user.id,
        action: 'EDITED',
        description: `Acompanhamento editado por ${user.name}`,
      });
    }

    const pendency = await prisma.clientPendency.update({
      where: { id: params.id },
      data: {
        ...updateData,
        history: {
          create: historyActions,
        },
      },
      include: {
        client: { select: { id: true, name: true, phone: true, whatsapp: true, cpfCnpj: true } },
        createdBy: { select: { id: true, name: true } },
        responsible: { select: { id: true, name: true } },
        resolvedBy: { select: { id: true, name: true } },
        history: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return NextResponse.json({ pendency });
  } catch (error: any) {
    console.error('Erro ao atualizar pendência:', error);
    return NextResponse.json({ error: 'Erro ao atualizar pendência.' }, { status: 500 });
  }
}

// Exclui definitivamente uma pendência (ex: cadastrada por engano).
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const existing = await prisma.clientPendency.findFirst({
      where: { id: params.id, officeId: user.officeId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Acompanhamento não encontrado.' }, { status: 404 });
    }

    await prisma.clientPendency.delete({ where: { id: params.id } });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Erro ao excluir pendência:', error);
    return NextResponse.json({ error: 'Erro ao excluir pendência.' }, { status: 500 });
  }
}
