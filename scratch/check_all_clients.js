const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 CONSULTANDO TODOS OS CLIENTES E ESCRITÓRIOS EM SUPABASE...');
  
  const offices = await prisma.office.findMany({
    include: {
      users: true,
      clients: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  console.log(JSON.stringify(offices, null, 2));

  const allClients = await prisma.client.findMany({
    orderBy: { createdAt: 'desc' },
  });

  console.log('\n📋 TODOS OS CLIENTES REGISTRADOS NO BANCO DE DADOS:');
  console.log(JSON.stringify(allClients, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
