const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Redefinindo senha dos usuários do Dr. Diego para "123456"...');

  const salt = await bcrypt.genSalt(10);
  const newHash = await bcrypt.hash('123456', salt);

  const updatedUsers = await prisma.user.updateMany({
    where: {
      email: {
        in: ['diego@rodriguessoares.adv.br', 'diegocrs.adv@gmail.com'],
      },
    },
    data: {
      passwordHash: newHash,
      active: true,
    },
  });

  console.log(`✅ ${updatedUsers.count} usuário(s) atualizados com a senha "123456"!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
