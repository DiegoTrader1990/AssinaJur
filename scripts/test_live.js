const { PrismaClient } = require('@prisma/client');
const fetch = require('node-fetch');

const prisma = new PrismaClient();

async function testLive() {
  console.log('🧪 Buscando usuário do banco Supabase...');
  const user = await prisma.user.findFirst({
    include: { office: true },
  });

  if (!user) {
    console.log('Nenhum usuário encontrado.');
    return;
  }

  console.log(`👤 Usuário encontrado: ${user.name} (${user.email}) | Escritório ID: ${user.officeId}`);

  // Testar Webhook do Agente IA com comando "status"
  console.log('\n2. Chamando Webhook do Agente IA com comando "status"...');
  const resWebhook = await fetch('https://www.assinajur.com.br/api/whatsapp/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      officeId: user.officeId,
      fromNumber: '5573981351319',
      message: 'status',
      messageType: 'TEXT',
    }),
  });
  console.log('   Status HTTP Webhook:', resWebhook.status);
  const dataWebhook = await resWebhook.json();
  console.log('   Resposta da IA:', JSON.stringify(dataWebhook, null, 2));
}

testLive().finally(() => prisma.$disconnect());
