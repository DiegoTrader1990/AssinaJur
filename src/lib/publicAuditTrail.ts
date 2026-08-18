export type PublicAuditEvent = {
  eventType: string;
  signerId?: string | null;
};

export function dedupePublicAuditEvents<T extends PublicAuditEvent>(events: T[]): T[] {
  // Cada marco da trilha pública representa um momento único do processo de
  // assinatura (permissão de câmera, CPF confirmado, selfie validada etc.).
  // Repetições técnicas (ex.: o navegador reconsultando a permissão de câmera
  // várias vezes) não devem poluir o certificado - mantemos apenas a primeira
  // ocorrência de cada tipo de evento por signatário, na ordem cronológica.
  const seen = new Set<string>();
  return events.filter((event) => {
    const key = `${event.eventType}::${event.signerId || 'document'}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
