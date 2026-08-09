import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { handleMetaWebhookPayload } from '@/lib/whatsapp/meta';
import { isAuthorizedLawyerPhone, processWhatsAppCommand } from '@/lib/whatsapp/agent';

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

function brazilianPhoneVariants(value: string): Set<string> {
  const digits = value.replace(/\D/g, '');
  const withCountry = digits.startsWith('55') ? digits : `55${digits}`;
  const variants = new Set<string>([digits, withCountry]);

  // A infraestrutura do WhatsApp ainda pode entregar números brasileiros no formato
  // legado sem o nono dígito. Consideramos as duas representações equivalentes.
  if (withCountry.length === 13 && withCountry[4] === '9') {
    variants.add(`${withCountry.slice(0, 4)}${withCountry.slice(5)}`);
  } else if (withCountry.length === 12) {
    variants.add(`${withCountry.slice(0, 4)}9${withCountry.slice(4)}`);
  }
  return variants;
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
  const fromVariants = brazilianPhoneVariants(fromNumber);
  const matchingUser = users.find((user) => {
    const userVariants = brazilianPhoneVariants(user.phone || '');
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

    if (body.eventType === 'STATUS') {
      const status = ['CONNECTED', 'CONNECTING', 'DISCONNECTED'].includes(body.status)
        ? body.status
        : 'DISCONNECTED';
      const whatsappSession = await prisma.whatsAppSession.upsert({
        where: { officeId: targetOfficeId },
        update: {
          status,
          phoneNumber: status === 'CONNECTED' ? String(body.phoneNumber || fromNumber) : null,
        },
        create: {
          officeId: targetOfficeId,
          status,
          phoneNumber: status === 'CONNECTED' ? String(body.phoneNumber || fromNumber) : null,
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

    return NextResponse.json({
      success: true,
      reply: agentResult.replyText,
      actionTaken: agentResult.actionTaken,
      outboundMessages: agentResult.outboundMessages || [],
    });
  } catch (error: any) {
    console.error('Erro no webhook do WhatsApp:', error);
    return NextResponse.json({ error: 'Erro ao processar mensagem do WhatsApp.' }, { status: 500 });
  }
}
