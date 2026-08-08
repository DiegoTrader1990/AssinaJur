import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getOrRefreshWhatsAppSession } from '@/lib/whatsapp/baileys';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const sessionData = await getOrRefreshWhatsAppSession(user.officeId);

    return NextResponse.json({
      success: true,
      status: sessionData.status,
      qrCode: sessionData.qrCodeUrl,
      rawQrString: sessionData.rawQrString,
      pairingCode: sessionData.pairingCode,
    });
  } catch (error: any) {
    console.error('Erro ao obter QR Code do WhatsApp:', error);
    return NextResponse.json({ error: 'Erro ao gerar QR Code.' }, { status: 500 });
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

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Número de telefone é obrigatório.' }, { status: 400 });
    }

    const sessionData = await getOrRefreshWhatsAppSession(user.officeId, phoneNumber);

    return NextResponse.json({
      success: true,
      phoneNumber,
      pairingCode: sessionData.pairingCode,
      status: sessionData.status,
      qrCode: sessionData.qrCodeUrl,
    });
  } catch (error: any) {
    console.error('Erro ao solicitar código de pareamento por telefone:', error);
    return NextResponse.json({ error: 'Erro ao solicitar código de pareamento.' }, { status: 500 });
  }
}
