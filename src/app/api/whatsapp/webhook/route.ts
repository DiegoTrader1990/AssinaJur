import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { processWhatsAppCommand } from '@/lib/whatsapp/agent';
import { handleMetaWebhookPayload } from '@/lib/whatsapp/meta';

export const dynamic = 'force-dynamic';

// GET: Verificacao do Webhook Oficial da Meta WhatsApp Cloud API
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const VERIFY_TOKEN = process.env.META_WA_VERIFY_TOKEN || 'assinajur_token';

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook Meta WhatsApp Verificado com Sucesso!');
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Token de verificação inválido.' }, { status: 403 });
}

// POST: Recebe eventos de mensagens da Meta WhatsApp API ou do Painel AssinaJur
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Se for um Webhook vindo da Meta WhatsApp API
    if (body.object === 'whatsapp_business_account') {
      const result = await handleMetaWebhookPayload(body);
      return NextResponse.json({ success: true, result });
    }

    // 2. Se for uma chamada do Painel Web do AssinaJur ou Daemon
    const { officeId, fromNumber, message, messageType, mediaBase64, mediaMimeType } = body;

    if (!fromNumber) {
      return NextResponse.json({ error: 'fromNumber é obrigatório.' }, { status: 400 });
    }

    // Resolver ID do escritorio seguro no Supabase
    let targetOfficeId = officeId;
    if (targetOfficeId) {
      const existingOffice = await prisma.office.findUnique({ where: { id: targetOfficeId } });
      if (!existingOffice) {
        const firstOffice = await prisma.office.findFirst();
        if (firstOffice) targetOfficeId = firstOffice.id;
      }
    } else {
      const firstOffice = await prisma.office.findFirst();
      if (firstOffice) targetOfficeId = firstOffice.id;
    }

    if (!targetOfficeId) {
      return NextResponse.json({ error: 'Nenhum escritório cadastrado no sistema.' }, { status: 400 });
    }

    const agentResult = await processWhatsAppCommand({
      officeId: targetOfficeId,
      fromNumber,
      body: message || '',
      messageType: messageType || 'TEXT',
      mediaBase64,
      mediaMimeType,
    });

    await prisma.whatsAppLog.create({
      data: {
        officeId: targetOfficeId,
        fromNumber,
        toNumber: 'AssinaJur AI Bot',
        direction: 'INBOUND',
        messageType: messageType || 'TEXT',
        body: message || (messageType === 'IMAGE' ? 'Foto de documento enviada' : 'Mensagem de mídia'),
        aiResponse: agentResult.replyText,
        actionTaken: agentResult.actionTaken,
      },
    });

    return NextResponse.json({
      success: true,
      reply: agentResult.replyText,
      actionTaken: agentResult.actionTaken,
    });
  } catch (error: any) {
    console.error('Erro no Webhook do WhatsApp:', error);
    return NextResponse.json({ error: 'Erro ao processar webhook do WhatsApp.', details: error.message }, { status: 500 });
  }
}
