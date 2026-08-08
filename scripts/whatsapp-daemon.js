/**
 * AssinaJur WhatsApp Gateway Daemon (Conector 24/7 de Alta Estabilidade)
 * 
 * Uso: node scripts/whatsapp-daemon.js
 */

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadMediaMessage } = require('@whiskeysockets/baileys');
const qrcodeTerminal = require('qrcode-terminal');
const qrcode = require('qrcode');
const pino = require('pino');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

// Trava de instancia unica para evitar conflito de 2 processos (Código 440 connectionReplaced)
const LOCK_FILE = path.join(__dirname, '..', 'whatsapp-daemon.lock');
if (fs.existsSync(LOCK_FILE)) {
  try {
    const pid = fs.readFileSync(LOCK_FILE, 'utf8');
    if (pid && pid.trim()) {
      console.log(`⚠️ Já existe outro processo do robô rodando (PID ${pid.trim()}). Encerrando duplicata para manter estabilidade.`);
      process.exit(0);
    }
  } catch (e) {}
}

// Salvar PID do processo atual
fs.writeFileSync(LOCK_FILE, String(process.pid));
process.on('exit', () => { try { fs.unlinkSync(LOCK_FILE); } catch (e) {} });
process.on('SIGINT', () => { try { fs.unlinkSync(LOCK_FILE); } catch (e) {} process.exit(0); });
process.on('uncaughtException', (err) => { console.error('Exceção não tratada:', err); });

const customFetch = globalThis.fetch || (async (url, opts) => {
  const mod = await import('node-fetch');
  return mod.default(url, opts);
});

const ASSINAJUR_WEBHOOK_URL = process.env.ASSINAJUR_WEBHOOK_URL || 'https://www.assinajur.com.br/api/whatsapp/webhook';
const AUTH_FOLDER = process.env.WHATSAPP_AUTH_DIR || path.join(__dirname, '..', 'whatsapp-auth');

let socketInstance = null;
let isConnected = false;
let isConnecting = false;

async function connectToWhatsApp() {
  if (isConnecting) return;
  isConnecting = true;

  console.log(`\n======================================================`);
  console.log(`🚀 CONECTANDO AGENTE IA DO ASSINAJUR (24/7)...`);
  console.log(`======================================================\n`);

  try {
    if (!fs.existsSync(AUTH_FOLDER)) {
      fs.mkdirSync(AUTH_FOLDER, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      browser: ['AssinaJur Office AI', 'Chrome', '1.0.0'],
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 25000,
      retryRequestOptions: {
        maxRetries: 5,
        delayMs: 3000,
      },
    });

    socketInstance = sock;

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr && !isConnected) {
        console.log('\n📲 QR CODE PRONTO! APONTE A CÂMERA DO CELULAR PARA PAREAR:');
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
        } catch (e) {}
      }

      if (connection === 'close') {
        isConnected = false;
        isConnecting = false;
        const statusCode = lastDisconnect?.error?.output?.statusCode;

        if (statusCode === DisconnectReason.loggedOut) {
          console.log('❌ Sessão deslogada pelo usuário no celular. Gerando nova chave...');
          try { fs.rmSync(AUTH_FOLDER, { recursive: true, force: true }); } catch (e) {}
          setTimeout(connectToWhatsApp, 3000);
        } else {
          console.log(`ℹ️ Reconexão de rotina (Código ${statusCode || 'WebSocket'}). Aguardando 10s...`);
          setTimeout(connectToWhatsApp, 10000);
        }
      } else if (connection === 'open') {
        isConnected = true;
        isConnecting = false;
        console.log('\n======================================================');
        console.log('🎉 WHATSAPP 100% CONECTADO E PRONTO PARA USO!');
        console.log('O robô está ouvindo mensagens, áudios e fotos de RG/CNH!');
        console.log('======================================================\n');
      }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      for (const msg of messages) {
        if (!msg.message) continue;

        // IMPORTANTE: Ignorar mensagens enviadas pelo próprio robô (fromMe = true) para evitar loop infinito
        if (msg.key.fromMe) continue;

        const rawJid = msg.key.remoteJid || '';
        const fromNumber = rawJid.replace(/@.*$/, '');
        const isImage = !!msg.message.imageMessage;
        const isAudio = !!msg.message.audioMessage;
        
        const textMessage = 
          msg.message.conversation || 
          msg.message.extendedTextMessage?.text || 
          (isImage ? 'Foto de documento para cadastro' : isAudio ? 'Áudio de voz enviado pelo advogado' : '');

        if (!textMessage) continue;

        console.log(`\n📩 Mensagem RECEBIDA de cliente/advogado (${fromNumber}): [${isImage ? 'FOTO' : isAudio ? 'ÁUDIO DE VOZ' : 'TEXTO'}] "${textMessage}"`);

        let mediaBase64 = undefined;
        let mediaMimeType = undefined;

        if (isImage) {
          try {
            const buffer = await downloadMediaMessage(msg, 'buffer', {});
            mediaBase64 = buffer.toString('base64');
            mediaMimeType = msg.message.imageMessage.mimetype || 'image/jpeg';
            console.log(`📸 Foto baixada com sucesso (${buffer.length} bytes)...`);
          } catch (errMedia) {
            console.error('Erro ao baixar mídia de imagem:', errMedia);
          }
        } else if (isAudio) {
          try {
            const buffer = await downloadMediaMessage(msg, 'buffer', {});
            mediaBase64 = buffer.toString('base64');
            mediaMimeType = msg.message.audioMessage.mimetype || 'audio/ogg; codecs=opus';
            console.log(`🎙️ Áudio de voz baixado com sucesso (${buffer.length} bytes)...`);
          } catch (errAudio) {
            console.error('Erro ao baixar mídia de áudio:', errAudio);
          }
        }

        try {
          console.log('🤖 Processando com a Inteligência IA do AssinaJur...');
          const response = await customFetch(ASSINAJUR_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              officeId: 'd5eeac12-c73b-43e4-93f8-03d3d8fb255f',
              fromNumber: fromNumber || '5573988250201',
              message: textMessage,
              messageType: isImage ? 'IMAGE' : isAudio ? 'AUDIO' : 'TEXT',
              mediaBase64,
              mediaMimeType,
            }),
          });

          const data = await response.json();
          if (data.reply) {
            console.log(`💬 Resposta enviada ao WhatsApp: "${data.reply}"`);
            await sock.sendMessage(rawJid, { text: data.reply });
            console.log('✅ Mensagem entregue com sucesso!');
          }
        } catch (err) {
          console.error('Erro ao enviar requisição para a IA do AssinaJur:', err);
        }
      }
    });
  } catch (errConnect) {
    isConnecting = false;
    console.error('Erro na inicialização do socket:', errConnect);
  }
}

connectToWhatsApp();
