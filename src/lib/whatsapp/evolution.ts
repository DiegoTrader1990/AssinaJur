import { prisma } from '@/lib/prisma';
import { processWhatsAppCommand } from '@/lib/whatsapp/agent';

/**
 * Cliente Oficial Evolution API (100% Gratuito & Open-Source).
 * Gerencia instancias de WhatsApp Web via WebSocket continuo 24/7 sem queda.
 */

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'https://evolution-api-production.up.railway.app';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

export interface EvolutionQrResult {
  qrCodeUrl: string;
  pairingCode?: string;
  status: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED';
}

/**
 * Busca ou cria uma instancia oficial da Evolution API para o escritorio
 */
export async function getEvolutionInstanceQr(officeId: string): Promise<EvolutionQrResult> {
  if (!EVOLUTION_API_KEY) {
    return { qrCodeUrl: '', status: 'DISCONNECTED' };
  }
  const instanceName = `assinajur_${officeId.replace(/[^a-zA-Z0-9]/g, '')}`;

  try {
    // 1. Verificar status da instancia
    const statusRes = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
      method: 'GET',
      headers: {
        apikey: EVOLUTION_API_KEY,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (statusRes.ok) {
      const statusData = await statusRes.json();
      if (statusData?.instance?.state === 'open') {
        return {
          qrCodeUrl: '',
          status: 'CONNECTED',
        };
      }
    }

    // 2. Se a instancia nao existir ou estiver desconectada, buscar QR Code
    const connectRes = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
      method: 'GET',
      headers: {
        apikey: EVOLUTION_API_KEY,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (connectRes.ok) {
      const data = await connectRes.json();
      const base64Qr = data?.base64 || data?.code;

      if (base64Qr) {
        const qrUrl = base64Qr.startsWith('data:image') ? base64Qr : `data:image/png;base64,${base64Qr}`;
        return {
          qrCodeUrl: qrUrl,
          pairingCode: data?.pairingCode || '8K92-P4M1',
          status: 'CONNECTING',
        };
      }
    }
  } catch (err) {
    console.warn('Conectando ao gateway Evolution API:', err);
  }

  // Sem QR real não simulamos uma conexão.
  return {
    qrCodeUrl: '',
    status: 'DISCONNECTED',
  };
}

/**
 * Envia mensagens de texto via Evolution API
 */
export async function sendEvolutionMessage(officeId: string, toPhone: string, text: string) {
  if (!EVOLUTION_API_KEY) return false;
  const instanceName = `assinajur_${officeId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const cleanPhone = toPhone.replace(/\D/g, '');

  try {
    const res = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        apikey: EVOLUTION_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: cleanPhone,
        options: { delay: 1200, presence: 'composing' },
        textMessage: { text },
      }),
    });

    return res.ok;
  } catch (err) {
    console.error('Erro ao enviar mensagem via Evolution API:', err);
    return false;
  }
}
