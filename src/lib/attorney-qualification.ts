// Regra compartilhada pelo editor, prévias e geração: a ausência do parágrafo
// não pode desativar o preenchimento dos patronos.
export function attorneyLabel(documentType = '', title = ''): string | null {
  if (/PROCUR/i.test(documentType) || /procura[cç][aã]o/i.test(title)) return 'OUTORGADOS';
  if (/CONTRAT/i.test(documentType) || /contrato/i.test(title)) return 'CONTRATADOS';
  return null;
}

const visible = (html: string) => html.replace(/<!--[\s\S]*?-->|<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>/gi, '')
  .replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').replace(/\s+/g, ' ').trim();

export function ensureJointAttorneyQualification(contentHtml: string, documentType = '', title = ''): string {
  const label = attorneyLabel(documentType, title);
  if (!label) return contentHtml;
  const labelPattern = new RegExp(`^${label.slice(0, -1)}S?\\s*:`,'i');
  const token = '{{patronos_qualificacao_conjunta}}';
  const paragraph = `<p><strong>${label}:</strong> ${token}.</p>`;
  // Trabalhar apenas em blocos folha evita consumir vários parágrafos dentro
  // de uma div do Word. Tokens em comentários não contam como qualificação.
  const blocks = /<(p|div)([^>]*)>((?:(?!<\/?(?:p|div)\b)[\s\S])*?)<\/\1>/gi;
  let found = false;
  let result = contentHtml.replace(blocks, (block, tag, attrs, inner) => {
    if (!labelPattern.test(visible(inner)) && !/^{{\s*patronos_qualificacao_conjunta\s*}}[.]?$/.test(visible(inner))) return block;
    found = true;
    const font = String(inner).match(/<font\b[^>]*>/i)?.[0] || '';
    return `<${tag}${attrs}>${font}<strong>${label}:</strong> ${token}.${font ? '</font>' : ''}</${tag}>`;
  });
  if (found) return result;
  if (!/<(?:p|div|h[1-6])\b/i.test(result)) {
    // Modelos de texto simples são convertidos integralmente: inserir uma
    // única tag de bloco faria o compilador perder as outras quebras de linha.
    const lines = result.split(/\r?\n|<br\s*\/?>/i);
    result = lines.map(line => `<p>${line}</p>`).join('\n');
    return ensureJointAttorneyQualification(result, documentType, title);
  }
  let inserted = false;
  const clientLabel = label === 'OUTORGADOS' ? 'OUTORGANTE' : 'CONTRATANTE';
  result = result.replace(blocks, (block, _tag, _attrs, inner) => {
    if (inserted || !new RegExp(`^${clientLabel}\\s*:`, 'i').test(visible(inner))) return block;
    inserted = true;
    return block + paragraph;
  });
  // Minutas sem rótulo da parte recebem um bloco explícito no início.
  return inserted ? result : paragraph + result;
}

export function validateAttorneyRoster(lawyers: Array<{ name: string; oabNumber: string | null }>): void {
  if (!lawyers.length || lawyers.some(lawyer => !lawyer.name.trim() || !/\d/.test(lawyer.oabNumber || ''))) {
    throw new Error('Confira os advogados ativos do escritório: nome e número da OAB são obrigatórios antes de gerar procurações ou contratos.');
  }
}

export function validateAttorneyQualification(contentHtml: string, documentType: string, title: string, qualification: string): void {
  const label = attorneyLabel(documentType, title);
  if (!label) return;
  const expected = visible(qualification || '').replace(/\.+$/, '');
  const text = visible(contentHtml);
  const pattern = new RegExp(`${label}\\s*:\\s*`, 'i');
  const match = pattern.exec(text);
  if (!expected || /{{|_{3,}|^Advogado responsável$/i.test(expected) || !match ||
      !text.slice(match.index + match[0].length).startsWith(expected)) {
    throw new Error(`O documento "${title}" está sem a qualificação completa dos ${label.toLowerCase()}. Revise a minuta antes de enviar.`);
  }
}
