const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');

const AUTH_FOLDER = path.join(__dirname, '..', 'whatsapp-auth');

async function checkJid() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
    browser: ['AssinaJur Office AI', 'Chrome', '1.0.0'],
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection } = update;
    if (connection === 'open') {
      console.log('🔍 Verificando o JID correto no servidor do WhatsApp Meta...');
      
      const numWith9 = '5573988250201';
      const numWithout9 = '557388250201';

      const resWith9 = await sock.onWhatsApp(numWith9);
      const resWithout9 = await sock.onWhatsApp(numWithout9);

      console.log('📱 Resultado com o 9 extra (5573988250201):', JSON.stringify(resWith9, null, 2));
      console.log('📱 Resultado sem o 9 extra (557388250201):', JSON.stringify(resWithout9, null, 2));

      // Testar envio para o JID valido retornado pela Meta
      const validJidObj = (resWith9 && resWith9[0] && resWith9[0].exists ? resWith9[0] : (resWithout9 && resWithout9[0] && resWithout9[0].exists ? resWithout9[0] : null));

      if (validJidObj) {
        console.log(`🎯 JID REAL CONFIRMADO PELA META: ${validJidObj.jid}`);
        await sock.sendMessage(validJidObj.jid, {
          text: '🤖 *Olá, Dr. Diego!* Esta é a mensagem confirmada enviada diretamente pelo servidor do WhatsApp para o seu celular! ⚖️🚀',
        });
        console.log(`✅ Mensagem enviada com sucesso absoluto para ${validJidObj.jid}!`);
      } else {
        console.log('⚠️ Nenhum JID retornado para esses numeros.');
      }

      setTimeout(() => process.exit(0), 3000);
    }
  });
}

checkJid().catch((err) => {
  console.error('Erro na checagem de JID:', err);
  process.exit(1);
});
