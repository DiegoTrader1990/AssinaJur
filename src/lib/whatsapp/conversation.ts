export interface ClientConversationCorrections {
  name?: string;
  cpfCnpj?: string;
  rg?: string;
  birthDate?: string;
  phone?: string;
  whatsapp?: string;
  maritalStatus?: string;
  profession?: string;
  email?: string;
  address?: string;
}

export function brazilianPhoneVariants(value: string): string[] {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return [];
  const withCountry = digits.startsWith('55') ? digits : `55${digits}`;
  const variants = new Set([digits, withCountry]);
  if (withCountry.startsWith('55')) variants.add(withCountry.slice(2));

  if (withCountry.length === 13 && withCountry[4] === '9') {
    const legacy = `${withCountry.slice(0, 4)}${withCountry.slice(5)}`;
    variants.add(legacy);
    variants.add(legacy.slice(2));
  } else if (withCountry.length === 12) {
    const modern = `${withCountry.slice(0, 4)}9${withCountry.slice(4)}`;
    variants.add(modern);
    variants.add(modern.slice(2));
  }
  return Array.from(variants);
}

function cleanCaptured(value?: string): string | undefined {
  const clean = String(value || '').trim().replace(/[.,;]+$/, '').trim();
  return clean || undefined;
}

export function extractClientConversationCorrections(text: string): {
  changes: ClientConversationCorrections;
  requestedWithoutValue: string[];
} {
  const input = String(text || '').trim();
  const changes: ClientConversationCorrections = {};
  const requestedWithoutValue: string[] = [];

  const phone = input.match(/\b(?:telefone|celular|whats(?:app)?|fone)\b\s*(?:correto\s*)?(?:é|e|:|para|como)?\s*\+?([\d\s().-]{10,20})/i)?.[1];
  const cpf = input.match(/\bcpf(?:\/cnpj)?\b\s*(?:correto\s*)?(?:é|e|:|para|como)?\s*([\d.\/-]{11,20})/i)?.[1];
  const rg = input.match(/\brg\b\s*(?:correto\s*)?(?:é|e|:|para|como)?\s*([A-Z0-9.\/-]{4,20})/i)?.[1];
  const birthDate = input.match(/\b(?:nascimento|data\s+de\s+nascimento)\b\s*(?:corret[oa]\s*)?(?:é|e|:|para|como)?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{4})/i)?.[1];
  const email = input.match(/\be-?mail\b\s*(?:correto\s*)?(?:é|e|:|para|como)?\s*([\w.+-]+@[\w.-]+\.[A-Za-z]{2,})/i)?.[1];
  const maritalStatus = input.match(/\b(?:estado\s+civil)\b\s*(?:correto\s*)?(?:é|e|:|para|como)?\s*(solteir[oa]|casad[oa]|divorciad[oa]|viúv[oa]|separad[oa]|união\s+estável)/i)?.[1];
  const profession = input.match(/\b(?:profissão|ocupação)\b\s*(?:corret[oa]\s*)?(?:é|e|:|para|como)?\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' -]{1,80})(?=$|[,;.])/i)?.[1];
  const address = input.match(/\bendereço\b\s*(?:correto\s*)?(?:é|e|:|para|como)?\s*(.{5,180})(?=$|[;])/i)?.[1];
  const name = input.match(/\b(?:nome(?:\s+correto)?|corrija\s+o\s+nome|troque\s+o\s+nome\s+para)\b\s*(?:é|e|:|para|como)?\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' -]{2,120})(?=$|[,;.])/i)?.[1];

  if (phone) {
    changes.phone = phone.replace(/\D/g, '');
    changes.whatsapp = changes.phone;
  }
  if (cpf) changes.cpfCnpj = cpf.replace(/\D/g, '');
  if (rg) changes.rg = cleanCaptured(rg);
  if (birthDate) changes.birthDate = birthDate.replace(/-/g, '/');
  if (email) changes.email = email.toLowerCase();
  if (maritalStatus) changes.maritalStatus = cleanCaptured(maritalStatus);
  if (profession) changes.profession = cleanCaptured(profession);
  if (address) changes.address = cleanCaptured(address);
  if (name) changes.name = cleanCaptured(name);

  const labels = [
    ['telefone', /\b(?:telefone|celular|whats(?:app)?|fone)\b/i, Boolean(phone)],
    ['CPF', /\bcpf(?:\/cnpj)?\b/i, Boolean(cpf)],
    ['RG', /\brg\b/i, Boolean(rg)],
    ['data de nascimento', /\b(?:nascimento|data\s+de\s+nascimento)\b/i, Boolean(birthDate)],
    ['nome', /\b(?:nome|corrija\s+o\s+nome|troque\s+o\s+nome)\b/i, Boolean(name)],
  ] as const;
  const correctionLanguage = /\b(?:errad[oa]|corrig|corret[oa]|troque|mude|alter)/i.test(input);
  if (correctionLanguage) {
    for (const [label, pattern, captured] of labels) {
      if (pattern.test(input) && !captured) requestedWithoutValue.push(label);
    }
  }

  return { changes, requestedWithoutValue };
}
