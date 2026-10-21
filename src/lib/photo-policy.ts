export const PHOTO_POLICY_EVENT = 'PHOTO_POLICY_CONFIGURED';
export type PhotoPolicy = 'COM_FOTOS' | 'SEM_FOTOS';
export function parsePhotoPolicy(value: unknown): PhotoPolicy {
  if (value === undefined) return 'COM_FOTOS';
  if (value !== 'COM_FOTOS' && value !== 'SEM_FOTOS') throw new Error('Modalidade de identificação inválida.');
  return value;
}
export function photoPolicyFromEvents(events: Array<{ eventType: string; metadata?: string | null }>): PhotoPolicy {
  const configs = events.filter(e => e.eventType === PHOTO_POLICY_EVENT);
  if (!configs.length) return 'COM_FOTOS';
  const policies = configs.map(e => {
    const config = JSON.parse(e.metadata || '{}');
    if (config.version !== 1 || !config.mode) throw new Error('Configuração de identificação inválida.');
    return parsePhotoPolicy(config.mode);
  });
  if (policies.some(p => p !== policies[0])) throw new Error('Configuração de identificação conflitante.');
  return policies[0];
}
export async function loadPhotoPolicy(db: any, documentId: string): Promise<PhotoPolicy> {
  return photoPolicyFromEvents(await db.documentEvent.findMany({ where: { documentId, eventType: PHOTO_POLICY_EVENT }, select: { eventType: true, metadata: true } }));
}
export function photoPolicyEvent(mode: PhotoPolicy, userId: string) {
  return { userId, eventType: PHOTO_POLICY_EVENT, metadata: JSON.stringify({ version: 1, mode }),
    description: mode === 'SEM_FOTOS' ? 'Escritório escolheu assinatura sem coleta de fotos de documento e selfie para todos os participantes deste envio.' : 'Escritório escolheu assinatura com fotos de documento e selfie para este envio.' };
}
export const evidenceImageFields = ['documentFrontImage', 'documentBackImage', 'selfieCenterImage', 'selfieLeftImage', 'selfieRightImage'] as const;
export function withoutPhotos(person: any) {
  return { ...person, ...Object.fromEntries(evidenceImageFields.map(field => [field, null])) };
}
export function validatePhotoFreeConsent(person: any, rogado = false): boolean {
  if (!person || typeof person.signedConsentText !== 'string' || person.signedConsentText.trim().length < 15 || person.signedConsentText.length > 10000) return false;
  if (rogado) return person.signatureType === 'CONSENTIMENTO_A_ROGO';
  if (!['DESENHADA', 'DIGITADA', 'SELO_DIGITAL'].includes(person.signatureType)) return false;
  return person.signatureType !== 'DESENHADA' || (typeof person.signatureImage === 'string' && /^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(person.signatureImage) && person.signatureImage.length > 100 && person.signatureImage.length < 2000000);
}
