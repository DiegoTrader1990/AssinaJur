import type { RogoDetails } from './participant-groups';
export type StampBox = { page: number; x: number; y: number; width: number; height: number };
export type StampParticipant = { signatureOrder: number; name: string; role: string; cpf?: string };
export type SignerStamp = StampBox & { order: number };
export const isWitnessStamp = (role: string) => role.startsWith('TESTEMUNHA');

export function editorParticipants(people: Array<{ name: string; role: string; cpf?: string; rogo?: RogoDetails }>, isIlliterate: boolean, rogoName: string): StampParticipant[] {
  let nextOrder = 1;
  const assign = (person: typeof people[number]) => { const order = nextOrder; nextOrder += person.rogo ? 2 : 1; return { ...person, name: person.rogo ? `${person.name} · a rogo: ${person.rogo.name}` : person.name, signatureOrder: order }; };
  if (!isIlliterate) return [...people.filter(p => !isWitnessStamp(p.role)), ...people.filter(p => isWitnessStamp(p.role))].map(assign);
  nextOrder = 3;
  const witnesses = people.slice(1).filter((p) => p.role === 'TESTEMUNHA');
  const others = people.slice(1).filter((p) => p.role !== 'TESTEMUNHA');
  return [
    { ...people[0], name: `${people[0]?.name || 'Cliente'} · a rogo: ${rogoName}`, signatureOrder: 1 },
    ...others.map(assign),
    ...witnesses.map((person, i) => assign({ ...person, role: `TESTEMUNHA_${i + 1}` })),
  ];
}

export function stampParticipants<T extends StampParticipant>(participants: T[], isIlliterate: boolean): T[] {
  return participants.filter((person) => person.role !== 'ASSINANTE_A_ROGO');
}

export function validateStamps(value: unknown, pageCount: number, participants: StampParticipant[]): SignerStamp[] {
  if (!Array.isArray(value) || value.length > participants.length) throw new Error('Posições de selos inválidas.');
  const seen = new Set<number>();
  return value.map((item) => {
    const { order, page, x, y, width, height } = item || {};
    if (!Number.isInteger(order) || !participants.some((person) => person.signatureOrder === order) || seen.has(order)) throw new Error('Participante do selo inválido.');
    if (!Number.isInteger(page) || page < 1 || page > pageCount || ![x, y, width, height].every((v) => typeof v === 'number' && Number.isFinite(v)) || x < 0 || y < 0 || width < 0.22 || width > 0.65 || height < 0.07 || height > 0.25 || x + width > 1.00001 || y + height > 1.00001) throw new Error('O selo precisa caber na página escolhida.');
    seen.add(order);
    return { order, page, x, y, width, height };
  });
}

export function encodeStamps(stamps: SignerStamp[]): string {
  return 'MULTI:' + JSON.stringify(stamps.map((s) => ({ o: s.order, p: s.page, x: s.x, y: s.y, w: s.width, h: s.height })));
}

export function decodeStamps(value: string, pageCount: number, participants: StampParticipant[]): SignerStamp[] | null {
  if (!value.startsWith('MULTI:')) return null;
  const parsed = JSON.parse(value.slice(6));
  if (!Array.isArray(parsed)) throw new Error('Posições de selos inválidas.');
  return validateStamps(parsed.map((s) => ({ order: s.o, page: s.p, x: s.x, y: s.y, width: s.w, height: s.h })), pageCount, participants);
}

// Uma linha sem identificação inequívoca não autoriza colocar selo sobre o contrato.
export function suggestStamps(placements: Array<StampBox & { caption?: string }>, participants: StampParticipant[]): SignerStamp[] {
  const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
  const result: SignerStamp[] = [];
  for (const person of participants) {
    const name = normalize(person.name);
    const matches = placements.filter((p) => name.length > 3 && normalize(p.caption || '').includes(name));
    if (matches.length !== 1) continue;
    const box = matches[0];
    if (result.some((p) => p.page === box.page && Math.abs(p.y - box.y) < Math.max(p.height, box.height))) continue;
    result.push({ order: person.signatureOrder, page: box.page, x: box.x, y: box.y, width: box.width, height: Math.max(0.1, box.height) });
  }
  return result.filter((p) => p.y + p.height <= 1);
}

// Mesmo retângulo visível usado pelo PDF.js: interseção de CropBox e MediaBox.
export function stampPageGeometry(media: { x: number; y: number; width: number; height: number }, crop: { x: number; y: number; width: number; height: number }, angle: number) {
  let x = Math.max(media.x, crop.x), y = Math.max(media.y, crop.y);
  let width = Math.min(media.x + media.width, crop.x + crop.width) - x;
  let height = Math.min(media.y + media.height, crop.y + crop.height) - y;
  if (width <= 0 || height <= 0) ({ x, y, width, height } = media);
  const rotation = ((angle % 360) + 360) % 360;
  const transforms: Record<number, [number, number, number, number, number, number]> = {
    0: [1, 0, 0, 1, x, y],
    90: [0, 1, -1, 0, x + width, y],
    180: [-1, 0, 0, -1, x + width, y + height],
    270: [0, -1, 1, 0, x, y + height],
  };
  if (!transforms[rotation]) throw new Error('Rotação da página inválida.');
  return { width: rotation % 180 ? height : width, height: rotation % 180 ? width : height, transform: transforms[rotation] };
}

export function overlappingStampOrders(stamps: SignerStamp[]): number[] {
  const orders = new Set<number>();
  stamps.forEach((a, index) => stamps.slice(index + 1).forEach(b => {
    if (a.page === b.page && a.x < b.x + b.width - 0.00001 && a.x + a.width > b.x + 0.00001 && a.y < b.y + b.height - 0.00001 && a.y + a.height > b.y + 0.00001) { orders.add(a.order); orders.add(b.order); }
  }));
  return [...orders];
}
