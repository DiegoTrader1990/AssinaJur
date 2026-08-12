import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const EVENT_DESCRIPTIONS: Record<string, string> = {
  DOCUMENT_VIEWED: 'Documento aberto pelo signatário para leitura.',
  CAMERA_PERMITTED: 'Permissão de câmera concedida pelo signatário.',
  LIVENESS_STARTED: 'Prova de presença ao vivo iniciada pelo signatário.',
  SELFIE_CENTER_VALIDATED: 'Registro facial frontal capturado durante a prova de presença.',
  SELFIE_LEFT_VALIDATED: 'Registro facial de perfil esquerdo capturado durante a prova de presença.',
  SELFIE_RIGHT_VALIDATED: 'Registro facial de perfil direito capturado durante a prova de presença.',
  CONSENT_ACCEPTED: 'Declaração de ciência e concordância aceita pelo signatário.',
};

export async function POST(req: Request, { params }: { params: { token: string } }) {
  try {
    const { eventType } = await req.json();
    if (!EVENT_DESCRIPTIONS[eventType]) return NextResponse.json({ error: 'Evento inválido.' }, { status: 400 });
    const signer = await prisma.signer.findUnique({ where: { token: params.token }, include: { document: true } });
    if (!signer?.document || signer.status === 'ASSINADO') return NextResponse.json({ success: true });
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Navegador Mobile';
    const targets = signer.document.kitBatchId && signer.role === 'CLIENTE'
      ? await prisma.document.findMany({
          where: { kitBatchId: signer.document.kitBatchId, clientId: signer.document.clientId, status: { notIn: ['CANCELADO', 'EXPIRADO'] } },
          include: { signers: { where: { role: 'CLIENTE' }, select: { id: true } } },
        })
      : [{ id: signer.document.id, signers: [{ id: signer.id }] }];
    await prisma.documentEvent.createMany({ data: targets.flatMap((document) => {
      const targetSigner = document.signers[0];
      return targetSigner ? [{ documentId: document.id, signerId: targetSigner.id, eventType, description: EVENT_DESCRIPTIONS[eventType], ipAddress, userAgent }] : [];
    }) });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Não foi possível registrar a evidência.' }, { status: 500 });
  }
}
