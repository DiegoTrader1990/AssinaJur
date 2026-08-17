import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Marca uma pendência manual como resolvida (não apaga - mantém histórico).
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
      return NextResponse.json({ error: 'Pendência não encontrada.' }, { status: 404 });
    }

    const pendency = await prisma.clientPendency.update({
      where: { id: params.id },
      data: { resolvedAt: new Date(), resolvedById: user.id },
      include: {
        client: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        resolvedBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ pendency });
  } catch (error: any) {
    console.error('Erro ao resolver pendência:', error);
    return NextResponse.json({ error: 'Erro ao resolver pendência.' }, { status: 500 });
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
      return NextResponse.json({ error: 'Pendência não encontrada.' }, { status: 404 });
    }

    await prisma.clientPendency.delete({ where: { id: params.id } });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Erro ao excluir pendência:', error);
    return NextResponse.json({ error: 'Erro ao excluir pendência.' }, { status: 500 });
  }
}
