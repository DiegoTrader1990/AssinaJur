import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, signToken, TOKEN_COOKIE_NAME, UserRole } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      officeName,
      cpfCnpj,
      oabNumber,
      phone,
      adminName,
      adminEmail,
      adminPassword,
    } = body;

    if (!officeName || !cpfCnpj || !phone || !adminName || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: 'Por favor, preencha todos os campos obrigatórios.' },
        { status: 400 }
      );
    }

    // Verificar se e-mail de usuário já está em uso
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'O e-mail informado já está cadastrado no sistema.' },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(adminPassword);

    // Criar escritório e usuário administrador em transação
    const result = await prisma.$transaction(async (tx) => {
      const office = await tx.office.create({
        data: {
          name: officeName,
          cpfCnpj,
          oabNumber: oabNumber || null,
          phone,
          email: adminEmail,
          primaryColor: '#0B1D3D',
          secondaryColor: '#D4AF37',
        },
      });

      const user = await tx.user.create({
        data: {
          officeId: office.id,
          name: adminName,
          email: adminEmail,
          passwordHash,
          role: 'OFFICE_ADMIN',
          oabNumber: oabNumber || null,
          phone,
        },
      });

      return { office, user };
    });

    await logAuditEvent({
      officeId: result.office.id,
      userId: result.user.id,
      eventType: 'OFFICE_REGISTERED',
      description: `Escritório ${result.office.name} cadastrado com sucesso.`,
    });

    const token = signToken({
      userId: result.user.id,
      officeId: result.office.id,
      email: result.user.email,
      role: result.user.role as UserRole,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Escritório cadastrado com sucesso!',
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        officeName: result.office.name,
      },
    });

    response.cookies.set(TOKEN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 dias
    });

    return response;
  } catch (error: any) {
    console.error('Erro no registro do escritório:', error);
    return NextResponse.json(
      { error: 'Erro interno ao cadastrar escritório: ' + (error?.message || '') },
      { status: 500 }
    );
  }
}
