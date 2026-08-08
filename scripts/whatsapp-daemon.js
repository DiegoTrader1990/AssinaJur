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

function unwrapMessageContent(message) {
  let content = message || {};
  for (let depth = 0; depth < 3; depth += 1) {
    const wrapped = content.ephemeralMessage?.message
      || content.viewOnceMessage?.message
      || content.viewOnceMessageV2?.message
      || content.viewOnceMessageV2Extension?.message;
    if (!wrapped) break;
    content = wrapped;
  }
  return content;
}

function phoneFromVcard(vcard) {
  if (!vcard) return '';
  const telephoneLine = String(vcard).split(/\r?\n/).find((line) => /^TEL(?:;|:)/i.test(line));
  if (!telephoneLine) return '';
  const waid = telephoneLine.match(/(?:^|;)waid=(\d+)/i)?.[1];
  const value = telephoneLine.slice(telephoneLine.indexOf(':') + 1);
  return String(waid || value).replace(/\D/g, '');
}

function hasValidCpfCnpjCheckDigits(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if ((digits.length !== 11 && digits.length !== 14) || /^(\d)\1+$/.test(digits)) return false;
  if (digits.length === 11) {
    const calculate = (length) => {
      let sum = 0;
      for (let index = 0; index < length; index += 1) {
        sum += Number(digits[index]) * (length + 1 - index);
      }
      const remainder = (sum * 10) % 11;
      return remainder === 10 ? 0 : remainder;
    };
    return calculate(9) === Number(digits[9]) && calculate(10) === Number(digits[10]);
  }
  const calculate = (length) => {
    const weights = length === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((total, weight, index) => total + Number(digits[index]) * weight, 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  return calculate(12) === Number(digits[12]) && calculate(13) === Number(digits[13]);
}

function parseGeminiJson(text) {
  try {
    return JSON.parse(String(text || '').replace(/```json/gi, '').replace(/```/g, '').trim());
  } catch {
    return null;
  }
}

async function analyzeDocumentLocally(mediaBase64, mediaMimeType) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY;
  if (!apiKey || !mediaBase64) return null;
  const mimeType = mediaMimeType?.startsWith('image/') ? mediaMimeType : 'image/jpeg';
  const prompt = `Analise cuidadosamente este RG ou CNH brasileiro, inclusive se estiver rotacionado.
Extraia somente os dados visíveis do titular. Diferencie CPF do número do RG e não invente dígitos.
Retorne somente JSON válido com: name, cpfCnpj, rg, issuingOrgan, birthDate, nationality,
maritalStatus, profession, cep, address, number, neighborhood, city e state.`;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await customFetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ inlineData: { mimeType, data: mediaBase64 } }, { text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0 },
          }),
        }
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error(`Leitura local do documento: Gemini respondeu HTTP ${response.status} na tentativa ${attempt}.`);
        if (response.status === 429 && attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
        }
        continue;
      }
      const parsed = parseGeminiJson(payload?.candidates?.[0]?.content?.parts?.[0]?.text);
      const name = typeof parsed?.name === 'string' ? parsed.name.trim() : '';
      const cpfCnpj = String(parsed?.cpfCnpj || '').replace(/\D/g, '');
      if (name && hasValidCpfCnpjCheckDigits(cpfCnpj)) {
        return { ...parsed, name, cpfCnpj };
      }
      console.error(`Leitura local do documento incompleta na tentativa ${attempt}; tentando novamente.`);
    } catch (error) {
      console.error(`Falha na leitura local do documento na tentativa ${attempt}:`, error?.message || error);
    }
  }
  return null;
}

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
        const messageContent = unwrapMessageContent(msg.message);
        const isImage = !!messageContent.imageMessage;
        const isAudio = !!messageContent.audioMessage;
        const sharedContact = messageContent.contactMessage || messageContent.contactsArrayMessage?.contacts?.[0];
        const isContact = !!sharedContact;
        const contactPhone = phoneFromVcard(sharedContact?.vcard);
        const contactName = sharedContact?.displayName || 'contato compartilhado';

        const textMessage =
          messageContent.conversation ||
          messageContent.extendedTextMessage?.text ||
          (isContact && contactPhone ? `telefone ${contactPhone}` : '') ||
          (isContact ? `Contato ${contactName} recebido sem telefone legível` : '') ||
          (isImage ? 'Foto de documento para cadastro' : isAudio ? 'Áudio de voz enviado pelo advogado' : '');

        if (!textMessage) continue;

        console.log(`\n📩 Mensagem RECEBIDA (${resolvedFromNumber}): [${isImage ? 'FOTO' : isAudio ? 'ÁUDIO DE VOZ' : isContact ? 'CONTATO' : 'TEXTO'}] "${textMessage}"`);

        let mediaBase64 = undefined;
        let mediaMimeType = undefined;
        let documentData = undefined;

        if (isImage) {
          try {
            const buffer = await downloadMediaMessage(msg, 'buffer', {});
            mediaBase64 = buffer.toString('base64');
            mediaMimeType = messageContent.imageMessage.mimetype || 'image/jpeg';
            console.log(`📸 Foto baixada com sucesso (${buffer.length} bytes)...`);
            console.log('🔎 Analisando o documento localmente no computador...');
            documentData = await analyzeDocumentLocally(mediaBase64, mediaMimeType);
            console.log(documentData
              ? '✅ Documento identificado localmente; enviando dados validados ao AssinaJur.'
              : '⚠️ Leitura local inconclusiva; acionando a contingência do servidor.');
          } catch (errMedia) {
            console.error('Erro ao baixar mídia de imagem:', errMedia);
          }
        } else if (isAudio) {
          try {
            const buffer = await downloadMediaMessage(msg, 'buffer', {});
            mediaBase64 = buffer.toString('base64');
            mediaMimeType = messageContent.audioMessage.mimetype || 'audio/ogg; codecs=opus';
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
            mediaBase64: documentData ? undefined : mediaBase64,
            mediaMimeType,
            documentData,
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
