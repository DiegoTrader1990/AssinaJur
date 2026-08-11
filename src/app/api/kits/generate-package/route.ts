import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { compileTemplateToPdf } from '@/lib/templateCompiler';
import { getFileBuffer } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const body = await req.json();
    const { clientId, kitId, customVariables, customContents } = body;

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

    const fullAddress = (office as any).address
      ? String((office as any).address)
      : 'Rua José Rodrigues, nº 219, Centro, Porto Seguro/BA, CEP 45810-000';

    const fullOfficeQualification = `${office.name}, pessoa jurídica inscrita no CNPJ sob o nº ${office.cpfCnpj || '00.000.000/0001-00'}, com sede na ${fullAddress}, e-mail: ${office.email || 'contato@rodriguesesoares.adv.br'}, telefone/WhatsApp: ${office.phone || '(73) 98117-1111'}`;

    const jointPatronosQualification = `DR. DIEGO DOS SANTOS RODRIGUES, inscrito na OAB/BA sob o nº 51.881, e DRA. DOMINICK QUINTO SOARES, inscrita na OAB/BA sob o nº 62.443, ambos integrantes de ${office.name}, com escritório profissional localizado na ${fullAddress}`;

    // Montar mapa completo de variáveis para substituição automática
    const variableValues = {
      cliente_nome: client.name,
      cliente_cpf: client.cpfCnpj,
      cliente_rg: client.rg || '—',
      cliente_nacionalidade: client.nationality || 'Brasileira',
      cliente_telefone: client.whatsapp || client.phone || '—',
      cliente_endereco: client.address || '—',
      cliente_estado_civil: client.maritalStatus || '—',
      cliente_profissao: client.profession || '—',
      advogado_nome: user.name,
      advogado_oab: office.oabNumber || 'OAB/BA 51.881',
      advogada_nome: 'Dra. Dominick Quinto Soares',
      advogada_oab: 'OAB/BA 62.443',
      escritorio_nome: office.name,
      escritorio_cnpj: office.cpfCnpj || '—',
      escritorio_endereco: fullAddress,
      escritorio_telefone: office.phone || '(73) 98117-1111 / (73) 98825-0201',
      escritorio_email: office.email || 'contato@rodriguesesoares.adv.br',
      escritorio_qualificacao: fullOfficeQualification,
      patronos_qualificacao_conjunta: jointPatronosQualification,
      cidade: 'Porto Seguro',
      ...(customVariables || {}),
    };

    // Carregar papel timbrado do escritório (se configurado)
    let letterheadBuffer: Buffer | undefined;
    if (office.letterheadFileId) {
      const letterheadFile = await prisma.storageFile.findUnique({
        where: { id: office.letterheadFileId },
      });
      if (letterheadFile) {
        const buf = await getFileBuffer(office.id, letterheadFile.storageKey);
        if (buf) letterheadBuffer = buf;
      }
    }

    const createdDocuments = [];
    let mainSignerToken = '';

    // Gerar todos os documentos do kit em transação
    for (const item of kit.items) {
      const template = item.template;

      // Usar conteúdo customizado (editado pelo advogado) se disponível
      const finalContentHtml = customContents?.[template.id] || template.contentHtml;

      const compiledResult = await compileTemplateToPdf({
        officeId: user.officeId,
        uploadedBy: user.id,
        title: `${template.title} - ${client.name}`,
        contentHtml: finalContentHtml,
        variables: variableValues,
        officeName: office.name,
        letterheadBuffer,
      });

      const doc = await prisma.document.create({
        data: {
          officeId: user.officeId,
          clientId: client.id,
          templateId: template.id,
          kitId: kit.id,
          title: `${template.title} (${kit.name})`,
          documentType: template.documentType,
          signaturePosition: compiledResult.signaturePosition,
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
