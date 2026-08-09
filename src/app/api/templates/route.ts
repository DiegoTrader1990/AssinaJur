import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || '';

    const templates = await prisma.template.findMany({
      where: {
        officeId: user.officeId, // TENANT ISOLATION
        active: true,
        category: category ? category : undefined,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ templates });
  } catch (error: any) {
    console.error('Erro ao listar modelos:', error);
    return NextResponse.json({ error: 'Erro ao buscar modelos.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const body = await req.json();
    if (body?.starterLibrary === true) {
      if (user.role !== 'OFFICE_ADMIN') {
        return NextResponse.json({ error: 'Apenas o administrador pode instalar a biblioteca inicial.' }, { status: 403 });
      }
      const existingCount = await prisma.template.count({ where: { officeId: user.officeId } });
      if (existingCount > 0) {
        return NextResponse.json({ error: 'A biblioteca inicial só pode ser instalada quando ainda não existem modelos.' }, { status: 409 });
      }
      const created = await prisma.$transaction(async (tx) => {
        const templates = await Promise.all([
          tx.template.create({ data: { officeId: user.officeId, title: 'Contrato de Honorários Advocatícios', category: 'Previdenciário', documentType: 'CONTRATO', description: 'Modelo inicial editável. Revise valores e condições antes de usar.', contentHtml: '<h1>CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS</h1><p><strong>CONTRATANTE:</strong> {{cliente_nome}}, CPF {{cliente_cpf}}, RG {{cliente_rg}}, residente em {{cliente_endereco}}.</p><p><strong>CONTRATADO:</strong> {{escritorio_nome}}, representado por {{advogado_nome}}, OAB {{advogado_oab}}.</p><h2>OBJETO</h2><p>[DESCREVER O OBJETO E O ESCOPO DOS SERVIÇOS].</p><h2>HONORÁRIOS</h2><p>Os honorários serão de {{valor_honorarios}}, acrescidos de {{percentual_exito}} de êxito, conforme condições que deverão ser revisadas pelo advogado.</p><p>{{cidade}}, {{data_atual}}.</p>' } }),
          tx.template.create({ data: { officeId: user.officeId, title: 'Procuração Ad Judicia', category: 'Previdenciário', documentType: 'PROCURACAO', description: 'Modelo inicial editável de procuração.', contentHtml: '<h1>PROCURAÇÃO AD JUDICIA ET EXTRA</h1><p><strong>OUTORGANTE:</strong> {{cliente_nome}}, CPF {{cliente_cpf}}, RG {{cliente_rg}}, {{cliente_estado_civil}}, {{cliente_profissao}}, residente em {{cliente_endereco}}.</p><p><strong>OUTORGADO:</strong> {{advogado_nome}}, OAB {{advogado_oab}}, integrante de {{escritorio_nome}}.</p><h2>PODERES</h2><p>Confere poderes para o foro em geral, com os poderes especiais que deverão ser definidos e revisados pelo advogado responsável antes do envio.</p><p>{{cidade}}, {{data_atual}}.</p>' } }),
          tx.template.create({ data: { officeId: user.officeId, title: 'Declaração de Hipossuficiência', category: 'Previdenciário', documentType: 'DECLARACAO', description: 'Modelo inicial editável de declaração.', contentHtml: '<h1>DECLARAÇÃO DE HIPOSSUFICIÊNCIA</h1><p>Eu, {{cliente_nome}}, CPF {{cliente_cpf}}, declaro, sob as penas da lei, que não possuo condições de arcar com as despesas processuais sem prejuízo do sustento próprio e de minha família.</p><p>{{cidade}}, {{data_atual}}.</p>' } }),
        ]);
        const kit = await tx.legalKit.create({ data: { officeId: user.officeId, name: 'Kit Previdenciário Inicial', category: 'Previdenciário', description: 'Contrato, procuração e declaração em um único fluxo.' } });
        await tx.kitItem.createMany({ data: templates.map((template, index) => ({ kitId: kit.id, templateId: template.id, displayOrder: index + 1 })) });
        return { templates, kit };
      });
      await logAuditEvent({ officeId: user.officeId, userId: user.id, eventType: 'STARTER_LIBRARY_CREATED', description: 'Biblioteca inicial com três modelos e um kit instalada.' });
      return NextResponse.json({ success: true, ...created });
    }
    const { title, category, documentType, contentHtml, description } = body;

    if (!title || !contentHtml) {
      return NextResponse.json(
        { error: 'Título e conteúdo do modelo são campos obrigatórios.' },
        { status: 400 }
      );
    }

    const template = await prisma.template.create({
      data: {
        officeId: user.officeId, // INJEÇÃO OBRIGATÓRIA DE TENANT
        title,
        category: category || 'Previdenciário',
        documentType: documentType || 'CONTRATO',
        contentHtml,
        description: description || null,
      },
    });

    await logAuditEvent({
      officeId: user.officeId,
      userId: user.id,
      eventType: 'TEMPLATE_CREATED',
      description: `Modelo de documento "${template.title}" cadastrado.`,
    });

    return NextResponse.json({ success: true, template });
  } catch (error: any) {
    console.error('Erro ao criar modelo:', error);
    return NextResponse.json({ error: 'Erro ao cadastrar modelo de documento.' }, { status: 500 });
  }
}
