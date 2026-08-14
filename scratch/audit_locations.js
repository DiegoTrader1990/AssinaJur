const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectClientLocations() {
  const clients = await prisma.client.findMany({
    select: {
      id: true,
      name: true,
      city: true,
      state: true,
      address: true,
      cep: true,
      legalArea: true,
      processes: { select: { id: true } },
      documents: { select: { id: true } },
    },
  });

  console.log(`Total Clients in DB: ${clients.length}`);
  clients.forEach((c) => {
    console.log(`- [${c.id}] ${c.name} | City: "${c.city}" | State: "${c.state}" | CEP: "${c.cep}" | Address: "${c.address}" | Processes: ${c.processes.length} | Docs: ${c.documents.length}`);
  });

  await prisma.$disconnect();
}

inspectClientLocations().catch((err) => {
  console.error(err);
  prisma.$disconnect();
});
