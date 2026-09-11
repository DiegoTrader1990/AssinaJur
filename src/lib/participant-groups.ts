export const PARTICIPANT_GROUPS_EVENT = 'PARTICIPANT_GROUPS_CONFIGURED';
export type RogoDetails = { name: string; cpf: string; birthDate: string; address: string; relationship?: string };
export type RogoGroup = { partyOrder: number; rogoOrder: number; details?: RogoDetails };
type Person = { signatureOrder: number; role: string; name: string; cpf?: string };

// Ordens são estáveis dentro do envio e também na cópia integral de um kit.
export function configuredGroups(document: { isIlliterate?: boolean; events?: Array<{ eventType: string; metadata?: string | null }> }, people: Person[]): RogoGroup[] {
  const event = document.events?.find(e => e.eventType === PARTICIPANT_GROUPS_EVENT);
  if (event) {
    const groups: RogoGroup[] = JSON.parse(event.metadata || '[]');
    if (!Array.isArray(groups)) throw new Error('Configuração de participantes inválida.');
    const used = new Set<number>();
    for (const group of groups) {
      const party = people.find(p => p.signatureOrder === group.partyOrder);
      const rogo = people.find(p => p.signatureOrder === group.rogoOrder);
      if (!party || !rogo || party.role.startsWith('TESTEMUNHA') || party.role === 'ASSINANTE_A_ROGO' || rogo.role !== 'ASSINANTE_A_ROGO' || used.has(group.partyOrder) || used.has(group.rogoOrder)) throw new Error('Vínculo a rogo inválido.');
      used.add(group.partyOrder); used.add(group.rogoOrder);
    }
    return groups;
  }
  const party = people.find(p => p.role === 'CLIENTE');
  const rogo = people.find(p => p.role === 'ASSINANTE_A_ROGO');
  return document.isIlliterate && party && rogo ? [{ partyOrder: party.signatureOrder, rogoOrder: rogo.signatureOrder }] : [];
}

export function expandRogoParticipants<T extends Person & { rogo?: RogoDetails; signingMode?: string }>(people: T[], legacyRogo: boolean) {
  const participants: Array<T | (Person & { cpf: string; signingMode: string; authMethod: string })> = [];
  const groups: RogoGroup[] = [];
  let witnessNumber = 0;
  const orderedPeople = [...people.filter(p => !p.role.startsWith('TESTEMUNHA')), ...people.filter(p => p.role.startsWith('TESTEMUNHA'))];
  for (const person of orderedPeople) {
    if (person.role === 'ASSINANTE_A_ROGO' && (!legacyRogo || person !== people[1])) throw new Error('Cadastre o acompanhante dentro da parte que ele acompanha.');
    const partyOrder = participants.length + 1;
    participants.push({ ...person, role: person.role.startsWith('TESTEMUNHA') ? `TESTEMUNHA_${++witnessNumber}` : person.role, signatureOrder: partyOrder });
    if (person.rogo) {
      if (person.role.startsWith('TESTEMUNHA') || person.role === 'ASSINANTE_A_ROGO') throw new Error('Vincule o assinante a rogo a uma parte, não a outro acompanhante ou testemunha.');
      const rogoOrder = participants.length + 1;
      participants.push({ name: person.rogo.name, cpf: person.rogo.cpf, role: 'ASSINANTE_A_ROGO', signatureOrder: rogoOrder, signingMode: 'SAME_DEVICE', authMethod: 'LINK_CPF_PRESENCA' });
      groups.push({ partyOrder, rogoOrder, details: person.rogo });
    }
  }
  if (legacyRogo) {
    const party = participants[0], rogo = participants.find(p => p.role === 'ASSINANTE_A_ROGO');
    if (!party || !rogo || people[0].rogo) throw new Error('Confira o acompanhante da primeira parte.');
    groups.unshift({ partyOrder: party.signatureOrder, rogoOrder: rogo.signatureOrder });
  }
  return { participants, groups };
}

export async function loadParticipantGroups(db: any, document: { id: string; isIlliterate?: boolean }, people: Person[]) {
  const events = await db.documentEvent.findMany({ where: { documentId: document.id, eventType: PARTICIPANT_GROUPS_EVENT }, select: { eventType: true, metadata: true }, orderBy: { createdAt: 'asc' }, take: 1 });
  return configuredGroups({ ...document, events }, people);
}
