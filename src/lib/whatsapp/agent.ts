import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { maskCpfCnpj, maskPhone } from '@/lib/formatters';
import { compileTemplatePreviewToPdf, compileTemplateToPdf } from '@/lib/templateCompiler';

export const AUTHORIZED_LAWYER_PHONES = [
  '5573988250201',
  '73988250201',
  '557388250201',
  '7388250201',
];

const PENDING_PREFIX = 'PENDING_ACTION:';
const EXECUTED_PREFIX = 'EXECUTED_ACTION:';
const PENDING_TTL_MS = 15 * 60 * 1000;
const LEGAL_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
const GEMINI_TEXT_MODEL = 'gemini-flash-latest';
const GEMINI_VISION_MODELS = ['gemini-flash-latest', 'gemini-flash-latest', 'gemini-flash-latest'] as const;

export interface WhatsAppIncomingMessage {
  officeId: string;
  fromNumber: string;
  body: string;
  messageType: 'TEXT' | 'AUDIO' | 'IMAGE' | 'DOCUMENT';
  mediaBase64?: string;
  mediaMimeType?: string;
  documentData?: Record<string, unknown>;
  naturalCommand?: string;
  conversationReply?: string;
  conversationRevision?: string;
  draftRequest?: LegalDraftRequest;
  localAiResult?: LegalDraftPackage;
  trustedSource?: boolean;
}

export interface OutboundWhatsAppMessage {
  to: string;
  text: string;
  documentBase64?: string;
  fileName?: string;
  mimeType?: string;
}

export interface WhatsAppAgentResult {
  replyText: string;
  actionTaken: string;
  mediaUrl?: string;
  outboundMessages?: OutboundWhatsAppMessage[];
  localAiTask?: LocalAiTask;
}

interface LegalDraftRequest {
  kind?: 'DOCUMENT' | 'KIT';
  clientQuery?: string;
  title?: string;
  legalArea?: string;
  instructions?: string;
  suggestedDocuments?: string[];
  generic?: boolean;
}

interface LegalDraftDocument {
  title: string;
  documentType: string;
  contentHtml: string;
}

interface LegalDraftPackage {
  kind?: 'DOCUMENT' | 'KIT';
  clientId?: string;
  clientName?: string;
  legalArea?: string;
  requestSummary?: string;
  documents?: LegalDraftDocument[];
  version?: number;
}

interface LocalAiTask {
  type: 'CREATE_LEGAL_DRAFT' | 'REVISE_LEGAL_DRAFT';
  clientId: string;
  clientName: string;
  clientContext: Record<string, string>;
  request: LegalDraftRequest;
  existingDraft?: LegalDraftPackage;
  revisionInstructions?: string;
}

interface ClientDraft {
  name: string;
  cpfCnpj: string;
  rg?: string;
  issuingOrgan?: string;
  birthDate?: string;
  nationality?: string;
  maritalStatus?: string;
  profession?: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  cep?: string;
  address?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  legalArea?: string;
  notes?: string;
}

interface PendingClientAction {
  id: string;
  type: 'CREATE_OR_UPDATE_CLIENT';
  createdAt: string;
  data: ClientDraft;
}

interface PendingKitAction {
  id: string;
  type: 'GENERATE_KIT';
  createdAt: string;
  data: { clientId: string; clientName: string; kitId: string; kitName: string };
}

interface PendingTemplateAction {
  id: string;
  type: 'GENERATE_TEMPLATE';
  createdAt: string;
  data: { clientId: string; clientName: string; templateId: string; templateName: string };
}

interface PendingDeleteClientAction {
  id: string;
  type: 'DELETE_CLIENT';
  createdAt: string;
  data: { clientId?: string; clientName?: string; cpfCnpj?: string };
}

interface PendingLegalDraftAction {
  id: string;
  type: 'GENERATE_LEGAL_DRAFT';
  createdAt: string;
  data: Required<Pick<LegalDraftPackage, 'kind' | 'clientId' | 'clientName' | 'documents'>> & {
    legalArea?: string;
    requestSummary?: string;
    version: number;
    approvedAt?: string;
  };
}

type PendingAction = PendingClientAction | PendingKitAction | PendingTemplateAction | PendingDeleteClientAction | PendingLegalDraftAction;

function normalizePhone(value?: string | null): string {
  return (value || '').replace(/\D/g, '');
}

export function isAuthorizedLawyerPhone(value: string): boolean {
  const configured = (process.env.WHATSAPP_AUTHORIZED_PHONES || '')
    .split(',')
    .map(normalizePhone)
    .filter(Boolean);
  const allowed = configured.length > 0 ? configured : AUTHORIZED_LAWYER_PHONES;
  const normalized = normalizePhone(value);
  return allowed.some((phone) => normalized === phone || normalized.endsWith(phone) || phone.endsWith(normalized));
}

function encodePendingAction(action: PendingAction): string {
  return `${PENDING_PREFIX}${Buffer.from(JSON.stringify(action), 'utf8').toString('base64url')}`;
}

function decodePendingAction(value?: string | null): PendingAction | null {
  if (!value?.startsWith(PENDING_PREFIX)) return null;
  try {
    return JSON.parse(Buffer.from(value.slice(PENDING_PREFIX.length), 'base64url').toString('utf8')) as PendingAction;
  } catch {
    return null;
  }
}

function normalizeCpfCnpj(value?: string): string {
  return (value || '').replace(/\D/g, '');
}

function isValidCpfCnpjLength(value: string): boolean {
  return value.length === 11 || value.length === 14;
}

function hasValidCpfCnpjCheckDigits(value: string): boolean {
  const digits = normalizeCpfCnpj(value);
  if (!isValidCpfCnpjLength(digits) || /^(\d)\1+$/.test(digits)) return false;

  if (digits.length === 11) {
    const calculateCpfDigit = (length: number) => {
      let sum = 0;
      for (let index = 0; index < length; index += 1) {
        sum += Number(digits[index]) * (length + 1 - index);
      }
      const remainder = (sum * 10) % 11;
      return remainder === 10 ? 0 : remainder;
    };
    return calculateCpfDigit(9) === Number(digits[9]) && calculateCpfDigit(10) === Number(digits[10]);
  }

  const calculateCnpjDigit = (length: number) => {
    const weights = length === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((total, weight, index) => total + Number(digits[index]) * weight, 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  return calculateCnpjDigit(12) === Number(digits[12]) && calculateCnpjDigit(13) === Number(digits[13]);
}

function cleanOptional(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const clean = value.trim();
  return clean || undefined;
}

function clientPreview(data: ClientDraft): string {
  const optional = [
    data.rg ? `🪪 *RG:* ${data.rg}` : null,
    data.birthDate ? `🎂 *Nascimento:* ${data.birthDate}` : null,
    data.phone ? `📱 *Telefone:* ${maskPhone(data.phone)}` : null,
    data.address ? `📍 *Endereço:* ${data.address}${data.number ? `, ${data.number}` : ''}${data.city ? ` — ${data.city}/${data.state || ''}` : ''}` : null,
    data.profession ? `💼 *Profissão:* ${data.profession}` : null,
    data.maritalStatus ? `💍 *Estado civil:* ${data.maritalStatus}` : null,
  ].filter(Boolean);

  return [
    '📝 *Prévia do cadastro*',
    '',
    `👤 *Nome:* ${data.name}`,
    `🪪 *CPF/CNPJ:* ${maskCpfCnpj(data.cpfCnpj)}`,
    ...optional,
    '',
    'Responda *CONFIRMAR* para gravar no AssinaJur ou *CANCELAR* para descartar.',
    '_Esta confirmação expira em 15 minutos._',
  ].join('\n');
}

function extractJson(text: string): Record<string, unknown> | null {
  try {
    const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(clean) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function callGemini(
  parts: Array<Record<string, unknown>>,
  jsonMode = false,
  model = GEMINI_TEXT_MODEL
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY;
  if (!apiKey) {
    console.error('[Gemini] Chave da API não configurada.');
    return null;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: jsonMode
            ? {
                responseMimeType: 'application/json',
                temperature: 0,
              }
            : { temperature: 0.2 },
        }),
      }
    );

    if (!response.ok) {
      console.error(`[Gemini] Modelo ${model} respondeu HTTP ${response.status}.`);
      return null;
    }

    const json = await response.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      const reason = json?.candidates?.[0]?.finishReason || json?.promptFeedback?.blockReason || 'resposta vazia';
      console.error(`[Gemini] Modelo ${model} não retornou conteúdo (${reason}).`);
      return null;
    }
    return text;
  } catch (error) {
    console.error(`[Gemini] Falha de comunicação com o modelo ${model}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

async function extractClientDraftFromText(text: string, fallbackPhone: string): Promise<ClientDraft | null> {
  const aiText = await callGemini(
    [
      {
        text: `Extraia somente os dados explicitamente informados para cadastro de cliente jurídico brasileiro.
Não invente dados. Retorne JSON válido com: name, cpfCnpj, rg, issuingOrgan, birthDate, nationality,
maritalStatus, profession, phone, whatsapp, email, cep, address, number, complement, neighborhood,
city, state, legalArea e notes.

Mensagem: ${text}`,
      },
    ],
    true
  );

  const parsed = aiText ? extractJson(aiText) : null;
  if (!parsed) return null;

  const name = cleanOptional(parsed.name);
  const cpfCnpj = normalizeCpfCnpj(cleanOptional(parsed.cpfCnpj));
  const phone = normalizePhone(cleanOptional(parsed.phone)) || normalizePhone(fallbackPhone);
  if (!name || !isValidCpfCnpjLength(cpfCnpj)) return null;

  return {
    name,
    cpfCnpj,
    phone,
    whatsapp: normalizePhone(cleanOptional(parsed.whatsapp)) || phone,
    rg: cleanOptional(parsed.rg),
    issuingOrgan: cleanOptional(parsed.issuingOrgan),
    birthDate: cleanOptional(parsed.birthDate),
    nationality: cleanOptional(parsed.nationality) || 'Brasileira',
    maritalStatus: cleanOptional(parsed.maritalStatus),
    profession: cleanOptional(parsed.profession),
    email: cleanOptional(parsed.email),
    cep: cleanOptional(parsed.cep),
    address: cleanOptional(parsed.address),
    number: cleanOptional(parsed.number),
    complement: cleanOptional(parsed.complement),
    neighborhood: cleanOptional(parsed.neighborhood),
    city: cleanOptional(parsed.city),
    state: cleanOptional(parsed.state)?.toUpperCase(),
    legalArea: cleanOptional(parsed.legalArea),
    notes: cleanOptional(parsed.notes),
  };
}

async function extractClientDraftFromImage(
  mediaBase64: string,
  mediaMimeType: string | undefined,
  fallbackPhone: string
): Promise<ClientDraft | null> {
  const mimeType = mediaMimeType?.startsWith('image/') ? mediaMimeType : 'image/jpeg';
  const cleanBase64 = mediaBase64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/i, '').trim();
  const collected: Partial<ClientDraft> = {};

  for (let attempt = 0; attempt < GEMINI_VISION_MODELS.length; attempt += 1) {
    const model = GEMINI_VISION_MODELS[attempt];
    const aiText = await callGemini(
      [
        { inlineData: { mimeType, data: cleanBase64 } },
        {
          text: `Analise cuidadosamente este documento de identidade brasileiro (RG ou CNH), inclusive se estiver rotacionado.
Extraia somente dados realmente visíveis do titular. Diferencie CPF do número do RG e não invente nenhum dígito.
Confira o CPF uma segunda vez antes de responder. Para campos ausentes ou ilegíveis, retorne uma string vazia.
Retorne: name, cpfCnpj, rg, issuingOrgan, birthDate, nationality, maritalStatus, profession, cep,
address, number, neighborhood, city e state.`,
        },
      ],
      true,
      model
    );
    const parsed = aiText ? extractJson(aiText) : null;
    if (!parsed) {
      console.error(`[WhatsApp Vision] Tentativa ${attempt + 1} não retornou JSON válido (${model}).`);
      continue;
    }

    const extractedCpfCnpj = normalizeCpfCnpj(cleanOptional(parsed.cpfCnpj));
    if (extractedCpfCnpj && !hasValidCpfCnpjCheckDigits(extractedCpfCnpj)) {
      console.error(`[WhatsApp Vision] Tentativa ${attempt + 1} retornou CPF/CNPJ com dígitos verificadores inválidos (${model}).`);
    }

    const candidate: Partial<ClientDraft> = {
      name: cleanOptional(parsed.name),
      cpfCnpj: hasValidCpfCnpjCheckDigits(extractedCpfCnpj) ? extractedCpfCnpj : undefined,
      rg: normalizeCpfCnpj(cleanOptional(parsed.rg)) === extractedCpfCnpj ? undefined : cleanOptional(parsed.rg),
      issuingOrgan: cleanOptional(parsed.issuingOrgan),
      birthDate: cleanOptional(parsed.birthDate),
      nationality: cleanOptional(parsed.nationality),
      maritalStatus: cleanOptional(parsed.maritalStatus),
      profession: cleanOptional(parsed.profession),
      cep: cleanOptional(parsed.cep),
      address: cleanOptional(parsed.address),
      number: cleanOptional(parsed.number),
      neighborhood: cleanOptional(parsed.neighborhood),
      city: cleanOptional(parsed.city),
      state: cleanOptional(parsed.state)?.toUpperCase(),
    };

    for (const [key, value] of Object.entries(candidate)) {
      if (value && !collected[key as keyof ClientDraft]) {
        (collected as Record<string, string>)[key] = value;
      }
    }

    if (collected.name && collected.cpfCnpj) {
      if (attempt > 0) console.info(`[WhatsApp Vision] Documento recuperado na tentativa ${attempt + 1} com ${model}.`);
      const phone = normalizePhone(fallbackPhone);
      return {
        ...collected,
        name: collected.name,
        cpfCnpj: collected.cpfCnpj,
        phone,
        whatsapp: phone,
        nationality: collected.nationality || 'Brasileira',
      };
    }
  }

  console.error('[WhatsApp Vision] Todas as tentativas terminaram sem nome e CPF válidos.');
  return null;
}

async function transcribeAudio(mediaBase64: string, mediaMimeType?: string): Promise<string | null> {
  const mimeType = mediaMimeType || 'audio/ogg';
  const cleanBase64 = mediaBase64.replace(/^data:audio\/[a-zA-Z0-9.+-]+;base64,/i, '').trim();
  return callGemini([
    { inlineData: { mimeType, data: cleanBase64 } },
    {
      text: 'Transcreva fielmente este comando em português brasileiro. Retorne somente o texto falado, sem comentários.',
    },
  ]);
}

async function createPendingClientAction(data: ClientDraft): Promise<WhatsAppAgentResult> {
  const action: PendingAction = {
    id: randomUUID(),
    type: 'CREATE_OR_UPDATE_CLIENT',
    createdAt: new Date().toISOString(),
    data,
  };
  return {
    replyText: clientPreview(data),
    actionTaken: encodePendingAction(action),
  };
}

async function findLatestPendingAction(officeId: string, fromNumber: string): Promise<PendingAction | null> {
  const logs = await prisma.whatsAppLog.findMany({
    where: { officeId, fromNumber },
    select: { actionTaken: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  for (const log of logs) {
    const action = decodePendingAction(log.actionTaken);
    if (!action) continue;
    const ttl = action.type === 'GENERATE_LEGAL_DRAFT' ? LEGAL_DRAFT_TTL_MS : PENDING_TTL_MS;
    if (Date.now() - new Date(action.createdAt || log.createdAt).getTime() > ttl) return null;
    const executed = await prisma.whatsAppLog.findFirst({
      where: { officeId, fromNumber, actionTaken: `${EXECUTED_PREFIX}${action.id}` },
      select: { id: true },
    });
    if (!executed) return action;
    // A ação pendente mais recente representa o estado atual do fluxo. Se ela já foi
    // concluída ou cancelada, não devemos ressuscitar versões anteriores do mesmo pedido.
    return null;
  }
  return null;
}

async function executePendingAction(officeId: string, action: PendingAction): Promise<WhatsAppAgentResult> {
  if (action.type === 'DELETE_CLIENT') {
    if (!action.data.clientId) {
      return {
        replyText: 'Claro. Qual cliente você deseja excluir? Pode informar o nome completo ou o CPF.',
        actionTaken: encodePendingAction(action),
      };
    }
    const client = await prisma.client.findFirst({
      where: { id: action.data.clientId, officeId },
      include: { _count: { select: { documents: true } } },
    });
    if (!client) {
      return { replyText: 'Esse cliente não foi encontrado ou já foi excluído.', actionTaken: `${EXECUTED_PREFIX}${action.id}` };
    }
    if (client._count.documents > 0) {
      return {
        replyText: `Não excluí *${client.name}* porque existem ${client._count.documents} documento(s) associado(s). Para preservar o histórico jurídico, remova ou trate esses documentos primeiro.`,
        actionTaken: `${EXECUTED_PREFIX}${action.id}`,
      };
    }
    await prisma.$transaction(async (tx) => {
      await tx.client.delete({ where: { id: client.id } });
      await tx.auditLog.create({
        data: {
          officeId,
          eventType: 'CLIENT_DELETED_BY_WHATSAPP',
          description: `${client.name} (${client.cpfCnpj}) excluído pelo controle remoto do WhatsApp após confirmação.`,
        },
      });
    });
    return {
      replyText: `✅ *Cliente excluído do AssinaJur*\n\n👤 ${client.name}\n🪪 ${maskCpfCnpj(client.cpfCnpj)}\n\nA exclusão foi registrada na auditoria.`,
      actionTaken: `${EXECUTED_PREFIX}${action.id}`,
    };
  }
  if (action.type === 'GENERATE_KIT') {
    return generateKitDocuments(officeId, action);
  }
  if (action.type === 'GENERATE_TEMPLATE') {
    return generateTemplateDocument(officeId, action);
  }
  if (action.type === 'GENERATE_LEGAL_DRAFT') {
    return generateLegalDraftDocuments(officeId, action);
  }
  if (action.type !== 'CREATE_OR_UPDATE_CLIENT') {
    return { replyText: 'Não reconheci a ação pendente. Envie o pedido novamente.', actionTaken: 'UNKNOWN_PENDING_ACTION' };
  }

  const data = action.data;
  if (!normalizePhone(data.phone)) {
    return {
      replyText: `Antes de cadastrar *${data.name}*, informe o telefone/WhatsApp do cliente. Exemplo: *telefone 73 99999-9999*`,
      actionTaken: encodePendingAction(action),
    };
  }
  const existing = await prisma.client.findUnique({
    where: { officeId_cpfCnpj: { officeId, cpfCnpj: data.cpfCnpj } },
  });

  const saved = existing
    ? await prisma.client.update({
        where: { id: existing.id },
        data: {
          name: data.name,
          rg: data.rg ?? existing.rg,
          issuingOrgan: data.issuingOrgan ?? existing.issuingOrgan,
          birthDate: data.birthDate ?? existing.birthDate,
          nationality: data.nationality ?? existing.nationality,
          maritalStatus: data.maritalStatus ?? existing.maritalStatus,
          profession: data.profession ?? existing.profession,
          phone: data.phone || existing.phone,
          whatsapp: data.whatsapp || existing.whatsapp,
          email: data.email ?? existing.email,
          cep: data.cep ?? existing.cep,
          address: data.address ?? existing.address,
          number: data.number ?? existing.number,
          complement: data.complement ?? existing.complement,
          neighborhood: data.neighborhood ?? existing.neighborhood,
          city: data.city ?? existing.city,
          state: data.state ?? existing.state,
          legalArea: data.legalArea ?? existing.legalArea,
          notes: data.notes ?? existing.notes,
        },
      })
    : await prisma.client.create({
        data: {
          officeId,
          name: data.name,
          cpfCnpj: data.cpfCnpj,
          rg: data.rg || null,
          issuingOrgan: data.issuingOrgan || null,
          birthDate: data.birthDate || null,
          nationality: data.nationality || 'Brasileira',
          maritalStatus: data.maritalStatus || null,
          profession: data.profession || null,
          phone: data.phone,
          whatsapp: data.whatsapp || data.phone,
          email: data.email || null,
          cep: data.cep || null,
          address: data.address || null,
          number: data.number || null,
          complement: data.complement || null,
          neighborhood: data.neighborhood || null,
          city: data.city || null,
          state: data.state || null,
          legalArea: data.legalArea || null,
          notes: data.notes || null,
        },
      });

  await prisma.auditLog.create({
    data: {
      officeId,
      eventType: existing ? 'CLIENT_UPDATED_BY_WHATSAPP' : 'CLIENT_CREATED_BY_WHATSAPP',
      description: `${saved.name} (${saved.cpfCnpj}) ${existing ? 'atualizado' : 'cadastrado'} pelo controle remoto do WhatsApp.`,
    },
  });

  return {
    replyText: [
      `✅ *Cliente ${existing ? 'atualizado' : 'cadastrado'} no AssinaJur*`,
      '',
      `👤 ${saved.name}`,
      `🪪 ${maskCpfCnpj(saved.cpfCnpj)}`,
      `🆔 Código: ${saved.id.slice(0, 8).toUpperCase()}`,
      '',
      'A alteração já está disponível no site.',
    ].join('\n'),
    actionTaken: `${EXECUTED_PREFIX}${action.id}`,
  };
}

async function getAutomationContext(officeId: string, clientId: string) {
  const [client, office, user] = await Promise.all([
    prisma.client.findFirst({ where: { id: clientId, officeId } }),
    prisma.office.findUnique({ where: { id: officeId } }),
    prisma.user.findFirst({ where: { officeId, active: true }, orderBy: { createdAt: 'asc' } }),
  ]);
  if (!client || !office || !user) throw new Error('Cliente, escritório ou usuário responsável não encontrado.');
  return { client, office, user };
}

function buildTemplateVariables(client: Awaited<ReturnType<typeof getAutomationContext>>['client'], office: Awaited<ReturnType<typeof getAutomationContext>>['office'], user: Awaited<ReturnType<typeof getAutomationContext>>['user']) {
  return {
    cliente_nome: client.name,
    cliente_cpf: client.cpfCnpj,
    cliente_rg: client.rg || '—',
    cliente_endereco: [client.address, client.number, client.neighborhood, client.city, client.state].filter(Boolean).join(', ') || '—',
    cliente_estado_civil: client.maritalStatus || '—',
    cliente_profissao: client.profession || '—',
    advogado_nome: user.name,
    advogado_oab: user.oabNumber || office.oabNumber || '—',
    escritorio_nome: office.tradeName || office.name,
    cidade: client.city || '—',
  };
}

async function createDocumentFromTemplate({
  officeId,
  clientId,
  template,
  kitId,
}: {
  officeId: string;
  clientId: string;
  template: { id?: string; title: string; contentHtml: string; documentType: string };
  kitId?: string;
}) {
  const { client, office, user } = await getAutomationContext(officeId, clientId);
  const title = `${template.title} - ${client.name}`;
  const compiled = await compileTemplateToPdf({
    officeId,
    uploadedBy: user.id,
    title,
    contentHtml: template.contentHtml,
    variables: buildTemplateVariables(client, office, user),
    officeName: office.tradeName || office.name,
  });
  const document = await prisma.document.create({
    data: {
      officeId,
      clientId: client.id,
      templateId: template.id || null,
      kitId: kitId || null,
      title,
      documentType: template.documentType,
      originalFileId: compiled.storageRecord.id,
      originalHash: compiled.hash,
      status: 'ENVIADO',
      createdById: user.id,
    },
  });
  const signer = await prisma.signer.create({
    data: {
      documentId: document.id,
      name: client.name,
      cpf: client.cpfCnpj,
      email: client.email || null,
      phone: client.whatsapp || client.phone || null,
      role: 'CLIENTE',
      signatureOrder: 1,
      status: 'PENDENTE',
    },
  });
  await prisma.documentEvent.create({
    data: {
      documentId: document.id,
      userId: user.id,
      eventType: 'DOCUMENT_GENERATED_BY_WHATSAPP',
      description: `Documento “${title}” gerado pelo controle remoto do WhatsApp.`,
    },
  });
  return { document, signer, client };
}

async function generateLegalDraftDocuments(officeId: string, action: PendingLegalDraftAction): Promise<WhatsAppAgentResult> {
  if (!action.data.approvedAt) {
    return {
      replyText: 'Esta minuta ainda não foi aprovada. Analise o PDF e responda *APROVAR MINUTA* antes de gerar o link.',
      actionTaken: encodePendingAction(action),
    };
  }
  if (!action.data.clientId) {
    return {
      replyText: 'A minuta genérica está aprovada, mas ainda não possui cliente vinculado. Para criar o documento definitivo e o link, diga *VINCULAR AO CLIENTE [nome ou CPF]*.',
      actionTaken: encodePendingAction(action),
    };
  }
  const client = await prisma.client.findFirst({ where: { id: action.data.clientId, officeId }, select: { id: true, name: true } });
  if (!client) {
    return { replyText: 'O cliente desta minuta não está mais disponível.', actionTaken: `${EXECUTED_PREFIX}${action.id}` };
  }

  const created = [];
  for (const draft of action.data.documents) {
    created.push(await createDocumentFromTemplate({
      officeId,
      clientId: client.id,
      template: draft,
    }));
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.assinajur.com.br';
  const titles = created
    .map((item, index) => `${index + 1}. ${item.document.title}\n   ${appUrl}/assinar/${item.signer.token}`)
    .join('\n');
  await prisma.auditLog.create({
    data: {
      officeId,
      eventType: action.data.kind === 'KIT' ? 'AI_LEGAL_KIT_CREATED_BY_WHATSAPP' : 'AI_LEGAL_DRAFT_CREATED_BY_WHATSAPP',
      description: `${created.length} documento(s) redigido(s) pela IA local e aprovado(s) no WhatsApp para ${client.name}.`,
      metadata: JSON.stringify({ legalArea: action.data.legalArea, requestSummary: action.data.requestSummary }),
    },
  });
  return {
    replyText: [
      `✅ *${action.data.kind === 'KIT' ? 'Kit jurídico definitivo criado' : 'Documento definitivo criado'} no AssinaJur*`,
      '',
      `👤 ${client.name}`,
      `📄 ${created.length} documento(s):`,
      titles,
      '',
      `O link ainda não foi enviado ao cliente. Quando desejar, diga *ENVIAR LINK PARA ${client.name}*.`,
    ].join('\n'),
    actionTaken: `${EXECUTED_PREFIX}${action.id}`,
  };
}

async function generateTemplateDocument(officeId: string, action: PendingTemplateAction): Promise<WhatsAppAgentResult> {
  const template = await prisma.template.findFirst({
    where: { id: action.data.templateId, officeId, active: true },
  });
  if (!template) return { replyText: 'O modelo não está mais disponível.', actionTaken: `${EXECUTED_PREFIX}${action.id}` };
  const result = await createDocumentFromTemplate({ officeId, clientId: action.data.clientId, template });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.assinajur.com.br';
  return {
    replyText: `✅ *Documento gerado no AssinaJur*\n\n📄 ${result.document.title}\n👤 ${result.client.name}\n🔗 ${appUrl}/assinar/${result.signer.token}\n\nDiga *cobrar ${result.client.name}* para enviar o link pelo WhatsApp.`,
    actionTaken: `${EXECUTED_PREFIX}${action.id}`,
  };
}

async function generateKitDocuments(officeId: string, action: PendingKitAction): Promise<WhatsAppAgentResult> {
  const kit = await prisma.legalKit.findFirst({
    where: { id: action.data.kitId, officeId, active: true },
    include: { items: { include: { template: true }, orderBy: { displayOrder: 'asc' } } },
  });
  if (!kit || kit.items.length === 0) {
    return { replyText: 'O kit não está disponível ou não possui modelos.', actionTaken: `${EXECUTED_PREFIX}${action.id}` };
  }
  const created = [];
  for (const item of kit.items) {
    created.push(await createDocumentFromTemplate({
      officeId,
      clientId: action.data.clientId,
      template: item.template,
      kitId: kit.id,
    }));
  }
  const first = created[0];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.assinajur.com.br';
  return {
    replyText: `✅ *Kit gerado no AssinaJur*\n\n📦 ${kit.name}\n👤 ${first.client.name}\n📄 ${created.length} documento(s)\n🔗 ${appUrl}/assinar/${first.signer.token}\n\nDiga *cobrar ${first.client.name}* para enviar o link.`,
    actionTaken: `${EXECUTED_PREFIX}${action.id}`,
  };
}

async function findSingleClient(officeId: string, query: string) {
  const digits = normalizeCpfCnpj(query);
  const clients = await prisma.client.findMany({
    where: {
      officeId,
      OR: [
        { name: { contains: query.trim(), mode: 'insensitive' } },
        ...(digits ? [{ cpfCnpj: { contains: digits } }] : []),
      ],
    },
    take: 3,
    orderBy: { updatedAt: 'desc' },
  });
  return clients;
}

function inferDraftClientQuery(text: string, fallback: string): string {
  const explicitlyNamed = text.match(/\b(?:d[oa]\s+)?cliente\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' -]{1,120})(?:[,.]|$)/i)?.[1]?.trim();
  return explicitlyNamed || fallback.trim().replace(/^(?:o|a)\s+cliente\s+/i, '');
}

function cleanDraftText(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function legalDraftPreview(action: PendingLegalDraftAction): string {
  const documentList = action.data.documents
    .map((document, index) => {
      const excerpt = document.contentHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 260);
      return `${index + 1}. *${document.title}* (${document.documentType})\n   _${excerpt}${excerpt.length >= 260 ? '…' : ''}_`;
    })
    .join('\n\n');
  return [
    `🧠 *Prévia ${action.data.kind === 'KIT' ? 'do kit jurídico' : 'da minuta jurídica'}*`,
    '',
    `👤 *Cliente:* ${action.data.clientName}`,
    `🔢 *Versão:* ${action.data.version}`,
    action.data.legalArea ? `⚖️ *Área:* ${action.data.legalArea}` : null,
    action.data.requestSummary ? `📝 *Pedido:* ${action.data.requestSummary}` : null,
    '',
    documentList,
    '',
    `O PDF provisório ${action.data.documents.length > 1 ? 'de cada documento será enviado' : 'será enviado'} abaixo.`,
    `Responda *APROVAR MINUTA* (ou *CONFIRMAR*) quando estiver correto, *ALTERAR: [o que deseja]* para revisar, ou *CANCELAR*.`,
    '_A aprovação não gera link nem envia nada ao cliente._',
    '_Esta minuta fica disponível por 24 horas._',
  ].filter((line): line is string => line !== null).join('\n');
}

async function buildLegalDraftPreviewFiles(
  officeId: string,
  fromNumber: string,
  action: PendingLegalDraftAction
): Promise<OutboundWhatsAppMessage[]> {
  const context = action.data.clientId ? await getAutomationContext(officeId, action.data.clientId) : null;
  const [office, user] = context
    ? [context.office, context.user]
    : await Promise.all([
        prisma.office.findUnique({ where: { id: officeId } }),
        prisma.user.findFirst({ where: { officeId, active: true }, orderBy: { createdAt: 'asc' } }),
      ]);
  if (!office || !user) throw new Error('Escritório ou advogado responsável não encontrado.');
  const variables = context
    ? buildTemplateVariables(context.client, office, user)
    : {
        cliente_nome: '[CLIENTE NÃO VINCULADO]',
        cliente_cpf: '[INFORMAR CPF]',
        cliente_rg: '[INFORMAR RG]',
        cliente_endereco: '[INFORMAR ENDEREÇO]',
        cliente_estado_civil: '[INFORMAR ESTADO CIVIL]',
        cliente_profissao: '[INFORMAR PROFISSÃO]',
        advogado_nome: user.name,
        advogado_oab: user.oabNumber || office.oabNumber || '—',
        escritorio_nome: office.tradeName || office.name,
        cidade: '[INFORMAR CIDADE]',
      };
  const officeName = office.tradeName || office.name;
  const messages: OutboundWhatsAppMessage[] = [];
  for (const [index, document] of action.data.documents.entries()) {
    const rendered = await compileTemplatePreviewToPdf({
      title: document.title,
      contentHtml: document.contentHtml,
      variables,
      officeName,
      version: action.data.version,
    });
    const safeTitle = document.title.replace(/[^a-zA-Z0-9À-ÿ _-]/g, '').replace(/\s+/g, '_').slice(0, 90);
    messages.push({
      to: fromNumber,
      text: `MINUTA ${index + 1}/${action.data.documents.length} — versão ${action.data.version}. Revise antes de aprovar.`,
      documentBase64: rendered.pdfBuffer.toString('base64'),
      fileName: `${String(index + 1).padStart(2, '0')}-${safeTitle}-MINUTA-V${action.data.version}.pdf`,
      mimeType: 'application/pdf',
    });
  }
  return messages;
}

async function prepareLegalDraftTask(officeId: string, request: LegalDraftRequest): Promise<WhatsAppAgentResult> {
  const clientQuery = cleanDraftText(request.clientQuery, 200);
  if (!clientQuery) {
    if (request.generic) {
      return {
        replyText: 'Estou preparando uma minuta genérica, sem cadastrar ou vincular cliente. Ela poderá ser revisada em PDF, mas será necessário associar um cliente antes de gerar link de assinatura.',
        actionTaken: 'LOCAL_AI_GENERIC_DRAFT_REQUESTED',
        localAiTask: {
          type: 'CREATE_LEGAL_DRAFT',
          clientId: '',
          clientName: 'MINUTA GENÉRICA — SEM CLIENTE VINCULADO',
          clientContext: {
            nome: '[CLIENTE NÃO VINCULADO]',
            cpfCnpj: '[INFORMAR CPF]',
            rg: '[INFORMAR RG]',
            endereco: '[INFORMAR ENDEREÇO]',
          },
          request: {
            ...request,
            kind: request.kind === 'KIT' ? 'KIT' : 'DOCUMENT',
            clientQuery: '',
            generic: true,
          },
        },
      };
    }
    return {
      replyText: [
        'Posso fazer de duas formas:',
        '',
        '1. *Documento para assinatura:* informe o nome/CPF de um cliente cadastrado. O vínculo é necessário somente quando você quiser gerar o documento definitivo e o link.',
        '2. *Somente minuta/modelo:* diga *FAÇA UMA MINUTA GENÉRICA* e eu preparo o PDF com campos em aberto, sem cadastrar ninguém.',
        '',
        'Qual opção você deseja?',
      ].join('\n'),
      actionTaken: 'LEGAL_DRAFT_CLIENT_REQUIRED',
    };
  }
  const clients = await findSingleClient(officeId, clientQuery);
  if (clients.length !== 1) {
    return {
      replyText: clients.length === 0
        ? `Não encontrei o cliente “${clientQuery}”. Para gerar link, confirme o nome ou cadastre-o. Se deseja apenas redigir sem cadastro, diga *FAÇA UMA MINUTA GENÉRICA*.`
        : `Encontrei mais de um cliente para “${clientQuery}”. Informe o nome completo ou CPF.`,
      actionTaken: 'LEGAL_DRAFT_CLIENT_NOT_UNIQUE',
    };
  }
  const client = clients[0];
  const clientContext: Record<string, string> = {
    nome: client.name,
    cpfCnpj: client.cpfCnpj,
    rg: client.rg || '',
    nacionalidade: client.nationality || '',
    estadoCivil: client.maritalStatus || '',
    profissao: client.profession || '',
    endereco: [client.address, client.number, client.neighborhood, client.city, client.state].filter(Boolean).join(', '),
  };
  return {
    replyText: 'Estou preparando a minuta com a IA local. Aguarde alguns instantes…',
    actionTaken: 'LOCAL_AI_LEGAL_DRAFT_REQUESTED',
    localAiTask: {
      type: 'CREATE_LEGAL_DRAFT',
      clientId: client.id,
      clientName: client.name,
      clientContext,
      request: {
        kind: request.kind === 'KIT' ? 'KIT' : 'DOCUMENT',
        clientQuery,
        title: cleanDraftText(request.title, 180),
        legalArea: cleanDraftText(request.legalArea, 120),
        instructions: cleanDraftText(request.instructions, 3000),
        suggestedDocuments: Array.isArray(request.suggestedDocuments)
          ? request.suggestedDocuments.map((item) => cleanDraftText(item, 160)).filter(Boolean).slice(0, 6)
          : [],
        generic: false,
      },
    },
  };
}

async function finalizeLegalDraft(officeId: string, fromNumber: string, draftPackage: LegalDraftPackage): Promise<WhatsAppAgentResult> {
  const clientId = cleanDraftText(draftPackage.clientId, 80);
  const client = clientId
    ? await prisma.client.findFirst({ where: { id: clientId, officeId }, select: { id: true, name: true } })
    : null;
  const documents = Array.isArray(draftPackage.documents)
    ? draftPackage.documents.slice(0, 6).map((document) => ({
        title: cleanDraftText(document?.title, 180),
        documentType: cleanDraftText(document?.documentType, 60).toUpperCase() || 'DOCUMENTO',
        contentHtml: cleanDraftText(document?.contentHtml, 18000),
      })).filter((document) => document.title && document.contentHtml.length >= 200)
    : [];
  if ((clientId && !client) || documents.length === 0) {
    return {
      replyText: 'A IA não conseguiu montar uma minuta completa com segurança. Envie novamente o tipo de documento, o cliente e os termos desejados.',
      actionTaken: 'LEGAL_DRAFT_INCOMPLETE',
    };
  }
  const action: PendingLegalDraftAction = {
    id: randomUUID(),
    type: 'GENERATE_LEGAL_DRAFT',
    createdAt: new Date().toISOString(),
    data: {
      kind: draftPackage.kind === 'KIT' ? 'KIT' : 'DOCUMENT',
      clientId: client?.id || '',
      clientName: client?.name || 'MINUTA GENÉRICA — SEM CLIENTE VINCULADO',
      legalArea: cleanDraftText(draftPackage.legalArea, 120) || undefined,
      requestSummary: cleanDraftText(draftPackage.requestSummary, 600) || undefined,
      documents,
      version: Math.max(1, Math.min(99, Number(draftPackage.version) || 1)),
    },
  };
  const outboundMessages = await buildLegalDraftPreviewFiles(officeId, fromNumber, action);
  return { replyText: legalDraftPreview(action), actionTaken: encodePendingAction(action), outboundMessages };
}

async function prepareClientDeletion(officeId: string, query?: string): Promise<WhatsAppAgentResult> {
  const cleanQuery = (query || '').trim().replace(/^(?:é|seria|o nome é|a cliente é|o cliente é)\s+/i, '');
  if (!cleanQuery) {
    const action: PendingDeleteClientAction = {
      id: randomUUID(),
      type: 'DELETE_CLIENT',
      createdAt: new Date().toISOString(),
      data: {},
    };
    return {
      replyText: 'Claro. Qual cliente você deseja excluir? Pode me dizer o nome completo ou o CPF.',
      actionTaken: encodePendingAction(action),
    };
  }

  const digits = normalizeCpfCnpj(cleanQuery);
  const clients = await prisma.client.findMany({
    where: {
      officeId,
      OR: [
        { name: { contains: cleanQuery, mode: 'insensitive' } },
        ...(digits ? [{ cpfCnpj: { contains: digits } }] : []),
      ],
    },
    take: 5,
    orderBy: { updatedAt: 'desc' },
  });
  if (clients.length === 0) {
    const action: PendingDeleteClientAction = {
      id: randomUUID(),
      type: 'DELETE_CLIENT',
      createdAt: new Date().toISOString(),
      data: {},
    };
    return {
      replyText: `Não encontrei cliente correspondente a “${cleanQuery}”. Tente outro nome ou informe o CPF.`,
      actionTaken: encodePendingAction(action),
    };
  }
  if (clients.length > 1) {
    const action: PendingDeleteClientAction = {
      id: randomUUID(),
      type: 'DELETE_CLIENT',
      createdAt: new Date().toISOString(),
      data: {},
    };
    return {
      replyText: `Encontrei mais de um cliente:\n\n${clients
        .map((client, index) => `${index + 1}. *${client.name}* — ${maskCpfCnpj(client.cpfCnpj)}`)
        .join('\n')}\n\nDiga o nome completo ou o CPF de quem deseja excluir.`,
      actionTaken: encodePendingAction(action),
    };
  }

  const client = clients[0];
  const action: PendingDeleteClientAction = {
    id: randomUUID(),
    type: 'DELETE_CLIENT',
    createdAt: new Date().toISOString(),
    data: { clientId: client.id, clientName: client.name, cpfCnpj: client.cpfCnpj },
  };
  return {
    replyText: `⚠️ *Confirmar exclusão de cliente*\n\n👤 ${client.name}\n🪪 ${maskCpfCnpj(client.cpfCnpj)}\n\nEssa ação remove o cadastro e não pode ser desfeita. Responda *CONFIRMAR* para excluir ou *CANCELAR* para manter.`,
    actionTaken: encodePendingAction(action),
  };
}

async function routeNaturalLanguageCommand(text: string): Promise<string | null> {
  const aiText = await callGemini(
    [{
      text: `Você é o roteador de comandos do AssinaJur. Identifique a intenção operacional da mensagem.
Retorne somente JSON válido com:
{
  "intent": "HELP|LIST_CLIENTS|SEARCH_CLIENT|STATUS|REMIND|CREATE_CLIENT|DELETE_CLIENT|GENERATE_TEMPLATE|GENERATE_KIT|CHAT",
  "client": "nome do cliente ou vazio",
  "document": "nome do modelo ou kit ou vazio"
}

Regras:
- Consultar pendências/assinaturas => STATUS.
- Procurar cadastro/dados de alguém => SEARCH_CLIENT.
- Cobrar, lembrar ou reenviar assinatura => REMIND.
- Cadastrar pessoa com dados => CREATE_CLIENT.
- Excluir, apagar ou remover cadastro de cliente => DELETE_CLIENT.
- Criar documento específico => GENERATE_TEMPLATE.
- Criar pacote/kit => GENERATE_KIT.
- Saudação, dúvida geral ou conversa sem ação => CHAT.

Mensagem: ${text}`,
    }],
    true
  );
  const parsed = aiText ? extractJson(aiText) : null;
  if (!parsed || typeof parsed.intent !== 'string') return null;
  const client = cleanOptional(parsed.client) || '';
  const document = cleanOptional(parsed.document) || '';
  switch (parsed.intent) {
    case 'HELP': return 'ajuda';
    case 'LIST_CLIENTS': return 'clientes';
    case 'SEARCH_CLIENT': return client ? `buscar cliente ${client}` : null;
    case 'STATUS': return 'status';
    case 'REMIND': return client ? `cobrar ${client}` : null;
    case 'CREATE_CLIENT': return `cadastrar cliente ${text}`;
    case 'DELETE_CLIENT': return client ? `excluir cliente ${client}` : 'excluir cliente';
    case 'GENERATE_TEMPLATE': return client && document ? `gerar ${document} para ${client}` : null;
    case 'GENERATE_KIT': return client && document ? `gerar kit ${document} para ${client}` : null;
    case 'CHAT': return '__CHAT__';
    default: return null;
  }
}

async function answerSafeConversation(officeId: string, fromNumber: string, text: string): Promise<string> {
  const recentLogs = await prisma.whatsAppLog.findMany({
    where: { officeId, fromNumber },
    orderBy: { createdAt: 'desc' },
    take: 8,
    select: { body: true, aiResponse: true },
  });
  const context = recentLogs
    .reverse()
    .map((log) => `Advogado: ${(log.body || '').slice(0, 500)}\nAssinaJur: ${(log.aiResponse || '').slice(0, 700)}`)
    .join('\n\n');
  const answer = await callGemini([{
    text: `Você é o AssinaJur Copilot, assistente privado do advogado administrador.
Converse de forma profissional, natural e breve em português brasileiro.
Você pode orientar sobre o uso do AssinaJur e ajudar a transformar o pedido em um dos recursos:
cadastro e exclusão segura de clientes, consulta, geração por modelo/kit, status e cobrança de assinatura.
Nunca diga que cadastrou, alterou, gerou ou enviou algo se nenhuma ação operacional foi executada.
Quando faltar informação, faça uma pergunta objetiva.

Histórico recente da conversa:
${context || 'Sem histórico anterior.'}

Mensagem do advogado: ${text}`,
  }]);
  return answer?.trim() || 'Entendi. Diga o que deseja fazer no AssinaJur ou digite *AJUDA* para consultar os recursos.';
}

async function handleTextCommand(
  officeId: string,
  fromNumber: string,
  originalBody: string,
  allowAiRouting = true,
  localRouting?: { command?: string; reply?: string; revision?: string; draftRequest?: LegalDraftRequest }
): Promise<WhatsAppAgentResult> {
  const text = originalBody.trim();
  const normalized = text.toLocaleLowerCase('pt-BR');

  if (/^(confirmar|confirmo|aprovar(?:\s+(?:a\s+)?minuta)?|(?:est[aá]\s+)?aprovad[oa]|minuta aprovada|pode aprovar|pode salvar|pode cadastrar|sim,? confirme)$/i.test(text)) {
    const action = await findLatestPendingAction(officeId, fromNumber);
    if (!action) {
      return {
        replyText: 'Não encontrei uma ação aguardando confirmação ou ela expirou. Envie o pedido novamente.',
        actionTaken: 'NO_PENDING_ACTION',
      };
    }
    if (action.type === 'GENERATE_LEGAL_DRAFT') {
      if (action.data.approvedAt) {
        return {
          replyText: '✅ Esta minuta já está aprovada. Quando quiser criar o documento definitivo e os links, diga *GERAR LINK*.',
          actionTaken: encodePendingAction(action),
        };
      }
      const approvedAction: PendingLegalDraftAction = {
        ...action,
        id: randomUUID(),
        createdAt: new Date().toISOString(),
        data: { ...action.data, approvedAt: new Date().toISOString() },
      };
      await prisma.auditLog.create({
        data: {
          officeId,
          eventType: 'AI_LEGAL_DRAFT_APPROVED_BY_WHATSAPP',
          description: `Minuta versão ${action.data.version} aprovada no WhatsApp para ${action.data.clientName}; documento definitivo ainda não gerado.`,
        },
      });
      return {
        replyText: [
          '✅ *Minuta aprovada*',
          '',
          `👤 ${action.data.clientName}`,
          `🔢 Versão ${action.data.version}`,
          '',
          'Nenhum documento definitivo ou link foi criado ainda.',
          'Quando desejar prosseguir, diga *GERAR LINK*.',
        ].join('\n'),
        actionTaken: encodePendingAction(approvedAction),
      };
    }
    return executePendingAction(officeId, action);
  }

  if (/^(?:pode\s+)?(?:gerar|gere|criar|crie|prepare|preparar)\s+(?:(?:o|os)\s+)?(?:link|links|documento definitivo|documentos definitivos)(?:\s+(?:de assinatura|para assinatura))?$/i.test(text)) {
    const action = await findLatestPendingAction(officeId, fromNumber);
    if (!action || action.type !== 'GENERATE_LEGAL_DRAFT') {
      return {
        replyText: 'Não encontrei uma minuta jurídica aprovada aguardando a geração do link.',
        actionTaken: 'NO_APPROVED_LEGAL_DRAFT',
      };
    }
    return executePendingAction(officeId, action);
  }

  if (/^(cancelar|cancela|não confirmar|descartar)$/i.test(text)) {
    const action = await findLatestPendingAction(officeId, fromNumber);
    return {
      replyText: action ? '🗑️ Ação descartada. Nenhuma alteração foi feita no AssinaJur.' : 'Não havia nenhuma ação pendente.',
      actionTaken: action ? `${EXECUTED_PREFIX}${action.id}` : 'NO_PENDING_ACTION',
    };
  }

  const existingPending = await findLatestPendingAction(officeId, fromNumber);
  if (existingPending?.type === 'GENERATE_LEGAL_DRAFT') {
    const linkClientMatch = text.match(/^(?:vincular|associar)\s+(?:a\s+minuta\s+)?(?:ao|a)\s+cliente\s+(.+)$/i);
    if (linkClientMatch) {
      const clients = await findSingleClient(officeId, linkClientMatch[1].trim());
      if (clients.length !== 1) {
        return {
          replyText: clients.length === 0
            ? `Não encontrei o cliente “${linkClientMatch[1].trim()}”. Confirme o nome/CPF ou cadastre-o primeiro.`
            : 'Encontrei mais de um cliente. Informe o nome completo ou CPF.',
          actionTaken: encodePendingAction(existingPending),
        };
      }
      const linkedAction: PendingLegalDraftAction = {
        ...existingPending,
        id: randomUUID(),
        createdAt: new Date().toISOString(),
        data: {
          ...existingPending.data,
          clientId: clients[0].id,
          clientName: clients[0].name,
          approvedAt: undefined,
          version: existingPending.data.version + 1,
        },
      };
      return {
        replyText: `${legalDraftPreview(linkedAction)}\n\n_O cliente foi vinculado e os dados foram preenchidos. Revise esta nova versão antes de aprovar._`,
        actionTaken: encodePendingAction(linkedAction),
        outboundMessages: await buildLegalDraftPreviewFiles(officeId, fromNumber, linkedAction),
      };
    }
    const fullTextMatch = text.match(/^(?:ver|mostrar|mostre)\s+(?:o\s+)?(?:texto|conte[uú]do|[ií]ntegra)(?:\s+(\d+))?$/i);
    if (fullTextMatch) {
      if (existingPending.data.documents.length > 1 && !fullTextMatch[1]) {
        return {
          replyText: `Este kit possui ${existingPending.data.documents.length} documentos. Diga *VER TEXTO 1*, *VER TEXTO 2* e assim por diante.`,
          actionTaken: encodePendingAction(existingPending),
        };
      }
      const documentIndex = Math.max(0, Number(fullTextMatch[1] || '1') - 1);
      const document = existingPending.data.documents[documentIndex];
      if (!document) {
        return {
          replyText: `Escolha um número entre 1 e ${existingPending.data.documents.length}.`,
          actionTaken: encodePendingAction(existingPending),
        };
      }
      const plainText = document.contentHtml
        .replace(/<\s*br\s*\/?>/gi, '\n')
        .replace(/<\/(?:p|h1|h2|li|ol|ul)>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      const chunks: string[] = [];
      for (let offset = 0; offset < plainText.length; offset += 3300) {
        chunks.push(plainText.slice(offset, offset + 3300));
      }
      return {
        replyText: `📖 Vou enviar a íntegra de *${document.title}* em ${chunks.length} parte(s). Depois, responda *CONFIRMAR*, *ALTERAR: [orientação]* ou *CANCELAR*.`,
        actionTaken: encodePendingAction(existingPending),
        outboundMessages: chunks.map((chunk, index) => ({
          to: fromNumber,
          text: `📄 *${document.title} — parte ${index + 1}/${chunks.length}*\n\n${chunk}`,
        })),
      };
    }
    const explicitRevision = text.match(/^(?:alterar|altere|revisar|revise|modificar|modifique|mudar|mude)\s*:?\s*(.+)$/i)?.[1]?.trim();
    const startsAnotherAction = /\b(?:cadastrar|cadastre|buscar|procurar|status|cobrar|excluir|remover|gerar link|criar link|aprovar|confirmar|cancelar|ajuda|menu)\b/i.test(text);
    const looksLikeDraftDetails = /\b(?:ela|ele|cliente|outorgante|outorgado|contratante|contratado|solteir[oa]|casad[oa]|advogad[oa]|residente|domiciliad[oa]|procura[cç][aã]o|contrato|poderes|valor|percentual|cl[aá]usula|geral|espec[ií]fic[oa])\b/i.test(text);
    const naturalStatement = !startsAnotherAction && !text.endsWith('?') && looksLikeDraftDetails ? text : '';
    const revision = explicitRevision || cleanOptional(localRouting?.revision) || naturalStatement;
    if (revision) {
      const client = existingPending.data.clientId
        ? await prisma.client.findFirst({ where: { id: existingPending.data.clientId, officeId } })
        : null;
      if (existingPending.data.clientId && !client) return { replyText: 'O cliente desta minuta não está mais disponível.', actionTaken: `${EXECUTED_PREFIX}${existingPending.id}` };
      return {
        replyText: 'Vou revisar a minuta com essas orientações. Aguarde alguns instantes…',
        actionTaken: encodePendingAction(existingPending),
        localAiTask: {
          type: 'REVISE_LEGAL_DRAFT',
          clientId: client?.id || '',
          clientName: client?.name || existingPending.data.clientName,
          clientContext: {
            nome: client?.name || '[CLIENTE NÃO VINCULADO]',
            cpfCnpj: client?.cpfCnpj || '[INFORMAR CPF]',
            rg: client?.rg || '[INFORMAR RG]',
            endereco: client ? [client.address, client.number, client.neighborhood, client.city, client.state].filter(Boolean).join(', ') : '[INFORMAR ENDEREÇO]',
          },
          request: {
            kind: existingPending.data.kind,
            clientQuery: client?.name || '',
            legalArea: existingPending.data.legalArea,
            instructions: existingPending.data.requestSummary,
            generic: !client,
          },
          existingDraft: existingPending.data,
          revisionInstructions: revision.slice(0, 3000),
        },
      };
    }
  }
  if (existingPending?.type === 'CREATE_OR_UPDATE_CLIENT') {
    const phoneCandidate = normalizePhone(text.match(/(?:telefone|celular|whatsapp|fone)?\s*\+?([\d\s().-]{10,20})/i)?.[1]);
    if (phoneCandidate.length >= 10 && phoneCandidate.length <= 13) {
      const updatedAction: PendingClientAction = {
        ...existingPending,
        id: randomUUID(),
        createdAt: new Date().toISOString(),
        data: { ...existingPending.data, phone: phoneCandidate, whatsapp: phoneCandidate },
      };
      return {
        replyText: clientPreview(updatedAction.data),
        actionTaken: encodePendingAction(updatedAction),
      };
    }
  }

  if (existingPending?.type === 'DELETE_CLIENT' && !existingPending.data.clientId) {
    const startsAnotherAction = /\b(cadastrar|cadastre|buscar|procurar|status|cobrar|gerar|criar|ajuda|menu|listar)\b/i.test(normalized);
    if (!startsAnotherAction) return prepareClientDeletion(officeId, text);
  }

  if (localRouting?.draftRequest) {
    return prepareLegalDraftTask(officeId, localRouting.draftRequest);
  }

  if (/^(ajuda|menu|comandos|o que você faz|oi|olá)$/i.test(normalized)) {
    return {
      replyText: [
        '🤖 *AssinaJur — Assistente do Escritório*',
        '',
        'Pode conversar normalmente. Alguns exemplos:',
        '',
        '• “Quero cadastrar um cliente”',
        '• “Procure o cadastro da Maria”',
        '• “Quero excluir um cliente”',
        '• “Quem ainda não assinou?”',
        '• “Cobre a assinatura do João”',
        '• “Gere uma procuração para Ana”',
        '• “Redija um contrato previdenciário com estes termos para Ana”',
        '• “Monte um kit trabalhista completo para João”',
        '• Envie uma foto de RG/CNH ou um áudio explicando o que precisa',
        '',
        'Quando faltar alguma informação, eu pergunto. Ações que alteram dados sempre pedem *CONFIRMAR*.',
      ].join('\n'),
      actionTaken: 'SHOW_HELP',
    };
  }

  const deleteMatch = text.match(/\b(?:remover|excluir|apagar|deletar)\b(?:\s+(?:o|a|um|uma))?\s*(?:cadastro\s+d[oa]\s+|cliente\s*)?(.*)$/i);
  if (deleteMatch) {
    return prepareClientDeletion(officeId, deleteMatch[1]);
  }

  const clientSearchMatch = normalized.match(/^(?:buscar|procurar|consultar|localizar|ver)\s+cliente\s+(.+)$/i);
  if (clientSearchMatch) {
    const query = clientSearchMatch[1].trim();
    const digits = normalizeCpfCnpj(query);
    const clients = await prisma.client.findMany({
      where: {
        officeId,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          ...(digits ? [{ cpfCnpj: { contains: digits } }] : []),
        ],
      },
      take: 5,
      orderBy: { updatedAt: 'desc' },
    });
    if (clients.length === 0) {
      return { replyText: `Não encontrei cliente correspondente a “${query}”.`, actionTaken: 'SEARCH_CLIENT_EMPTY' };
    }
    return {
      replyText: `🔎 *Clientes encontrados:*\n\n${clients
        .map((c, index) => `${index + 1}. *${c.name}*\n   CPF/CNPJ: ${maskCpfCnpj(c.cpfCnpj)}\n   Telefone: ${maskPhone(c.phone)}`)
        .join('\n\n')}`,
      actionTaken: 'SEARCH_CLIENT',
    };
  }

  if (/^(clientes|cliente|listar clientes|meus clientes|últimos clientes)$/i.test(normalized)) {
    const [clients, total] = await Promise.all([
      prisma.client.findMany({ where: { officeId }, take: 5, orderBy: { createdAt: 'desc' } }),
      prisma.client.count({ where: { officeId } }),
    ]);
    const list = clients.length
      ? clients.map((c, index) => `${index + 1}. *${c.name}* — ${maskCpfCnpj(c.cpfCnpj)}`).join('\n')
      : 'Nenhum cliente cadastrado.';
    return {
      replyText: `👥 *Clientes cadastrados:* ${total}\n\n${list}`,
      actionTaken: 'LIST_CLIENTS',
    };
  }

  if (normalized.includes('status') || normalized.includes('pendente') || normalized.includes('não assinou')) {
    const pendingDocs = await prisma.document.findMany({
      where: {
        officeId,
        status: { in: ['ENVIADO', 'PENDENTE', 'VISUALIZADO', 'PARCIALMENTE_ASSINADO'] },
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { client: true, signers: { orderBy: { signatureOrder: 'asc' } } },
    });
    if (pendingDocs.length === 0) {
      return { replyText: '✅ Não há documentos aguardando assinatura.', actionTaken: 'CHECK_STATUS_EMPTY' };
    }
    return {
      replyText: `📌 *Aguardando assinatura (${pendingDocs.length}):*\n\n${pendingDocs
        .map((doc, index) => {
          const waiting = doc.signers.filter((s) => s.status !== 'ASSINADO').map((s) => s.name).join(', ');
          return `${index + 1}. *${doc.title}*\n   Cliente: ${doc.client?.name || 'Não informado'}\n   Aguardando: ${waiting || '—'}`;
        })
        .join('\n\n')}\n\nUse *cobrar [nome]* para reenviar o link.`,
      actionTaken: 'CHECK_STATUS',
    };
  }

  const remindMatch = normalized.match(/^(?:(?:cobrar|lembrar|reenviar)\s+(?:cliente\s+)?|enviar\s+(?:o\s+)?links?\s+(?:de assinatura\s+)?para\s+)(.+)$/i);
  if (remindMatch) {
    const query = remindMatch[1].trim();
    const signer = await prisma.signer.findFirst({
      where: {
        status: { not: 'ASSINADO' },
        name: { contains: query, mode: 'insensitive' },
        document: { officeId, status: { notIn: ['CANCELADO', 'CONCLUIDO', 'EXPIRADO'] } },
      },
      include: { document: { include: { office: true } } },
      orderBy: { document: { createdAt: 'desc' } },
    });
    if (!signer) {
      return { replyText: `Não encontrei assinatura pendente para “${query}”.`, actionTaken: 'REMIND_SIGNATURE_EMPTY' };
    }
    const phone = normalizePhone(signer.phone);
    if (!phone) {
      return {
        replyText: `Encontrei ${signer.name}, mas o cadastro do signatário não possui WhatsApp.`,
        actionTaken: 'REMIND_SIGNATURE_NO_PHONE',
      };
    }
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.assinajur.com.br';
    const groupStart = new Date(signer.document.createdAt.getTime() - 2 * 60 * 1000);
    const relatedSigners = await prisma.signer.findMany({
      where: {
        status: { not: 'ASSINADO' },
        name: signer.name,
        phone: signer.phone,
        document: {
          officeId,
          clientId: signer.document.clientId,
          createdAt: { gte: groupStart, lte: signer.document.createdAt },
          status: { notIn: ['CANCELADO', 'CONCLUIDO', 'EXPIRADO'] },
        },
      },
      include: { document: { include: { office: true } } },
      orderBy: { document: { createdAt: 'asc' } },
      take: 6,
    });
    const signersToNotify = relatedSigners.length > 0 ? relatedSigners : [signer];
    return {
      replyText: `📤 Vou enviar agora ${signersToNotify.length === 1 ? 'o link' : `${signersToNotify.length} links`} para *${signer.name}* em ${maskPhone(phone)}.`,
      actionTaken: 'REMIND_SIGNATURE',
      outboundMessages: signersToNotify.map((item) => ({
        to: phone,
        text: `Olá, ${item.name}! O escritório ${item.document.office.tradeName || item.document.office.name} enviou o documento “${item.document.title}” para sua assinatura. Acesse: ${appUrl}/assinar/${item.token}`,
      })),
    };
  }

  const genericDraftMatch = text.match(/\b(procura[cç][aã]o|contrato|declara[cç][aã]o|peti[cç][aã]o|termo|minuta|modelo)\b/i);
  if (genericDraftMatch && /\b(?:gen[eé]ric[oa]|sem\s+(?:cadastrar|cadastro|vincular|cliente)|s[oó]\s+(?:a\s+)?minuta|apenas\s+(?:a\s+)?minuta)\b/i.test(text)) {
    return prepareLegalDraftTask(officeId, {
      kind: /\bkit\b/i.test(text) ? 'KIT' : 'DOCUMENT',
      clientQuery: '',
      title: genericDraftMatch[1],
      legalArea: /\b(?:inss|previdenci[aá]ri[oa]|aposentadoria|benef[ií]cio)\b/i.test(text) ? 'Previdenciário' : undefined,
      instructions: text,
      generic: true,
    });
  }

  const freeDraftMatch = text.match(/^(?:redigir|redija|elaborar|elabore)\s+(?:um|uma)?\s*(.+?)\s+para\s+(?:o\s+cliente\s+|a\s+cliente\s+)?(.+)$/i);
  if (freeDraftMatch) {
    return prepareLegalDraftTask(officeId, {
      kind: /\bkit\b/i.test(freeDraftMatch[1]) ? 'KIT' : 'DOCUMENT',
      clientQuery: freeDraftMatch[2].trim(),
      title: freeDraftMatch[1].trim(),
      instructions: text,
    });
  }

  const kitMatch = text.match(/^(?:gerar|gere|criar|crie|preparar|prepare|fazer|faça|faca)\s+kit\s+(.+?)\s+para\s+(.+)$/i);
  if (kitMatch) {
    const [, kitQuery, clientQuery] = kitMatch;
    const [kits, clients] = await Promise.all([
      prisma.legalKit.findMany({
        where: { officeId, active: true, name: { contains: kitQuery.trim(), mode: 'insensitive' } },
        take: 3,
      }),
      findSingleClient(officeId, clientQuery),
    ]);
    if (kits.length !== 1 || clients.length !== 1) {
      return {
        replyText: kits.length === 0
          ? `Não encontrei o kit “${kitQuery}”.`
          : clients.length === 0
            ? `Não encontrei o cliente “${clientQuery}”.`
            : 'Encontrei mais de uma possibilidade. Informe o nome mais completo do kit e do cliente.',
        actionTaken: 'KIT_OR_CLIENT_NOT_UNIQUE',
      };
    }
    const action: PendingKitAction = {
      id: randomUUID(),
      type: 'GENERATE_KIT',
      createdAt: new Date().toISOString(),
      data: { clientId: clients[0].id, clientName: clients[0].name, kitId: kits[0].id, kitName: kits[0].name },
    };
    return {
      replyText: `📦 *Preparar kit*\n\nKit: *${kits[0].name}*\nCliente: *${clients[0].name}*\n\nResponda *CONFIRMAR* para gerar os documentos ou *CANCELAR*.`,
      actionTaken: encodePendingAction(action),
    };
  }

  const templateMatch = text.match(/^(?:gerar|gere|criar|crie|preparar|prepare|fazer|faça|faca)\s+(.+?)\s+para\s+(.+)$/i);
  if (templateMatch) {
    const [, rawTemplateQuery, rawClientQuery] = templateMatch;
    const templateQuery = rawTemplateQuery.trim().replace(/^(?:um|uma|o|a)\s+/i, '');
    const clientQuery = inferDraftClientQuery(text, rawClientQuery);
    const [templates, clients] = await Promise.all([
      prisma.template.findMany({
        where: { officeId, active: true, title: { contains: templateQuery.trim(), mode: 'insensitive' } },
        take: 3,
      }),
      findSingleClient(officeId, clientQuery),
    ]);
    if (templates.length === 0) {
      return prepareLegalDraftTask(officeId, {
        kind: 'DOCUMENT',
        clientQuery,
        title: templateQuery,
        legalArea: /\b(?:inss|previdenci[aá]ri[oa]|aposentadoria|benef[ií]cio)\b/i.test(text) ? 'Previdenciário' : undefined,
        instructions: text,
      });
    }
    if (templates.length !== 1 || clients.length !== 1) {
      return {
        replyText: clients.length === 0
            ? `Não encontrei o cliente “${clientQuery}”.`
            : 'Encontrei mais de uma possibilidade. Informe o nome mais completo do modelo e do cliente.',
        actionTaken: 'TEMPLATE_OR_CLIENT_NOT_UNIQUE',
      };
    }
    const action: PendingTemplateAction = {
      id: randomUUID(),
      type: 'GENERATE_TEMPLATE',
      createdAt: new Date().toISOString(),
      data: {
        clientId: clients[0].id,
        clientName: clients[0].name,
        templateId: templates[0].id,
        templateName: templates[0].title,
      },
    };
    return {
      replyText: `📄 *Preparar documento*\n\nModelo: *${templates[0].title}*\nCliente: *${clients[0].name}*\n\nResponda *CONFIRMAR* para gerar ou *CANCELAR*.`,
      actionTaken: encodePendingAction(action),
    };
  }

  if (/\b(cadastrar|cadastre|novo cliente|nova cliente)\b/i.test(normalized)) {
    const draft = await extractClientDraftFromText(text, '');
    if (!draft) {
      return {
        replyText: 'Para preparar o cadastro, informe pelo menos *nome completo, CPF e telefone*. Você também pode enviar uma foto legível do RG ou da CNH.',
        actionTaken: 'CLIENT_DATA_REQUIRED',
      };
    }
    return createPendingClientAction(draft);
  }

  if (allowAiRouting) {
    try {
      if (localRouting?.command) {
        return handleTextCommand(officeId, fromNumber, localRouting.command, false);
      }
      if (localRouting?.reply) {
        return { replyText: localRouting.reply, actionTaken: 'LOCAL_AI_CONVERSATION' };
      }
      const routedCommand = await routeNaturalLanguageCommand(text);
      if (routedCommand === '__CHAT__') {
        return { replyText: await answerSafeConversation(officeId, fromNumber, text), actionTaken: 'SAFE_AI_CONVERSATION' };
      }
      if (routedCommand) {
        return handleTextCommand(officeId, fromNumber, routedCommand, false);
      }
    } catch (error) {
      console.error('Erro ao interpretar intenção do comando:', error);
    }
  }

  return {
    replyText: await answerSafeConversation(officeId, fromNumber, text),
    actionTaken: 'SAFE_AI_CONVERSATION_FALLBACK',
  };
}

export async function processWhatsAppCommand(input: WhatsAppIncomingMessage): Promise<WhatsAppAgentResult> {
  const {
    officeId,
    fromNumber,
    body,
    messageType,
    mediaBase64,
    mediaMimeType,
    documentData,
    naturalCommand,
    conversationReply,
    conversationRevision,
    draftRequest,
    localAiResult,
    trustedSource,
  } = input;
  if (!trustedSource && !isAuthorizedLawyerPhone(fromNumber)) {
    return {
      replyText: 'Este número não possui autorização para administrar o AssinaJur.',
      actionTaken: 'UNAUTHORIZED_PHONE',
    };
  }


  if (localAiResult) {
    return finalizeLegalDraft(officeId, fromNumber, localAiResult);
  }

  if (messageType === 'AUDIO' && mediaBase64) {
    try {
      const transcript = await transcribeAudio(mediaBase64, mediaMimeType);
      if (!transcript) throw new Error('Transcrição vazia');
      const result = await handleTextCommand(officeId, fromNumber, transcript);
      return { ...result, replyText: `🎙️ _Entendi: “${transcript.trim()}”_\n\n${result.replyText}` };
    } catch (error) {
      console.error('Erro ao interpretar áudio do WhatsApp:', error);
      return { replyText: 'Não consegui compreender o áudio. Tente novamente ou envie o comando em texto.', actionTaken: 'AUDIO_ERROR' };
    }
  }

  if (messageType === 'IMAGE' && documentData) {
    const name = cleanOptional(documentData.name);
    const cpfCnpj = normalizeCpfCnpj(cleanOptional(documentData.cpfCnpj));
    if (name && hasValidCpfCnpjCheckDigits(cpfCnpj)) {
      const extractedRg = cleanOptional(documentData.rg);
      const safeRg = normalizeCpfCnpj(extractedRg) === cpfCnpj ? undefined : extractedRg;
      const draft: ClientDraft = {
        name,
        cpfCnpj,
        phone: '',
        whatsapp: '',
        rg: safeRg,
        issuingOrgan: cleanOptional(documentData.issuingOrgan),
        birthDate: cleanOptional(documentData.birthDate),
        nationality: cleanOptional(documentData.nationality) || 'Brasileira',
        maritalStatus: cleanOptional(documentData.maritalStatus),
        profession: cleanOptional(documentData.profession),
        cep: cleanOptional(documentData.cep),
        address: cleanOptional(documentData.address),
        number: cleanOptional(documentData.number),
        neighborhood: cleanOptional(documentData.neighborhood),
        city: cleanOptional(documentData.city),
        state: cleanOptional(documentData.state)?.toUpperCase(),
      };
      return createPendingClientAction(draft);
    }
    console.error('[WhatsApp Vision] Leitura local recebida sem nome e CPF válidos; acionando contingência do servidor.');
  }

  if (messageType === 'IMAGE' && mediaBase64) {
    try {
      const draft = await extractClientDraftFromImage(mediaBase64, mediaMimeType, '');
      if (!draft) {
        return {
          replyText: 'Não consegui identificar nome e CPF com segurança. Envie uma foto mais nítida ou informe os dados em texto.',
          actionTaken: 'IMAGE_DATA_INCOMPLETE',
        };
      }
      return createPendingClientAction(draft);
    } catch (error) {
      console.error('Erro ao ler documento recebido pelo WhatsApp:', error);
      return { replyText: 'Não consegui processar a foto do documento. Tente uma imagem mais nítida.', actionTaken: 'IMAGE_ERROR' };
    }
  }

  return handleTextCommand(officeId, fromNumber, body || '', true, {
    command: cleanOptional(naturalCommand),
    reply: cleanOptional(conversationReply),
    revision: cleanOptional(conversationRevision),
    draftRequest,
  });
}
