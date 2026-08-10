const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const files = await prisma.storageFile.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  console.log('Recent Storage Files:', files);
}

run().catch(console.error).finally(() => prisma.$disconnect());
