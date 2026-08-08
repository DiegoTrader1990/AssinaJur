const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getRealUser() {
  const user = await prisma.user.findFirst();
  console.log('REAL_USER_ID:', user ? user.id : 'NENHUM_USUARIO');
  console.log('REAL_OFFICE_ID:', user ? user.officeId : 'NENHUM_ESCRITORIO');
  console.log('REAL_EMAIL:', user ? user.email : 'NENHUM_EMAIL');
  console.log('REAL_ROLE:', user ? user.role : 'NENHUM_ROLE');
}

getRealUser().finally(() => prisma.$disconnect());
