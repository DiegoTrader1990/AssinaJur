import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function parseMetadata(value?: string | null): Record<string, any> {
  try {
    const parsed = JSON.parse(value || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function summarizePendingFlow(logs: Array<{ actionTaken: string | null; createdAt: Date }>) {
  const executed = new Set(logs.map((log) => log.actionTaken || '').filter((value) => value.startsWith('EXECUTED_ACTION:')).map((value) => value.slice('EXECUTED_ACTION:'.length)));
  for (const log of logs) {
    const value = log.actionTaken || '';
    if (!value.startsWith('PENDING_ACTION:')) continue;
    try {
      const action = JSON.parse(Buffer.from(value.slice('PENDING_ACTION:'.length), 'base64url').toString('utf8'));
      if (!action?.id || executed.has(action.id)) return null;
      const ttl = action.type === 'GENERATE_LEGAL_DRAFT' ? 24 * 60 * 60 * 1000 : 15 * 60 * 1000;
      if (Date.now() - new Date(action.createdAt || log.createdAt).getTime() > ttl) return null;
      return {
        type: String(action.type || ''),
        createdAt: action.createdAt || log.createdAt,
        clientName: action.data?.clientName || action.data?.name || null,
        version: action.data?.version || null,
        approved: Boolean(action.data?.approvedAt),
        missingPhone: action.type === 'CREATE_OR_UPDATE_CLIENT' && !String(action.data?.phone || '').replace(/\D/g, ''),
      };
    } catch {
      return null;
    }
  }
  return null;
}

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

    const metadata = parseMetadata(session?.sessionData);
    const heartbeatAt = metadata.lastStatusAt || session?.updatedAt || null;
    const heartbeatFresh = heartbeatAt
      ? Date.now() - new Date(heartbeatAt).getTime() < 2 * 60 * 1000
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
      lastHeartbeatAt: heartbeatAt,
      bot: {
        version: metadata.botVersion || null,
        runtime: metadata.runtime || null,
        startedAt: metadata.daemonStartedAt || null,
        providers: metadata.providers || {},
      },
      lastDocumentDiagnostic: metadata.lastDocumentDiagnostic || null,
      lastCommand: metadata.lastCommand || null,
      currentFlow: summarizePendingFlow(logs),
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
