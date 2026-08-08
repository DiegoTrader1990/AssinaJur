import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getEvolutionInstanceQr } from '@/lib/whatsapp/evolution';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const evoData = await getEvolutionInstanceQr(user.officeId);

    await prisma.whatsAppSession.upsert({
      where: { officeId: user.officeId },
      update: {
        qrCode: evoData.qrCodeUrl,
        status: evoData.status,
      },
      create: {
        officeId: user.officeId,
        qrCode: evoData.qrCodeUrl,
        status: evoData.status,
      },
    });

    return NextResponse.json({
      success: true,
      status: evoData.status,
      qrCode: evoData.qrCodeUrl,
      pairingCode: evoData.pairingCode,
    });
  } catch (error: any) {
    console.error('Erro ao obter QR Code da Evolution API:', error);
    return NextResponse.json({ error: 'Erro ao obter QR Code.' }, { status: 500 });
  }
}
