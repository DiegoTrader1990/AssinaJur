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
      take: 30,
    });

    const heartbeatFresh = session
      ? Date.now() - new Date(session.updatedAt).getTime() < 2 * 60 * 1000
      : false;
    const realStatus = session?.status === 'CONNECTED' && heartbeatFresh
      ? 'CONNECTED'
      : session?.status === 'CONNECTING' && heartbeatFresh
        ? 'CONNECTING'
        : 'DISCONNECTED';

    return NextResponse.json({
      success: true,
      status: realStatus,
      phoneNumber: realStatus === 'CONNECTED' ? session?.phoneNumber || null : null,
      autoRemind: session?.autoRemind ?? true,
      qrCode: session?.qrCode || null,
      lastHeartbeatAt: session?.updatedAt || null,
      logs: logs.map((l) => ({
        id: l.id,
        fromNumber: l.fromNumber,
        body: l.body,
        aiResponse: l.aiResponse,
        actionTaken: l.actionTaken?.startsWith('PENDING_ACTION:')
          ? 'PENDING_ACTION'
          : l.actionTaken?.startsWith('EXECUTED_ACTION:')
            ? 'EXECUTED_ACTION'
            : l.actionTaken,
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

    await req.json().catch(() => ({}));
    return NextResponse.json(
      { error: 'A conexão é controlada pelo AssinaJur-Bot no computador. Inicie ou encerre o bot local.' },
      { status: 409 }
    );
  } catch (error: any) {
    console.error('Erro ao alterar estado do WhatsApp:', error);
    return NextResponse.json({ error: 'Erro ao alterar estado.' }, { status: 500 });
  }
}
