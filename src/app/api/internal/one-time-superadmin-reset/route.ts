import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

// Rota temporária, protegida por segredo de uso único e removida logo após a
// recuperação do acesso solicitada pelo proprietário do sistema.
const RESET_TOKEN = '5a2e4c6938f44a078d91a1f0e7c9bd26';
const EXPIRES_AT = new Date('2026-08-18T00:00:00-03:00').getTime();
const SUPERADMIN_EMAIL = 'diegocrs.adv@gmail.com';
const NEW_PASSWORD = 'Cemav@123';

export async function POST(request: Request) {
  if (Date.now() > EXPIRES_AT) {
    return NextResponse.json({ error: 'Solicitação expirada.' }, { status: 410 });
  }

  const token = request.headers.get('x-assinajur-reset-token') || '';
  const expected = Buffer.from(RESET_TOKEN);
  const received = Buffer.from(token);
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const passwordHash = await bcrypt.hash(NEW_PASSWORD, 10);
  await prisma.platformUser.upsert({
    where: { email: SUPERADMIN_EMAIL },
    update: { passwordHash },
    create: {
      name: 'Diego - Super Admin AssinaJur',
      email: SUPERADMIN_EMAIL,
      passwordHash,
    },
  });
  return NextResponse.json({ success: true });
}
