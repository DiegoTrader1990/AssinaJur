const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const offices = await prisma.office.findMany({
    select: { id: true, name: true, letterheadFileId: true },
  });
  console.log('Offices:', offices);

  for (const off of offices) {
    if (off.letterheadFileId) {
      const sf = await prisma.storageFile.findUnique({ where: { id: off.letterheadFileId } });
      console.log('StorageFile for', off.name, ':', sf);
    }
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
