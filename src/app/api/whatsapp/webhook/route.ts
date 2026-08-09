import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { handleMetaWebhookPayload } from '@/lib/whatsapp/meta';
import { isAuthorizedLawyerPhone, processWhatsAppCommand } from '@/lib/whatsapp/agent';
import { brazilianPhoneVariants } from '@/lib/whatsapp/conversation';
import { getFileBuffer } from '@/lib/storage';
import { queueSignatureCompletionMessages } from '@/lib/whatsapp/signatureCompletion';
import { generateFinalPdfCertificate } from '@/lib/pdfCertificate';
import { ensureDefaultLegalLibrary } from '@/lib/defaultLegalLibrary';
import { PDFDocument } from 'pdf-lib';

export const dynamic = 'force-dynamic';

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function hasValidBridgeSecret(req: Request): boolean {
  const expected = process.env.WHATSAPP_BOT_SECRET;
  const supplied = req.headers.get('x-assinajur-bot-secret') || '';
  return Boolean(expected && supplied && safeEqual(supplied, expected));
}

function hasValidMetaSignature(req: Request, rawBody: string): boolean {
  const appSecret = process.env.META_WA_APP_SECRET;
  if (!appSecret) return process.env.NODE_ENV !== 'production';
  const supplied = req.headers.get('x-hub-signature-256') || '';
  const expected = `sha256=${createHmac('sha256', appSecret).update(rawBody).digest('hex')}`;
  return Boolean(supplied && safeEqual(supplied, expected));
}

function parseSessionMetadata(value?: string | null): Record<string, any> {
  try {
    const parsed = JSON.parse(value || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

async function mergeSessionMetadata(officeId: string, patch: Record<string, any>) {
  const current = await prisma.whatsAppSession.findUnique({ where: { officeId }, select: { sessionData: true } });
  const merged = { ...parseSessionMetadata(current?.sessionData), ...patch };
  return JSON.stringify(merged).slice(0, 24_000);
}

async function resolveBridgeOfficeId(fromNumber: string): Promise<string | null> {
  const configuredOfficeId = process.env.WHATSAPP_OFFICE_ID;
  if (configuredOfficeId) {
    const office = await prisma.office.findFirst({ where: { id: configuredOfficeId, active: true }, select: { id: true } });
    if (office) return office.id;
  }

  const users = await prisma.user.findMany({
    where: { active: true, office: { active: true }, phone: { not: null } },
    select: { officeId: true, phone: true },
  });
  const fromVariants = new Set(brazilianPhoneVariants(fromNumber));
  const matchingUser = users.find((user) => {
    const userVariants = new Set(brazilianPhoneVariants(user.phone || ''));
    return [...fromVariants].some((phone) => userVariants.has(phone));
  });
  if (matchingUser) return matchingUser.officeId;

  const offices = await prisma.office.findMany({ where: { active: true }, select: { id: true }, take: 2 });
  return offices.length === 1 ? offices[0].id : null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');
  const verifyToken = process.env.META_WA_VERIFY_TOKEN;

  if (verifyToken && mode === 'subscribe' && token && safeEqual(token, verifyToken)) {
    return new Response(challenge, { status: 200 });
  }
  return NextResponse.json({ error: 'Token de verificação inválido.' }, { status: 403 });
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    if (rawBody.length > 6_000_000) {
      return NextResponse.json({ error: 'Mensagem excede o limite permitido.' }, { status: 413 });
    }

    let body: Record<string, any>;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
    }

    if (body.object === 'whatsapp_business_account') {
      if (!hasValidMetaSignature(req, rawBody)) {
        return NextResponse.json({ error: 'Assinatura Meta inválida.' }, { status: 401 });
      }
      const result = await handleMetaWebhookPayload(body);
      return NextResponse.json({ success: true, result });
    }

    const sessionUser = await getSessionUser();
    const bridgeAuthenticated = hasValidBridgeSecret(req);
    if (!sessionUser && !bridgeAuthenticated) {
      return NextResponse.json(
        { error: 'Ponte do WhatsApp não autenticada. Configure WHATSAPP_BOT_SECRET no computador e na Vercel.' },
        { status: 401 }
      );
    }

    const fromNumber = String(body.fromNumber || '');
    if (!fromNumber) {
      return NextResponse.json({ error: 'fromNumber é obrigatório.' }, { status: 400 });
    }
    if (!sessionUser && !isAuthorizedLawyerPhone(fromNumber)) {
      return NextResponse.json({ error: 'Número não autorizado para administrar o AssinaJur.' }, { status: 403 });
    }

    const targetOfficeId = sessionUser?.officeId || (await resolveBridgeOfficeId(fromNumber));
    if (!targetOfficeId) {
      return NextResponse.json(
        { error: 'Não foi possível vincular o WhatsApp a um escritório. Configure WHATSAPP_OFFICE_ID na Vercel.' },
        { status: 409 }
      );
    }

    if (body.eventType === 'CONTEXT') {
      const phoneVariants = brazilianPhoneVariants(fromNumber);
      const logs = await prisma.whatsAppLog.findMany({
        where: { officeId: targetOfficeId, fromNumber: { in: phoneVariants } },
        select: { fromNumber: true, body: true, aiResponse: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
      return NextResponse.json({ success: true, logs: logs.reverse() });
    }

    if (body.eventType === 'QUEUE_LATEST_COMPLETION') {
      const document = await prisma.document.findFirst({
        where: {
          officeId: targetOfficeId,
          signedFileId: { not: null },
          status: 'CONCLUIDO',
        },
        orderBy: { updatedAt: 'desc' },
        select: { id: true, title: true },
      });
      if (!document) {
        return NextResponse.json({ success: false, error: 'Nenhum documento assinado foi encontrado.' }, { status: 404 });
      }
      await queueSignatureCompletionMessages(document.id);
      return NextResponse.json({ success: true, document });
    }

    if (body.eventType === 'REGENERATE_LATEST_CERTIFICATE') {
      const document = await prisma.document.findFirst({
        where: {
          officeId: targetOfficeId,
          status: 'CONCLUIDO',
          signers: { some: { status: 'ASSINADO' } },
        },
        orderBy: { updatedAt: 'desc' },
        select: { id: true, title: true },
      });
      if (!document) {
        return NextResponse.json({ success: false, error: 'Nenhum documento concluído foi encontrado.' }, { status: 404 });
      }
      const generated = await generateFinalPdfCertificate(document.id);
      return NextResponse.json({
        success: true,
        document,
        verificationCode: generated.verificationCode,
        signedFileId: generated.signedStorageFile.id,
      });
    }

    if (body.eventType === 'UPGRADE_LATEST_SIGNATURE_STAMP') {
      const document = await prisma.document.findFirst({
        where: { officeId: targetOfficeId, status: 'CONCLUIDO', signers: { some: { status: 'ASSINADO' } } },
        orderBy: { updatedAt: 'desc' },
        include: { originalFile: true },
      });
      if (!document?.originalFile) {
        return NextResponse.json({ success: false, error: 'Nenhum documento concluído foi encontrado.' }, { status: 404 });
      }
      const original = await getFileBuffer(targetOfficeId, document.originalFile.storageKey);
      if (!original) {
        return NextResponse.json({ success: false, error: 'O PDF original não foi encontrado.' }, { status: 404 });
      }
      const originalPdf = await PDFDocument.load(original, { ignoreEncryption: true });
      const page = originalPdf.getPageCount();
      await prisma.document.update({
        where: { id: document.id },
        data: { signaturePosition: `CUSTOM:${page}:0.3100:0.3980:0.3800:0.0850` },
      });
      const generated = await generateFinalPdfCertificate(document.id);
      return NextResponse.json({
        success: true,
        document: { id: document.id, title: document.title },
        page,
        verificationCode: generated.verificationCode,
      });
    }

    if (body.eventType === 'DOWNLOAD_LATEST_CERTIFICATE') {
      const document = await prisma.document.findFirst({
        where: { officeId: targetOfficeId, status: 'CONCLUIDO', signedFileId: { not: null } },
        orderBy: { updatedAt: 'desc' },
        include: { signedFile: true },
      });
      if (!document?.signedFile) {
        return NextResponse.json({ success: false, error: 'Nenhum certificado final foi encontrado.' }, { status: 404 });
      }
      const file = await getFileBuffer(targetOfficeId, document.signedFile.storageKey);
      if (!file) {
        return NextResponse.json({ success: false, error: 'O arquivo final não foi encontrado.' }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        document: { id: document.id, title: document.title },
        fileName: document.signedFile.originalName,
        mimeType: document.signedFile.mimeType,
        documentBase64: file.toString('base64'),
      });
    }

    if (body.eventType === 'ENSURE_DEFAULT_LEGAL_LIBRARY') {
      const library = await ensureDefaultLegalLibrary(targetOfficeId);
      return NextResponse.json({ success: true, library });
    }

    if (body.eventType === 'OUTBOX_PULL') {
      const pending = await prisma.whatsAppLog.findMany({
        where: {
          officeId: targetOfficeId,
          direction: 'OUTBOUND',
          actionTaken: { startsWith: 'PENDING_COMPLETION_' },
        },
        orderBy: { createdAt: 'asc' },
        take: 6,
      });
      const messages = [];
      for (const item of pending) {
        const ownerMatch = item.actionTaken?.match(/^PENDING_COMPLETION_OWNER:([^:]+)(?::.+)?$/);
        if (!ownerMatch) {
          messages.push({ id: item.id, to: item.toNumber, text: item.body });
          continue;
        }
        const document = await prisma.document.findFirst({
          where: { id: ownerMatch[1], officeId: targetOfficeId },
          include: { signedFile: true },
        });
        if (!document?.signedFile) continue;
        const file = await getFileBuffer(targetOfficeId, document.signedFile.storageKey);
        if (!file) continue;
        messages.push({
          id: item.id,
          to: item.toNumber,
          text: item.body,
          documentBase64: file.toString('base64'),
          fileName: document.signedFile.originalName,
          mimeType: document.signedFile.mimeType,
        });
      }
      return NextResponse.json({ success: true, messages });
    }

    if (body.eventType === 'OUTBOX_ACK') {
      const ids = Array.isArray(body.ids)
        ? body.ids.filter((id: unknown): id is string => typeof id === 'string').slice(0, 20)
        : [];
      if (ids.length > 0) {
        await prisma.whatsAppLog.updateMany({
          where: { id: { in: ids }, officeId: targetOfficeId, actionTaken: { startsWith: 'PENDING_COMPLETION_' } },
          data: { actionTaken: 'DELIVERED_SIGNATURE_COMPLETION' },
        });
      }
      return NextResponse.json({ success: true, acknowledged: ids.length });
    }

    if (body.eventType === 'STATUS') {
      const status = ['CONNECTED', 'CONNECTING', 'DISCONNECTED'].includes(body.status)
        ? body.status
        : 'DISCONNECTED';
      const whatsappSession = await prisma.whatsAppSession.upsert({
        where: { officeId: targetOfficeId },
        update: {
          status,
          phoneNumber: status === 'CONNECTED' ? String(body.phoneNumber || fromNumber) : null,
          sessionData: await mergeSessionMetadata(targetOfficeId, {
            botVersion: String(body.botVersion || ''),
            daemonStartedAt: body.daemonStartedAt || null,
            runtime: String(body.runtime || ''),
            providers: body.providers && typeof body.providers === 'object' ? body.providers : {},
            lastStatusAt: new Date().toISOString(),
          }),
        },
        create: {
          officeId: targetOfficeId,
          status,
          phoneNumber: status === 'CONNECTED' ? String(body.phoneNumber || fromNumber) : null,
          sessionData: JSON.stringify({
            botVersion: String(body.botVersion || ''),
            daemonStartedAt: body.daemonStartedAt || null,
            runtime: String(body.runtime || ''),
            providers: body.providers && typeof body.providers === 'object' ? body.providers : {},
            lastStatusAt: new Date().toISOString(),
          }),
        },
      });
      return NextResponse.json({ success: true, status: whatsappSession.status });
    }

    const messageType = ['TEXT', 'AUDIO', 'IMAGE', 'DOCUMENT'].includes(body.messageType)
      ? body.messageType
      : 'TEXT';
    const agentResult = await processWhatsAppCommand({
      officeId: targetOfficeId,
      fromNumber,
      body: String(body.message || ''),
      messageType,
      mediaBase64: typeof body.mediaBase64 === 'string' ? body.mediaBase64 : undefined,
      mediaMimeType: typeof body.mediaMimeType === 'string' ? body.mediaMimeType : undefined,
      documentData: body.documentData && typeof body.documentData === 'object' && !Array.isArray(body.documentData)
        ? body.documentData as Record<string, unknown>
        : undefined,
      naturalCommand: bridgeAuthenticated && typeof body.naturalCommand === 'string' ? body.naturalCommand : undefined,
      conversationReply: bridgeAuthenticated && typeof body.conversationReply === 'string' ? body.conversationReply : undefined,
      conversationRevision: bridgeAuthenticated && typeof body.conversationRevision === 'string' ? body.conversationRevision : undefined,
      draftRequest: bridgeAuthenticated && body.draftRequest && typeof body.draftRequest === 'object' && !Array.isArray(body.draftRequest)
        ? body.draftRequest
        : undefined,
      localAiResult: bridgeAuthenticated && body.localAiResult && typeof body.localAiResult === 'object' && !Array.isArray(body.localAiResult)
        ? body.localAiResult
        : undefined,
      trustedSource: Boolean(sessionUser),
    });

    await prisma.whatsAppLog.create({
      data: {
        officeId: targetOfficeId,
        fromNumber,
        toNumber: 'AssinaJur Controle Remoto',
        direction: 'INBOUND',
        messageType,
        body: String(body.message || (messageType === 'IMAGE' ? 'Foto de documento enviada' : 'Mensagem de mídia')),
        aiResponse: agentResult.replyText,
        actionTaken: agentResult.actionTaken,
      },
    });

    const diagnostic = body.diagnostic && typeof body.diagnostic === 'object' && !Array.isArray(body.diagnostic)
      ? body.diagnostic
      : null;
    const serverRecoveredDocument = Boolean(diagnostic && !diagnostic.complete && messageType !== 'TEXT' && agentResult.actionTaken?.startsWith('PENDING_ACTION:'));
    const finalDiagnostic = diagnostic
      ? {
          ...diagnostic,
          complete: diagnostic.complete || serverRecoveredDocument,
          provider: serverRecoveredDocument ? 'Contingência visual do servidor' : diagnostic.provider,
          error: serverRecoveredDocument ? '' : diagnostic.error,
        }
      : null;
    await prisma.whatsAppSession.upsert({
      where: { officeId: targetOfficeId },
      update: {
        sessionData: await mergeSessionMetadata(targetOfficeId, {
          ...(finalDiagnostic ? { lastDocumentDiagnostic: finalDiagnostic } : {}),
          lastCommand: {
            at: new Date().toISOString(),
            messageType,
            action: agentResult.actionTaken?.startsWith('PENDING_ACTION:') ? 'PENDING_ACTION' : agentResult.actionTaken?.startsWith('EXECUTED_ACTION:') ? 'EXECUTED_ACTION' : agentResult.actionTaken,
            success: !/ERROR|INCOMPLETE|FAILED/i.test(agentResult.actionTaken || ''),
          },
        }),
      },
      create: {
        officeId: targetOfficeId,
        status: 'DISCONNECTED',
        sessionData: JSON.stringify({ lastDocumentDiagnostic: finalDiagnostic, lastCommand: { at: new Date().toISOString(), messageType, action: agentResult.actionTaken } }),
      },
    });

    return NextResponse.json({
      success: true,
      reply: agentResult.replyText,
      actionTaken: agentResult.actionTaken,
      outboundMessages: agentResult.outboundMessages || [],
      localAiTask: agentResult.localAiTask,
    });
  } catch (error: any) {
    console.error('Erro no webhook do WhatsApp:', error);
    return NextResponse.json({ error: 'Erro ao processar mensagem do WhatsApp.' }, { status: 500 });
  }
}
