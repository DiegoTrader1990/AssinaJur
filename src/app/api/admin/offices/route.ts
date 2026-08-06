import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const offices = await prisma.office.findMany({
      include: {
        _count: {
          select: {
            users: true,
            clients: true,
            documents: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const officesWithUsage = await Promise.all(
      offices.map(async (off) => {
        const monthDocsCount = await prisma.document.count({
          where: {
            officeId: off.id,
            createdAt: { gte: firstDayOfMonth },
          },
        });

        return {
          id: off.id,
          name: off.name,
          tradeName: off.tradeName,
          cpfCnpj: off.cpfCnpj,
          phone: off.phone,
          email: off.email,
          plan: off.plan,
          planStatus: off.planStatus,
          monthlyDocLimit: off.monthlyDocLimit,
          maxUsersLimit: off.maxUsersLimit,
          additionalCredits: off.additionalCredits,
          usersCount: off._count.users,
          clientsCount: off._count.clients,
          totalDocsCount: off._count.documents,
          monthDocsCount,
          createdAt: off.createdAt,
        };
      })
    );

    return NextResponse.json({ offices: officesWithUsage });
  } catch (error: any) {
    console.error('Erro ao listar escritórios para admin:', error);
    return NextResponse.json({ error: 'Erro ao buscar lista de escritórios.' }, { status: 500 });
  }
}
