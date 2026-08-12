import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { compileTemplateToPdf } from '@/lib/templateCompiler';
import { getFileBuffer } from '@/lib/storage';

export const dynamic = 'force-dynamic';

function ensureJointAttorneyQualification(contentHtml: string, documentType: string, title: string) {
  const isPowerOfAttorney = /PROCUR/i.test(documentType) || /procura[cç][aã]o/i.test(title);
  const isContract = /CONTRAT/i.test(documentType) || /contrato/i.test(title);
  if ((!isPowerOfAttorney && !isContract) || /{{\s*patronos_qualificacao_conjunta\s*}}/i.test(contentHtml)) {
    return contentHtml;
  }

  // Modelos antigos trazem apenas o primeiro advogado. Ao gerar documentos de kit,
  // aproveitamos os patronos ativos configurados pelo escritório sem alterar o modelo salvo.
  const labels = isPowerOfAttorney ? 'OUTORGADOS?' : 'CONTRATADOS?';
  const pattern = new RegExp(`<(p|div)([^>]*)>\\s*<strong>\\s*${labels}\\s*:\\s*<\\/strong>[\\s\\S]*?<\\/\\1>`, 'i');
  const replacementLabel = isPowerOfAttorney ? 'OUTORGADOS' : 'CONTRATADOS';
  return contentHtml.replace(
    pattern,
    (_match, tag, attributes) => `<${tag}${attributes}><strong>${replacementLabel}:</strong> {{patronos_qualificacao_conjunta}}.</${tag}>`,
  );
}

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

    const activeLawyers = await prisma.user.findMany({
      where: { officeId: user.officeId, active: true },
      select: { name: true, oabNumber: true },
      orderBy: { name: 'asc' },
    });

    const fullAddress = (office as any).address
      ? String((office as any).address)
      : 'Rua José Rodrigues, nº 219, Centro, Porto Seguro/BA, CEP 45810-000';

    const cleanDoc = (office.cpfCnpj || '').replace(/\D/g, '');
    const isCnpj = cleanDoc.length > 11;

    const officeState = String((office as any).address || '').match(/(?:\/|,|\s)(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/i)?.[1]?.toUpperCase() || 'BA';
    const formatOab = (oabNumber: string | null) => {
      const value = String(oabNumber || '').trim();
      if (!value) return 'inscrito(a) na Ordem dos Advogados do Brasil';
      if (/\bOAB\b/i.test(value)) return `inscrito(a) na ${value}`;
      return `inscrito(a) na OAB/${officeState} sob o nº ${value}`;
    };
    const orderedLawyers = [...activeLawyers].sort((left, right) => {
      if (left.name === user.name) return -1;
      if (right.name === user.name) return 1;
      return left.name.localeCompare(right.name, 'pt-BR');
    });
    const lawyerTextList = orderedLawyers.length > 0
      ? orderedLawyers.map(l => `${l.name}, advogado(a), ${formatOab(l.oabNumber)}`).join(' e ')
      : 'DR. DIEGO DOS SANTOS RODRIGUES, inscrito na OAB/BA nº 51.881, e DRA. DOMINICK QUINTO SOARES, inscrita na OAB/BA nº 62.443';

    let fullOfficeQualification = '';
    let jointPatronosQualification = '';

    if (isCnpj) {
      // Pessoa Jurídica com CNPJ registrado na OAB
      fullOfficeQualification = `${office.name}, sociedade de advogados inscrita no CNPJ sob o nº ${office.cpfCnpj}, representada por seus patronos ${lawyerTextList}, com sede na ${fullAddress}, e-mail: ${office.email || 'contato@rodriguesesoares.adv.br'}, telefone/WhatsApp: ${office.phone || '(73) 98117-1111'}`;
      jointPatronosQualification = `${lawyerTextList}, integrantes de ${office.name}, com escritório profissional na ${fullAddress}`;
    } else {
      // Pessoa Física / Advocacia em Conjunto (SEM CNPJ - Conforme Código de Ética e Provimento OAB)
      const cpfText = cleanDoc.length === 11 ? `inscrito(a) no CPF sob o nº ${office.cpfCnpj}, ` : '';
      fullOfficeQualification = `${lawyerTextList}, ${cpfText}com escritório profissional localizado na ${fullAddress}, e-mail: ${office.email || 'contato@rodriguesesoares.adv.br'}, telefone/WhatsApp: ${office.phone || '(73) 98117-1111'}`;
      jointPatronosQualification = `${lawyerTextList}, ${cpfText}com escritório profissional na ${fullAddress}`;
    }

    const mainLawyer = activeLawyers.find(l => l.name.toLowerCase().includes('diego')) || activeLawyers[0] || { name: user.name, oabNumber: 'OAB/BA 51.881' };
    const secondLawyer = activeLawyers.find(l => l.name.toLowerCase().includes('dominick')) || activeLawyers[1] || { name: 'Dra. Dominick Quinto Soares', oabNumber: 'OAB/BA 62.443' };

    // Montar mapa completo de variáveis para substituição automática
    const variableValues = {
      cliente_nome: client.name,
      cliente_cpf: client.cpfCnpj,
      cliente_rg: client.rg || '—',
      cliente_nacionalidade: client.nationality || 'Brasileira',
      cliente_telefone: client.whatsapp || client.phone || '—',
      cliente_endereco: [
        client.address,
        client.number && !String(client.address || '').includes(client.number) ? `nº ${client.number}` : '',
        client.complement,
        client.neighborhood,
        [client.city, client.state].filter(Boolean).join('/'),
        client.cep ? `CEP ${client.cep}` : '',
      ].filter(Boolean).join(', ') || '—',
      cliente_estado_civil: client.maritalStatus || '—',
      cliente_profissao: client.profession || '—',
      advogado_nome: mainLawyer.name,
      advogado_oab: mainLawyer.oabNumber || 'OAB/BA 51.881',
      advogada_nome: secondLawyer.name,
      advogada_oab: secondLawyer.oabNumber || 'OAB/BA 62.443',
      escritorio_nome: office.name,
      escritorio_cnpj: office.cpfCnpj || 'Não possui CNPJ (Sociedade de Fato)',
      escritorio_endereco: fullAddress,
      escritorio_telefone: office.phone || '(73) 98117-1111 / (73) 98825-0201',
      escritorio_email: office.email || 'contato@rodriguesesoares.adv.br',
      escritorio_qualificacao: fullOfficeQualification,
      patronos_qualificacao_conjunta: jointPatronosQualification,
      cidade: client.city || 'Porto Seguro',
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

    const createdDocuments: Array<{
      id: string;
      title: string;
      signerToken: string;
      signatureLink: string;
    }> = [];
    let mainSignerToken = '';

    // Gerar todos os documentos do kit em transação
    for (const item of kit.items) {
      const template = item.template;

      // Usar conteúdo customizado (editado pelo advogado) se disponível
      const finalContentHtml = ensureJointAttorneyQualification(
        customContents?.[template.id] || template.contentHtml,
        template.documentType,
        template.title,
      );

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

      createdDocuments.push({
        id: doc.id,
        title: doc.title,
        signerToken: signer.token,
        signatureLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/assinar/${signer.token}`,
      });
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
      documents: createdDocuments,
      mainSignerToken,
      signatureLink,
    });
  } catch (error: any) {
    console.error('Erro ao gerar pacote do kit jurídico:', error);
    return NextResponse.json({ error: 'Erro ao gerar pacote de documentos do kit: ' + (error?.message || '') }, { status: 500 });
  }
}
