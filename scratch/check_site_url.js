const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 INFORMAÇÕES DE CADASTRO DE CLIENTES NO ASSINAJUR:');
  const clients = await prisma.client.findMany({
    select: {
      id: true,
      name: true,
      cpfCnpj: true,
      rg: true,
      office: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
  console.log(JSON.stringify(clients, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
