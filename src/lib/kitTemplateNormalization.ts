// Modelos antigos podem ter sido salvos depois de uma revisão com dados de uma
// cliente específica. No fluxo de kit, a qualificação nunca pode depender desse
// texto fixo: ela é sempre refeita a partir da cliente selecionada.
export function ensureClientQualificationTokens(contentHtml: string, title: string, documentType = '') {
  let result = contentHtml;
  const hasClientVariable = /{{\s*cliente_nome\s*}}/i.test(result);
  const isPower = /PROCUR/i.test(documentType) || /procura[cç][aã]o/i.test(title);
  const isContract = /CONTRAT/i.test(documentType) || /contrato/i.test(title);
  const isDeclaration = /DECLAR/i.test(documentType) || /declara[cç][aã]o/i.test(title);
  if (!isPower && !isContract && !isDeclaration) return result;

  const clientLine = (label: string, suffix = '') => `<strong>${label}:</strong> {{cliente_nome}}, {{cliente_nacionalidade}}, {{cliente_estado_civil}}, {{cliente_profissao}}, portador(a) do RG nº {{cliente_rg}} e inscrito(a) no CPF sob o nº {{cliente_cpf}}, residente e domiciliado(a) em {{cliente_endereco}}${suffix}`;
  const label = isPower ? 'OUTORGANTE' : isContract ? 'CONTRATANTE' : '';
  if (label && !hasClientVariable) {
    let changed = false;
    const normalized = result.replace(/<(p|div)([^>]*)>([\s\S]*?)<\/\1>/gi, (block, tag, attrs, inner) => {
      const text = String(inner).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').trim();
      if (changed || !new RegExp(`^${label}\\s*:`, 'i').test(text)) return block;
      changed = true;
      const suffix = isContract ? ', doravante denominado(a) CONTRATANTE.' : '.';
      return `<${tag}${attrs}>${clientLine(label, suffix)}</${tag}>`;
    });
    if (changed) result = normalized;
  }
  if (isDeclaration && !hasClientVariable) {
    let changed = false;
    result = result.replace(/<(p|div)([^>]*)>([\s\S]*?)<\/\1>/gi, (block, tag, attrs, inner) => {
      const text = String(inner).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').trim();
      if (changed || !/(CPF|CPF\/MF)/i.test(text)) return block;
      changed = true;
      return `<${tag}${attrs}>{{cliente_nome}}, {{cliente_nacionalidade}}, {{cliente_estado_civil}}, {{cliente_profissao}}, inscrito(a) no CPF/MF sob nº {{cliente_cpf}}, residente e domiciliado(a) em {{cliente_endereco}}, declara, sob as penas da lei, que não possui condições financeiras de arcar com as despesas processuais sem prejuízo do próprio sustento e de sua família.</${tag}>`;
    });
  }
  // Cidade/data e nome de assinatura também podem ter ficado fixos numa revisão
  // anterior. Só alcançamos os blocos finais para não tocar no corpo jurídico.
  result = result.replace(/(?:[A-ZÀ-ÿ][A-Za-zÀ-ÿ'\- ]{2,}),\s*\d{1,2}\s+de\s+[A-Za-zÀ-ÿ]+\s+de\s+\d{4}\.?/g, '{{cidade}}, {{data_atual}}.');
  const blocks = [...result.matchAll(/<(p|div)([^>]*)>([\s\S]*?)<\/\1>/gi)];
  const candidate = blocks.slice(-5).reverse().find((block) => {
    const text = String(block[3]).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').trim();
    const words = text.split(/\s+/).filter(Boolean);
    return words.length >= 2 && words.length <= 5 && !/(OUTORGANTE|CONTRATANTE|DECLARANTE|LOCAL|DATA|ASSINATURA)/i.test(text) && /^[A-ZÀ-Ý][A-ZÀ-Ýa-zà-ÿ'\- ]+$/.test(text);
  });
  if (candidate) {
    const full = candidate[0];
    const tag = candidate[1]; const attrs = candidate[2];
    result = result.slice(0, candidate.index) + `<${tag}${attrs}>{{cliente_nome}}</${tag}>` + result.slice((candidate.index || 0) + full.length);
  }
  return result;
}
