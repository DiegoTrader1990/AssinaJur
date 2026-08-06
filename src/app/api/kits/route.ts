import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const kits = await prisma.legalKit.findMany({
      where: {
        officeId: user.officeId, // MULTI-TENANT ISOLATION
        active: true,
      },
      include: {
        items: {
          include: {
            template: {
              select: { id: true, title: true, documentType: true },
            },
          },
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ kits });
  } catch (error: any) {
    console.error('Erro ao listar kits jurídicos:', error);
    return NextResponse.json({ error: 'Erro ao carregar kits jurídicos.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const body = await req.json();
    const { name, category, description, templateIds } = body;

    if (!name || !templateIds || !Array.isArray(templateIds) || templateIds.length === 0) {
      return NextResponse.json(
        { error: 'Nome do kit e ao menos 1 modelo jurídico são obrigatórios.' },
        { status: 400 }
      );
    }

    const kit = await prisma.$transaction(async (tx) => {
      const createdKit = await tx.legalKit.create({
        data: {
          officeId: user.officeId,
          name,
          category: category || 'Previdenciário',
          description: description || null,
        },
      });

      for (let i = 0; i < templateIds.length; i++) {
        await tx.kitItem.create({
          data: {
            kitId: createdKit.id,
            templateId: templateIds[i],
            displayOrder: i + 1,
          },
        });
      }

      return createdKit;
    });

    await logAuditEvent({
      officeId: user.officeId,
      userId: user.id,
      eventType: 'KIT_CREATED',
      description: `Kit jurídico "${kit.name}" criado com ${templateIds.length} modelos.`,
    });

    return NextResponse.json({ success: true, kit });
  } catch (error: any) {
    console.error('Erro ao criar kit jurídico:', error);
    return NextResponse.json({ error: 'Erro ao cadastrar kit jurídico.' }, { status: 500 });
  }
}
