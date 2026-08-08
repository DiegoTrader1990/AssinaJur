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

    const session = await prisma.whatsAppSession.findUnique({
      where: { officeId: user.officeId },
    });

    const logs = await prisma.whatsAppLog.findMany({
      where: { officeId: user.officeId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      status: session?.status || 'DISCONNECTED',
      phoneNumber: session?.phoneNumber || null,
      autoRemind: session?.autoRemind ?? true,
      qrCode: session?.qrCode || null,
      logs: logs.map((l) => ({
        id: l.id,
        fromNumber: l.fromNumber,
        body: l.body,
        aiResponse: l.aiResponse,
        actionTaken: l.actionTaken,
        createdAt: l.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('Erro ao verificar status do WhatsApp:', error);
    return NextResponse.json({ error: 'Erro ao verificar status.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'CONNECT') {
      const session = await prisma.whatsAppSession.upsert({
        where: { officeId: user.officeId },
        update: { status: 'CONNECTED', phoneNumber: user.officeName ? `WhatsApp ${user.officeName}` : 'Conectado' },
        create: {
          officeId: user.officeId,
          status: 'CONNECTED',
          phoneNumber: `WhatsApp ${user.officeName}`,
        },
      });

      return NextResponse.json({ success: true, status: 'CONNECTED', session });
    }

    if (action === 'DISCONNECT') {
      const session = await prisma.whatsAppSession.upsert({
        where: { officeId: user.officeId },
        update: { status: 'DISCONNECTED', phoneNumber: null, qrCode: null },
        create: { officeId: user.officeId, status: 'DISCONNECTED' },
      });

      return NextResponse.json({ success: true, status: 'DISCONNECTED', session });
    }

    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
  } catch (error: any) {
    console.error('Erro ao alterar estado do WhatsApp:', error);
    return NextResponse.json({ error: 'Erro ao alterar estado.' }, { status: 500 });
  }
}
