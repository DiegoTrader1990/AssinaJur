import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { ensureDefaultLegalLibrary } from '@/lib/defaultLegalLibrary';
import { ensureClientQualificationTokens } from '@/lib/kitTemplateNormalization';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || '';

    await ensureDefaultLegalLibrary(user.officeId);

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
      const library = await ensureDefaultLegalLibrary(user.officeId);
      await logAuditEvent({ officeId: user.officeId, userId: user.id, eventType: 'STARTER_LIBRARY_CREATED', description: 'Biblioteca jurídica essencial verificada e atualizada sem sobrescrever modelos existentes.' });
      return NextResponse.json({ success: true, library });
    }
    const { title, category, documentType, contentHtml, description } = body;

    if (!title || !contentHtml) {
      return NextResponse.json(
        { error: 'Título e conteúdo do modelo são campos obrigatórios.' },
        { status: 400 }
      );
    }

    const normalizedContentHtml = ensureClientQualificationTokens(contentHtml, title, documentType || 'CONTRATO');
    const template = await prisma.template.create({
      data: {
        officeId: user.officeId, // INJEÇÃO OBRIGATÓRIA DE TENANT
        title,
        category: category || 'Previdenciário',
        documentType: documentType || 'CONTRATO',
        contentHtml: normalizedContentHtml,
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
