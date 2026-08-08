const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const REAL_OFFICE_ID = 'd5eeac12-c73b-43e4-93f8-03d3d8fb255f';

  const clients = await prisma.client.findMany({
    where: {
      officeId: REAL_OFFICE_ID,
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log('📊 TOTAL DE CLIENTES NO ESCRITÓRIO DO DR. DIEGO:', clients.length);
  clients.forEach((c, i) => {
    console.log(`${i + 1}. ${c.name} - CPF: ${c.cpfCnpj} - RG: ${c.rg || 'N/A'} - Criado em: ${c.createdAt}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
