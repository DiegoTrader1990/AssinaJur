import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, signToken, TOKEN_COOKIE_NAME, UserRole } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'E-mail e senha são obrigatórios.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: String(email).trim().toLowerCase() },
      include: { office: true },
    });

    if (!user || !user.active) {
      return NextResponse.json(
        { error: 'Credenciais inválidas ou conta inativa.' },
        { status: 401 }
      );
    }

    if (!user.office.active) {
      return NextResponse.json(
        { error: 'O acesso do escritório está suspenso ou inativo.' },
        { status: 403 }
      );
    }

    const validPassword = await verifyPassword(password, user.passwordHash);
    if (!validPassword) {
      return NextResponse.json(
        { error: 'Credenciais inválidas.' },
        { status: 401 }
      );
    }

    const token = signToken({
      userId: user.id,
      officeId: user.officeId,
      email: user.email,
      role: user.role as UserRole,
    });

    await logAuditEvent({
      officeId: user.officeId,
      userId: user.id,
      eventType: 'USER_LOGIN',
      description: `Login efetuado por ${user.name} (${user.email}).`,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        officeId: user.officeId,
        officeName: user.office.name,
      },
    });

    response.cookies.set(TOKEN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error('Erro no login:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro interno ao realizar login. Tente novamente.' },
      { status: 500 }
    );
  }
}
