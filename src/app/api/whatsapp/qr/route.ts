import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getGatewayQrCode } from '@/lib/whatsapp/gateway';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const gatewayData = await getGatewayQrCode(user.officeId);

    // Atualizar sessao no Supabase
    await prisma.whatsAppSession.upsert({
      where: { officeId: user.officeId },
      update: {
        qrCode: gatewayData.qrCode,
        status: gatewayData.status,
      },
      create: {
        officeId: user.officeId,
        qrCode: gatewayData.qrCode,
        status: gatewayData.status,
      },
    });

    return NextResponse.json({
      success: true,
      status: gatewayData.status,
      qrCode: gatewayData.qrCode,
      pairingCode: gatewayData.pairingCode,
    });
  } catch (error: any) {
    console.error('Erro ao obter QR Code do Gateway:', error);
    return NextResponse.json({ error: 'Erro ao obter QR Code.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const body = await req.json();
    const { phoneNumber } = body;

    const gatewayData = await getGatewayQrCode(user.officeId);

    return NextResponse.json({
      success: true,
      phoneNumber: phoneNumber || null,
      pairingCode: gatewayData.pairingCode,
      status: gatewayData.status,
      qrCode: gatewayData.qrCode,
    });
  } catch (error: any) {
    console.error('Erro ao solicitar código de pareamento por telefone:', error);
    return NextResponse.json({ error: 'Erro ao solicitar código de pareamento.' }, { status: 500 });
  }
}
