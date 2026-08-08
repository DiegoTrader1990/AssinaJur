const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 PROCURANDO "JUSSIARA" EM TODO O BANCO DE DADOS SUPABASE...');

  const clients = await prisma.client.findMany({
    where: {
      OR: [
        { name: { contains: 'Jussiara', mode: 'insensitive' } },
        { name: { contains: 'Jus', mode: 'insensitive' } },
      ],
    },
    include: { office: true },
  });

  console.log('Clientes encontrados com "Jussiara":', JSON.stringify(clients, null, 2));

  const allClients = await prisma.client.findMany({
    include: { office: true },
  });

  console.log('\n📋 TODOS OS CLIENTES NO BANCO DE DADOS:');
  allClients.forEach((c) => {
    console.log(`- ID: ${c.id} | Nome: ${c.name} | OfficeId: ${c.officeId} (${c.office.name}) | CPF: ${c.cpfCnpj}`);
  });

  const allOffices = await prisma.office.findMany({
    include: { users: true },
  });

  console.log('\n🏢 TODAS AS OFFICES NO BANCO DE DADOS:');
  allOffices.forEach((o) => {
    console.log(`- Office ID: ${o.id} | Nome: ${o.name} | CNPJ: ${o.cpfCnpj}`);
    o.users.forEach((u) => {
      console.log(`   └ User: ${u.name} | Email: ${u.email} | ID: ${u.id}`);
    });
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
