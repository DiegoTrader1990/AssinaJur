import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const tags = await prisma.tag.findMany({
      where: { officeId: user.officeId }, // INJEÇÃO RIGOROSA DO TENANT
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ tags });
  } catch (error: any) {
    console.error('Erro ao listar tags:', error);
    return NextResponse.json({ error: 'Erro ao carregar tags.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const body = await req.json();
    const name = String(body.name || '').trim();
    const color = String(body.color || '#2563EB');

    if (!name) {
      return NextResponse.json({ error: 'Nome da tag é obrigatório.' }, { status: 400 });
    }

    const existing = await prisma.tag.findFirst({
      where: { officeId: user.officeId, name },
    });
    if (existing) {
      return NextResponse.json({ error: 'Já existe uma tag com esse nome.' }, { status: 400 });
    }

    const tag = await prisma.tag.create({
      data: { officeId: user.officeId, name, color },
    });

    return NextResponse.json({ success: true, tag });
  } catch (error: any) {
    console.error('Erro ao criar tag:', error);
    return NextResponse.json({ error: 'Erro ao criar tag.' }, { status: 500 });
  }
}
