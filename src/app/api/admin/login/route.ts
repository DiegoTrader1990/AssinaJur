import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, signToken } from '@/lib/auth';

const ADMIN_COOKIE_NAME = 'assinajur_admin_token';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'E-mail e senha são obrigatórios.' }, { status: 400 });
    }

    const platformUser = await prisma.platformUser.findUnique({
      where: { email },
    });

    if (!platformUser) {
      return NextResponse.json({ error: 'Credenciais de administrador inválidas.' }, { status: 401 });
    }

    const validPassword = await verifyPassword(password, platformUser.passwordHash);
    if (!validPassword) {
      return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });
    }

    const token = signToken({
      userId: platformUser.id,
      officeId: 'PLATFORM_SUPER_ADMIN',
      email: platformUser.email,
      role: 'OFFICE_ADMIN',
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: platformUser.id,
        name: platformUser.name,
        email: platformUser.email,
      },
    });

    response.cookies.set(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error('Erro no login do Super Admin:', error);
    return NextResponse.json({ error: 'Erro interno ao realizar login administrativo.' }, { status: 500 });
  }
}
