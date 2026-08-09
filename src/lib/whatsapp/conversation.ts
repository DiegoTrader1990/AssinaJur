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

export function isGenerateLinkIntent(text: string): boolean {
  const input = String(text || '').trim();
  if (/\b(?:não\s+(?:quero|gere|gerar|crie|criar|envie|enviar)|não\s+precisa|cancele|cancelar)\b/i.test(input)) return false;
  return !input.endsWith('?')
    && /\b(?:link|links|documento definitivo|documentos definitivos|para assinatura)\b/i.test(input)
    && /\b(?:gerar|gere|gera|geramos|criar|crie|cria|emitir|emita|preparar|prepare|enviar|envie|finalizar|finalize|vamos|pode|fa[cç]a|quero|preciso|produzir|produza|disponibilizar|disponibilize)\b/i.test(input);
}

export function isApprovalIntent(text: string, generateLinkIntent = isGenerateLinkIntent(text)): boolean {
  const input = String(text || '').trim();
  if (!input || input.endsWith('?')) return false;
  return /^(?:sim|certo|ok|perfeito|pode\s+seguir|est[aá]\s+certo)[.!]?$/i.test(input)
    || /^(?:(?:sim|ok|certo|perfeito)[,!]?\s*)?(?:eu\s+)?(?:aprovo|aprovei|aprovar|confirmo|confirmar|confirme|aprovad[oa]s?|confirmad[oa]s?|minutas?\s+aprovadas?|pode\s+(?:aprovar|salvar|prosseguir|seguir)|est[aá]\s+(?:corret[oa]s?|aprovad[oa]s?)|pode\s+cadastrar)\b/i.test(input)
    || /^(?:aprovar|confirmar)(?:\s+(?:a|o|as|os))?\s+(?:minutas?|procura[cç][aã]o|contratos?|documentos?|cadastro)\b/i.test(input)
    || (generateLinkIntent && /\b(?:aprovo|aprovei|j[aá]\s+aprovei|aprovad[oa]s?|confirmo|confirmad[oa]s?)\b/i.test(input));
}

export function isCancelIntent(text: string): boolean {
  const input = String(text || '').trim();
  return !input.endsWith('?') && /^(?:cancelar|cancela|cancele(?:\s+(?:isso|essa\s+(?:minuta|ação)|esse\s+(?:cadastro|documento)))?|não\s+(?:quero|preciso)\s+mais|deixa\s+(?:isso\s+)?pra\s+l[aá]|pode\s+descartar|descartar|não\s+confirmar)(?:[.!])?$/i.test(input);
}

export function looksLikeUnverifiedOperationalClaim(text: string): boolean {
  const input = String(text || '');
  if (/\b(?:não|ainda\s+não|nenhum[oa]?)\b[^.!?]{0,60}\b(?:gerad[oa]|enviad[oa]|aprova(?:d[oa])?|cadastrad[oa]|alterad[oa]|exclu[ií]d[oa]|conclu[ií]d[oa])\b/i.test(input)) {
    return false;
  }
  return /\b(?:link|documento|procura[cç][aã]o|minuta|cadastro|cliente)\b/i.test(input)
    && /\b(?:foi|ser[aá]|est[aá]|ficou|prosseguiremos|conclu[ií]d[oa]|gerad[oa]|enviad[oa]|aprova(?:d[oa])?|cadastrad[oa]|alterad[oa]|exclu[ií]d[oa])\b/i.test(input);
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
  const email = input.match(/(?:\be-?mail\b\s*(?:correto\s*)?(?:é|e|:|para|como)?\s*)?([\w.+-]+@[\w.-]+\.[A-Za-z]{2,})/i)?.[1];
  const maritalStatus = input.match(/(?:\b(?:estado\s+civil)\b\s*(?:correto\s*)?(?:é|e|:|para|como)?\s*)?\b(solteir[oa]|casad[oa]|divorciad[oa]|viúv[oa]|separad[oa]|união\s+estável)\b/i)?.[1];
  const profession = input.match(/\b(?:profissão|ocupação)\b\s*(?:corret[oa]\s*)?(?:é|e|:|para|como)?\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' -]{1,80})(?=$|[,;.])/i)?.[1];
  const address = input.match(/\bendereço\b\s*(?:correto\s*)?(?:é|e|:|para|como)?\s*(.{5,180})(?=$|[;])/i)?.[1];
  const name = input.match(/\b(?:nome(?:\s+correto)?|corrija\s+o\s+nome|troque\s+o\s+nome\s+para)\b\s*(?:é|e|:|para|como)?\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' -]{2,120})(?=$|[,;.])/i)?.[1];
  const knownProfession = input.match(/\b(advogad[oa]|professor[ae]?|médic[oa]|enfermeir[oa]|engenheir[oa]|contador[ae]?|empresári[oa]|comerciante|agricultor[ae]?|autônom[oa]|aposentad[oa]|servidor[ae]?\s+públic[oa]|doméstic[oa])\b/i)?.[1];

  if (phone) {
    changes.phone = phone.replace(/\D/g, '');
    changes.whatsapp = changes.phone;
  }
  if (cpf) changes.cpfCnpj = cpf.replace(/\D/g, '');
  if (rg) changes.rg = cleanCaptured(rg);
  if (birthDate) changes.birthDate = birthDate.replace(/-/g, '/');
  if (email) changes.email = email.toLowerCase();
  if (maritalStatus) changes.maritalStatus = cleanCaptured(maritalStatus);
  if (profession || knownProfession) changes.profession = cleanCaptured(profession || knownProfession);
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
