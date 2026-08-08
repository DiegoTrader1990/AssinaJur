const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 TODOS OS USUÁRIOS E SEUS RESPECTIVOS ESCRITÓRIOS:');
  const users = await prisma.user.findMany({
    include: { office: true },
  });
  console.log(JSON.stringify(users, null, 2));

  console.log('\n🔍 TODOS OS CLIENTES E SEUS ESCRITÓRIOS:');
  const clients = await prisma.client.findMany({
    include: { office: true },
  });
  console.log(JSON.stringify(clients, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
