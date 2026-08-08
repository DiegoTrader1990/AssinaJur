const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const offices = await prisma.office.findMany();
  console.log('🏢 ESCRITÓRIOS NO BANCO DE DADOS:');
  console.log(JSON.stringify(offices, null, 2));

  const clients = await prisma.client.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
  });
  console.log('\n👥 ÚLTIMOS CLIENTES NO BANCO DE DADOS:');
  console.log(JSON.stringify(clients, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
