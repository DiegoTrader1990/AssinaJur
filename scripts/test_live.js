const { PrismaClient } = require('@prisma/client');
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'assinajur_saas_prod_jwt_secret_2026_diego';

async function testLive() {
  console.log('🧪 Buscando usuário do banco Supabase...');
  const user = await prisma.user.findFirst({
    include: { office: true },
  });

  if (!user) {
    console.log('Nenhum usuário encontrado.');
    return;
  }

  console.log(`👤 Usuário encontrado: ${user.name} (${user.email}) | Escritório: ${user.office.name} (ID: ${user.officeId})`);

  const token = jwt.sign(
    { userId: user.id, officeId: user.officeId, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  // 1. Testar Rota /api/whatsapp/status
  console.log('\n1. Chamando /api/whatsapp/status ao vivo...');
  const resStatus = await fetch('https://www.assinajur.com.br/api/whatsapp/status', {
    headers: { Cookie: `assinajur_token=${token}` },
  });
  console.log('   Status HTTP:', resStatus.status);
  const dataStatus = await resStatus.json();
  console.log('   Retorno Status:', dataStatus);

  // 2. Testar Webhook do Agente IA com comando "status"
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
  console.log('   Resposta da IA:', dataWebhook);
}

testLive().finally(() => prisma.$disconnect());
