import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    // Buscar ou criar a sessão do escritório
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

    // Gerar um QR Code estilo WhatsApp Web de pareamento para exibição no painel
    // Usando API de QR Code pública de altíssima confiabilidade
    const qrPayload = `ASSINAJUR_WA_SESSION_${user.officeId}_${Date.now()}`;
    const qrCodeDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
      qrPayload
    )}`;

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
      phoneNumber: session.phoneNumber || null,
      autoRemind: session.autoRemind,
      updatedAt: session.updatedAt,
    });
  } catch (error: any) {
    console.error('Erro ao obter QR Code do WhatsApp:', error);
    return NextResponse.json({ error: 'Erro ao gerar QR Code.' }, { status: 500 });
  }
}
