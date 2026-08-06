import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const ADMIN_COOKIE_NAME = 'assinajur_admin_token';

function verifyAdminSession() {
  const cookieStore = cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || payload.officeId !== 'PLATFORM_SUPER_ADMIN') return null;
  return payload;
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const admin = verifyAdminSession();
  if (!admin) {
    return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  }

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
