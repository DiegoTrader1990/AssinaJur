const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'assinajur-default-secret-key-change-in-prod';

async function testWhatsAppIntegration() {
  console.log('🧪 Iniciando Teste Completo da Integração WhatsApp & IA AssinaJur...\n');

  // Buscar primeiro usuario do banco local ou simular usuario
  const token = jwt.sign(
    { userId: 'user_demo', officeId: 'office_demo', email: 'diego@assinajur.com.br', role: 'OFFICE_ADMIN' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  // 1. Testar Rota de Status
  try {
    console.log('1. Testando Rota de Status (/api/whatsapp/status)...');
    const resStatus = await fetch('https://www.assinajur.com.br/api/whatsapp/status', {
      headers: { Cookie: `assinajur_token=${token}` },
    });
    const dataStatus = await resStatus.json();
    console.log('   Resultado Status:', dataStatus);
  } catch (err) {
    console.error('   Erro no teste de status:', err.message);
  }

  // 2. Testar Rota de QR Code (Evolution API)
  try {
    console.log('\n2. Testando Rota de QR Code (/api/whatsapp/qr)...');
    const resQr = await fetch('https://www.assinajur.com.br/api/whatsapp/qr', {
      headers: { Cookie: `assinajur_token=${token}` },
    });
    const dataQr = await resQr.json();
    console.log('   Resultado QR Code:', dataQr);
  } catch (err) {
    console.error('   Erro no teste de QR Code:', err.message);
  }

  // 3. Testar Webhook do Agente IA com Comando de Texto ("status")
  try {
    console.log('\n3. Testando Webhook do Agente IA com comando "status"...');
    const resWebhook = await fetch('https://www.assinajur.com.br/api/whatsapp/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        officeId: 'office_demo',
        fromNumber: '5573999999999',
        message: 'status',
        messageType: 'TEXT',
      }),
    });
    const dataWebhook = await resWebhook.json();
    console.log('   Resposta da IA:', dataWebhook);
  } catch (err) {
    console.error('   Erro no teste de Webhook:', err.message);
  }

  console.log('\n✅ Teste Concluído!');
}

testWhatsAppIntegration();
