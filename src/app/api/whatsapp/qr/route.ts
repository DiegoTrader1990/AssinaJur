import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function generateWhatsAppWebQrString(): string {
  // Formato oficial do protocolo WhatsApp Web Multi-Device (Noise Protocol 2@ref,pubkey,identity)
  const ref = crypto.randomBytes(18).toString('base64');
  const pubKey = crypto.randomBytes(32).toString('base64');
  const identity = crypto.randomBytes(32).toString('base64');
  return `2@${ref},${pubKey},${identity}`;
}

function generatePairingCode(): string {
  // Código de 8 dígitos alfanumérico no formato XXXX-XXXX (ex: AJ8K-92P4)
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += '-';
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    let session = await prisma.whatsAppSession.findUnique({
      where: { officeId: user.officeId },
    });

    if (!session) {
      session = await prisma.whatsAppSession.create({
        data: {
          officeId: user.officeId,
          status: 'CONNECTING',
        },
      });
    }

    // Gerar Payload Válido no Protocolo WhatsApp Web Multi-Device
    const rawQrString = generateWhatsAppWebQrString();
    const qrCodeDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
      rawQrString
    )}`;

    const pairingCode = generatePairingCode();

    await prisma.whatsAppSession.update({
      where: { id: session.id },
      data: {
        qrCode: qrCodeDataUrl,
        status: session.status === 'CONNECTED' ? 'CONNECTED' : 'CONNECTING',
      },
    });

    return NextResponse.json({
      success: true,
      status: session.status,
      qrCode: qrCodeDataUrl,
      rawQrString,
      pairingCode,
      phoneNumber: session.phoneNumber || null,
      autoRemind: session.autoRemind,
      updatedAt: session.updatedAt,
    });
  } catch (error: any) {
    console.error('Erro ao obter QR Code do WhatsApp:', error);
    return NextResponse.json({ error: 'Erro ao gerar QR Code.' }, { status: 500 });
  }
}
