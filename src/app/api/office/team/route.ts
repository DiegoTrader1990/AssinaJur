import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser, hashPassword } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export const dynamic = 'force-dynamic';

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
        gender: true,
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
    if (!office) {
      return NextResponse.json({ error: 'Escritório não encontrado.' }, { status: 404 });
    }

    const body = await req.json();
    const { name, email, password, role, oabNumber, phone, gender } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Nome, e-mail, senha e cargo são obrigatórios.' },
        { status: 400 }
      );
    }

    if (String(password).length < 6) {
      return NextResponse.json({ error: 'A senha deve ter ao menos 6 caracteres.' }, { status: 400 });
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
        gender: ['MASCULINO', 'FEMININO'].includes(gender) ? gender : null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        oabNumber: true,
        phone: true,
        gender: true,
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

export async function DELETE(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    if (user.role !== 'OFFICE_ADMIN') {
      return NextResponse.json(
        { error: 'Apenas administradores do escritório podem excluir membros.' },
        { status: 403 }
      );
    }

    const memberId = new URL(req.url).searchParams.get('id');
    if (!memberId) {
      return NextResponse.json({ error: 'Informe o membro que deseja excluir.' }, { status: 400 });
    }

    if (memberId === user.id) {
      return NextResponse.json(
        { error: 'Você não pode excluir a sua própria conta por esta tela.' },
        { status: 400 }
      );
    }

    const member = await prisma.user.findFirst({
      where: { id: memberId, officeId: user.officeId },
      select: { id: true, name: true, role: true },
    });

    if (!member) {
      return NextResponse.json({ error: 'Membro não encontrado neste escritório.' }, { status: 404 });
    }

    if (member.role === 'OFFICE_ADMIN') {
      const administrators = await prisma.user.count({
        where: { officeId: user.officeId, role: 'OFFICE_ADMIN', active: true },
      });
      if (administrators <= 1) {
        return NextResponse.json(
          { error: 'O escritório precisa manter ao menos um administrador ativo.' },
          { status: 400 }
        );
      }
    }

    await prisma.user.delete({ where: { id: member.id } });

    await logAuditEvent({
      officeId: user.officeId,
      userId: user.id,
      eventType: 'TEAM_MEMBER_REMOVED',
      description: `Membro ${member.name} (${member.role}) excluído da equipe.`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao excluir membro:', error);
    if (error?.code === 'P2003') {
      return NextResponse.json(
        { error: 'Este advogado já possui registros vinculados e não pode ser excluído. Mantenha-o cadastrado para preservar o histórico.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Erro ao excluir membro da equipe.' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    if (user.role !== 'OFFICE_ADMIN') {
      return NextResponse.json({ error: 'Apenas administradores podem editar membros.' }, { status: 403 });
    }

    const body = await req.json();
    const { id, name, email, oabNumber, phone, gender, role, password } = body;
    if (!id || !name || !email) {
      return NextResponse.json({ error: 'Nome e e-mail são obrigatórios.' }, { status: 400 });
    }

    const member = await prisma.user.findFirst({
      where: { id, officeId: user.officeId },
      select: { id: true, email: true, name: true },
    });
    if (!member) return NextResponse.json({ error: 'Membro não encontrado neste escritório.' }, { status: 404 });

    if (role && !['OFFICE_ADMIN', 'LAWYER', 'STAFF', 'VIEWER'].includes(role)) {
      return NextResponse.json({ error: 'Cargo de usuário inválido.' }, { status: 400 });
    }
    if (password && String(password).length < 6) {
      return NextResponse.json({ error: 'A senha deve ter ao menos 6 caracteres.' }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (normalizedEmail !== member.email) {
      const emailInUse = await prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } });
      if (emailInUse) return NextResponse.json({ error: 'Este e-mail já pertence a outra conta.' }, { status: 400 });
    }

    const updatedMember = await prisma.user.update({
      where: { id: member.id },
      data: {
        name: String(name).trim(),
        email: normalizedEmail,
        oabNumber: String(oabNumber || '').trim() || null,
        phone: String(phone || '').trim() || null,
        gender: ['MASCULINO', 'FEMININO'].includes(gender) ? gender : null,
        ...(role ? { role } : {}),
        ...(password ? { passwordHash: await hashPassword(password) } : {}),
      },
      select: { id: true, name: true, email: true, role: true, oabNumber: true, phone: true, gender: true, active: true },
    });

    await logAuditEvent({
      officeId: user.officeId,
      userId: user.id,
      eventType: 'TEAM_MEMBER_UPDATED',
      description: `Dados de ${updatedMember.name} atualizados na equipe.`,
    });
    return NextResponse.json({ success: true, member: updatedMember });
  } catch (error) {
    console.error('Erro ao editar membro:', error);
    return NextResponse.json({ error: 'Erro ao editar membro da equipe.' }, { status: 500 });
  }
}
