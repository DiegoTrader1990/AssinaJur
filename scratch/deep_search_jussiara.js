const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 DEEP SEARCH FOR JUSSIARA IN ALL SUPABASE TABLES...');

  const clients = await prisma.client.findMany();
  console.log('--- ALL CLIENTS IN SUPABASE ---');
  console.log(JSON.stringify(clients, null, 2));

  const users = await prisma.user.findMany();
  console.log('--- ALL USERS IN SUPABASE ---');
  console.log(JSON.stringify(users, null, 2));

  const offices = await prisma.office.findMany();
  console.log('--- ALL OFFICES IN SUPABASE ---');
  console.log(JSON.stringify(offices, null, 2));

  const docs = await prisma.document.findMany();
  console.log('--- ALL DOCUMENTS IN SUPABASE ---');
  console.log(JSON.stringify(docs, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
