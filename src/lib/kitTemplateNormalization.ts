// Garante que dados pessoais nunca fiquem fixos em modelos usados dentro de um kit.
export function ensureClientQualificationTokens(contentHtml: string, title: string, documentType = '') {
  let result = contentHtml;
  const isPower = /PROCUR/i.test(documentType) || /procura[cç][aã]o/i.test(title);
  const isContract = /CONTRAT/i.test(documentType) || /contrato/i.test(title);
  const isDeclaration = /DECLAR/i.test(documentType) || /declara[cç][aã]o/i.test(title);
  if (!isPower && !isContract && !isDeclaration) return result;

  const label = isPower ? 'OUTORGANTE' : isContract ? 'CONTRATANTE' : '';
  if (label) {
    let replaced = false;
    result = result.replace(/<(p|div)([^>]*)>([\s\S]*?)<\/\1>/gi, (block, tag, attrs, inner) => {
      const text = String(inner).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').trim();
      // Não basta existir uma variável em outro trecho da minuta. A qualificação
      // inicial precisa ser dinâmica por si só; caso ainda tenha dados fixos de
      // outra pessoa, ela é reconstruída integralmente.
      if (replaced || !new RegExp(`^${label}\\s*:`, 'i').test(text) || /{{\s*cliente_(?:nome|cpf|rg|endereco)\s*}}/i.test(inner)) return block;
      replaced = true;
      const suffix = isContract ? ', doravante denominado(a) CONTRATANTE.' : '.';
      return `<${tag}${attrs}><strong>${label}:</strong> {{cliente_nome}}, {{cliente_nacionalidade}}, {{cliente_estado_civil}}, {{cliente_profissao}}, portador(a) do RG nº {{cliente_rg}} e inscrito(a) no CPF sob o nº {{cliente_cpf}}, residente e domiciliado(a) em {{cliente_endereco}}${suffix}</${tag}>`;
    });
  }

  // A assinatura final é definida pelo último rótulo. Assim funciona mesmo se
  // o Word salvou linhas vazias, estilos, ou nomes de outra cliente no rodapé.
  const blocks = [...result.matchAll(/<(p|div)([^>]*)>([\s\S]*?)<\/\1>/gi)];
  const textOf = (block: RegExpMatchArray) => String(block[3]).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').trim();
  const roleIndex = blocks.map(textOf).map((text, index) => /^(OUTORGANTE|CONTRATANTE|DECLARANTE)\b/i.test(text) ? index : -1).filter((index) => index >= 0).at(-1);
  const replaceBlock = (block: RegExpMatchArray, content: string) => {
    result = result.replace(block[0], `<${block[1]}${block[2]}>${content}</${block[1]}>`);
  };
  if (roleIndex !== undefined && roleIndex >= Math.max(1, blocks.length - 10)) {
    if (blocks[roleIndex - 1]) replaceBlock(blocks[roleIndex - 1], '{{cliente_nome}}');
    const dateBlock = blocks.slice(0, Math.max(0, roleIndex - 1)).reverse().find((block) => /\d{1,2}\s+de\s+/i.test(textOf(block)) || /\d{1,2}[\/.\-]\d{2,4}/.test(textOf(block)));
    if (dateBlock) replaceBlock(dateBlock, '{{cidade}}, {{data_atual}}.');
  }
  return result;
}
