import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { compileTemplatePreviewToPdf } from '@/lib/templateCompiler';
import { getFileBuffer } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const { clientId, title, contentHtml, customVariables } = await req.json();
    const [client, office, lawyer] = await Promise.all([
      prisma.client.findFirst({ where: { id: clientId, officeId: user.officeId } }),
      prisma.office.findUnique({ where: { id: user.officeId } }),
      prisma.user.findFirst({ where: { officeId: user.officeId, active: true }, orderBy: { createdAt: 'asc' } }),
    ]);
    if (!client || !office) return NextResponse.json({ error: 'Cliente ou escritório não encontrado.' }, { status: 404 });
    let letterheadBuffer: Buffer | undefined;
    if (office.letterheadFileId) {
      const file = await prisma.storageFile.findUnique({ where: { id: office.letterheadFileId } });
      if (file) letterheadBuffer = await getFileBuffer(office.id, file.storageKey) || undefined;
    }
    const variables = {
      cliente_nome: client.name, cliente_cpf: client.cpfCnpj, cliente_rg: client.rg || '—', cliente_nacionalidade: client.nationality || 'Brasileira',
      cliente_estado_civil: client.maritalStatus || '—', cliente_profissao: client.profession || '—', cidade: client.city || '—',
      cliente_endereco: [client.address, client.number, client.neighborhood, [client.city, client.state].filter(Boolean).join('/')].filter(Boolean).join(', ') || '—',
      advogado_nome: lawyer?.name || 'Advogado responsável', advogado_oab: lawyer?.oabNumber || '—', escritorio_nome: office.tradeName || office.name,
      ...(customVariables || {}),
    };
    const rendered = await compileTemplatePreviewToPdf({ title: title || 'Documento', contentHtml, variables, officeName: office.tradeName || office.name, version: 1, letterheadBuffer });
    return new NextResponse(rendered.pdfBuffer, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="minuta.pdf"' } });
  } catch (error) { console.error(error); return NextResponse.json({ error: 'Não foi possível gerar a prévia.' }, { status: 500 }); }
}
