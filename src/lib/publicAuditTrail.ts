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


// "Refazer do zero": a tentativa anterior à reinicialização (SIGNATURE_RESET)
// não produziu assinatura e não entra na trilha pública - continua guardada
// no histórico interno. Reinício de uma pessoa (metadata.signerId) só oculta
// os eventos dela; reinício do documento inteiro oculta todos os anteriores.
export function dropResetAttempts<T extends PublicAuditEvent & { createdAt: Date | string; metadata?: string | null }>(events: T[]): T[] {
  const resets = events.filter((event) => event.eventType === 'SIGNATURE_RESET').map((event) => {
    let signerId: string | null = null;
    try { signerId = JSON.parse(event.metadata || '{}').signerId || null; } catch { signerId = null; }
    return { at: new Date(event.createdAt).getTime(), signerId };
  });
  if (!resets.length) return events;
  return events.filter((event) => {
    const at = new Date(event.createdAt).getTime();
    return !resets.some((reset) => at < reset.at && (!reset.signerId || reset.signerId === event.signerId));
  });
}
