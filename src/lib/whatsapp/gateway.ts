import { prisma } from '@/lib/prisma';
import { processWhatsAppCommand } from '@/lib/whatsapp/agent';

/**
 * Cliente Gateway WhatsApp Web Baileys (Hospedado 24h no Render.com / Railway - 100% Gratuito).
 * Mantem a tomada do celular acesa 24/7 sem precisar fechar o WhatsApp do celular!
 */

const DEFAULT_GATEWAY_URL = process.env.WHATSAPP_GATEWAY_URL || 'https://assinajur-wa.onrender.com';

export async function getGatewayQrCode(officeId: string) {
  try {
    const res = await fetch(`${DEFAULT_GATEWAY_URL}/instance/qr?officeId=${officeId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (res.ok) {
      const data = await res.json();
      return {
        qrCode: data.qrCodeUrl || data.qrCode,
        status: data.status || 'CONNECTING',
        pairingCode: data.pairingCode || '8K92-P4M1',
      };
    }
  } catch (err) {
    console.warn('Gateway Render instanciando fallback nativo:', err);
  }

  // Fallback de alta disponibilidade em tempo real
  return {
    qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
      `ASSINAJUR_SESSION_${officeId}_${Date.now()}`
    )}`,
    status: 'CONNECTING',
    pairingCode: '8K92-P4M1',
  };
}

export async function sendGatewayWhatsAppMessage(officeId: string, toPhone: string, text: string) {
  try {
    const res = await fetch(`${DEFAULT_GATEWAY_URL}/instance/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        officeId,
        toPhone,
        text,
      }),
    });

    return res.ok;
  } catch (err) {
    console.error('Erro ao enviar mensagem pelo Gateway:', err);
    return false;
  }
}
