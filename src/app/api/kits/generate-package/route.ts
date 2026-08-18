import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { compileTemplateToPdf } from '@/lib/templateCompiler';
import { getDocumentLetterheadBuffer } from '@/lib/documentLetterhead';
import { randomUUID } from 'crypto';
import { ensureClientQualificationTokens, formatBirthDate, formatCpfCnpj, removeStandaloneClientNameBeforeQualification } from '@/lib/kitTemplateNormalization';

export const dynamic = 'force-dynamic';

// Aceita a posição de selo escolhida manualmente pelo advogado (arrastando na
// prévia de cada minuta) em vez da posição detectada automaticamente pelo
// compilador de template. Mesma validação de faixas usada em /api/documents.
function normalizeManualStampOverride(value: unknown, pageCount: number): string | null {
  if (!value || typeof value !== 'object') return null;
  const { page, x, y, width, height } = value as Record<string, unknown>;
  const pageNumber = Number(page);
  const xNumber = Number(x);
  const yNumber = Number(y);
  const widthNumber = Number(width);
  const heightNumber = Number(height);
  if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > pageCount) return null;
  if (![xNumber, yNumber, widthNumber, heightNumber].every(Number.isFinite)) return null;
  if (xNumber < 0 || yNumber < 0 || widthNumber < 0.18 || widthNumber > 0.6 || heightNumber < 0.065 || heightNumber > 0.22) return null;
  if (xNumber + widthNumber > 1.001 || yNumber + heightNumber > 1.001) return null;
  return `CUSTOM:${pageNumber}:${xNumber.toFixed(4)}:${yNumber.toFixed(4)}:${widthNumber.toFixed(4)}:${heightNumber.toFixed(4)}`;
}

function hasValidCpfCnpjCheckDigits(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (![11, 14].includes(digits.length) || /^(\d)\1+$/.test(digits)) return false;
  if (digits.length === 11) {
    const digit = (length: number) => {
      const sum = digits.slice(0, length).split('').reduce((total, current, index) => total + Number(current) * (length + 1 - index), 0);
      const remainder = (sum * 10) % 11;
      return remainder === 10 ? 0 : remainder;
    };
    return digit(9) === Number(digits[9]) && digit(10) === Number(digits[10]);
  }
  const digit = (length: number) => {
    const weights = length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const remainder = weights.reduce((total, weight, index) => total + Number(digits[index]) * weight, 0) % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  return digit(12) === Number(digits[12]) && digit(13) === Number(digits[13]);
}

function ensureJointAttorneyQualification(contentHtml: string, documentType: string, title: string) {
  const isPowerOfAttorney = /PROCUR/i.test(documentType) || /procura[cç][aã]o/i.test(title);
  const isContract = /CONTRAT/i.test(documentType) || /contrato/i.test(title);
  if ((!isPowerOfAttorney && !isContract) || /{{\s*patronos_qualificacao_conjunta\s*}}/i.test(contentHtml)) {
    return contentHtml;
  }

  // Modelos antigos trazem apenas o primeiro advogado. Ao gerar documentos de kit,
  // aproveitamos os patronos ativos configurados pelo escritório sem alterar o modelo salvo.
  const labels = isPowerOfAttorney ? 'OUTORGADOS?' : 'CONTRATADOS?';
  const replacementLabel = isPowerOfAttorney ? 'OUTORGADOS' : 'CONTRATADOS';
  const labelAtStart = new RegExp(`^\\s*${labels}\\s*:`, 'i');
  let replaced = false;

  // O editor pode salvar o rótulo puro, em <strong>, <b> ou junto com outras tags.
  // Por isso analisamos cada parágrafo isoladamente, sem depender de uma única estrutura HTML.
  const withBlockQualification = contentHtml.replace(/<(p|div)([^>]*)>([\s\S]*?)<\/\1>/gi, (block, tag, attributes, innerHtml) => {
    const visibleText = String(innerHtml).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').trim();
    if (!labelAtStart.test(visibleText)) return block;
    replaced = true;
    const fontOpen = String(innerHtml).match(/<font\b[^>]*>/i)?.[0] || '';
    const fontClose = fontOpen ? '</font>' : '';
    return `<${tag}${attributes}>${fontOpen}<strong>${replacementLabel}:</strong> {{patronos_qualificacao_conjunta}}.${fontClose}</${tag}>`;
  });

  if (replaced) return withBlockQualification;

  // Compatibilidade com modelos antigos em texto simples, sem tags de parágrafo.
  const plainLinePattern = new RegExp(`(^|\\n)\\s*${labels}\\s*:[^\\n]*`, 'i');
  return withBlockQualification.replace(
    plainLinePattern,
    (_match, prefix) => `${prefix}<p><strong>${replacementLabel}:</strong> {{patronos_qualificacao_conjunta}}.</p>`,
  );
}

function ensureClientRepresentativeQualification(contentHtml: string, documentType: string, title: string, hasRepresentative: boolean) {
  const isPowerOfAttorney = /PROCUR/i.test(documentType) || /procura[cç][aã]o/i.test(title);
  const isContract = /CONTRAT/i.test(documentType) || /contrato/i.test(title);
  const isDeclaration = /DECLAR/i.test(documentType) || /declara[cç][aã]o/i.test(title);
  if (!hasRepresentative || (!isPowerOfAttorney && !isContract && !isDeclaration) || /{{\s*cliente_representacao\s*}}/i.test(contentHtml)) return contentHtml;
  const label = isPowerOfAttorney ? 'OUTORGANTE' : isContract ? 'CONTRATANTE' : '';
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
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const body = await req.json();
    const {
      clientId, kitId, customVariables, customContents,
      stampOverrides,
      signers: extraSignersInput,
      isIlliterate,
      rogoName,
      rogoCpf,
      rogoRelationship,
      rogoPhone,
      rogoEmail,
      enforceSignatureOrder,
      witnessSigningMode,
    } = body;

    if (!clientId || !kitId) {
      return NextResponse.json(
        { error: 'Cliente e Kit Jurídico são obrigatórios.' },
        { status: 400 }
      );
    }

    const extraSigners = Array.isArray(extraSignersInput) ? extraSignersInput : [];
    if (extraSigners.some((signer: any) => !signer?.name || !hasValidCpfCnpjCheckDigits(String(signer?.cpf || '')))) {
      return NextResponse.json({ error: 'Todos os signatários adicionais precisam ter nome e CPF/CNPJ válido.' }, { status: 400 });
    }

    // Buscar dados do Cliente, Escritório e Kit
    const client = await prisma.client.findFirst({
      where: { id: clientId, officeId: user.officeId },
    });

    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 });
    }

    if (isIlliterate) {
      if (!rogoName || !hasValidCpfCnpjCheckDigits(String(rogoCpf || ''))) {
        return NextResponse.json({ error: 'No fluxo a rogo, informe o nome e CPF válido do assinante a rogo.' }, { status: 400 });
      }
      const rogoDigits = String(rogoCpf).replace(/\D/g, '');
      const clientDigits = String(client.cpfCnpj || '').replace(/\D/g, '');
      if (rogoDigits === clientDigits) {
        return NextResponse.json({ error: 'O assinante a rogo deve ser uma pessoa diferente da cliente titular.' }, { status: 400 });
      }
      const participantCpfs = [clientDigits, rogoDigits, ...extraSigners.map((signer: any) => String(signer.cpf).replace(/\D/g, ''))];
      if (new Set(participantCpfs).size !== participantCpfs.length) {
        return NextResponse.json({ error: 'Cliente, assinante a rogo e testemunhas devem ser pessoas distintas, com CPFs diferentes.' }, { status: 400 });
      }
    }

    const clientSignerInput = {
      name: client.name,
      cpf: client.cpfCnpj,
      email: client.email || '',
      phone: client.phone || '',
      role: 'CLIENTE',
      signatureOrder: 1,
    };
    const rogoWitnesses = isIlliterate ? extraSigners.filter((signer: any) => signer.role === 'TESTEMUNHA') : [];
    const rogoAdditionalSigners = isIlliterate ? extraSigners.filter((signer: any) => signer.role !== 'TESTEMUNHA') : [];
    const orderedSignerInputs = isIlliterate
      ? [
          clientSignerInput,
          {
            name: String(rogoName).trim(), cpf: String(rogoCpf), email: rogoEmail || '', phone: rogoPhone || '',
            role: 'ASSINANTE_A_ROGO', signatureOrder: 2, authMethod: 'LINK_CPF_PRESENCA',
          },
          ...rogoWitnesses.map((signer: any, index: number) => ({ ...signer, role: `TESTEMUNHA_${index + 1}`, signingMode: witnessSigningMode === 'SAME_DEVICE' ? 'SAME_DEVICE' : 'INDIVIDUAL', signatureOrder: index + 3 })),
          ...rogoAdditionalSigners.map((signer: any, index: number) => ({ ...signer, signatureOrder: index + 3 + rogoWitnesses.length })),
        ]
      : [clientSignerInput, ...extraSigners.map((signer: any, index: number) => ({ ...signer, signatureOrder: index + 2 }))];

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
      where: { officeId: user.officeId, active: true, role: { in: ['LAWYER', 'OFFICE_ADMIN'] } },
      select: { name: true, oabNumber: true, gender: true },
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
      ? orderedLawyers.map(l => `${l.name}, ${l.gender === 'FEMININO' ? 'advogada, inscrita' : l.gender === 'MASCULINO' ? 'advogado, inscrito' : 'advogado(a), inscrito(a)'} ${formatOab(l.oabNumber).replace(/^inscrito\(a\)\s*/i, '')}`).join(' e ')
      : 'DR. DIEGO DOS SANTOS RODRIGUES, inscrito na OAB/BA nº 51.881, e DRA. DOMINICK QUINTO SOARES, inscrita na OAB/BA nº 62.443';

    let fullOfficeQualification = '';
    let jointPatronosQualification = '';
    const hasMultiplePatronos = orderedLawyers.length > 1;
    const collectiveOfficeLink = hasMultiplePatronos
      ? `com escritório profissional na ${fullAddress}`
      : `com escritório profissional na ${fullAddress}`;

    if (isCnpj) {
      // Pessoa Jurídica com CNPJ registrado na OAB
      fullOfficeQualification = `${office.name}, sociedade de advogados inscrita no CNPJ sob o nº ${office.cpfCnpj}, representada por seus patronos ${lawyerTextList}, com sede na ${fullAddress}, e-mail: ${office.email || 'contato@rodriguesesoares.adv.br'}, telefone/WhatsApp: ${office.phone || '(73) 98117-1111'}`;
      jointPatronosQualification = `${lawyerTextList}, ${collectiveOfficeLink}`;
    } else {
      // Pessoa Física / Advocacia em Conjunto (SEM CNPJ - Conforme Código de Ética e Provimento OAB)
      // CPF profissional somente faz sentido quando existe um único titular; nunca pode
      // ser anexado ao último nome de uma qualificação conjunta.
      const cpfText = cleanDoc.length === 11 && !hasMultiplePatronos ? `inscrito(a) no CPF sob o nº ${office.cpfCnpj}, ` : '';
      fullOfficeQualification = `${lawyerTextList}, ${cpfText}com escritório profissional localizado na ${fullAddress}, e-mail: ${office.email || 'contato@rodriguesesoares.adv.br'}, telefone/WhatsApp: ${office.phone || '(73) 98117-1111'}`;
      jointPatronosQualification = `${lawyerTextList}, ${cpfText}${collectiveOfficeLink}`;
    }

    const mainLawyer = activeLawyers.find(l => l.name.toLowerCase().includes('diego')) || activeLawyers[0] || { name: user.name, oabNumber: 'OAB/BA 51.881' };
    const secondLawyer = activeLawyers.find(l => l.name.toLowerCase().includes('dominick')) || activeLawyers[1] || { name: 'Dra. Dominick Quinto Soares', oabNumber: 'OAB/BA 62.443' };
    const clientGender = String(client.gender || '').trim().toUpperCase();
    const clientIsFemale = clientGender === 'FEMININO';
    const clientIsMale = clientGender === 'MASCULINO';
    const clientNationality = (!client.nationality || /^brasileir[ao]$/i.test(client.nationality))
      ? clientIsFemale ? 'Brasileira' : clientIsMale ? 'Brasileiro' : 'Brasileira'
      : client.nationality;
    const clientBirthQualification = client.birthDate
      ? `, ${clientIsFemale ? 'nascida' : clientIsMale ? 'nascido' : 'nascido(a)'} em ${formatBirthDate(client.birthDate)}`
      : '';

    // Montar mapa completo de variáveis para substituição automática
    const variableValues = {
      // Valores livres (honorários, êxito e cláusulas adicionais) podem vir da
      // tela de revisão. Os dados vinculados ao cliente abaixo sempre prevalecem
      // para que um valor de uma revisão anterior jamais permaneça no novo kit.
      ...(customVariables || {}),
      cliente_nome: client.name,
      cliente_cpf: formatCpfCnpj(client.cpfCnpj),
      cliente_rg: client.rg || '—',
      cliente_nacionalidade: clientNationality,
      cliente_genero: clientGender,
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
      cliente_nascimento_qualificacao: clientBirthQualification,
      representante_legal: client.legalRepresentative || '',
      representante_cpf: client.representativeCpf || '',
      representante_rg: client.representativeRg || '',
      representante_telefone: client.representativePhone || '',
      representante_qualificacao: [client.representativeRole, client.representativeCpf ? `CPF nº ${client.representativeCpf}` : '', client.representativeRg ? `RG nº ${client.representativeRg}` : '', client.representativePhone ? `telefone ${client.representativePhone}` : ''].filter(Boolean).join(', '),
      cliente_representacao: client.legalRepresentative ? `neste ato representado(a) por ${client.legalRepresentative}, ${[client.representativeRole, client.representativeCpf ? `CPF nº ${client.representativeCpf}` : '', client.representativeRg ? `RG nº ${client.representativeRg}` : '', client.representativePhone ? `telefone ${client.representativePhone}` : ''].filter(Boolean).join(', ')}` : '',
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
      patronos_nomes: orderedLawyers.map((lawyer) => lawyer.name).join('|'),
      // A cidade é um dado do cliente selecionado; um valor antigo salvo no kit não pode sobrescrevê-la.
      cidade: [client.city, client.state].filter(Boolean).join('/') || 'Porto Seguro/BA',
    };

    // Carregar papel timbrado dos documentos: o próprio do escritório (se
    // configurado e selecionado) ou o modelo original do AssinaJur.
    const letterheadBuffer = await getDocumentLetterheadBuffer(office);

    const createdDocuments: Array<{
      id: string;
      title: string;
      signerToken: string;
      signatureLink: string;
    }> = [];
    let mainSignerToken = '';
    const kitBatchId = randomUUID();

    // Gerar todos os documentos do kit em transação
    for (const item of kit.items) {
      const template = item.template;

      // Usar conteúdo customizado (editado pelo advogado) se disponível
      const normalizedClientContent = removeStandaloneClientNameBeforeQualification(
        ensureClientQualificationTokens(
          customContents?.[template.id] || template.contentHtml,
          template.title,
          template.documentType,
        ),
        client.name,
      );
      const clientContentHtml = ensureClientRepresentativeQualification(
        normalizedClientContent,
        template.documentType,
        template.title,
        Boolean(client.legalRepresentative),
      );
      const finalContentHtml = ensureJointAttorneyQualification(
        clientContentHtml,
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
        // O kit já usa o papel timbrado do escritório. O título técnico do
        // sistema não deve ser impresso acima da minuta assinada.
        showSystemHeader: false,
      });

      // Se o advogado ajustou manualmente a posição do selo para esta minuta
      // (arrastando na prévia), essa escolha prevalece sobre a posição que o
      // compilador detectou automaticamente a partir do texto do documento.
      const manualOverride = stampOverrides && typeof stampOverrides === 'object' ? stampOverrides[template.id] : null;
      const normalizedOverride = manualOverride ? normalizeManualStampOverride(manualOverride, compiledResult.pageCount) : null;
      const finalSignaturePosition = normalizedOverride || compiledResult.signaturePosition;

      const doc = await prisma.document.create({
        data: {
          officeId: user.officeId,
          clientId: client.id,
          templateId: template.id,
          kitId: kit.id,
          kitBatchId,
          title: `${template.title} (${kit.name})`,
          documentType: template.documentType,
          signaturePosition: finalSignaturePosition,
          originalFileId: compiledResult.storageRecord.id,
          originalHash: compiledResult.hash,
          status: 'ENVIADO',
          createdById: user.id,
          isIlliterate: !!isIlliterate,
          rogoName: isIlliterate ? rogoName || null : null,
          rogoCpf: isIlliterate && rogoCpf ? String(rogoCpf).replace(/\D/g, '') : null,
          rogoRelationship: isIlliterate ? rogoRelationship || null : null,
        },
      });

      const signerRecords = [];
      for (let i = 0; i < orderedSignerInputs.length; i++) {
        const signerInput: any = orderedSignerInputs[i];
        const createdSigner = await prisma.signer.create({
          data: {
            documentId: doc.id,
            name: signerInput.name,
            cpf: String(signerInput.cpf).replace(/\D/g, ''),
            email: signerInput.email || null,
            phone: signerInput.phone || null,
            role: signerInput.role || 'CLIENTE',
            signatureOrder: signerInput.signatureOrder || i + 1,
            signingMode: signerInput.signingMode || (signerInput.role === 'ASSINANTE_A_ROGO' ? 'SAME_DEVICE' : 'INDIVIDUAL'),
            status: 'PENDENTE',
            authMethod: signerInput.authMethod || 'EMAIL_OTP_CPF',
          },
        });
        signerRecords.push(createdSigner);
      }

      const mainSigner = signerRecords[0];
      if (!mainSignerToken) {
        mainSignerToken = mainSigner.token;
      }

      await prisma.documentEvent.create({
        data: {
          documentId: doc.id,
          userId: user.id,
          eventType: 'KIT_DOCUMENT_GENERATED',
          description: `Documento "${doc.title}" gerado automaticamente pelo ${kit.name}.`,
        },
      });

      if (enforceSignatureOrder || isIlliterate) {
        await prisma.documentEvent.create({
          data: {
            documentId: doc.id,
            userId: user.id,
            eventType: 'SIGNATURE_ORDER_ENFORCED',
            description: 'Ordem sequencial de participação configurada e protegida pelo sistema.',
          },
        });
      }

      if (isIlliterate) {
        await prisma.documentEvent.create({
          data: {
            documentId: doc.id,
            userId: user.id,
            eventType: 'ROGO_FLOW_CONFIGURED',
            description: `Fluxo a rogo configurado para ${client.name}, com ${rogoName} como assinante a rogo${rogoWitnesses.length ? ` e ${rogoWitnesses.length} testemunha(s) independente(s)` : ''}.`,
          },
        });
      }

      createdDocuments.push({
        id: doc.id,
        title: doc.title,
        signerToken: mainSigner.token,
        signatureLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/assinar/${mainSigner.token}`,
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
