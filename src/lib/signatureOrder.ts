import { prisma } from '@/lib/prisma';

export const SIGNATURE_ORDER_EVENT = 'SIGNATURE_ORDER_ENFORCED';

type OrderedSigner = {
  id: string;
  name: string;
  role: string;
  status: string;
  signatureOrder: number;
};

export function findBlockingSigner(signers: OrderedSigner[], currentSignerId: string) {
  const current = signers.find((signer) => signer.id === currentSignerId);
  if (!current) return null;

  return signers
    .filter((signer) => signer.id !== currentSignerId && signer.signatureOrder < current.signatureOrder && signer.status !== 'ASSINADO')
    .sort((a, b) => a.signatureOrder - b.signatureOrder)[0] || null;
}

export async function getSignatureOrderBlock(documentId: string, currentSignerId: string) {
  const enforced = await prisma.documentEvent.findFirst({
    where: { documentId, eventType: SIGNATURE_ORDER_EVENT },
    select: { id: true },
  });
  if (!enforced) return null;

  const signers = await prisma.signer.findMany({
    where: { documentId },
    select: { id: true, name: true, role: true, status: true, signatureOrder: true },
    orderBy: { signatureOrder: 'asc' },
  });
  return findBlockingSigner(signers, currentSignerId);
}

export function signatureOrderError(blocker: { name: string; role: string; signatureOrder: number }) {
  return `Este documento segue uma ordem de assinatura. Aguarde ${blocker.name} (${blocker.role}) concluir a etapa ${blocker.signatureOrder}.`;
}
