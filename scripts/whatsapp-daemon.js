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

// Carrega apenas configurações locais do bot. O arquivo .env.bot nunca deve ser versionado.
for (const envFile of ['.env.bot', '.env']) {
  const envPath = path.join(__dirname, '..', envFile);
  if (!fs.existsSync(envPath)) continue;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
  }
}

// Trava de instancia unica para evitar conflito de 2 processos (Código 440 connectionReplaced)
const LOCK_FILE = path.join(__dirname, '..', 'whatsapp-daemon.lock');
if (fs.existsSync(LOCK_FILE)) {
  try {
    const pid = fs.readFileSync(LOCK_FILE, 'utf8');
    const existingPid = Number(pid.trim());
    if (Number.isInteger(existingPid) && existingPid > 0) {
      try {
        process.kill(existingPid, 0);
        console.log(`⚠️ Já existe outro processo do robô rodando (PID ${existingPid}). Encerrando duplicata para manter estabilidade.`);
        process.exit(0);
      } catch {
        // O arquivo ficou para trás após queda/reinício do Windows. Pode ser removido com segurança.
        fs.unlinkSync(LOCK_FILE);
      }
    } else {
      fs.unlinkSync(LOCK_FILE);
    }
  } catch (e) {}
}

// Salvar PID do processo atual
fs.writeFileSync(LOCK_FILE, String(process.pid));
process.on('exit', () => { try { fs.unlinkSync(LOCK_FILE); } catch (e) {} });
process.on('SIGINT', () => { try { fs.unlinkSync(LOCK_FILE); } catch (e) {} process.exit(0); });
process.on('uncaughtException', (err) => {
  console.error('Exceção não tratada:', err);
  try { fs.unlinkSync(LOCK_FILE); } catch (e) {}
  process.exit(1);
});

const customFetch = globalThis.fetch || (async (url, opts) => {
  const mod = await import('node-fetch');
  return mod.default(url, opts);
});

const ASSINAJUR_WEBHOOK_URL = process.env.ASSINAJUR_WEBHOOK_URL || 'https://www.assinajur.com.br/api/whatsapp/webhook';
const BOT_SECRET = process.env.WHATSAPP_BOT_SECRET || '';
const AUTH_FOLDER = process.env.WHATSAPP_AUTH_DIR || path.join(__dirname, '..', 'whatsapp-auth');

let socketInstance = null;
let isConnected = false;
let isConnecting = false;

async function callAssinaJur(payload) {
  const headers = { 'Content-Type': 'application/json' };
  if (BOT_SECRET) headers['x-assinajur-bot-secret'] = BOT_SECRET;
  const response = await customFetch(ASSINAJUR_WEBHOOK_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `AssinaJur respondeu HTTP ${response.status}`);
  }
  return data;
}

async function publishConnectionStatus(status, phoneNumber) {
  try {
    await callAssinaJur({
      eventType: 'STATUS',
      status,
      fromNumber: process.env.WHATSAPP_ADMIN_PHONE || phoneNumber || '5573988250201',
      phoneNumber: phoneNumber || null,
    });
  } catch (error) {
    console.error(`Não foi possível atualizar o status ${status} no site:`, error.message);
  }
}

async function connectToWhatsApp() {
  if (isConnecting) return;
  isConnecting = true;

  console.log(`\n======================================================`);
  console.log(`🚀 CONECTANDO AGENTE IA DO ASSINAJUR (24/7)...`);
  console.log(`======================================================\n`);

  if (!BOT_SECRET) {
    console.log('⚠️ WHATSAPP_BOT_SECRET não configurado. O servidor publicado recusará a conexão segura.');
  }

  await publishConnectionStatus('CONNECTING');

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
        await publishConnectionStatus('DISCONNECTED');

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
        const connectedPhone = (sock.user?.id || '').replace(/@.*$/, '').replace(/:\d+$/, '');
        await publishConnectionStatus('CONNECTED', connectedPhone);
      }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      for (const msg of messages) {
        if (!msg.message) continue;

        // IMPORTANTE: Ignorar mensagens enviadas pelo próprio robô (fromMe = true) para evitar loop infinito
        if (msg.key.fromMe) continue;

        const rawJid = msg.key.remoteJid || '';
        if (rawJid.endsWith('@g.us') || rawJid === 'status@broadcast' || rawJid.endsWith('@newsletter')) continue;
        const fromNumber = rawJid.replace(/@.*$/, '');
        const alternateJid = msg.key.remoteJidAlt || msg.key.participantAlt || '';
        const resolvedFromNumber = alternateJid.endsWith('@s.whatsapp.net')
          ? alternateJid.replace(/@.*$/, '')
          : fromNumber;
        const isImage = !!msg.message.imageMessage;
        const isAudio = !!msg.message.audioMessage;
        
        const textMessage = 
          msg.message.conversation || 
          msg.message.extendedTextMessage?.text || 
          (isImage ? 'Foto de documento para cadastro' : isAudio ? 'Áudio de voz enviado pelo advogado' : '');

        if (!textMessage) continue;

        console.log(`\n📩 Mensagem RECEBIDA (${resolvedFromNumber}): [${isImage ? 'FOTO' : isAudio ? 'ÁUDIO DE VOZ' : 'TEXTO'}] "${textMessage}"`);

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
          const data = await callAssinaJur({
            fromNumber: resolvedFromNumber,
            message: textMessage,
            messageType: isImage ? 'IMAGE' : isAudio ? 'AUDIO' : 'TEXT',
            mediaBase64,
            mediaMimeType,
          });
          if (data.reply) {
            console.log(`💬 Resposta enviada ao WhatsApp: "${data.reply}"`);
            await sock.sendMessage(rawJid, { text: data.reply });
            console.log('✅ Mensagem entregue com sucesso!');
          }

          for (const outbound of data.outboundMessages || []) {
            const cleanTo = String(outbound.to || '').replace(/\D/g, '');
            if (!cleanTo || !outbound.text) continue;
            const candidates = [cleanTo];
            if (cleanTo.startsWith('55') && cleanTo.length === 13) {
              candidates.push(`${cleanTo.slice(0, 4)}${cleanTo.slice(5)}`);
            }
            const [jidResult] = await sock.onWhatsApp(...candidates);
            const destinationJid = jidResult?.jid || `${cleanTo}@s.whatsapp.net`;
            await sock.sendMessage(destinationJid, { text: outbound.text });
            console.log(`📤 Ação externa entregue para ${cleanTo}.`);
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

// Heartbeat: permite que o painel diferencie conexão real de um status antigo no banco.
setInterval(() => {
  if (!isConnected) return;
  const connectedPhone = (socketInstance?.user?.id || '').replace(/@.*$/, '').replace(/:\d+$/, '');
  publishConnectionStatus('CONNECTED', connectedPhone);
}, 60_000);
