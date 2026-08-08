async function main() {
  const customFetch = globalThis.fetch || (await import('node-fetch')).default;

  const LIVE_WEBHOOK_URL = 'https://www.assinajur.com.br/api/whatsapp/webhook';

  console.log('🚀 SINCRONIZANDO CLIENTES DO WHATSAPP COM O SITE AO VIVO: www.assinajur.com.br ...');

  // 1. Cadastrar Luziane no site em produção
  try {
    const resLuziane = await customFetch(LIVE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        officeId: 'd5eeac12-c73b-43e4-93f8-03d3d8fb255f',
        fromNumber: '5573988250201',
        message: 'Cadastrar cliente LUZIANE GONÇALVES CANCELA',
        messageType: 'TEXT',
      }),
    });
    console.log('Status Webhook Luziane:', resLuziane.status);
    const dataLuziane = await resLuziane.json();
    console.log('Resposta Luziane:', JSON.stringify(dataLuziane, null, 2));
  } catch (e) {
    console.error('Erro Luziane:', e);
  }

  // 2. Cadastrar Carlos Alberto no site em produção
  try {
    const resCarlos = await customFetch(LIVE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        officeId: 'd5eeac12-c73b-43e4-93f8-03d3d8fb255f',
        fromNumber: '5573988250201',
        message: 'Cadastrar cliente CARLOS ALBERTO DE MOURA BIANCHI',
        messageType: 'TEXT',
      }),
    });
    console.log('Status Webhook Carlos:', resCarlos.status);
    const dataCarlos = await resCarlos.json();
    console.log('Resposta Carlos:', JSON.stringify(dataCarlos, null, 2));
  } catch (e) {
    console.error('Erro Carlos:', e);
  }
}

main();
