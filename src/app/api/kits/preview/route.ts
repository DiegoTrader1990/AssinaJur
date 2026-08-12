import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { compileTemplatePreviewToPdf } from '@/lib/templateCompiler';
import { getFileBuffer } from '@/lib/storage';

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

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const { clientId, title, contentHtml, customVariables } = await req.json();
    const [client, office, activeLawyers] = await Promise.all([
      prisma.client.findFirst({ where: { id: clientId, officeId: user.officeId } }),
      prisma.office.findUnique({ where: { id: user.officeId } }),
      prisma.user.findMany({ where: { officeId: user.officeId, active: true }, select: { name: true, oabNumber: true, gender: true }, orderBy: { createdAt: 'asc' } }),
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
      cliente_nome: client.name, cliente_cpf: client.cpfCnpj, cliente_rg: client.rg || '—', cliente_nacionalidade: client.nationality || 'Brasileira',
      cliente_estado_civil: client.maritalStatus || '—', cliente_profissao: client.profession || '—',
      cliente_endereco: [client.address, client.number, client.neighborhood, [client.city, client.state].filter(Boolean).join('/')].filter(Boolean).join(', ') || '—',
      advogado_nome: lawyer?.name || 'Advogado responsável', advogado_oab: lawyer?.oabNumber || '—', escritorio_nome: office.tradeName || office.name,
      patronos_qualificacao_conjunta: `${patronosQualification}, com escritório profissional na ${fullAddress}`,
      data_atual: new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date()),
      ...(customVariables || {}),
      cidade: client.city || '—',
    };
    const finalContentHtml = ensureJointAttorneyQualification(contentHtml, title || '');
    const rendered = await compileTemplatePreviewToPdf({ title: title || 'Documento', contentHtml: finalContentHtml, variables, officeName: office.tradeName || office.name, version: 1, letterheadBuffer });
    return new NextResponse(rendered.pdfBuffer, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="minuta.pdf"' } });
  } catch (error) { console.error(error); return NextResponse.json({ error: 'Não foi possível gerar a prévia.' }, { status: 500 }); }
}
