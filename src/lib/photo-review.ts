import type { Prisma } from '@prisma/client';

export const photoFields = ['documentFrontImage', 'documentBackImage', 'selfieCenterImage'] as const;
export type PhotoField = typeof photoFields[number];
export async function isIndividualRetry(db: Pick<Prisma.TransactionClient, 'documentEvent'>, documentId: string) {
  const reset = await db.documentEvent.findFirst({ where: { documentId, eventType: 'SIGNATURE_RESET' }, orderBy: { createdAt: 'desc' } });
  try { return JSON.parse(reset?.metadata || '{}').scope === 'DOCUMENT'; } catch { return false; }
}
export async function pendingPhotoCorrection(db: Pick<Prisma.TransactionClient, 'documentEvent'>,
  signer: { id: string; documentId: string; documentFrontImage: string | null; documentBackImage: string | null; selfieCenterImage: string | null }, field?: string) {
  const reset = await db.documentEvent.findFirst({ where: { documentId: signer.documentId, eventType: 'SIGNATURE_RESET' }, orderBy: { createdAt: 'desc' } });
  const requests = await db.documentEvent.findMany({ where: { signerId: signer.id, eventType: 'PHOTO_REDO_REQUESTED', ...(reset ? { createdAt: { gt: reset.createdAt } } : {}) }, orderBy: { createdAt: 'desc' } });
  // Com mais de uma foto pedida (ex.: "Refazer todas as fotos"), devolve a
  // primeira na ordem do fluxo (frente, verso, selfie) - antes voltava a do
  // pedido mais recente, e o link abria no verso em vez de começar pela frente.
  let found: { id: string; field: PhotoField } | null = null;
  for (const request of requests) {
    try {
      const requested = JSON.parse(request.metadata || '{}').field as PhotoField;
      if (photoFields.includes(requested) && (!field || field === requested) && !signer[requested]
        && (!found || photoFields.indexOf(requested) < photoFields.indexOf(found.field))) found = { id: request.id, field: requested };
    } catch { /* Metadados inválidos não autorizam alteração. */ }
  }
  return found;
}
