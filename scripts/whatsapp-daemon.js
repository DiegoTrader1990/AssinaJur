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
const sharp = require('sharp');

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
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const BOT_VERSION = '2026.08.09.2';
const DAEMON_STARTED_AT = new Date().toISOString();

let socketInstance = null;
let isConnected = false;
let isConnecting = false;
const conversationHistories = new Map();
let activeDocumentDiagnostic = null;

function recordDocumentDiagnostic(event, details = {}) {
  if (activeDocumentDiagnostic) {
    activeDocumentDiagnostic.events.push({ event, at: new Date().toISOString(), ...details });
  }
  try {
    const diagnosticFolder = path.join(process.env.LOCALAPPDATA || path.join(__dirname, '..'), 'AssinaJur');
    fs.mkdirSync(diagnosticFolder, { recursive: true });
    fs.appendFileSync(
      path.join(diagnosticFolder, 'whatsapp-document-diagnostics.log'),
      `${JSON.stringify({ at: new Date().toISOString(), event, ...details })}\n`,
      'utf8'
    );
  } catch {}
}

function conversationKey(fromNumber) {
  const digits = String(fromNumber || '').replace(/\D/g, '');
  const withCountry = digits.startsWith('55') ? digits : `55${digits}`;
  return withCountry.length === 12 ? `${withCountry.slice(0, 4)}9${withCountry.slice(4)}` : withCountry || 'default';
}

function documentDiagnosticSummary(documentData) {
  if (!activeDocumentDiagnostic) return null;
  const fields = Object.keys(documentData || {}).filter((field) => Boolean(documentData?.[field]));
  const events = activeDocumentDiagnostic.events || [];
  const providerEvent = [...events].reverse().find((item) => /(?:GEMINI_RESULT|GROQ_VISION_RESULT|LOCAL_OCR_RESULT)/.test(item.event));
  const errorEvent = [...events].reverse().find((item) => /ERROR|INCOMPLETE/.test(item.event));
  return {
    startedAt: activeDocumentDiagnostic.startedAt,
    finishedAt: new Date().toISOString(),
    durationMs: Date.now() - activeDocumentDiagnostic.startedAtMs,
    mimeType: activeDocumentDiagnostic.mimeType,
    bytes: activeDocumentDiagnostic.bytes,
    rotationsTested: activeDocumentDiagnostic.rotationsTested,
    provider: providerEvent?.event?.startsWith('GEMINI') ? 'Gemini' : providerEvent?.event?.startsWith('GROQ') ? 'Groq Vision' : providerEvent?.event?.startsWith('LOCAL') ? 'OCR local' : 'Não identificado',
    attempts: events.filter((item) => /RESULT|HTTP_ERROR/.test(item.event)).length,
    fields,
    complete: Boolean(documentData?.name && hasValidCpfCnpjCheckDigits(documentData?.cpfCnpj)),
    error: errorEvent ? String(errorEvent.message || errorEvent.event).slice(0, 180) : '',
  };
}

function rememberConversation(fromNumber, role, content) {
  const clean = String(content || '').trim();
  if (!clean) return;
  const key = conversationKey(fromNumber);
  const history = conversationHistories.get(key) || [];
  history.push({ role, content: clean.slice(0, 1200) });
  if (history.length > 20) history.splice(0, history.length - 20);
  conversationHistories.set(key, history);
}

// Reutiliza apenas a chave Groq já configurada no agente de atendimento do escritório.
// O segredo permanece no arquivo original e não é copiado para o projeto AssinaJur.
if (!process.env.GROQ_API_KEY) {
  const sharedAgentEnv = path.join(__dirname, '..', '..', 'agente-whatsapp', '.env');
  if (fs.existsSync(sharedAgentEnv)) {
    const groqLine = fs.readFileSync(sharedAgentEnv, 'utf8').split(/\r?\n/)
      .find((line) => /^GROQ_API_KEY=/.test(line));
    const groqValue = groqLine?.replace(/^GROQ_API_KEY=/, '').trim().replace(/^(['"])(.*)\1$/, '$2');
    if (groqValue) process.env.GROQ_API_KEY = groqValue;
  }
}

function unwrapMessageContent(message) {
  let content = message || {};
  for (let depth = 0; depth < 3; depth += 1) {
    const wrapped = content.ephemeralMessage?.message
      || content.viewOnceMessage?.message
      || content.viewOnceMessageV2?.message
      || content.viewOnceMessageV2Extension?.message
      || content.documentWithCaptionMessage?.message;
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

const DOCUMENT_FIELDS = [
  'name', 'cpfCnpj', 'rg', 'issuingOrgan', 'birthDate', 'nationality', 'maritalStatus',
  'profession', 'cep', 'address', 'number', 'neighborhood', 'city', 'state',
];

function mergeDocumentCandidate(target, candidate) {
  if (!candidate || typeof candidate !== 'object') return target;
  for (const field of DOCUMENT_FIELDS) {
    let value = typeof candidate[field] === 'string' ? candidate[field].trim() : '';
    if (!value) continue;
    if (field === 'cpfCnpj') {
      value = value.replace(/\D/g, '');
      if (!hasValidCpfCnpjCheckDigits(value)) continue;
    }
    if (!target[field]) target[field] = value;
  }
  return target;
}

function hasMinimumDocumentIdentity(data) {
  return Boolean(data?.name && hasValidCpfCnpjCheckDigits(data?.cpfCnpj));
}

function validBrazilianDate(day, month, year) {
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return date.getUTCFullYear() === Number(year)
    && date.getUTCMonth() === Number(month) - 1
    && date.getUTCDate() === Number(day);
}

function extractDocumentPatternsFromOcr(rawText) {
  const lines = String(rawText || '').replace(/\r/g, '').split('\n').map((line) => line.trim()).filter(Boolean);
  const candidate = {};
  const numericText = String(rawText || '').replace(/[Oo]/g, '0').replace(/[Il|]/g, '1');

  // Um CPF possui 11 dígitos (3+3+3+2). Testamos todas as sequências compatíveis e só
  // aceitamos aquela cujos dois dígitos verificadores estejam matematicamente corretos.
  const cpfPatterns = numericText.split(/\r?\n/).flatMap((line) => line.match(/(?:\d[\t .\-/]*){11}/g) || []);
  for (const value of cpfPatterns) {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 11 && hasValidCpfCnpjCheckDigits(digits)) {
      candidate.cpfCnpj = digits;
      break;
    }
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const nextLine = lines[index + 1] || '';
    const nameMatch = line.match(/\b(?:NOME(?:\s+CIVIL)?|NAME)\b\s*[:\-]?\s*(.*)$/i);
    if (!candidate.name && nameMatch) {
      const possibleName = (nameMatch[1] || nextLine).replace(/[^A-Za-zÀ-ÿ' -]/g, ' ').replace(/\s+/g, ' ').trim();
      if ((possibleName.match(/[A-Za-zÀ-ÿ]{2,}/g) || []).length >= 2) candidate.name = possibleName;
    }

    const rgMatch = line.match(/\b(?:RG|REGISTRO\s+GERAL|DOC(?:UMENTO)?\.?\s+(?:DE\s+)?IDENTIDADE|IDENTIDADE)\b\s*[:\-]?\s*([0-9][0-9.\-\sX]{4,18})/i);
    if (!candidate.rg && rgMatch) {
      const rg = rgMatch[1].replace(/\s+/g, '').trim();
      if (rg.replace(/\D/g, '').length >= 5 && rg.replace(/\D/g, '') !== candidate.cpfCnpj) candidate.rg = rg;
    }

    const dateMatch = line.match(/\b(?:NASCIMENTO|DATA\s+DE\s+NASCIMENTO|NASC\.?|BIRTH)\b[^0-9]{0,12}([0-3]?\d)[\s/.\-]([01]?\d)[\s/.\-]((?:19|20)\d{2})/i);
    if (!candidate.birthDate && dateMatch && validBrazilianDate(dateMatch[1], dateMatch[2], dateMatch[3])) {
      candidate.birthDate = `${dateMatch[1].padStart(2, '0')}/${dateMatch[2].padStart(2, '0')}/${dateMatch[3]}`;
    }
  }
  return candidate;
}

async function buildOcrImageVariants(mediaBase64) {
  const source = Buffer.from(mediaBase64, 'base64');
  try {
    const autoOriented = await sharp(source).rotate().toBuffer();
    const variants = [];
    for (const angle of [0, 90, 180, 270]) {
      variants.push(await sharp(autoOriented)
        .rotate(angle)
        .resize({ width: 2200, height: 2200, fit: 'inside', withoutEnlargement: false })
        .greyscale()
        .normalize()
        .sharpen()
        .jpeg({ quality: 92 })
        .toBuffer());
    }
    return variants;
  } catch (error) {
    recordDocumentDiagnostic('IMAGE_NORMALIZATION_ERROR', { message: String(error?.message || error).slice(0, 180) });
    return [source];
  }
}

async function analyzeDocumentLocally(mediaBase64, mediaMimeType) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY;
  if (!mediaBase64) return null;
  const suppliedMimeType = String(mediaMimeType || '').split(';')[0].trim().toLowerCase();
  const mimeType = suppliedMimeType.startsWith('image/') || suppliedMimeType === 'application/pdf'
    ? suppliedMimeType
    : 'image/jpeg';
  const collected = {};
  const imageVariants = mimeType.startsWith('image/') ? await buildOcrImageVariants(mediaBase64) : [];
  activeDocumentDiagnostic = {
    startedAt: new Date().toISOString(),
    startedAtMs: Date.now(),
    mimeType,
    bytes: Math.floor(mediaBase64.length * 0.75),
    rotationsTested: imageVariants.length || 1,
    events: [],
  };
  const geminiInputs = imageVariants.length
    ? imageVariants.map((buffer) => ({ mimeType: 'image/jpeg', data: buffer.toString('base64') }))
    : [{ mimeType, data: mediaBase64 }];
  recordDocumentDiagnostic('READ_STARTED', { mimeType, bytes: Math.floor(mediaBase64.length * 0.75) });
  const prompt = `Analise cuidadosamente este RG ou CNH brasileiro, inclusive se estiver rotacionado.
Extraia somente os dados visíveis do titular. Diferencie CPF do número do RG e não invente dígitos.
Retorne somente JSON válido com: name, cpfCnpj, rg, issuingOrgan, birthDate, nationality,
maritalStatus, profession, cep, address, number, neighborhood, city e state.`;

  if (apiKey) for (let attempt = 1; attempt <= geminiInputs.length; attempt += 1) {
    try {
      const response = await customFetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ inlineData: geminiInputs[attempt - 1] }, { text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
        }
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error(`Leitura local do documento: Gemini respondeu HTTP ${response.status} na tentativa ${attempt}.`);
        recordDocumentDiagnostic('GEMINI_HTTP_ERROR', { status: response.status, attempt });
        // Limite de uso não é defeito da fotografia. Acionamos imediatamente o leitor alternativo.
        if (response.status === 429) break;
        continue;
      }
      const parsed = parseGeminiJson(payload?.candidates?.[0]?.content?.parts?.[0]?.text);
      mergeDocumentCandidate(collected, parsed);
      recordDocumentDiagnostic('GEMINI_RESULT', { attempt, fields: Object.keys(collected), complete: hasMinimumDocumentIdentity(collected) });
      if (hasMinimumDocumentIdentity(collected)) return collected;
      console.error(`Leitura local do documento incompleta na tentativa ${attempt}; tentando novamente.`);
    } catch (error) {
      console.error(`Falha na leitura local do documento na tentativa ${attempt}:`, error?.message || error);
    }
  }

  const groqKey = String(process.env.GROQ_API_KEY || '').trim();
  // O endpoint visual do Groq recebe imagens. PDFs continuam pela leitura Gemini do bloco anterior.
  if (groqKey && mimeType.startsWith('image/')) for (let attempt = 1; attempt <= imageVariants.length; attempt += 1) {
    try {
      const response = await customFetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen/qwen3.6-27b',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: `${prompt}\nNão confunda número do documento com CPF. Se um campo não estiver visível, retorne string vazia.` },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageVariants[attempt - 1].toString('base64')}` } },
            ],
          }],
          temperature: 0.05,
          max_completion_tokens: 1800,
          response_format: { type: 'json_object' },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error(`Leitura alternativa do documento: Groq Vision respondeu HTTP ${response.status} na tentativa ${attempt}.`);
        recordDocumentDiagnostic('GROQ_VISION_HTTP_ERROR', {
          status: response.status,
          attempt,
          errorType: payload?.error?.type,
          errorCode: payload?.error?.code,
          message: String(payload?.error?.message || '').slice(0, 180),
        });
        if (response.status === 429) break;
        continue;
      }
      const parsed = parseGeminiJson(payload?.choices?.[0]?.message?.content);
      mergeDocumentCandidate(collected, parsed);
      recordDocumentDiagnostic('GROQ_VISION_RESULT', { attempt, fields: Object.keys(collected), complete: hasMinimumDocumentIdentity(collected) });
      if (hasMinimumDocumentIdentity(collected)) {
        console.log('✅ Documento lido pelo leitor visual alternativo.');
        return collected;
      }
      console.error(`Leitura alternativa incompleta na tentativa ${attempt}.`);
    } catch (error) {
      console.error(`Falha na leitura alternativa na tentativa ${attempt}:`, error?.message || error);
    }
  }

  // Última contingência para imagens: OCR executado no próprio computador. O texto reconhecido
  // é estruturado separadamente e ainda passa pela validação matemática do CPF/CNPJ.
  if (mimeType.startsWith('image/')) {
    let worker;
    try {
      const { createWorker } = require('tesseract.js');
      const ocrCachePath = path.join(process.env.LOCALAPPDATA || path.join(__dirname, '..'), 'AssinaJur', 'tesseract-cache');
      fs.mkdirSync(ocrCachePath, { recursive: true });
      worker = await createWorker('por', 1, { cachePath: ocrCachePath });
      const ocrTexts = [];
      for (let index = 0; index < imageVariants.length; index += 1) {
        const result = await worker.recognize(imageVariants[index]);
        const rawText = String(result?.data?.text || '').replace(/\r/g, '').trim().slice(0, 6000);
        ocrTexts.push(`ORIENTAÇÃO ${[0, 90, 180, 270][index] || index}:\n${rawText}`);
        mergeDocumentCandidate(collected, extractDocumentPatternsFromOcr(rawText));
        recordDocumentDiagnostic('LOCAL_OCR_RESULT', {
          orientation: [0, 90, 180, 270][index] || index,
          characters: rawText.length,
          fields: Object.keys(collected),
          complete: hasMinimumDocumentIdentity(collected),
        });
        if (hasMinimumDocumentIdentity(collected)) {
          console.log('✅ Documento recuperado por padrões documentais e OCR local.');
          return collected;
        }
      }
      const rawText = ocrTexts.join('\n\n').slice(0, 12000);
      if (rawText && groqKey) {
        const parsed = await callGroqJson(`O texto abaixo foi extraído localmente de um RG ou CNH brasileiro.
Identifique apenas informações explicitamente presentes e retorne JSON com: name, cpfCnpj, rg, issuingOrgan,
birthDate, nationality, maritalStatus, profession, cep, address, number, neighborhood, city e state.
Não invente dados e diferencie CPF do número do RG.

Texto OCR: ${rawText}`, { model: 'openai/gpt-oss-120b', maxTokens: 1200 });
        mergeDocumentCandidate(collected, parsed);
        if (hasMinimumDocumentIdentity(collected)) {
          console.log('✅ Documento recuperado pela contingência OCR local.');
          return collected;
        }
      }
      console.error('Contingência OCR local não confirmou nome e CPF válidos.');
    } catch (error) {
      console.error('Falha na contingência OCR local:', error?.message || error);
    } finally {
      if (worker) await worker.terminate().catch(() => {});
    }
  }
  const usefulPartial = Boolean(collected.name && (collected.cpfCnpj || collected.rg || collected.birthDate));
  recordDocumentDiagnostic('READ_FINISHED', { fields: Object.keys(collected), complete: hasMinimumDocumentIdentity(collected), usefulPartial });
  return usefulPartial ? collected : null;
}

async function callGroqJson(prompt, { model = 'openai/gpt-oss-120b', maxTokens = 1200, strictRouting = false } = {}) {
  const apiKey = String(process.env.GROQ_API_KEY || '').trim();
  if (!apiKey) return null;
  const responseFormat = strictRouting
    ? {
        type: 'json_schema',
        json_schema: {
          name: 'assinajur_routing',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              command: { type: 'string' },
              reply: { type: 'string' },
              revision: { type: 'string' },
              draftRequest: {
                anyOf: [
                  { type: 'null' },
                  {
                    type: 'object',
                    properties: {
                      kind: { type: 'string', enum: ['DOCUMENT', 'KIT'] },
                      clientQuery: { type: 'string' },
                      title: { type: 'string' },
                      legalArea: { type: 'string' },
                      instructions: { type: 'string' },
                      suggestedDocuments: { type: 'array', items: { type: 'string' } },
                      generic: { type: 'boolean' },
                      askMissingBeforeDraft: { type: 'boolean' },
                    },
                    required: ['kind', 'clientQuery', 'title', 'legalArea', 'instructions', 'suggestedDocuments', 'generic', 'askMissingBeforeDraft'],
                    additionalProperties: false,
                  },
                ],
              },
            },
            required: ['command', 'reply', 'revision', 'draftRequest'],
            additionalProperties: false,
          },
        },
      }
    : { type: 'json_object' };
  try {
    const response = await customFetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'Siga rigorosamente as instruções e responda somente com JSON válido.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.15,
        max_completion_tokens: maxTokens,
        response_format: responseFormat,
      }),
    });
    if (!response.ok) {
      console.error(`Groq respondeu HTTP ${response.status}; acionando contingência.`);
      return null;
    }
    const payload = await response.json().catch(() => ({}));
    return parseGeminiJson(payload?.choices?.[0]?.message?.content);
  } catch (error) {
    console.error('Falha na chamada local ao Groq:', error?.message || error);
    return null;
  }
}

function normalizeConversationRouting(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  const command = typeof parsed.command === 'string' ? parsed.command.trim().slice(0, 1000) : '';
  const reply = typeof parsed.reply === 'string' ? parsed.reply.trim().slice(0, 2000) : '';
  const revision = typeof parsed.revision === 'string' ? parsed.revision.trim().slice(0, 3000) : '';
  const hasDraftRequest = parsed.draftRequest
    && typeof parsed.draftRequest === 'object'
    && !Array.isArray(parsed.draftRequest)
    && ['DOCUMENT', 'KIT'].includes(parsed.draftRequest.kind)
    && Boolean(String(parsed.draftRequest.title || parsed.draftRequest.instructions || '').trim());
  const draftRequest = hasDraftRequest
    ? {
        kind: parsed.draftRequest.kind === 'KIT' ? 'KIT' : 'DOCUMENT',
        clientQuery: String(parsed.draftRequest.clientQuery || '').trim().slice(0, 200),
        title: String(parsed.draftRequest.title || '').trim().slice(0, 180),
        legalArea: String(parsed.draftRequest.legalArea || '').trim().slice(0, 120),
        instructions: String(parsed.draftRequest.instructions || '').trim().slice(0, 3000),
        generic: parsed.draftRequest.generic === true,
        askMissingBeforeDraft: parsed.draftRequest.askMissingBeforeDraft === true,
        suggestedDocuments: Array.isArray(parsed.draftRequest.suggestedDocuments)
          ? parsed.draftRequest.suggestedDocuments.map((item) => String(item || '').trim().slice(0, 160)).filter(Boolean).slice(0, 6)
          : [],
      }
    : null;
  const allowedCommand = /^(?:ajuda|clientes|buscar cliente(?:\s+.+)?|status|cobrar\s+.+|cadastrar cliente(?:\s+.*)?|excluir cliente(?:\s+.*)?|gerar(?:\s+kit)?\s+.+\s+para\s+.+)$/i.test(command)
    ? command
    : '';
  return {
    command: draftRequest || revision ? '' : allowedCommand,
    reply: draftRequest || revision || allowedCommand ? '' : reply,
    draftRequest,
    revision,
  };
}

async function interpretConversationLocally(fromNumber, text) {
  const key = conversationKey(fromNumber);
  const history = (conversationHistories.get(key) || []).map((item) => `${item.role === 'user' ? 'Advogado' : 'AssinaJur'}: ${item.content}`).join('\n');
  const prompt = `Você é o copilot privado do advogado administrador do AssinaJur. Interprete a mensagem considerando toda a conversa recente.
Retorne somente JSON válido com "command", "reply", "revision" e "draftRequest". Use strings vazias e draftRequest null nos campos não aplicáveis.

Use command apenas quando houver uma ação operacional. Formatos permitidos:
- ajuda
- clientes
- buscar cliente NOME OU CPF
- status
- cobrar NOME
- cadastrar cliente DADOS
- excluir cliente NOME OU CPF
- excluir cliente
- gerar MODELO para CLIENTE
- gerar kit KIT para CLIENTE

Quando o advogado pedir para REDIGIR, ELABORAR, CRIAR, FAZER, PREPARAR ou MONTAR uma procuração, contrato, declaração, petição, termo ou outro conteúdo jurídico novo, não use command. Preencha draftRequest:
{"kind":"DOCUMENT" ou "KIT","clientQuery":"nome ou CPF","title":"tipo/título","legalArea":"área","instructions":"todos os termos pedidos","suggestedDocuments":["nomes, se for kit"],"generic":false,"askMissingBeforeDraft":false}
Use KIT quando ele pedir para montar um conjunto inteligente de documentos. Use DOCUMENT para uma única procuração, contrato, declaração, termo, petição ou outra minuta.
Use o command "gerar MODELO para CLIENTE" somente quando ele disser claramente que quer usar um modelo já existente/salvo no AssinaJur.
Defina askMissingBeforeDraft como true quando o advogado pedir para perguntar, conferir ou completar dados/qualificação faltantes antes de redigir.
Extraia o cliente e os requisitos também do histórico recente quando a mensagem atual for continuação, como "então crie um modelo" ou apenas "procuração". Considere especialmente o cliente que acabou de ser cadastrado e citado pelo AssinaJur.
Se ele pedir somente uma minuta genérica, sem cadastrar ou vincular cliente, deixe clientQuery vazio e defina generic como true. Se faltar o cliente sem essa intenção, deixe clientQuery vazio e generic como false; o servidor explicará as opções.

Quando já houver uma prévia/minuta em andamento e a mensagem acrescentar, corrigir ou retirar informações dela, coloque a mensagem completa em revision e mantenha draftRequest null. Exemplos: "ela é solteira e advogada", "troque para 25%", "a procuração é geral", "retire os poderes para receber valores".
Nunca amplie, presuma ou invente conteúdo em revision. Esse campo serve apenas para classificar; o sistema utilizará literalmente a mensagem original do advogado.

Se for conversa, dúvida, continuação sem dados suficientes ou discussão de ideias, deixe command vazio e responda em reply de forma natural, profissional e breve. Faça uma pergunta objetiva quando faltar informação.
Nunca afirme que alterou, cadastrou, excluiu, gerou ou enviou algo; ações reais são executadas e confirmadas pelo servidor.

Histórico:
${history || 'Sem histórico anterior.'}

Mensagem atual: ${text}`;

  const groqRouting = normalizeConversationRouting(await callGroqJson(prompt, {
    model: 'openai/gpt-oss-120b',
    maxTokens: 1200,
    strictRouting: true,
  }));
  if (groqRouting) {
    if (groqRouting.revision) groqRouting.revision = text.trim().slice(0, 3000);
    return groqRouting;
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY;
  if (!apiKey) return null;
  try {
    const response = await customFetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      }
    );
    if (!response.ok) {
      console.error(`Interpretação local da conversa: Gemini respondeu HTTP ${response.status}.`);
      return null;
    }
    const payload = await response.json().catch(() => ({}));
    const parsed = parseGeminiJson(payload?.candidates?.[0]?.content?.parts?.[0]?.text);
    const geminiRouting = normalizeConversationRouting(parsed);
    if (geminiRouting?.revision) geminiRouting.revision = text.trim().slice(0, 3000);
    return geminiRouting;
  } catch (error) {
    console.error('Falha ao interpretar a conversa localmente:', error?.message || error);
    return null;
  }
}

async function generateLegalDraftLocally(task) {
  const isRevision = task?.type === 'REVISE_LEGAL_DRAFT';
  const prompt = `Você é um redator jurídico brasileiro trabalhando sob supervisão direta de um advogado.
Produza somente JSON válido. Não inclua markdown fora do JSON.

Regras obrigatórias:
- Não invente fatos, números, datas, partes, valores, legislação específica ou condições não informadas.
- Use os dados do cliente fornecidos. Quando um dado indispensável não existir, use um marcador claro entre colchetes, como [INFORMAR VALOR].
- Preserve no texto as variáveis {{cliente_nome}}, {{cliente_cpf}}, {{cliente_rg}}, {{cliente_endereco}}, {{cliente_estado_civil}}, {{cliente_profissao}}, {{advogado_nome}}, {{advogado_oab}}, {{escritorio_nome}}, {{cidade}} e {{data_atual}} quando forem pertinentes; o AssinaJur as preencherá.
- Escreva em português brasileiro, com linguagem jurídica profissional, cláusulas numeradas e sem emojis.
- O conteúdo deve ser HTML simples, usando apenas h1, h2, p, strong, ol, ul e li.
- Uma minuta deve ser completa, mas objetiva. Para KIT, gere de 2 a 5 documentos úteis e não duplique conteúdo.
- Isto é uma minuta para revisão do advogado, não uma afirmação de que o documento já foi aprovado.

Formato:
{"kind":"DOCUMENT ou KIT","clientId":"...","clientName":"...","legalArea":"...","requestSummary":"resumo fiel do pedido","documents":[{"title":"...","documentType":"CONTRATO|PROCURACAO|DECLARACAO|PETICAO|TERMO|DOCUMENTO","contentHtml":"..."}]}

Tarefa: ${isRevision ? 'REVISAR a minuta existente conforme a orientação, mantendo o que não foi solicitado alterar.' : 'CRIAR uma nova minuta ou kit.'}
Dados e instruções:
${JSON.stringify(task)}

Retorne o clientId exatamente como recebido.`;

  const normalizeDraft = (parsed) => {
    if (!parsed || !Array.isArray(parsed.documents) || parsed.documents.length === 0) return null;
    return {
      ...parsed,
      kind: task?.request?.kind === 'KIT' ? 'KIT' : 'DOCUMENT',
      clientId: task.clientId,
      clientName: task.clientName,
      version: isRevision ? Number(task?.existingDraft?.version || 1) + 1 : 1,
    };
  };

  const groqDraft = normalizeDraft(await callGroqJson(prompt, {
    model: 'qwen/qwen3.6-27b',
    maxTokens: 8000,
  }));
  if (groqDraft) return groqDraft;

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY;
  if (!apiKey) throw new Error('Nenhum provedor de IA local está disponível no computador.');
  const response = await customFetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 12000 },
      }),
    }
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Gemini respondeu HTTP ${response.status} ao redigir a minuta.`);
  const parsed = parseGeminiJson(payload?.candidates?.[0]?.content?.parts?.[0]?.text);
  const normalizedDraft = normalizeDraft(parsed);
  if (!normalizedDraft) {
    throw new Error('A IA local devolveu uma minuta incompleta.');
  }
  return normalizedDraft;
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

async function restoreConversationContext(fromNumber) {
  try {
    const data = await callAssinaJur({ eventType: 'CONTEXT', fromNumber });
    for (const log of data.logs || []) {
      if (log.body) rememberConversation(log.fromNumber || fromNumber, 'user', log.body);
      if (log.aiResponse) rememberConversation(log.fromNumber || fromNumber, 'assistant', log.aiResponse);
    }
    console.log(`🧠 Contexto restaurado: ${data.logs?.length || 0} interação(ões) anteriores.`);
  } catch (error) {
    console.error('Não foi possível restaurar o contexto anterior:', error.message);
  }
}

async function publishConnectionStatus(status, phoneNumber) {
  try {
    await callAssinaJur({
      eventType: 'STATUS',
      status,
      fromNumber: process.env.WHATSAPP_ADMIN_PHONE || phoneNumber || '5573988250201',
      phoneNumber: phoneNumber || null,
      botVersion: BOT_VERSION,
      daemonStartedAt: DAEMON_STARTED_AT,
      runtime: process.version,
      providers: {
        gemini: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY),
        groq: Boolean(process.env.GROQ_API_KEY),
        localOcr: true,
      },
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
        await restoreConversationContext(process.env.WHATSAPP_ADMIN_PHONE || '5573988250201');
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
        const documentMessage = messageContent.documentMessage;
        const isDocument = !!documentMessage;
        const documentMimeType = String(documentMessage?.mimetype || '').split(';')[0].toLowerCase();
        const isReadableDocument = isDocument && (documentMimeType.startsWith('image/') || documentMimeType === 'application/pdf');
        const sharedContact = messageContent.contactMessage || messageContent.contactsArrayMessage?.contacts?.[0];
        const isContact = !!sharedContact;
        const contactPhone = phoneFromVcard(sharedContact?.vcard);
        const contactName = sharedContact?.displayName || 'contato compartilhado';

        const textMessage =
          messageContent.conversation ||
          messageContent.extendedTextMessage?.text ||
          (isContact && contactPhone ? `telefone ${contactPhone}` : '') ||
          (isContact ? `Contato ${contactName} recebido sem telefone legível` : '') ||
          (isImage ? 'Foto de documento para cadastro' : isReadableDocument ? 'Arquivo de documento para cadastro' : isDocument ? 'Arquivo recebido' : isAudio ? 'Áudio de voz enviado pelo advogado' : '');

        if (!textMessage) continue;

        console.log(`\n📩 Mensagem RECEBIDA (${resolvedFromNumber}): [${isImage ? 'FOTO' : isDocument ? 'DOCUMENTO' : isAudio ? 'ÁUDIO DE VOZ' : isContact ? 'CONTATO' : 'TEXTO'}] "${textMessage}"`);

        let mediaBase64 = undefined;
        let mediaMimeType = undefined;
        let documentData = undefined;
        let localRouting = undefined;
        activeDocumentDiagnostic = null;

        if (isImage || isReadableDocument) {
          try {
            const buffer = await downloadMediaMessage(msg, 'buffer', {});
            mediaBase64 = buffer.toString('base64');
            mediaMimeType = isImage ? (messageContent.imageMessage.mimetype || 'image/jpeg') : documentMimeType;
            console.log(`📸 Documento baixado com sucesso (${buffer.length} bytes, ${mediaMimeType})...`);
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

        if (!isImage && !isDocument && !isAudio && !isContact) {
          const simpleControl = /^(?:sim|confirmar|confirmo|aprovar(?:\s+minuta)?|aprovado|pode\s+seguir|está\s+certo|gerar\s+(?:o\s+)?link|continuar|continue|voltar|recomeçar|o\s+que\s+falta\??|cancelar|cancela|ajuda|menu|oi|olá|\+?[\d\s().-]{10,20})$/i.test(textMessage.trim());
          if (!simpleControl) {
            localRouting = await interpretConversationLocally(resolvedFromNumber, textMessage);
          }
          rememberConversation(resolvedFromNumber, 'user', textMessage);
        }

        try {
          console.log('🤖 Processando com a Inteligência IA do AssinaJur...');
          const localDocumentComplete = Boolean(documentData?.name && hasValidCpfCnpjCheckDigits(documentData?.cpfCnpj));
          let data = await callAssinaJur({
            fromNumber: resolvedFromNumber,
            message: textMessage,
            messageType: isImage ? 'IMAGE' : isReadableDocument ? 'DOCUMENT' : isAudio ? 'AUDIO' : 'TEXT',
            // Uma leitura parcial não deve impedir a contingência do servidor de analisar a imagem original.
            mediaBase64: localDocumentComplete ? undefined : mediaBase64,
            mediaMimeType,
            documentData,
            naturalCommand: localRouting?.command,
            conversationReply: localRouting?.reply,
            draftRequest: localRouting?.draftRequest,
            conversationRevision: localRouting?.revision,
            diagnostic: (isImage || isReadableDocument) ? documentDiagnosticSummary(documentData) : undefined,
          });
          if (data.localAiTask) {
            try {
              console.log(`🧠 Redigindo ${data.localAiTask.request?.kind === 'KIT' ? 'kit jurídico' : 'minuta jurídica'} localmente...`);
              const localAiResult = await generateLegalDraftLocally(data.localAiTask);
              data = await callAssinaJur({
                eventType: 'LOCAL_AI_RESULT',
                fromNumber: resolvedFromNumber,
                message: data.localAiTask.type === 'REVISE_LEGAL_DRAFT' ? 'Revisão jurídica concluída pela IA local' : 'Minuta jurídica concluída pela IA local',
                messageType: 'TEXT',
                localAiResult,
              });
              console.log('✅ Minuta jurídica preparada; enviando prévia para aprovação.');
            } catch (draftError) {
              console.error('Erro na redação jurídica local:', draftError?.message || draftError);
              data = {
                reply: 'Não consegui concluir a minuta nesta tentativa. Seus dados não foram alterados. Tente novamente em instantes ou envie o pedido com menos documentos por vez.',
                outboundMessages: [],
              };
            }
          }
          const safeAction = String(data.actionTaken || '').startsWith('PENDING_ACTION:')
            ? 'PENDING_ACTION'
            : String(data.actionTaken || '').startsWith('EXECUTED_ACTION:')
              ? 'EXECUTED_ACTION'
              : String(data.actionTaken || '').slice(0, 100);
          recordDocumentDiagnostic('COMMAND_RESULT', {
            messageType: isImage ? 'IMAGE' : isReadableDocument ? 'DOCUMENT' : isAudio ? 'AUDIO' : 'TEXT',
            routing: localRouting?.draftRequest ? 'DRAFT_REQUEST' : localRouting?.revision ? 'REVISION' : localRouting?.command ? 'COMMAND' : localRouting?.reply ? 'CONVERSATION' : 'DIRECT',
            action: safeAction,
            hasOutboundMessages: Boolean(data.outboundMessages?.length),
          });
          if (data.reply) {
            console.log(`💬 Resposta enviada ao WhatsApp: "${data.reply}"`);
            await sock.sendMessage(rawJid, { text: data.reply });
            console.log('✅ Mensagem entregue com sucesso!');
            rememberConversation(resolvedFromNumber, 'assistant', data.reply);
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
            if (outbound.documentBase64) {
              await sock.sendMessage(destinationJid, {
                document: Buffer.from(outbound.documentBase64, 'base64'),
                mimetype: outbound.mimeType || 'application/pdf',
                fileName: outbound.fileName || 'minuta-assinajur.pdf',
                caption: outbound.text,
              });
              console.log(`📎 PDF provisório entregue para ${cleanTo}: ${outbound.fileName || 'minuta-assinajur.pdf'}.`);
            } else {
              await sock.sendMessage(destinationJid, { text: outbound.text });
              console.log(`📤 Ação externa entregue para ${cleanTo}.`);
            }
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
