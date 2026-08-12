import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { compileTemplatePreviewToPdf } from '@/lib/templateCompiler';

export const dynamic = 'force-dynamic';

const EXAMPLES = {
  cliente_nome: 'MARIA APARECIDA DA SILVA', cliente_cpf: '123.456.789-09', cliente_rg: '12.345.678-9',
  cliente_nacionalidade: 'brasileira', cliente_estado_civil: 'solteira', cliente_profissao: 'aposentada',
  cliente_endereco: 'Rua das Acácias, nº 120, Centro, Porto Seguro/BA, CEP 45810-000', cliente_telefone: '(73) 99999-9999',
  advogado_nome: 'DR. DIEGO DOS SANTOS RODRIGUES', advogado_oab: 'OAB/BA nº 51.881',
  advogada_nome: 'DRA. DOMINICK QUINTO SOARES', advogada_oab: 'OAB/BA nº 62.443',
  escritorio_nome: 'Rodrigues & Soares - Advogados', escritorio_endereco: 'Rua José Rodrigues, nº 219, Centro, Porto Seguro/BA',
  valor_honorarios: 'R$ 3.000,00', percentual_exito: '30%', cidade: 'Porto Seguro', data_atual: '12 de agosto de 2026',
};

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const { title, contentHtml } = await req.json();
    const office = await prisma.office.findUnique({ where: { id: user.officeId } });
    if (!office) return NextResponse.json({ error: 'Escritório não encontrado.' }, { status: 404 });
    const result = await compileTemplatePreviewToPdf({ title: title || 'Modelo jurídico', contentHtml: contentHtml || '', variables: EXAMPLES, officeName: office.tradeName || office.name, version: 1 });
    return new NextResponse(result.pdfBuffer, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="previa-modelo.pdf"' } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Não foi possível gerar a prévia.' }, { status: 500 });
  }
}
