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

let socketInstance = null;
let isConnected = false;
let isConnecting = false;
let conflictCount = 0;

async function connectToWhatsApp() {
  if (isConnecting) return;
  isConnecting = true;

  console.log(`\n======================================================`);
  console.log(`🚀 INICIANDO CONECTOR DEDICADO ASSINAJUR IA (24/7)...`);
  console.log(`======================================================\n`);

  try {
    if (!fs.existsSync(AUTH_FOLDER)) {
      fs.mkdirSync(AUTH_FOLDER, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
    const isAlreadyLoggedIn = !!(state && state.creds && state.creds.me);

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

      if (qr && !isConnected) {
        console.log('\n📲 NOVO QR CODE LIMPO GERADO! APONTE A CÂMERA DO CELULAR PARA ESTABILIZAR:');
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
                  <h2>🟢 PAREAR WHATSAPP ASSINAJUR (SESSÃO LIMPA)</h2>
                  <p>1. Abra o WhatsApp no celular &rarr; Aparelhos Conectados</p>
                  <p>2. Aponte a câmera para o QR Code abaixo para estabilizar 100%:</p>
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

        if (statusCode === 440 || statusCode === 428) {
          conflictCount++;
          console.log(`⚠️ Conflito de sessão residual (Código ${statusCode}). Tentativa ${conflictCount}/2...`);
        }

        // Se houver conflito persistente ou deslogamento, resetar chaves velhas para conexao limpa
        if (statusCode === DisconnectReason.loggedOut || conflictCount >= 2) {
          console.log('🧹 Limpando chaves antigas para garantir sessão 100% estável e sem loops...');
          conflictCount = 0;
          try {
            fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
          } catch (eRm) {}
          setTimeout(connectToWhatsApp, 2000);
        } else {
          setTimeout(connectToWhatsApp, 3000);
        }
      } else if (connection === 'open') {
        isConnected = true;
        isConnecting = false;
        conflictCount = 0;
        console.log('\n======================================================');
        console.log('🎉 WHATSAPP 100% CONECTADO E ESTÁVEL NO ASSINAJUR!');
        console.log('O robô de IA está ativo ouvindo suas mensagens, áudios e fotos!');
        console.log('======================================================\n');
      }
    });

    // Ouvir mensagens recebidas no WhatsApp
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const msg of messages) {
        if (!msg.message) continue;

        const rawJid = msg.key.remoteJid || '';
        const fromNumber = rawJid.replace(/@.*$/, '');
        const isImage = !!msg.message.imageMessage;
        const isAudio = !!msg.message.audioMessage;
        
        const textMessage = 
          msg.message.conversation || 
          msg.message.extendedTextMessage?.text || 
          (isImage ? 'Foto de documento para cadastro' : isAudio ? 'Áudio de voz enviado' : '');

        // Evitar que o bot responda as proprias respostas (loop)
        if (
          textMessage.startsWith('🤖') || 
          textMessage.startsWith('✅') || 
          textMessage.startsWith('📌') || 
          textMessage.startsWith('🎙️')
        ) {
          continue;
        }

        console.log(`\n📩 Mensagem detectada no WhatsApp (${fromNumber}): [${isImage ? 'FOTO' : isAudio ? 'ÁUDIO' : 'TEXTO'}] "${textMessage}"`);

        let mediaBase64 = undefined;
        let mediaMimeType = undefined;

        if (isImage) {
          try {
            const buffer = await downloadMediaMessage(msg, 'buffer', {});
            mediaBase64 = buffer.toString('base64');
            mediaMimeType = msg.message.imageMessage.mimetype || 'image/jpeg';
            console.log(`📸 Processando foto (${buffer.length} bytes)...`);
          } catch (errMedia) {
            console.error('Erro ao baixar mídia de imagem:', errMedia);
          }
        } else if (isAudio) {
          try {
            const buffer = await downloadMediaMessage(msg, 'buffer', {});
            mediaBase64 = buffer.toString('base64');
            mediaMimeType = msg.message.audioMessage.mimetype || 'audio/ogg; codecs=opus';
            console.log(`🎙️ Processando áudio (${buffer.length} bytes)...`);
          } catch (errAudio) {
            console.error('Erro ao baixar mídia de áudio:', errAudio);
          }
        }

        try {
          console.log('🤖 Enviando para a Inteligência IA do AssinaJur...');
          const response = await fetch(ASSINAJUR_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              officeId: 'office_demo',
              fromNumber: '5573988250201',
              message: textMessage,
              messageType: isImage ? 'IMAGE' : isAudio ? 'AUDIO' : 'TEXT',
              mediaBase64,
              mediaMimeType,
            }),
          });

          const data = await response.json();
          if (data.reply) {
            console.log(`💬 Resposta da IA: "${data.reply}"`);
            await sock.sendMessage(rawJid, { text: data.reply });
            console.log('✅ Resposta enviada com sucesso no WhatsApp!');
          }
        } catch (err) {
          console.error('Erro ao enviar para a IA do AssinaJur:', err);
        }
      }
    });
  } catch (errConnect) {
    isConnecting = false;
    console.error('Erro na inicialização do socket:', errConnect);
  }
}

connectToWhatsApp();
