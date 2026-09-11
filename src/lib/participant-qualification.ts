export const PARTICIPANT_DETAILS_EVENT = 'PARTICIPANT_DETAILS_CONFIGURED';
export type ParticipantQualification = { roleLabel?: string; rg?: string; issuingOrgan?: string; birthDate?: string; nationality?: string; gender?: string; maritalStatus?: string; profession?: string; cep?: string; address?: string; city?: string; state?: string };
export type QualifiedParticipant = { name: string; cpf?: string; email?: string | null; phone?: string | null; role: string; signatureOrder: number; qualification?: ParticipantQualification };
export function qualificationFromClient(client: any): ParticipantQualification {
 return Object.fromEntries(['rg','issuingOrgan','birthDate','nationality','gender','maritalStatus','profession','cep','address','city','state'].map(key => [key, String(client?.[key] || '')]));
}
export function validateParticipantQualifications(people: QualifiedParticipant[], hasRegisteredClient: boolean) {
 for (const [index, person] of people.entries()) {
  if (person.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(person.email)) throw new Error(`Confira o e-mail de ${person.name}.`);
  if (person.phone && !/^(?:55)?\d{10,11}$/.test(person.phone.replace(/\D/g,''))) throw new Error(`Confira o telefone de ${person.name}.`);
  const q = person.qualification;
  if (person.role.startsWith('TESTEMUNHA') || person.role === 'ASSINANTE_A_ROGO' || index === 0 && hasRegisteredClient) continue;
  if (!q || ['birthDate','nationality','maritalStatus','profession','address','city','state','cep'].some(key => !String(q[key as keyof ParticipantQualification] || '').trim())) throw new Error(`Complete a qualificação de ${person.name}: nascimento, nacionalidade, estado civil, profissão e endereço com CEP.`);
  if (!/^\d{8}$/.test(String(q.cep).replace(/\D/g,'')) || !/^[A-Za-z]{2}$/.test(String(q.state))) throw new Error(`Confira CEP e UF de ${person.name}.`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(q.birthDate)) || !Number.isFinite(Date.parse(String(q.birthDate))) || new Date(String(q.birthDate)).toISOString().slice(0,10) !== q.birthDate || q.birthDate > new Date().toISOString().slice(0,10)) throw new Error(`Confira o nascimento de ${person.name}.`);
  if (Object.values(q).some(v => typeof v !== 'string' || v.length > 500)) throw new Error(`Qualificação inválida de ${person.name}.`);
 }
}
const cpf = (value = '') => value.replace(/\D/g,'').replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
const escapeHtml = (value: string) => value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
export function fullQualification(person: QualifiedParticipant): string {
 const q = person.qualification || {};
 const address = [q.address, [q.city,q.state].filter(Boolean).join('/'), q.cep ? `CEP ${q.cep}` : ''].filter(Boolean).join(', ');
 return [person.name, q.nationality, q.maritalStatus, q.profession, q.rg ? `RG nº ${q.rg}${q.issuingOrgan ? ' '+q.issuingOrgan : ''}` : '', person.cpf ? `CPF nº ${cpf(person.cpf)}` : '', q.birthDate ? `nascimento: ${q.birthDate.slice(0,10).split('-').reverse().join('/')}` : '', address ? `residência: ${address}` : '', person.email ? `e-mail: ${person.email}` : '', person.phone ? `telefone: ${person.phone}` : ''].filter(Boolean).join(', ');
}
export function participantVariables(people: QualifiedParticipant[]): Record<string,string> {
 const values: Record<string,string> = {}; let part = 0, witness = 0;
 for (const person of people) {
  if (person.role === 'ASSINANTE_A_ROGO') continue;
  const prefix = person.role.startsWith('TESTEMUNHA') ? `testemunha${++witness}` : `parte${++part}`;
  const q = person.qualification || {};
  const fields = { nome: person.name, cpf: cpf(person.cpf), email: person.email || '', telefone: person.phone || '', papel: q.roleLabel || person.role, qualificacao: fullQualification(person), rg: q.rg || '', orgao_emissor: q.issuingOrgan || '', nascimento: q.birthDate || '', nacionalidade: q.nationality || '', estado_civil: q.maritalStatus || '', profissao: q.profession || '', endereco: q.address || '', cidade: q.city || '', uf: q.state || '', cep: q.cep || '' };
  for (const [key,value] of Object.entries(fields)) values[`${prefix}_${key}`] = escapeHtml(value);
 }
 values.partes_quantidade = String(part);
 return values;
}
export function qualificationDetails(document: { events?: Array<{ eventType: string; metadata?: string | null }> }): Array<{ order: number; qualification: ParticipantQualification }> {
 const event = document.events?.find(e => e.eventType === PARTICIPANT_DETAILS_EVENT);
 if (!event) return [];
 const parsed = JSON.parse(event.metadata || '[]');
 if (!Array.isArray(parsed)) throw new Error('Qualificação de participantes inválida.');
 return parsed;
}
