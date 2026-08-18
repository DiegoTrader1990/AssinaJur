import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Lista as pendências manuais abertas do escritório (todas, ou de um cliente específico).
// Usado para "Sua Prioridade Agora" substituir o cálculo automático quando houver pendência.
export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('clientId') || '';
    const includeResolved = searchParams.get('includeResolved') === 'true';

    const pendencies = await prisma.clientPendency.findMany({
      where: {
        officeId: user.officeId, // ISOLAMENTO RIGOROSO MULTI-TENANT
        ...(clientId ? { clientId } : {}),
        ...(includeResolved ? {} : { resolvedAt: null }),
      },
      include: {
        client: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        resolvedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ pendencies });
  } catch (error: any) {
    console.error('Erro ao listar pendências:', error);
    return NextResponse.json({ error: 'Erro ao buscar pendências.' }, { status: 500 });
  }
}

// Cria uma nova pendência manual para um cliente (ex: "Cobrar atualização de senha do INSS").
export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const body = await req.json();
    const clientId = (body.clientId || '').trim();
    const description = (body.description || '').trim();
    const priority = ['URGENTE', 'ALTA', 'NORMAL', 'BAIXA'].includes(body.priority) ? body.priority : 'NORMAL';
    const dueDate = body.dueDate ? new Date(`${body.dueDate}T12:00:00`) : null;

    if (!description) {
      return NextResponse.json({ error: 'Descreva o que precisa ser feito.' }, { status: 400 });
    }

    if (dueDate && Number.isNaN(dueDate.getTime())) {
      return NextResponse.json({ error: 'Prazo inválido.' }, { status: 400 });
    }

    if (clientId) {
      const client = await prisma.client.findFirst({
        where: { id: clientId, officeId: user.officeId },
        select: { id: true },
      });
      if (!client) {
        return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 });
      }
    }

    const pendency = await prisma.clientPendency.create({
      data: {
        officeId: user.officeId,
        ...(clientId ? { clientId } : {}),
        description,
        priority,
        dueDate,
        createdById: user.id,
      },
      include: {
        client: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ pendency }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar pendência:', error);
    return NextResponse.json({ error: 'Erro ao criar pendência.' }, { status: 500 });
  }
}
