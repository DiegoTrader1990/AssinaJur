import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser, hashPassword } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const members = await prisma.user.findMany({
      where: { officeId: user.officeId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        oabNumber: true,
        phone: true,
        active: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ members });
  } catch (error: any) {
    console.error('Erro ao listar equipe:', error);
    return NextResponse.json({ error: 'Erro ao buscar membros da equipe.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    if (user.role !== 'OFFICE_ADMIN') {
      return NextResponse.json(
        { error: 'Apenas administradores do escritório podem adicionar membros.' },
        { status: 403 }
      );
    }

    const office = await prisma.office.findUnique({ where: { id: user.officeId } });
    const activeUsers = await prisma.user.count({ where: { officeId: user.officeId, active: true } });
    if (!office || office.planStatus !== 'ACTIVE') {
      return NextResponse.json({ error: 'O plano do escritório está inativo.' }, { status: 403 });
    }
    if (activeUsers >= office.maxUsersLimit) {
      return NextResponse.json({ error: `O limite de ${office.maxUsersLimit} usuário(s) do plano foi atingido.` }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, password, role, oabNumber, phone } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Nome, e-mail, senha e cargo são obrigatórios.' },
        { status: 400 }
      );
    }

    if (String(password).length < 10 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return NextResponse.json({ error: 'A senha deve ter ao menos 10 caracteres, incluindo letras e números.' }, { status: 400 });
    }
    if (!['OFFICE_ADMIN', 'LAWYER', 'STAFF', 'VIEWER'].includes(role)) {
      return NextResponse.json({ error: 'Cargo de usuário inválido.' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Este e-mail já pertence a uma conta no sistema.' },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    const newMember = await prisma.user.create({
      data: {
        officeId: user.officeId, // VÍNCULO MULTI-TENANT
        name,
        email,
        passwordHash,
        role,
        oabNumber: oabNumber || null,
        phone: phone || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        oabNumber: true,
        phone: true,
        active: true,
      },
    });

    await logAuditEvent({
      officeId: user.officeId,
      userId: user.id,
      eventType: 'TEAM_MEMBER_ADDED',
      description: `Membro ${newMember.name} (${newMember.role}) adicionado à equipe.`,
    });

    return NextResponse.json({ success: true, member: newMember });
  } catch (error: any) {
    console.error('Erro ao adicionar membro:', error);
    return NextResponse.json({ error: 'Erro ao cadastrar membro da equipe.' }, { status: 500 });
  }
}
