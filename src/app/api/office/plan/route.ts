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

    const office = await prisma.office.findUnique({
      where: { id: user.officeId },
    });

    if (!office) {
      return NextResponse.json({ error: 'Escritório não encontrado.' }, { status: 404 });
    }

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthDocsCount = await prisma.document.count({
      where: {
        officeId: user.officeId,
        createdAt: { gte: firstDayOfMonth },
      },
    });

    const activeUsersCount = await prisma.user.count({
      where: {
        officeId: user.officeId,
        active: true,
      },
    });

    const totalAllowed = office.monthlyDocLimit + office.additionalCredits;
    const percentageUsed = Math.min(Math.round((monthDocsCount / (totalAllowed || 1)) * 100), 100);

    return NextResponse.json({
      plan: office.plan,
      planStatus: office.planStatus,
      monthlyDocLimit: office.monthlyDocLimit,
      additionalCredits: office.additionalCredits,
      totalAllowed,
      monthDocsCount,
      percentageUsed,
      maxUsersLimit: office.maxUsersLimit,
      activeUsersCount,
    });
  } catch (error: any) {
    console.error('Erro ao consultar plano do escritório:', error);
    return NextResponse.json({ error: 'Erro ao buscar dados da assinatura.' }, { status: 500 });
  }
}
