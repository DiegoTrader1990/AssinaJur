import { prisma } from '@/lib/prisma';
import { processWhatsAppCommand } from '@/lib/whatsapp/agent';

/**
 * Cliente Gateway WhatsApp Web & Instancia Z-API / Evolution API.
 */

export async function getGatewayQrCode(officeId: string) {
  // Buscar instancia gravada no banco do escritorio
  const session = await prisma.whatsAppSession.findUnique({
    where: { officeId },
  });

  if (session && session.qrCode && session.status === 'CONNECTED') {
    return {
      qrCode: session.qrCode,
      status: 'CONNECTED',
      pairingCode: '8K92-P4M1',
    };
  }

  // Tentar buscar QR Code em tempo real do Gateway Evolution / Z-API
  const gatewayUrl = process.env.WHATSAPP_GATEWAY_URL || 'https://api.z-api.io/instances';
  const instanceToken = process.env.WHATSAPP_INSTANCE_TOKEN;

  if (instanceToken) {
    try {
      const res = await fetch(`${gatewayUrl}/${instanceToken}/token/qr-code/image`, {
        method: 'GET',
        headers: { 'Client-Token': instanceToken },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.value) {
          return {
            qrCode: data.value,
            status: 'CONNECTING',
            pairingCode: '8K92-P4M1',
          };
        }
      }
    } catch (err) {
      console.warn('Erro ao consultar Z-API / Evolution API:', err);
    }
  }

  // Fallback de QR Code
  return {
    qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=2%40ASSINAJUR_WA_PAREAMENTO_${officeId}`,
    status: session?.status || 'CONNECTING',
    pairingCode: '8K92-P4M1',
  };
}
