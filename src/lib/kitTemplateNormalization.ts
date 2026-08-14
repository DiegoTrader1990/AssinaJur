// Modelos antigos podem ter sido salvos depois de uma revisão com dados de uma
// cliente específica. No fluxo de kit, a qualificação nunca pode depender desse
// texto fixo: ela é sempre refeita a partir da cliente selecionada.
export function ensureClientQualificationTokens(contentHtml: string, title: string, documentType = '') {
  if (/{{\s*cliente_nome\s*}}/i.test(contentHtml)) return contentHtml;
  const isPower = /PROCUR/i.test(documentType) || /procura[cç][aã]o/i.test(title);
  const isContract = /CONTRAT/i.test(documentType) || /contrato/i.test(title);
  const isDeclaration = /DECLAR/i.test(documentType) || /declara[cç][aã]o/i.test(title);
  if (!isPower && !isContract && !isDeclaration) return contentHtml;

  const clientLine = (label: string, suffix = '') => `<strong>${label}:</strong> {{cliente_nome}}, {{cliente_nacionalidade}}, {{cliente_estado_civil}}, {{cliente_profissao}}, portador(a) do RG nº {{cliente_rg}} e inscrito(a) no CPF sob o nº {{cliente_cpf}}, residente e domiciliado(a) em {{cliente_endereco}}${suffix}`;
  const label = isPower ? 'OUTORGANTE' : isContract ? 'CONTRATANTE' : '';
  if (label) {
    let changed = false;
    const normalized = contentHtml.replace(/<(p|div)([^>]*)>([\s\S]*?)<\/\1>/gi, (block, tag, attrs, inner) => {
      const text = String(inner).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').trim();
      if (changed || !new RegExp(`^${label}\\s*:`, 'i').test(text)) return block;
      changed = true;
      const suffix = isContract ? ', doravante denominado(a) CONTRATANTE.' : '.';
      return `<${tag}${attrs}>${clientLine(label, suffix)}</${tag}>`;
    });
    if (changed) return normalized;
  }
  if (isDeclaration) {
    let changed = false;
    return contentHtml.replace(/<(p|div)([^>]*)>([\s\S]*?)<\/\1>/gi, (block, tag, attrs, inner) => {
      const text = String(inner).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').trim();
      if (changed || !/(CPF|CPF\/MF)/i.test(text)) return block;
      changed = true;
      return `<${tag}${attrs}>{{cliente_nome}}, {{cliente_nacionalidade}}, {{cliente_estado_civil}}, {{cliente_profissao}}, inscrito(a) no CPF/MF sob nº {{cliente_cpf}}, residente e domiciliado(a) em {{cliente_endereco}}, declara, sob as penas da lei, que não possui condições financeiras de arcar com as despesas processuais sem prejuízo do próprio sustento e de sua família.</${tag}>`;
    });
  }
  return contentHtml;
}
