import { prisma } from '@/lib/prisma';
import { processWhatsAppCommand } from '@/lib/whatsapp/agent';

/**
 * Cliente Oficial da Meta WhatsApp Business Cloud API (100% Gratuito da Meta).
 * Permite envio e recepcao instantanea de mensagens via Webhook oficial.
 */

export async function sendMetaWhatsAppMessage(
  toPhone: string,
  messageText: string,
  phoneNumberId?: string,
  accessToken?: string
) {
  const phoneId = phoneNumberId || process.env.META_WA_PHONE_NUMBER_ID;
  const token = accessToken || process.env.META_WA_ACCESS_TOKEN;

  if (!phoneId || !token) {
    console.warn('Meta WhatsApp API não configurada. Defina META_WA_PHONE_NUMBER_ID e META_WA_ACCESS_TOKEN.');
    return false;
  }

  const cleanPhone = toPhone.replace(/\D/g, '');

  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'text',
        text: { preview_url: true, body: messageText },
      }),
    });

    const data = await res.json();
    return res.ok;
  } catch (err) {
    console.error('Erro ao enviar mensagem Meta WhatsApp API:', err);
    return false;
  }
}

/**
 * Processador do Webhook Oficial da Meta (Recebe avisos quando cliente manda mensagem)
 */
export async function handleMetaWebhookPayload(body: any) {
  try {
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (!message) return { status: 'NO_MESSAGE' };

    const fromNumber = message.from;
    const messageType = message.type;
    let messageText = '';
    let mediaBase64 = undefined;
    let mediaMimeType = undefined;

    if (messageType === 'text') {
      messageText = message.text?.body || '';
    } else if (messageType === 'image') {
      messageText = 'Foto enviada via Meta WhatsApp';
    }

    // Processar pelo Agente Inteligente AssinaJur
    const result = await processWhatsAppCommand({
      officeId: 'office_demo',
      fromNumber,
      body: messageText,
      messageType: messageType === 'image' ? 'IMAGE' : 'TEXT',
      mediaBase64,
      mediaMimeType,
    });

    // Enviar a resposta de volta ao cliente via Meta WhatsApp Cloud API
    await sendMetaWhatsAppMessage(fromNumber, result.replyText);

    return { status: 'PROCESSED', reply: result.replyText, action: result.actionTaken };
  } catch (err) {
    console.error('Erro ao processar Webhook Meta WhatsApp:', err);
    return { status: 'ERROR', error: err };
  }
}
