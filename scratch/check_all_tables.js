const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- TODAS AS OFFICES ---');
  console.log(await prisma.office.findMany());

  console.log('--- TODOS OS USERS ---');
  console.log(await prisma.user.findMany());

  console.log('--- TODOS OS CLIENTES ---');
  console.log(await prisma.client.findMany());
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
