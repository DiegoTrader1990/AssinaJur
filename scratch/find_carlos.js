const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Procurando Carlos Alberto de Moura Bianchi no banco de dados...');

  const found = await prisma.client.findMany({
    where: {
      OR: [
        { name: { contains: 'Carlos', mode: 'insensitive' } },
        { cpfCnpj: { contains: '75086069734' } },
      ],
    },
  });

  console.log('Resultados encontrados:', JSON.stringify(found, null, 2));

  // Garantir que CARLOS ALBERTO DE MOURA BIANCHI esta criado no escritorio real d5eeac12-c73b-43e4-93f8-03d3d8fb255f
  const carlos = await prisma.client.upsert({
    where: {
      officeId_cpfCnpj: {
        officeId: 'd5eeac12-c73b-43e4-93f8-03d3d8fb255f',
        cpfCnpj: '75086069734',
      },
    },
    update: {
      name: 'CARLOS ALBERTO DE MOURA BIANCHI',
      rg: '56034D CREA RJ',
      city: 'SAO PAULO',
      state: 'SP',
    },
    create: {
      officeId: 'd5eeac12-c73b-43e4-93f8-03d3d8fb255f',
      name: 'CARLOS ALBERTO DE MOURA BIANCHI',
      cpfCnpj: '75086069734',
      rg: '56034D CREA RJ',
      phone: '5573988250201',
      whatsapp: '5573988250201',
      city: 'SAO PAULO',
      state: 'SP',
    },
  });

  console.log('\n✅ CARLOS ALBERTO VINCULADO AO ESCRITÓRIO REAL:', carlos);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
