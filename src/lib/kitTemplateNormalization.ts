export function formatCpfCnpj(value: string | null | undefined): string {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 11) return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (digits.length === 14) return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return String(value || '');
}

// Remove o nome isolado que alguns fluxos de revisão herdaram do Word antes da
// qualificação. Recebe também o nome já renderizado, pois a cópia temporária da
// revisão pode não conter mais a tag {{cliente_nome}}.
export function removeStandaloneClientNameBeforeQualification(contentHtml: string, clientName: string): string {
  const normalizedName = String(clientName || '').replace(/\s+/g, ' ').trim().toLocaleUpperCase('pt-BR');
  if (!normalizedName) return contentHtml;
  let reachedQualification = false;
  return contentHtml.replace(/<(p|div|h1|h2|h3)([^>]*)>([\s\S]*?)<\/\1>/gi, (block, tag, attrs, inner) => {
    const visibleText = String(inner).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
    if (/^OUTORGANTE\s*:/i.test(visibleText)) reachedQualification = true;
    const isClientName = visibleText.toLocaleUpperCase('pt-BR') === normalizedName || /^{{\s*cliente_nome\s*}}$/i.test(visibleText);
    return !reachedQualification && isClientName ? '' : `<${tag}${attrs}>${inner}</${tag}>`;
  });
}

// Garante que dados pessoais nunca fiquem fixos em modelos usados dentro de um kit.
export function ensureClientQualificationTokens(contentHtml: string, title: string, documentType = '') {
  let result = contentHtml;
  const isPower = /PROCUR/i.test(documentType) || /procura[cç][aã]o/i.test(title);
  const isContract = /CONTRAT/i.test(documentType) || /contrato/i.test(title);
  const isDeclaration = /DECLAR/i.test(documentType) || /declara[cç][aã]o/i.test(title);
  if (!isPower && !isContract && !isDeclaration) return result;

  // Alguns modelos antigos mantiveram um {{cliente_nome}} isolado logo abaixo
  // do título. A qualificação completa já vem no parágrafo próprio; esse bloco
  // solto apenas duplica o nome e prejudica a apresentação da minuta.
  result = result.replace(/(<h[1-3][^>]*>[\s\S]*?<\/h[1-3]>)\s*<(p|div|h1|h2|h3)([^>]*)>([\s\S]*?)<\/\2>/i, (whole, heading, _tag, _attrs, inner) => {
    const visibleText = String(inner).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').trim();
    return /^{{\s*cliente_nome\s*}}$/i.test(visibleText) ? heading : whole;
  });
  if (isPower) {
    let reachedQualification = false;
    result = result.replace(/<(p|div|h1|h2|h3)([^>]*)>([\s\S]*?)<\/\1>/gi, (block, tag, attrs, inner) => {
      const visibleText = String(inner).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').trim();
      if (/^OUTORGANTE\s*:/i.test(visibleText)) reachedQualification = true;
      // Na procuração, um nome isolado antes da qualificação é resíduo do modelo
      // Word e não faz parte da redação jurídica.
      if (!reachedQualification && /^{{\s*cliente_nome\s*}}$/i.test(visibleText)) return '';
      return `<${tag}${attrs}>${inner}</${tag}>`;
    });
  }

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
  // Declarações de hipossuficiência geralmente começam pela qualificação sem
  // rótulo: "NOME, brasileira... CPF...". Tornamos apenas esse primeiro bloco
  // de identificação dinâmico, preservando o restante da declaração.
  if (isDeclaration) {
    let declarationQualificationReplaced = false;
    result = result.replace(/<(p|div)([^>]*)>([\s\S]*?)<\/\1>/gi, (block, tag, attrs, inner) => {
      const text = String(inner).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').trim();
      const hasClientToken = /{{\s*cliente_(?:nome|cpf|rg|endereco)\s*}}/i.test(inner);
      const looksLikeQualification = /(?:CPF(?:\s*\/\s*MF)?|RG\s*(?:n[ºo.]?)?|residente\s+e\s+domiciliad)/i.test(text);
      if (declarationQualificationReplaced || hasClientToken || !looksLikeQualification) return block;
      declarationQualificationReplaced = true;
      return `<${tag}${attrs}><strong>{{cliente_nome}}</strong>, {{cliente_nacionalidade}}, {{cliente_estado_civil}}, {{cliente_profissao}}, inscrito(a) no CPF/MF sob o n.º {{cliente_cpf}}, residente e domiciliado(a) em {{cliente_endereco}}, declara, sob as penas da lei, que não possui condições financeiras de arcar com as custas processuais, despesas cartorárias e honorários advocatícios, sem prejuízo do próprio sustento e de sua família.</${tag}>`;
    });
  }

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
