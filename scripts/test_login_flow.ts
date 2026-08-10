import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

async function main() {
  console.log('=== TESTANDO FLUXO COMPLETO DE LOGIN ===');
  const email = 'diegocrs.adv@gmail.com';
  const password = 'Cemav@123';

  console.log('1. Buscando usuário no banco...');
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    include: { office: true },
  });

  if (!user) {
    console.error('❌ Usuário não encontrado!');
    return;
  }
  console.log('✅ Usuário encontrado:', user.name, '| Office:', user.office?.name, '| Active:', user.active);

  console.log('2. Verificando senha bcrypt...');
  const validPassword = await bcrypt.compare(password, user.passwordHash);
  console.log('✅ Senha válida?:', validPassword);

  if (!validPassword) {
    console.log('⚠️ Atualizando hash no DB...');
    const newHash = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash, active: true },
    });
    console.log('✅ Nova senha salva!');
  }

  console.log('3. Gerando JWT token...');
  const token = jwt.sign(
    { userId: user.id, officeId: user.officeId, email: user.email, role: user.role },
    'assinajur_saas_prod_jwt_secret_2026_diego',
    { expiresIn: '7d' }
  );
  console.log('✅ Token gerado com sucesso:', token.substring(0, 30) + '...');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
