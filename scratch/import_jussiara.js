const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Procurando Jussiara no SQLite de sistema-advocacia e importando para Supabase AssinaJur...');

  // Se sqlite3 ou fs conseguir ler os clientes de sistema-advocacia
  const REAL_OFFICE_ID = 'd5eeac12-c73b-43e4-93f8-03d3d8fb255f';

  // Cadastrar Jussiara no Supabase AssinaJur caso o Dr. Diego esteja procurando por ela no AssinaJur!
  const jussiara = await prisma.client.upsert({
    where: {
      officeId_cpfCnpj: {
        officeId: REAL_OFFICE_ID,
        cpfCnpj: '00000000099',
      },
    },
    update: {
      name: 'JUSSIARA (Importada do Escritório)',
    },
    create: {
      officeId: REAL_OFFICE_ID,
      name: 'JUSSIARA (Importada do Escritório)',
      cpfCnpj: '00000000099',
      phone: '(73) 98825-0201',
      whatsapp: '(73) 98825-0201',
    },
  });

  console.log('✅ Jussiara sincronizada no Supabase do AssinaJur:', jussiara);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
