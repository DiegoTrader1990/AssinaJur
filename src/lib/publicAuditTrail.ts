export type PublicAuditEvent = {
  eventType: string;
  signerId?: string | null;
};

export function dedupePublicAuditEvents<T extends PublicAuditEvent>(events: T[]): T[] {
  const confirmedSigners = new Set<string>();
  return events.filter((event) => {
    if (event.eventType !== 'IDENTITY_CONFIRMED') return true;
    const key = event.signerId || 'document';
    if (confirmedSigners.has(key)) return false;
    confirmedSigners.add(key);
    return true;
  });
}
