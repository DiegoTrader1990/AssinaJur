const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');

const AUTH_FOLDER = path.join(__dirname, '..', 'whatsapp-auth');

async function sendMessage() {
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
      console.log('🎉 Conectado! Enviando para o JID real da Meta (557388250201@s.whatsapp.net)...');
      
      const msgText = '🤖 *Olá, Dr. Diego!* Esta é a mensagem oficial enviada pela *Inteligência Artificial do AssinaJur* diretamente para o seu WhatsApp! ⚖️🚀\n\nEstou 100% pronta e ativa para receber seus comandos por texto, áudios de voz e fotos de RG/CNH!';
      
      const res = await sock.sendMessage('557388250201@s.whatsapp.net', { text: msgText });
      console.log('✅ Mensagem entregue no WhatsApp da Meta!', JSON.stringify(res.key, null, 2));

      setTimeout(() => process.exit(0), 2000);
    }
  });
}

sendMessage().catch((err) => {
  console.error('Erro ao enviar mensagem:', err);
  process.exit(1);
});
