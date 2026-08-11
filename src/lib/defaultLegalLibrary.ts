import { prisma } from '@/lib/prisma';

export const ESSENTIAL_LEGAL_TEMPLATES = [
  {
    title: 'Contrato de Honorários Advocatícios - Completo',
    category: 'Geral',
    documentType: 'CONTRATO',
    description: 'Contrato completo e editável, com objeto, honorários, êxito, despesas, obrigações, rescisão, proteção de dados e assinatura eletrônica.',
    contentHtml: `<h1>CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS</h1>
<p><strong>CONTRATANTE:</strong> {{cliente_nome}}, {{cliente_nacionalidade}}, {{cliente_estado_civil}}, {{cliente_profissao}}, portador(a) do RG nº {{cliente_rg}} e inscrito(a) no CPF sob o nº {{cliente_cpf}}, residente e domiciliado(a) em {{cliente_endereco}}, telefone {{cliente_telefone}}.</p>
<p><strong>CONTRATADO:</strong> {{advogado_nome}}, advogado(a), inscrito(a) na OAB sob o nº {{advogado_oab}}, integrante de <strong>{{escritorio_nome}}</strong>, doravante denominado(a) CONTRATADO.</p>
<h2>1. OBJETO</h2>
<p>O presente contrato tem por objeto a prestação de serviços advocatícios consistentes no ajuizamento de ação e acompanhamento integral da causa perante os órgãos jurisdicionais e administrativos competentes.</p>
<p>Atos, recursos, incidentes, ações autônomas, cumprimento de sentença ou atuação perante instância diversa que não estejam expressamente compreendidos no objeto dependerão de ajuste escrito entre as partes.</p>
<h2>2. OBRIGAÇÕES DO CONTRATADO</h2>
<p>O CONTRATADO compromete-se a atuar com independência técnica, zelo e diligência, mantendo o CONTRATANTE informado sobre os atos relevantes e preservando o sigilo profissional, sem garantia de resultado.</p>
<h2>3. OBRIGAÇÕES DO CONTRATANTE</h2>
<p>O CONTRATANTE fornecerá informações verdadeiras e documentos completos, comunicará alterações de endereço e telefone, comparecerá aos atos para os quais for convocado e colaborará tempestivamente com a estratégia jurídica definida.</p>
<h2>4. HONORÁRIOS CONTRATUAIS</h2>
<p>Pelos serviços descritos, o CONTRATANTE pagará honorários de <strong>{{valor_honorarios}}</strong>, na forma e nos vencimentos acordados entre as partes.</p>
<p>Em caso de êxito, serão devidos honorários adicionais correspondentes a <strong>{{percentual_exito}}</strong>, calculados sobre o valor do proveito econômico obtido, exigíveis quando houver recebimento, disponibilização ou reconhecimento do benefício econômico.</p>
<p>Honorários de sucumbência eventualmente fixados pertencem ao advogado e não se confundem com os honorários contratados, conforme a legislação aplicável.</p>
<h2>5. DESPESAS</h2>
<p>Custas, taxas, emolumentos, deslocamentos, cópias, diligências, perícias e demais despesas necessárias não estão incluídos nos honorários, salvo ajuste escrito, e serão antecipados ou reembolsados pelo CONTRATANTE mediante comprovação.</p>
<h2>6. INADIMPLEMENTO</h2>
<p>O atraso no pagamento sujeitará o valor devido à atualização monetária, juros e multa, observada a legislação aplicável.</p>
<h2>7. RESCISÃO, REVOGAÇÃO E RENÚNCIA</h2>
<p>O contrato poderá ser encerrado por qualquer parte mediante comunicação escrita. Na revogação do mandato, renúncia ou acordo, serão devidos os honorários vencidos e os proporcionais ao trabalho realizado, sem prejuízo das despesas pendentes e do honorário de êxito quando cabível.</p>
<h2>8. COMUNICAÇÕES E PROTEÇÃO DE DADOS</h2>
<p>As partes reconhecem como válidas as comunicações realizadas pelos contatos informados. Os dados pessoais serão tratados para execução deste contrato, exercício regular de direitos e cumprimento de obrigações legais, com acesso limitado às pessoas e aos prestadores necessários à condução do serviço.</p>
<h2>9. ASSINATURA ELETRÔNICA</h2>
<p>As partes concordam com a assinatura eletrônica deste instrumento e reconhecem sua autoria, integridade e validade, inclusive quando realizada por plataforma que registre evidências técnicas de identificação e consentimento.</p>
<h2>10. FORO</h2>
<p>Fica eleito o foro da comarca de <strong>{{cidade}}</strong>, ressalvadas as hipóteses legais de competência obrigatória, para dirimir controvérsias decorrentes deste contrato.</p>
<p>E, por estarem de acordo, firmam o presente instrumento.</p>
<p><strong>{{cidade}}, {{data_atual}}.</strong></p>
<p><strong>CONTRATANTE:</strong> {{cliente_nome}}</p>
<p><strong>CONTRATADO:</strong> {{advogado_nome}} — OAB {{advogado_oab}}</p>`,
  },
  {
    title: 'Procuração Geral Ad Judicia et Extra',
    category: 'Geral',
    documentType: 'PROCURACAO',
    description: 'Procuração geral editável, com poderes forenses e especiais previstos no CPC.',
    contentHtml: `<h1>PROCURAÇÃO AD JUDICIA ET EXTRA</h1>
<p><strong>OUTORGANTE:</strong> {{cliente_nome}}, {{cliente_nacionalidade}}, {{cliente_estado_civil}}, {{cliente_profissao}}, portador(a) do RG nº {{cliente_rg}} e inscrito(a) no CPF sob o nº {{cliente_cpf}}, residente e domiciliado(a) em {{cliente_endereco}}.</p>
<p><strong>OUTORGADO:</strong> {{advogado_nome}}, advogado(a), inscrito(a) na OAB sob o nº {{advogado_oab}}, integrante de <strong>{{escritorio_nome}}</strong>, com endereço profissional constante no cadastro da Ordem dos Advogados do Brasil.</p>
<h2>PODERES</h2>
<p>Por este instrumento, o(a) OUTORGANTE nomeia e constitui seu bastante procurador o(a) OUTORGADO(A), conferindo-lhe poderes para o foro em geral, com a cláusula <em>ad judicia et extra</em>, perante qualquer juízo, instância, tribunal, órgão público ou entidade privada, podendo propor ações, apresentar defesa, acompanhar processos e praticar todos os atos necessários à proteção de seus direitos e interesses.</p>
<h2>PODERES ESPECIAIS</h2>
<p>Confere, ainda, os poderes especiais para receber citação, confessar, reconhecer a procedência do pedido, transigir, desistir, renunciar ao direito sobre o qual se funda a ação, receber valores, dar e receber quitação, firmar compromissos, assinar declaração de hipossuficiência econômica, requerer gratuidade da justiça, levantar alvarás, requisitórios e depósitos, solicitar documentos e informações e praticar os demais atos que exijam autorização expressa, nos termos do art. 105 do Código de Processo Civil.</p>
<h2>SUBSTABELECIMENTO</h2>
<p>O(A) OUTORGADO(A) poderá substabelecer os poderes recebidos, com ou sem reserva de iguais poderes, quando necessário ao cumprimento do mandato.</p>
<p>Esta procuração destina-se ao acompanhamento processual e administrativo completo.</p>
<p><strong>{{cidade}}, {{data_atual}}.</strong></p>
<p><strong>OUTORGANTE:</strong> {{cliente_nome}}</p>`,
  },
  {
    title: 'Procuração Previdenciária - INSS',
    category: 'Previdenciário',
    documentType: 'PROCURACAO',
    description: 'Procuração específica para atuação administrativa e judicial em matéria previdenciária.',
    contentHtml: `<h1>PROCURAÇÃO PARA FINS PREVIDENCIÁRIOS — INSS</h1>
<p><strong>OUTORGANTE:</strong> {{cliente_nome}}, {{cliente_nacionalidade}}, {{cliente_estado_civil}}, {{cliente_profissao}}, portador(a) do RG nº {{cliente_rg}}, inscrito(a) no CPF sob o nº {{cliente_cpf}}, residente e domiciliado(a) em {{cliente_endereco}}.</p>
<p><strong>OUTORGADO:</strong> {{advogado_nome}}, advogado(a), inscrito(a) na OAB sob o nº {{advogado_oab}}, integrante de <strong>{{escritorio_nome}}</strong>.</p>
<h2>FINALIDADE E PODERES</h2>
<p>O(A) OUTORGANTE confere ao(à) OUTORGADO(A) poderes para representá-lo(a) administrativa e judicialmente em matéria previdenciária perante o Instituto Nacional do Seguro Social — INSS, Meu INSS, Conselho de Recursos da Previdência Social — CRPS, Justiça Federal e demais órgãos competentes.</p>
<p>Poderá requerer benefícios e serviços, formular exigências, apresentar documentos, justificações, recursos e revisões, acompanhar processos, obter cópias, extratos, cartas, laudos e informações, consultar dados previdenciários e trabalhistas, cumprir exigências, agendar e acompanhar perícias, audiências e avaliações, produzir provas e praticar os atos necessários à defesa dos interesses do(a) OUTORGANTE.</p>
<h2>PODERES ESPECIAIS</h2>
<p>Confere poderes para receber citação, confessar, reconhecer a procedência do pedido, transigir, desistir, renunciar ao direito sobre o qual se funda a ação, firmar declarações, requerer gratuidade da justiça, receber valores e dar quitação, levantar alvarás, requisições e depósitos, observadas as limitações e exigências do órgão pagador.</p>
<h2>DADOS E DOCUMENTOS</h2>
<p>Autoriza o acesso e o tratamento dos dados e documentos estritamente necessários à execução deste mandato, inclusive informações mantidas em sistemas previdenciários, observados o sigilo profissional e a legislação de proteção de dados.</p>
<h2>SUBSTABELECIMENTO</h2>
<p>O(A) OUTORGADO(A) poderá substabelecer estes poderes, com ou sem reserva, para a adequada condução do caso.</p>
<p><strong>Benefício ou finalidade específica:</strong> Acompanhamento de processos e requerimentos previdenciários.</p>
<p><strong>{{cidade}}, {{data_atual}}.</strong></p>
<p><strong>OUTORGANTE:</strong> {{cliente_nome}}</p>`,
  },
  {
    title: 'Declaração de Hipossuficiência Econômica',
    category: 'Geral',
    documentType: 'DECLARACAO',
    description: 'Declaração editável para pedido de gratuidade da justiça, com responsabilidade pelas informações.',
    contentHtml: `<h1>DECLARAÇÃO DE HIPOSSUFICIÊNCIA ECONÔMICA</h1>
<p>Eu, <strong>{{cliente_nome}}</strong>, {{cliente_nacionalidade}}, {{cliente_estado_civil}}, {{cliente_profissao}}, portador(a) do RG nº {{cliente_rg}} e inscrito(a) no CPF sob o nº {{cliente_cpf}}, residente e domiciliado(a) em {{cliente_endereco}}, declaro, para os devidos fins e sob as penas da lei, que não possuo recursos suficientes para pagar custas, despesas processuais e honorários periciais sem prejuízo do meu sustento e do sustento de minha família.</p>
<p>Requeiro, por essa razão, a concessão dos benefícios da gratuidade da justiça, nos termos dos arts. 98 e 99 do Código de Processo Civil e demais normas aplicáveis.</p>
<p>Declaro estar ciente de que esta afirmação poderá ser verificada pela autoridade competente e de que informações falsas poderão acarretar as consequências legais cabíveis.</p>
<p><strong>{{cidade}}, {{data_atual}}.</strong></p>
<p><strong>DECLARANTE:</strong> {{cliente_nome}}</p>
<p><strong>CPF:</strong> {{cliente_cpf}}</p>`,
  },
] as const;

const ESSENTIAL_KIT_NAME = 'Kit Jurídico Essencial - Editável';

export async function ensureDefaultLegalLibrary(officeId: string) {
  const templateIds: string[] = [];
  let templatesCreated = 0;

  // Check if office already has any kits or templates
  const existingKitsCount = await prisma.legalKit.count({ where: { officeId } });
  const existingTemplatesCount = await prisma.template.count({ where: { officeId } });

  // If office already has templates or kits, do NOT auto-create or reactivate deleted ones
  if (existingKitsCount > 0 || existingTemplatesCount > 0) {
    return { templatesCreated: 0, templatesAvailable: 0, kitCreated: false, kitId: null, kitItemsAdded: 0 };
  }

  for (const definition of ESSENTIAL_LEGAL_TEMPLATES) {
    let template = await prisma.template.findFirst({
      where: { officeId, title: definition.title },
      select: { id: true, active: true },
    });

    if (!template) {
      template = await prisma.template.create({
        data: { officeId, ...definition },
        select: { id: true, active: true },
      });
      templatesCreated += 1;
    }
    if (template && template.active) {
      templateIds.push(template.id);
    }
  }

  let kit = await prisma.legalKit.findFirst({
    where: { officeId, name: ESSENTIAL_KIT_NAME },
    select: { id: true, active: true },
  });
  let kitCreated = false;
  if (!kit) {
    kit = await prisma.legalKit.create({
      data: {
        officeId,
        name: ESSENTIAL_KIT_NAME,
        category: 'Geral',
        description: 'Contrato completo, procuração geral, procuração previdenciária e declaração de hipossuficiência em um único fluxo editável.',
      },
      select: { id: true, active: true },
    });
    kitCreated = true;
  }

  const existingItems = await prisma.kitItem.findMany({
    where: { kitId: kit.id },
    select: { templateId: true },
  });
  const linked = new Set(existingItems.map((item) => item.templateId));
  const missing = templateIds
    .map((templateId, index) => ({ templateId, displayOrder: index + 1 }))
    .filter((item) => !linked.has(item.templateId));
  if (missing.length > 0) {
    await prisma.kitItem.createMany({
      data: missing.map((item) => ({ kitId: kit.id, ...item })),
    });
  }

  return {
    templatesCreated,
    templatesAvailable: templateIds.length,
    kitCreated,
    kitId: kit.id,
    kitItemsAdded: missing.length,
  };
}
