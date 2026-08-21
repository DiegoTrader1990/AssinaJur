import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Lista as pendências da Central Operacional do Escritório
export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('clientId') || '';
    const status = searchParams.get('status') || '';
    const category = searchParams.get('category') || '';
    const priority = searchParams.get('priority') || '';
    const responsibleId = searchParams.get('responsibleId') || '';
    const search = (searchParams.get('search') || '').trim();
    const period = searchParams.get('period') || ''; // ATRASADO | HOJE | ESTA_SEMANA | SEM_PRAZO
    const includeResolved = searchParams.get('includeResolved') === 'true';

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const endOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59, 59, 999);

    let dueDateFilter: any = undefined;
    if (period === 'ATRASADO') {
      dueDateFilter = { lt: startOfToday };
    } else if (period === 'HOJE') {
      dueDateFilter = { gte: startOfToday, lte: endOfToday };
    } else if (period === 'ESTA_SEMANA') {
      dueDateFilter = { gte: startOfToday, lte: endOfWeek };
    } else if (period === 'SEM_PRAZO') {
      dueDateFilter = null;
    }

    const where: any = {
      officeId: user.officeId, // ISOLAMENTO RIGOROSO MULTI-TENANT
      ...(clientId ? { clientId } : {}),
      ...(status ? { status } : {}),
      ...(category ? { category } : {}),
      ...(priority ? { priority } : {}),
      ...(responsibleId ? { responsibleId } : {}),
      ...(includeResolved ? {} : { resolvedAt: null }),
      ...(dueDateFilter !== undefined ? { dueDate: dueDateFilter } : {}),
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { client: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const pendencies = await prisma.clientPendency.findMany({
      where,
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
      orderBy: [
        { dueDate: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({ pendencies });
  } catch (error: any) {
    console.error('Erro ao listar pendências:', error);
    return NextResponse.json({ error: 'Erro ao buscar pendências.' }, { status: 500 });
  }
}

// Cria uma nova pendência na Central Operacional do Escritório
export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const body = await req.json();
    const clientId = (body.clientId || '').trim();
    const title = (body.title || '').trim();
    const description = (body.description || '').trim();
    const category = body.category || 'OUTRO';
    const status = body.status || 'PARA_FAZER';
    const priority = ['URGENTE', 'ALTA', 'NORMAL', 'BAIXA'].includes(body.priority) ? body.priority : 'NORMAL';
    const dueDate = body.dueDate ? new Date(body.dueDate) : null;
    const responsibleId = body.responsibleId || user.id;
    const source = body.source || 'MANUAL';
    const sourceType = body.sourceType || null;
    const sourceEntityId = body.sourceEntityId || null;

    if (!description && !title) {
      return NextResponse.json({ error: 'Informe um título ou descrição.' }, { status: 400 });
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
        title: title || description.slice(0, 40),
        description: description || title,
        category,
        status,
        priority,
        dueDate,
        source,
        sourceType,
        sourceEntityId,
        createdById: user.id,
        responsibleId,
        history: {
          create: {
            userId: user.id,
            action: 'CREATED',
            toStatus: status,
            description: `Acompanhamento criado por ${user.name}`,
          },
        },
      },
      include: {
        client: { select: { id: true, name: true, phone: true, whatsapp: true, cpfCnpj: true } },
        createdBy: { select: { id: true, name: true } },
        responsible: { select: { id: true, name: true } },
        history: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return NextResponse.json({ pendency }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar pendência:', error);
    return NextResponse.json({ error: 'Erro ao criar pendência.' }, { status: 500 });
  }
}
