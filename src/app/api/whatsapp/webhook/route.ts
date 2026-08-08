import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { processWhatsAppCommand } from '@/lib/whatsapp/agent';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { officeId, fromNumber, message, messageType, mediaBase64, mediaMimeType } = body;

    if (!officeId || !fromNumber) {
      return NextResponse.json({ error: 'officeId e fromNumber são obrigatórios.' }, { status: 400 });
    }

    // 1. Processar a mensagem pelo Agente IA do AssinaJur
    const agentResult = await processWhatsAppCommand({
      officeId,
      fromNumber,
      body: message || '',
      messageType: messageType || 'TEXT',
      mediaBase64,
      mediaMimeType,
    });

    // 2. Gravar o log da mensagem no banco de dados para auditoria do escritorio
    await prisma.whatsAppLog.create({
      data: {
        officeId,
        fromNumber,
        toNumber: 'AssinaJur AI Bot',
        direction: 'INBOUND',
        messageType: messageType || 'TEXT',
        body: message || (messageType === 'IMAGE' ? 'Foto de documento enviada' : 'Mensagem de voz/mídia'),
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
    return NextResponse.json({ error: 'Erro ao processar webhook do WhatsApp.' }, { status: 500 });
  }
}
