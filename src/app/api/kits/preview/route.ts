import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { compileTemplatePreviewToPdf } from '@/lib/templateCompiler';
import { getFileBuffer } from '@/lib/storage';
import { ensureClientQualificationTokens, formatBirthDate, formatCpfCnpj, removeStandaloneClientNameBeforeQualification } from '@/lib/kitTemplateNormalization';

export const dynamic = 'force-dynamic';

function ensureJointAttorneyQualification(contentHtml: string, title: string) {
  if (!/(procura[cç][aã]o|contrato)/i.test(title) || /{{\s*patronos_qualificacao_conjunta\s*}}/i.test(contentHtml)) return contentHtml;
  const labels = /OUTORGADOS?|CONTRATADOS?/i;
  let replaced = false;
  const prepared = contentHtml.replace(/<(p|div)([^>]*)>([\s\S]*?)<\/\1>/gi, (block, tag, attributes, innerHtml) => {
    const text = String(innerHtml).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').trim();
    if (!new RegExp(`^${labels.source}\\s*:`, 'i').test(text)) return block;
    replaced = true;
    const label = /^CONTRATADOS?/i.test(text) ? 'CONTRATADOS' : 'OUTORGADOS';
    return `<${tag}${attributes}><strong>${label}:</strong> {{patronos_qualificacao_conjunta}}.</${tag}>`;
  });
  return replaced ? prepared : contentHtml;
}

function ensureClientRepresentativeQualification(contentHtml: string, title: string, hasRepresentative: boolean) {
  const isPowerOfAttorney = /procura[cç][aã]o/i.test(title);
  const isContract = /contrato/i.test(title);
  const isDeclaration = /declara[cç][aã]o/i.test(title);
  if (!hasRepresentative || (!isPowerOfAttorney && !isContract && !isDeclaration) || /{{\s*cliente_representacao\s*}}/i.test(contentHtml)) return contentHtml;
  const label = isContract ? 'CONTRATANTE' : isPowerOfAttorney ? 'OUTORGANTE' : '';
  let included = false;
  return contentHtml.replace(/<(p|div)([^>]*)>([\s\S]*?)<\/\1>/gi, (block, tag, attributes, innerHtml) => {
    const visibleText = String(innerHtml).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').trim();
    const matchesClientQualification = label ? new RegExp(`^${label}\\s*:`, 'i').test(visibleText) : /{{\s*cliente_nome\s*}}/i.test(innerHtml);
    if (included || !matchesClientQualification) return block;
    included = true;
    return `<${tag}${attributes}>${String(innerHtml).replace(/\s*\.?\s*$/, '')}, {{cliente_representacao}}.</${tag}>`;
  });
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const { clientId, title, contentHtml, customVariables } = await req.json();
    const [client, office, activeLawyers] = await Promise.all([
      prisma.client.findFirst({ where: { id: clientId, officeId: user.officeId } }),
      prisma.office.findUnique({ where: { id: user.officeId } }),
      prisma.user.findMany({ where: { officeId: user.officeId, active: true, role: { in: ['LAWYER', 'OFFICE_ADMIN'] } }, select: { name: true, oabNumber: true, gender: true }, orderBy: { createdAt: 'asc' } }),
    ]);
    if (!client || !office) return NextResponse.json({ error: 'Cliente ou escritório não encontrado.' }, { status: 404 });
    let letterheadBuffer: Buffer | undefined;
    if (office.letterheadFileId) {
      const file = await prisma.storageFile.findUnique({ where: { id: office.letterheadFileId } });
      if (file) letterheadBuffer = await getFileBuffer(office.id, file.storageKey) || undefined;
    }
    const officeState = String((office as any).address || '').match(/(?:\/|,|\s)(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/i)?.[1]?.toUpperCase() || 'BA';
    const fullAddress = String((office as any).address || '').trim() || 'endereço profissional informado na configuração';
    const orderedLawyers = [...activeLawyers].sort((left, right) => left.name === user.name ? -1 : right.name === user.name ? 1 : left.name.localeCompare(right.name, 'pt-BR'));
    const patronosQualification = orderedLawyers.map((lawyer) => {
      const role = lawyer.gender === 'FEMININO' ? 'advogada, inscrita' : lawyer.gender === 'MASCULINO' ? 'advogado, inscrito' : 'advogado(a), inscrito(a)';
      const oab = String(lawyer.oabNumber || '').trim();
      const registration = /\bOAB\b/i.test(oab) ? `na ${oab}` : oab ? `na OAB/${officeState} sob o nº ${oab}` : 'na Ordem dos Advogados do Brasil';
      return `${lawyer.name}, ${role} ${registration}`;
    }).join(' e ') || 'Advogado responsável';
    const lawyer = orderedLawyers[0];
    const variables = {
      representante_legal: client.legalRepresentative || '', representante_cpf: client.representativeCpf || '', representante_rg: client.representativeRg || '', representante_telefone: client.representativePhone || '',
      representante_qualificacao: [client.representativeRole, client.representativeCpf ? `CPF nº ${client.representativeCpf}` : '', client.representativeRg ? `RG nº ${client.representativeRg}` : '', client.representativePhone ? `telefone ${client.representativePhone}` : ''].filter(Boolean).join(', '),
      cliente_representacao: client.legalRepresentative ? `neste ato representado(a) por ${client.legalRepresentative}, ${[client.representativeRole, client.representativeCpf ? `CPF nº ${client.representativeCpf}` : '', client.representativeRg ? `RG nº ${client.representativeRg}` : '', client.representativePhone ? `telefone ${client.representativePhone}` : ''].filter(Boolean).join(', ')}` : '',
      cliente_nome: client.name, cliente_cpf: formatCpfCnpj(client.cpfCnpj), cliente_rg: client.rg || '—', cliente_nacionalidade: client.nationality || 'Brasileira',
      cliente_estado_civil: client.maritalStatus || '—', cliente_profissao: client.profession || '—',
      cliente_nascimento_qualificacao: client.birthDate ? `, nascido(a) em ${formatBirthDate(client.birthDate)}` : '',
      cliente_endereco: [client.address, client.number, client.complement, client.neighborhood, [client.city, client.state].filter(Boolean).join('/'), client.cep ? `CEP ${client.cep}` : ''].filter(Boolean).join(', ') || '—',
      advogado_nome: lawyer?.name || 'Advogado responsável', advogado_oab: lawyer?.oabNumber || '—', escritorio_nome: office.tradeName || office.name,
      patronos_qualificacao_conjunta: `${patronosQualification}, com escritório profissional na ${fullAddress}`,
      patronos_nomes: orderedLawyers.map((lawyer) => lawyer.name).join('|'),
      data_atual: new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date()),
      ...(customVariables || {}),
      cidade: [client.city, client.state].filter(Boolean).join('/') || '—',
    };
    const normalizedClientContent = removeStandaloneClientNameBeforeQualification(ensureClientQualificationTokens(contentHtml, title || ''), client.name);
    const clientContentHtml = ensureClientRepresentativeQualification(normalizedClientContent, title || '', Boolean(client.legalRepresentative));
    const finalContentHtml = ensureJointAttorneyQualification(clientContentHtml, title || '');
    const rendered = await compileTemplatePreviewToPdf({ title: title || 'Documento', contentHtml: finalContentHtml, variables, officeName: office.tradeName || office.name, version: 1, letterheadBuffer });
    return new NextResponse(rendered.pdfBuffer, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="minuta.pdf"' } });
  } catch (error) { console.error(error); return NextResponse.json({ error: 'Não foi possível gerar a prévia.' }, { status: 500 }); }
}
