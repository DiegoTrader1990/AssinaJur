/**
 * AssinaJur WhatsApp Gateway Daemon (Conector de Alta Estabilidade 24/7)
 * 
 * Este conector roda como um servico dedicado Node.js (no computador do escritorio ou VPS),
 * mantendo a sessao do WhatsApp Web 100% estavel, exatamente como o WhatsApp Web Desktop!
 * 
 * Uso: node scripts/whatsapp-daemon.js
 */

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

const ASSINAJUR_WEBHOOK_URL = process.env.ASSINAJUR_WEBHOOK_URL || 'https://www.assinajur.com.br/api/whatsapp/webhook';
const AUTH_FOLDER = path.join(__dirname, '..', 'whatsapp-auth');

if (!fs.existsSync(AUTH_FOLDER)) {
  fs.mkdirSync(AUTH_FOLDER, { recursive: true });
}

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    logger: pino({ level: 'silent' }),
    browser: ['AssinaJur Desktop', 'Chrome', '1.0.0'],
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n======================================================');
      console.log('📲 QR CODE GERADO COM SUCESSO! APONTE A CÂMERA DO CELULAR:');
      console.log('======================================================\n');
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut);
      console.log('Conexão fechada. Reconectando:', shouldReconnect);
      if (shouldReconnect) {
        setTimeout(connectToWhatsApp, 5000);
      }
    } else if (connection === 'open') {
      console.log('\n🎉 WHATSAPP CONECTADO COM SUCESSO AO ASSINAJUR!');
      console.log('O robô de IA agora está ativo 24h por dia recebendo fotos de RG e comandos!\n');
    }
  });

  // Ouvir mensagens recebidas no WhatsApp e enviar para a IA do AssinaJur
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      const fromNumber = msg.key.remoteJid.replace('@s.whatsapp.net', '');
      const textMessage = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

      console.log(`📩 Mensagem recebida de ${fromNumber}: "${textMessage}"`);

      try {
        // Enviar para o Webhook da IA do AssinaJur
        const response = await fetch(ASSINAJUR_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            officeId: 'office_demo',
            fromNumber,
            message: textMessage,
            messageType: 'TEXT',
          }),
        });

        const data = await response.json();
        if (data.reply) {
          console.log(`🤖 Resposta da IA do AssinaJur: "${data.reply}"`);
          await sock.sendMessage(msg.key.remoteJid, { text: data.reply });
        }
      } catch (err) {
        console.error('Erro ao enviar mensagem para o AssinaJur:', err);
      }
    }
  });
}

connectToWhatsApp();
