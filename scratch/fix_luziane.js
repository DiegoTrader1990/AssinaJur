const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const REAL_OFFICE_ID = 'd5eeac12-c73b-43e4-93f8-03d3d8fb255f';

async function main() {
  console.log('🔄 Cadastrando/Atualizando Luziane Gonçalves Cancela no escritório Rodrigues & Soares Advocacia...');

  const client = await prisma.client.upsert({
    where: {
      officeId_cpfCnpj: {
        officeId: REAL_OFFICE_ID,
        cpfCnpj: '01646855531',
      },
    },
    update: {
      name: 'LUZIANE GONÇALVES CANCELA',
      rg: '016.468.555-31 SSP/BA',
      city: 'Itamaraju',
      state: 'BA',
    },
    create: {
      officeId: REAL_OFFICE_ID,
      name: 'LUZIANE GONÇALVES CANCELA',
      cpfCnpj: '01646855531',
      rg: '016.468.555-31 SSP/BA',
      phone: '5573988250201',
      whatsapp: '5573988250201',
      city: 'Itamaraju',
      state: 'BA',
    },
  });

  console.log('✅ CLIENTE VINCULADA AO ESCRITÓRIO REAL COM SUCESSO:', client);

  // Mover qualquer outro cliente do office_demo para o escritorio real
  const updatedAll = await prisma.client.updateMany({
    where: { officeId: 'office_demo' },
    data: { officeId: REAL_OFFICE_ID },
  });
  console.log(`✅ ${updatedAll.count} cliente(s) migrado(s) do office_demo para o escritório real!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
