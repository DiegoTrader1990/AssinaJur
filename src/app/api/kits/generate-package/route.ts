import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { compileTemplateToPdf } from '@/lib/templateCompiler';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const body = await req.json();
    const { clientId, kitId, customVariables } = body;

    if (!clientId || !kitId) {
      return NextResponse.json(
        { error: 'Cliente e Kit Jurídico são obrigatórios.' },
        { status: 400 }
      );
    }

    // Buscar dados do Cliente, Escritório e Kit
    const client = await prisma.client.findFirst({
      where: { id: clientId, officeId: user.officeId },
    });

    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 });
    }

    const office = await prisma.office.findUnique({
      where: { id: user.officeId },
    });

    const kit = await prisma.legalKit.findFirst({
      where: { id: kitId, officeId: user.officeId },
      include: {
        items: {
          include: { template: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!kit || !office || kit.items.length === 0) {
      return NextResponse.json({ error: 'Kit jurídico não possui modelos cadastrados.' }, { status: 400 });
    }

    // Montar mapa completo de variáveis para substituição automática
    const variableValues = {
      cliente_nome: client.name,
      cliente_cpf: client.cpfCnpj,
      cliente_rg: client.rg || '—',
      cliente_nacionalidade: client.nationality || 'Brasileira',
      cliente_telefone: client.whatsapp || client.phone,
      cliente_endereco: client.address || '—',
      cliente_estado_civil: client.maritalStatus || '—',
      cliente_profissao: client.profession || '—',
      advogado_nome: user.name,
      advogado_oab: office.oabNumber || 'OAB/SP 123.456',
      escritorio_nome: office.name,
      ...(customVariables || {}),
    };

    const createdDocuments = [];
    let mainSignerToken = '';

    // Gerar todos os documentos do kit em transação
    for (const item of kit.items) {
      const template = item.template;

      const compiledResult = await compileTemplateToPdf({
        officeId: user.officeId,
        uploadedBy: user.id,
        title: `${template.title} - ${client.name}`,
        contentHtml: template.contentHtml,
        variables: variableValues,
        officeName: office.name,
      });

      const doc = await prisma.document.create({
        data: {
          officeId: user.officeId,
          clientId: client.id,
          templateId: template.id,
          kitId: kit.id,
          title: `${template.title} (${kit.name})`,
          documentType: template.documentType,
          signaturePosition: `CUSTOM:${compiledResult.pageCount}:0.3100:0.7850:0.3800:0.1050`,
          originalFileId: compiledResult.storageRecord.id,
          originalHash: compiledResult.hash,
          status: 'ENVIADO',
          createdById: user.id,
        },
      });

      const signer = await prisma.signer.create({
        data: {
          documentId: doc.id,
          name: client.name,
          cpf: client.cpfCnpj,
          email: client.email || null,
          phone: client.phone || null,
          role: 'CLIENTE',
          signatureOrder: 1,
          status: 'PENDENTE',
        },
      });

      if (!mainSignerToken) {
        mainSignerToken = signer.token;
      }

      await prisma.documentEvent.create({
        data: {
          documentId: doc.id,
          userId: user.id,
          eventType: 'KIT_DOCUMENT_GENERATED',
          description: `Documento "${doc.title}" gerado automaticamente pelo ${kit.name}.`,
        },
      });

      createdDocuments.push(doc);
    }

    await logAuditEvent({
      officeId: user.officeId,
      userId: user.id,
      eventType: 'KIT_PACKAGE_DISPATCHED',
      description: `Pacote do ${kit.name} (${createdDocuments.length} documentos) disparado para ${client.name}.`,
    });

    const signatureLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/assinar/${mainSignerToken}`;

    return NextResponse.json({
      success: true,
      kitName: kit.name,
      clientName: client.name,
      documentsCount: createdDocuments.length,
      mainSignerToken,
      signatureLink,
    });
  } catch (error: any) {
    console.error('Erro ao gerar pacote do kit jurídico:', error);
    return NextResponse.json({ error: 'Erro ao gerar pacote de documentos do kit: ' + (error?.message || '') }, { status: 500 });
  }
}
