import type { Prisma } from '@prisma/client';

export class InvalidKitTemplatesError extends Error {
  constructor() {
    super('Selecione apenas modelos ativos deste escritório.');
  }
}

export function validTemplateIds(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 &&
    value.every((id) => typeof id === 'string' && id.trim().length > 0) &&
    new Set(value).size === value.length;
}

export async function assertKitTemplates(
  tx: Pick<Prisma.TransactionClient, 'template'>,
  officeId: string,
  templateIds: string[],
) {
  const count = await tx.template.count({
    where: { id: { in: templateIds }, officeId, active: true },
  });
  if (count !== templateIds.length) throw new InvalidKitTemplatesError();
}
