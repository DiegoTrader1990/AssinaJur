/**
 * AssinaJur WhatsApp Gateway Daemon (Conector de Alta Estabilidade 24/7)
 * 
 * Este conector roda de forma silenciosa e continua no computador do escritorio,
 * mantendo a sessao do WhatsApp Web 100% estavel, exatamente como o WhatsApp Web Desktop!
 * 
 * Uso: node scripts/whatsapp-daemon.js
 */

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadMediaMessage } = require('@whiskeysockets/baileys');
const qrcodeTerminal = require('qrcode-terminal');
const qrcode = require('qrcode');
const pino = require('pino');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const ASSINAJUR_WEBHOOK_URL = process.env.ASSINAJUR_WEBHOOK_URL || 'https://www.assinajur.com.br/api/whatsapp/webhook';
const AUTH_FOLDER = process.env.WHATSAPP_AUTH_DIR || path.join(__dirname, '..', 'whatsapp-auth');

if (!fs.existsSync(AUTH_FOLDER)) {
  fs.mkdirSync(AUTH_FOLDER, { recursive: true });
}

let socketInstance = null;
let isConnected = false;
let qrOpened = false;

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);

  const isAlreadyLoggedIn = !!(state && state.creds && state.creds.me);
  if (isAlreadyLoggedIn) {
    console.log('✅ Credenciais salvas encontradas! Reconectando de forma silenciosa...');
  }

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
    browser: ['AssinaJur Office AI', 'Chrome', '1.0.0'],
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 25000,
  });

  socketInstance = sock;

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr && !isConnected && !isAlreadyLoggedIn && !qrOpened) {
      qrOpened = true;
      console.log('\n======================================================');
      console.log('📲 QR CODE DEDICADO 24/7 GERADO COM SUCESSO!');
      console.log('APONTE A CÂMERA DO CELULAR PARA PAREAR O ESCRITÓRIO:');
      console.log('======================================================\n');

      qrcodeTerminal.generate(qr, { small: true });

      try {
        const qrDataUrl = await qrcode.toDataURL(qr, { width: 350 });
        const htmlContent = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>Pareamento WhatsApp AssinaJur</title>
              <style>
                body { font-family: Arial, sans-serif; background: #075E54; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                .card { background: white; color: #333; padding: 30px; border-radius: 20px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.3); }
                img { width: 300px; height: 300px; }
                h2 { color: #075E54; margin-bottom: 10px; }
                p { color: #666; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="card">
                <h2>🟢 PAREAR WHATSAPP ASSINAJUR</h2>
                <p>1. Abra o WhatsApp no celular &rarr; Aparelhos Conectados</p>
                <p>2. Aponte a câmera para o QR Code abaixo:</p>
                <img src="${qrDataUrl}" alt="QR Code WhatsApp">
              </div>
            </body>
          </html>
        `;
        const htmlPath = path.join(__dirname, '..', 'qrcode-pareamento.html');
        fs.writeFileSync(htmlPath, htmlContent);
        exec(`start "" "${htmlPath}"`);
      } catch (errHtml) {
        console.error('Erro ao abrir QR Code no navegador:', errHtml);
      }
    }

    if (connection === 'close') {
      isConnected = false;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const isLoggedOut = statusCode === DisconnectReason.loggedOut;
      
      console.log(`ℹ️ Reconexão de rotina (Código ${statusCode || '515'}). Reconectando silenciosamente...`);

      if (isLoggedOut) {
        console.log('❌ Sessão deslogada pelo usuário. Limpando chaves...');
        fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
        qrOpened = false;
        setTimeout(connectToWhatsApp, 3000);
      } else {
        setTimeout(connectToWhatsApp, 2000);
      }
    } else if (connection === 'open') {
      isConnected = true;
      qrOpened = false;
      console.log('\n======================================================');
      console.log('🎉 WHATSAPP CONECTADO COM SUCESSO E ESTÁVEL NO ASSINAJUR!');
      console.log('O robô de IA do Dr. (73) 98825-0201 está ativo 24h/dia para texto, notas de VOZ e fotos de RG!');
      console.log('======================================================\n');
    }
  });

  // Ouvir mensagens recebidas no WhatsApp e enviar para a IA do AssinaJur
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      const fromNumber = msg.key.remoteJid.replace('@s.whatsapp.net', '');
      const isImage = !!msg.message.imageMessage;
      const isAudio = !!msg.message.audioMessage;
      const textMessage = msg.message.conversation || msg.message.extendedTextMessage?.text || (isImage ? 'Foto de documento para cadastro' : isAudio ? 'Áudio de voz enviado pelo advogado' : '');

      console.log(`📩 Mensagem recebida de ${fromNumber}: [${isImage ? 'FOTO' : isAudio ? 'ÁUDIO DE VOZ' : 'TEXTO'}] "${textMessage}"`);

      let mediaBase64 = undefined;
      let mediaMimeType = undefined;

      if (isImage) {
        try {
          const buffer = await downloadMediaMessage(msg, 'buffer', {});
          mediaBase64 = buffer.toString('base64');
          mediaMimeType = msg.message.imageMessage.mimetype || 'image/jpeg';
          console.log(`📸 Foto baixada com sucesso (${buffer.length} bytes). Enviando para Gemini Vision OCR...`);
        } catch (errMedia) {
          console.error('Erro ao baixar mídia de imagem:', errMedia);
        }
      } else if (isAudio) {
        try {
          const buffer = await downloadMediaMessage(msg, 'buffer', {});
          mediaBase64 = buffer.toString('base64');
          mediaMimeType = msg.message.audioMessage.mimetype || 'audio/ogg; codecs=opus';
          console.log(`🎙️ Áudio de voz baixado com sucesso (${buffer.length} bytes). Enviando para transcrição e Gemini Audio...`);
        } catch (errAudio) {
          console.error('Erro ao baixar mídia de áudio:', errAudio);
        }
      }

      try {
        const response = await fetch(ASSINAJUR_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            officeId: 'office_demo',
            fromNumber,
            message: textMessage,
            messageType: isImage ? 'IMAGE' : isAudio ? 'AUDIO' : 'TEXT',
            mediaBase64,
            mediaMimeType,
          }),
        });

        const data = await response.json();
        if (data.reply) {
          console.log(`🤖 Resposta enviada ao Dr. no WhatsApp: "${data.reply}"`);
          await sock.sendMessage(msg.key.remoteJid, { text: data.reply });
        }
      } catch (err) {
        console.error('Erro ao enviar mensagem para a IA do AssinaJur:', err);
      }
    }
  });
}

connectToWhatsApp();
