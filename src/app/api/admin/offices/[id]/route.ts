import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { plan, planStatus, monthlyDocLimit, maxUsersLimit, additionalCredits } = body;

    const office = await prisma.office.findUnique({
      where: { id: params.id },
    });

    if (!office) {
      return NextResponse.json({ error: 'Escritório não encontrado.' }, { status: 404 });
    }

    const updatedOffice = await prisma.office.update({
      where: { id: params.id },
      data: {
        plan: plan ?? office.plan,
        planStatus: planStatus ?? office.planStatus,
        monthlyDocLimit: monthlyDocLimit !== undefined ? Number(monthlyDocLimit) : office.monthlyDocLimit,
        maxUsersLimit: maxUsersLimit !== undefined ? Number(maxUsersLimit) : office.maxUsersLimit,
        additionalCredits: additionalCredits !== undefined ? Number(additionalCredits) : office.additionalCredits,
        active: planStatus ? planStatus === 'ACTIVE' : office.active,
      },
    });

    return NextResponse.json({ success: true, office: updatedOffice });
  } catch (error: any) {
    console.error('Erro ao atualizar plano do escritório:', error);
    return NextResponse.json({ error: 'Erro ao alterar escritório.' }, { status: 500 });
  }
}
