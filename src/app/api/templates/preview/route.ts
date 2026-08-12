import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { compileTemplatePreviewToPdf } from '@/lib/templateCompiler';

export const dynamic = 'force-dynamic';

const EXAMPLES = {
  cliente_nome: 'MARIA APARECIDA DA SILVA', cliente_cpf: '123.456.789-09', cliente_rg: '12.345.678-9',
  cliente_nacionalidade: 'brasileira', cliente_estado_civil: 'solteira', cliente_profissao: 'aposentada',
  cliente_endereco: 'Rua das Acácias, nº 120, Centro, Porto Seguro/BA, CEP 45810-000', cliente_telefone: '(73) 99999-9999',
  cliente_genero: 'FEMININO',
  advogado_nome: 'DR. DIEGO DOS SANTOS RODRIGUES', advogado_oab: 'OAB/BA nº 51.881',
  advogada_nome: 'DRA. DOMINICK QUINTO SOARES', advogada_oab: 'OAB/BA nº 62.443',
  escritorio_nome: 'Rodrigues & Soares - Advogados', escritorio_endereco: 'Rua José Rodrigues, nº 219, Centro, Porto Seguro/BA',
  valor_honorarios: 'R$ 3.000,00', percentual_exito: '30%', cidade: 'Porto Seguro', data_atual: '12 de agosto de 2026',
};

function ensureJointAttorneyQualification(contentHtml: string, documentType: string, title: string) {
  const isPowerOfAttorney = /PROCUR/i.test(documentType) || /procura[cç][aã]o/i.test(title);
  const isContract = /CONTRAT/i.test(documentType) || /contrato/i.test(title);
  if ((!isPowerOfAttorney && !isContract) || /{{\s*patronos_qualificacao_conjunta\s*}}/i.test(contentHtml)) return contentHtml;
  const labels = isPowerOfAttorney ? 'OUTORGADOS?' : 'CONTRATADOS?';
  const replacementLabel = isPowerOfAttorney ? 'OUTORGADOS' : 'CONTRATADOS';
  const labelAtStart = new RegExp(`^\\s*${labels}\\s*:`, 'i');
  let replaced = false;
  const prepared = contentHtml.replace(/<(p|div)([^>]*)>([\s\S]*?)<\/\1>/gi, (block, tag, attributes, innerHtml) => {
    const text = String(innerHtml).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').trim();
    if (!labelAtStart.test(text)) return block;
    replaced = true;
    return `<${tag}${attributes}><strong>${replacementLabel}:</strong> {{patronos_qualificacao_conjunta}}.</${tag}>`;
  });
  if (replaced) return prepared;
  const plainLinePattern = new RegExp(`(^|\\n)\\s*${labels}\\s*:[^\\n]*`, 'i');
  return prepared.replace(plainLinePattern, (_match, prefix) => `${prefix}<p><strong>${replacementLabel}:</strong> {{patronos_qualificacao_conjunta}}.</p>`);
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const { title, contentHtml, documentType } = await req.json();
    const [office, activeLawyers] = await Promise.all([
      prisma.office.findUnique({ where: { id: user.officeId } }),
      prisma.user.findMany({ where: { officeId: user.officeId, active: true }, select: { name: true, oabNumber: true, gender: true }, orderBy: { name: 'asc' } }),
    ]);
    if (!office) return NextResponse.json({ error: 'Escritório não encontrado.' }, { status: 404 });
    // A prévia do editor representa somente a minuta original: sem capa/cabeçalho
    // automático e sem o nome do kit ao qual o modelo eventualmente pertença.
    const previewTitle = String(title || 'Modelo jurídico').replace(/\s*\(Kit[^)]*\)/i, '').trim();
    const officeState = String((office as any).address || '').match(/(?:\/|,|\s)(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/i)?.[1]?.toUpperCase() || 'BA';
    const fullAddress = String((office as any).address || '').trim() || 'endereço profissional informado na configuração';
    const orderedLawyers = [...activeLawyers].sort((left, right) => left.name === user.name ? -1 : right.name === user.name ? 1 : left.name.localeCompare(right.name, 'pt-BR'));
    const formatOab = (oabNumber: string | null) => {
      const value = String(oabNumber || '').trim();
      if (!value) return 'inscrito(a) na Ordem dos Advogados do Brasil';
      if (/\bOAB\b/i.test(value)) return `inscrito(a) na ${value}`;
      return `inscrito(a) na OAB/${officeState} sob o nº ${value}`;
    };
    const lawyerTextList = orderedLawyers.length > 0
      ? orderedLawyers.map((lawyer) => `${lawyer.name}, ${lawyer.gender === 'FEMININO' ? 'advogada, inscrita' : lawyer.gender === 'MASCULINO' ? 'advogado, inscrito' : 'advogado(a), inscrito(a)'} ${formatOab(lawyer.oabNumber).replace(/^inscrito\(a\)\s*/i, '')}`).join(' e ')
      : 'Advogado responsável';
    const cleanDoc = (office.cpfCnpj || '').replace(/\D/g, '');
    const hasMultiplePatronos = orderedLawyers.length > 1;
    const cpfText = cleanDoc.length === 11 && !hasMultiplePatronos ? `inscrito(a) no CPF sob o nº ${office.cpfCnpj}, ` : '';
    const jointPatronosQualification = `${lawyerTextList}, ${cpfText}com escritório profissional na ${fullAddress}`;
    const mainLawyer = activeLawyers.find((lawyer) => lawyer.name.toLowerCase().includes('diego')) || activeLawyers[0];
    const variables = {
      ...EXAMPLES,
      advogado_nome: mainLawyer?.name || EXAMPLES.advogado_nome,
      advogado_oab: mainLawyer?.oabNumber || EXAMPLES.advogado_oab,
      escritorio_nome: office.tradeName || office.name,
      escritorio_endereco: fullAddress,
      patronos_qualificacao_conjunta: jointPatronosQualification,
      patronos_nomes: orderedLawyers.map((lawyer) => lawyer.name).join('|'),
    };
    const finalContentHtml = ensureJointAttorneyQualification(contentHtml || '', documentType || '', previewTitle);
    const result = await compileTemplatePreviewToPdf({ title: previewTitle, contentHtml: finalContentHtml, variables, officeName: office.tradeName || office.name, version: 1, showSystemHeader: false });
    return new NextResponse(result.pdfBuffer, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="previa-modelo.pdf"' } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Não foi possível gerar a prévia.' }, { status: 500 });
  }
}
