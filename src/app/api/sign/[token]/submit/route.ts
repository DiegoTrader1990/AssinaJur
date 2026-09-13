import { validateEvidenceImage } from '@/lib/evidence-image';
import { loadParticipantGroups } from '@/lib/participant-groups';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateFinalPdfCertificate } from '@/lib/pdfCertificate';
import { queueSignatureCompletionMessages } from '@/lib/whatsapp/signatureCompletion';
import { getSignatureOrderBlock, signatureOrderError } from '@/lib/signatureOrder';
import { isIndividualRetry } from '@/lib/photo-review';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(
  req: Request,
  { params }: { params: { token: string } }
) {
  try {
    const body = await req.json();
    const {
      confirmCpf,
      signatureType,
      signatureImage,
      signedConsentText,
      selfieCenterImage,
      selfieLeftImage,
      selfieRightImage,
      documentFrontImage,
      documentBackImage,
      geoLat,
      geoLng,
      geoAccuracy,
      geoCity,
      geoState,
      rogo,
      witness1,
      witness2,
    } = body;

    const link = await prisma.signer.findUnique({ where: { token: params.token }, select: { document: { select: { officeId: true } } } });
    if (!link) return NextResponse.json({ error: 'Link não encontrado.' }, { status: 404 });
    // A aprovação usa a mesma ordem de bloqueios. Nenhum arquivo externo é gerado nesta transação.
    const result = await prisma.$transaction(async (prisma) => {
    await prisma.$queryRaw`SELECT id FROM "Office" WHERE id = ${link.document.officeId} FOR UPDATE`;
    const linkedDocument = await prisma.signer.findUnique({ where: { token: params.token }, select: { document: true } });
    if (!linkedDocument) return NextResponse.json({ error: 'Link não encontrado.' }, { status: 404 });
    const lockDoc = linkedDocument.document;
    await prisma.$queryRaw`SELECT id FROM "Document" WHERE "officeId" = ${lockDoc.officeId}
      AND (id = ${lockDoc.id} OR (${lockDoc.kitBatchId}::text IS NOT NULL AND "kitBatchId" = ${lockDoc.kitBatchId})) ORDER BY id FOR UPDATE`;
    const signer = await prisma.signer.findUnique({
      where: { token: params.token },
      include: {
        document: {
          include: { signers: true },
        },
      },
    });

    if (!signer || !signer.document) {
      return NextResponse.json({ error: 'Signatário inválido ou link expirado.' }, { status: 404 });
    }

    if (signer.status === 'ASSINADO') {
      const pending = signer.document.signers.filter((s) => s.name && s.status !== 'ASSINADO').sort((a, b) => a.signatureOrder - b.signatureOrder);
      return NextResponse.json({ success: true, alreadySigned: true, documentStatus: signer.document.status,
        message: 'Sua participação já está salva.',
        certificatePending: signer.document.status === 'CONCLUIDO' && !signer.document.signedFileId,
        nextSigner: pending[0]?.signingMode === 'SAME_DEVICE' ? { token: pending[0].token, name: pending[0].name, role: pending[0].role } : null,
        pendingParticipants: pending.map((s) => ({ name: s.name, role: s.role, signingMode: s.signingMode })),
      });
    }
    if (signer.document.status === 'CONCLUIDO' && signer.document.reviewStatus === 'APROVADO') {
      return NextResponse.json({ error: 'O documento aprovado não pode ser alterado.' }, { status: 409 });
    }
    const groups = await loadParticipantGroups(prisma, signer.document, signer.document.signers);
    const pair = groups.find(g => g.partyOrder === signer.signatureOrder);
    const pairedRogo = pair ? signer.document.signers.find(p => p.signatureOrder === pair.rogoOrder) : null;
    // O link só pode registrar acompanhantes previstos para o mesmo aparelho.
    for (const [input, roles] of [[rogo, ['ASSINANTE_A_ROGO']], [witness1, ['TESTEMUNHA_1', 'TESTEMUNHA']], [witness2, ['TESTEMUNHA_2']]] as const) {
      if (!input) continue;
      const target = input === rogo ? pairedRogo : signer.document.signers.find((person) => (roles as readonly string[]).includes(person.role));
      if ((input === rogo ? !pair : signer.role !== 'CLIENTE') || !target || target.signingMode !== 'SAME_DEVICE' || target.status === 'ASSINADO' ||
          String(input.cpf || '').replace(/\D/g, '') !== target.cpf.replace(/\D/g, '') ||
          String(input.name || '').trim().toLocaleLowerCase('pt-BR') !== target.name.trim().toLocaleLowerCase('pt-BR')) {
        return NextResponse.json({ error: 'Os dados do acompanhante não correspondem ao participante autorizado. Solicite a correção ao escritório.' }, { status: 403 });
      }
    }
    if (signer.document.status === 'CANCELADO' || signer.document.status === 'EXPIRADO' || (signer.document.expirationDate && new Date(signer.document.expirationDate).getTime() < Date.now())) {
      return NextResponse.json({ error: 'Este link foi cancelado ou expirou.' }, { status: 400 });
    }

    const blocker = await getSignatureOrderBlock(signer.document.id, signer.id, prisma);
    if (blocker) {
      return NextResponse.json({ error: signatureOrderError(blocker), orderEnforced: true, waitingFor: blocker.name }, { status: 409 });
    }

    // 1. Validação do CPF do Cliente Titular
    const cleanConfirmCpf = (confirmCpf || '').replace(/\D/g, '');
    const cleanSignerCpf = (signer.cpf || '').replace(/\D/g, '');

    if (cleanConfirmCpf !== cleanSignerCpf) {
      return NextResponse.json(
        { error: 'O CPF informado não corresponde ao CPF cadastrado para esta assinatura.' },
        { status: 400 }
      );
    }

    // Evidências obrigatórias para qualquer papel, inclusive acompanhantes legados.
    for (const [person, label] of [[body, 'participante'], [rogo, 'assinante a rogo'], [witness1, 'primeira testemunha'], [witness2, 'segunda testemunha']] as const) {
      if (!person) continue;
      if (['documentFrontImage', 'documentBackImage', 'selfieCenterImage'].some(field => typeof person[field] !== 'string' || !person[field].trim())) {
        return NextResponse.json({ error: `Conclua as três fotos do ${label}: identidade frente, verso e selfie segurando o documento.` }, { status: 400 });
      }
      try {
        for (const field of ['documentFrontImage', 'documentBackImage', 'selfieCenterImage']) await validateEvidenceImage(person[field]);
      } catch { return NextResponse.json({ error: `Uma foto do ${label} está inválida ou incompleta. Capture novamente antes de concluir.` }, { status: 400 }); }
    }

    // 2. Validação da Prova de Presença (Selfie segurando o documento)
    if (!selfieCenterImage) {
      return NextResponse.json(
        { error: 'É necessário enviar a foto segurando o documento de identificação antes de assinar.' },
        { status: 400 }
      );
    }

    const isRogadoConsent = Boolean(pair);

    // 3. Se for fluxo a rogo e dados do acompanhante foram enviados no mesmo link, validar dados do Acompanhante
    if (isRogadoConsent && rogo) {
      if (!rogo.selfieCenterImage) {
        return NextResponse.json(
          { error: 'O Assinante a Rogo também deve enviar a foto segurando o documento no mesmo aparelho.' },
          { status: 400 }
        );
      }
      const cleanRogoCpf = (rogo.cpf || '').replace(/\D/g, '');
      if (!cleanRogoCpf) {
        return NextResponse.json(
          { error: 'Informe o CPF do Assinante a Rogo.' },
          { status: 400 }
        );
      }
    }

    if (signer.role === 'ASSINANTE_A_ROGO' && signer.status !== 'ASSINADO') {
      return NextResponse.json({ error: 'O assinante a rogo deve concluir junto com o cliente no mesmo aparelho.' }, { status: 409 });
    }
    if (isRogadoConsent && !rogo) return NextResponse.json({ error: 'Conclua a participação do assinante a rogo neste aparelho.' }, { status: 400 });
    for (const witness of [witness1, witness2]) {
      if (witness && !witness.selfieCenterImage) return NextResponse.json({ error: 'Conclua a foto da testemunha antes de enviar.' }, { status: 400 });
    }

    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Mobile Browser';

    // 4. Atualizar o Signatário Titular (Cliente)
    const updatedSigner = await prisma.signer.update({
      where: { id: signer.id },
      data: {
        status: 'ASSINADO',
        signatureType: signatureType || (isRogadoConsent ? 'SELO_DIGITAL' : 'DESENHADA'),
        signatureImage: signatureImage || null,
        signedConsentText: signedConsentText || (isRogadoConsent
          ? 'Declaro ciência e concordância integral com este documento, autorizando a assinatura a rogo realizada em meu nome.'
          : 'Declaro que li os documentos, concordo com seu conteúdo e reconheço esta manifestação como minha assinatura eletrônica.'),
        selfieCenterImage,
        selfieLeftImage: selfieLeftImage || null,
        selfieRightImage: selfieRightImage || null,
        documentFrontImage: documentFrontImage || null,
        documentBackImage: documentBackImage || null,
        geoLat: typeof geoLat === 'number' ? geoLat : null,
        geoLng: typeof geoLng === 'number' ? geoLng : null,
        geoAccuracy: typeof geoAccuracy === 'number' ? geoAccuracy : null,
        geoCity: geoCity || null,
        geoState: geoState || null,
        signedAt: new Date(),
        ipAddress: clientIp,
        userAgent,
      },
    });

    // 5. Se for fluxo a rogo e dados do acompanhante foram enviados no mesmo link, atualizar o Assinante a Rogo
    if (isRogadoConsent && rogo) {
      let rogoSignerRecord = pairedRogo || undefined;
      if (rogoSignerRecord) {
        await prisma.signer.update({
          where: { id: rogoSignerRecord.id },
          data: {
            name: rogo.name || rogoSignerRecord.name,
            cpf: (rogo.cpf || rogoSignerRecord.cpf).replace(/\D/g, ''),
            status: 'ASSINADO',
            signatureType: rogo.signatureType || 'DESENHADA',
            signatureImage: rogo.signatureImage || null,
            signedConsentText: rogo.signedConsentText || `Assino a rogo pelo cliente ${signer.name}, declarando a veracidade das informações apresentadas.`,
            selfieCenterImage: rogo.selfieCenterImage,
            selfieLeftImage: rogo.selfieLeftImage || null,
            selfieRightImage: rogo.selfieRightImage || null,
            documentFrontImage: rogo.documentFrontImage || null,
            documentBackImage: rogo.documentBackImage || null,
            geoLat: typeof geoLat === 'number' ? geoLat : null,
            geoLng: typeof geoLng === 'number' ? geoLng : null,
            geoAccuracy: typeof geoAccuracy === 'number' ? geoAccuracy : null,
            geoCity: geoCity || null,
            geoState: geoState || null,
            signedAt: new Date(),
            ipAddress: clientIp,
            userAgent,
          },
        });

        await prisma.documentEvent.create({
          data: {
            documentId: signer.document.id,
            signerId: rogoSignerRecord.id,
            eventType: 'SIGNATURE_SUBMITTED',
            description: `Assinatura eletrônica a rogo concluída no mesmo link por ${rogo.name || rogoSignerRecord.name} em favor de ${signer.name}.`,
            ipAddress: clientIp,
            userAgent,
          },
        });
      }
    }

    // 5b. Se dados da 1ª Testemunha foram enviados no mesmo link, registrar assinatura
    if (witness1 && witness1.name && witness1.cpf && witness1.selfieCenterImage) {
      // O papel gravado na criação do documento é "TESTEMUNHA_1" (ver
      // api/documents/route.ts e api/kits/generate-package/route.ts, que
      // renomeiam para TESTEMUNHA_${index + 1}). Esta busca procurava só
      // "TESTEMUNHA", nunca encontrava a testemunha já criada e caía no create
      // abaixo: nascia um segundo registro para a mesma pessoa, a TESTEMUNHA_1
      // original ficava PENDENTE para sempre e o documento nunca chegava a
      // CONCLUÍDO - logo, nunca emitia certificado. O papel antigo continua
      // aceito para documentos criados antes da renomeação.
      let witness1Signer = signer.document.signers.find((s) => s.role === 'TESTEMUNHA_1' || s.role === 'TESTEMUNHA');
      if (!witness1Signer) {
        witness1Signer = await prisma.signer.create({
          data: {
            documentId: signer.document.id,
            name: witness1.name,
            cpf: witness1.cpf.replace(/\D/g, ''),
            role: 'TESTEMUNHA_1',
            status: 'PENDENTE',
          },
        });
      }

      await prisma.signer.update({
        where: { id: witness1Signer.id },
        data: {
          name: witness1.name,
          cpf: witness1.cpf.replace(/\D/g, ''),
          status: 'ASSINADO',
          signatureType: witness1.signatureType || 'DESENHADA',
          signatureImage: witness1.signatureImage || null,
          signedConsentText: `Assino como 1ª Testemunha Instrumentária do documento ${signer.document.title}.`,
          documentFrontImage: witness1.documentFrontImage,
          documentBackImage: witness1.documentBackImage,
          selfieCenterImage: witness1.selfieCenterImage,
          selfieLeftImage: witness1.selfieLeftImage,
          selfieRightImage: witness1.selfieRightImage,
          geoLat: typeof geoLat === 'number' ? geoLat : null,
          geoLng: typeof geoLng === 'number' ? geoLng : null,
          geoAccuracy: typeof geoAccuracy === 'number' ? geoAccuracy : null,
          geoCity: geoCity || null,
          geoState: geoState || null,
          signedAt: new Date(),
          ipAddress: clientIp,
          userAgent,
        },
      });

      await prisma.documentEvent.create({
        data: {
          documentId: signer.document.id,
          signerId: witness1Signer.id,
          eventType: 'SIGNATURE_SUBMITTED',
          description: `Assinatura da 1ª Testemunha Instrumentária registrada no mesmo aparelho por ${witness1.name}.`,
          ipAddress: clientIp,
          userAgent,
        },
      });
    }

    // 5c. Se dados da 2ª Testemunha foram enviados no mesmo link, registrar assinatura
    if (witness2 && witness2.name && witness2.cpf && witness2.selfieCenterImage) {
      let witness2Signer = signer.document.signers.find((s) => s.role === 'TESTEMUNHA_2');
      if (!witness2Signer) {
        witness2Signer = await prisma.signer.create({
          data: {
            documentId: signer.document.id,
            name: witness2.name,
            cpf: witness2.cpf.replace(/\D/g, ''),
            role: 'TESTEMUNHA_2',
            status: 'PENDENTE',
          },
        });
      }

      await prisma.signer.update({
        where: { id: witness2Signer.id },
        data: {
          name: witness2.name,
          cpf: witness2.cpf.replace(/\D/g, ''),
          status: 'ASSINADO',
          signatureType: witness2.signatureType || 'DESENHADA',
          signatureImage: witness2.signatureImage || null,
          signedConsentText: `Assino como 2ª Testemunha Instrumentária do documento ${signer.document.title}.`,
          documentFrontImage: witness2.documentFrontImage,
          documentBackImage: witness2.documentBackImage,
          selfieCenterImage: witness2.selfieCenterImage,
          selfieLeftImage: witness2.selfieLeftImage,
          selfieRightImage: witness2.selfieRightImage,
          geoLat: typeof geoLat === 'number' ? geoLat : null,
          geoLng: typeof geoLng === 'number' ? geoLng : null,
          geoAccuracy: typeof geoAccuracy === 'number' ? geoAccuracy : null,
          geoCity: geoCity || null,
          geoState: geoState || null,
          signedAt: new Date(),
          ipAddress: clientIp,
          userAgent,
        },
      });

      await prisma.documentEvent.create({
        data: {
          documentId: signer.document.id,
          signerId: witness2Signer.id,
          eventType: 'SIGNATURE_SUBMITTED',
          description: `Assinatura da 2ª Testemunha Instrumentária registrada no mesmo aparelho por ${witness2.name}.`,
          ipAddress: clientIp,
          userAgent,
        },
      });
    }

    // 6. Atualização do Status do Documento
    const freshDoc = await prisma.document.findUnique({
      where: { id: signer.document.id },
      include: { signers: true },
    });
    const rawSigners = freshDoc?.signers || signer.document.signers;
    const allSigners = rawSigners.filter((s) => s.name && s.name.trim().length > 0);
    const allCompleted = allSigners.length > 0 && allSigners.every((s) => s.status === 'ASSINADO');
    const nextSigner = allSigners
      .filter((s) => s.status !== 'ASSINADO')
      .sort((a, b) => a.signatureOrder - b.signatureOrder)[0] || null;

    let newDocStatus = 'PARCIALMENTE_ASSINADO';
    if (allCompleted) {
      newDocStatus = 'CONCLUIDO';
    }

    await prisma.document.update({
      where: { id: signer.document.id },
      data: {
        status: newDocStatus,
        completedAt: allCompleted ? new Date() : null,
        // Toda conclusão de assinatura (inclusive depois de um "Refazer") volta a exigir
        // revisão manual do escritório antes de liberar o botão Refazer de novo.
        ...(allCompleted ? { reviewStatus: 'PENDENTE_REVISAO' } : {}),
      },
    });

    // Registros da Trilha de Auditoria
    await prisma.documentEvent.create({
      data: {
        documentId: signer.document.id,
        signerId: signer.id,
        eventType: 'IDENTITY_CONFIRMED',
        description: `CPF confirmado pelo signatário ${signer.name}.`,
        ipAddress: clientIp,
        userAgent,
      },
    });

    await prisma.documentEvent.create({
      data: {
        documentId: signer.document.id,
        signerId: signer.id,
        eventType: 'LIVENESS_CAPTURED',
        description: `Prova de presença ao vivo concluída (selfie) para ${signer.name}.`,
        ipAddress: clientIp,
        userAgent,
      },
    });

    await prisma.documentEvent.create({
      data: {
        documentId: signer.document.id,
        signerId: signer.id,
        eventType: isRogadoConsent ? 'ROGO_CONSENT_RECORDED' : 'SIGNATURE_SUBMITTED',
        description: isRogadoConsent
          ? `Ciência, compreensão e autorização para assinatura a rogo registradas por ${signer.name}.`
          : `Assinatura eletrônica concluída com sucesso por ${signer.name}.`,
        ipAddress: clientIp,
        userAgent,
      },
    });

    // Registra a conclusão imediatamente. A geração dos PDFs acontece somente
    // depois de todos os documentos do pacote terem sido persistidos, evitando
    // que um certificado pesado deixe o último documento do kit para trás.
    if (allCompleted) {
      await prisma.documentEvent.create({
        data: {
          documentId: signer.document.id,
          eventType: 'DOCUMENT_COMPLETED',
          description: 'Todas as assinaturas foram salvas. Documento aguardando geração do certificado e revisão do escritório.',
          ipAddress: clientIp,
          userAgent,
        },
      });
    }

    // Um kit é apresentado ao cliente por um único link. A identidade, prova de
    // presença e consentimento desta sessão são vinculados a cada documento pendente
    // do mesmo kit, mantendo PDFs e certificados individuais por documento.
    let kitDocumentsSigned = 1;
    const completedCompanionIds: string[] = [];
    if (allCompleted && signer.document.kitBatchId && !(await isIndividualRetry(prisma, signer.document.id))) {
      const companionDocuments = await prisma.document.findMany({
        where: {
          officeId: signer.document.officeId,
          kitBatchId: signer.document.kitBatchId,
          clientId: signer.document.clientId,
          id: { not: signer.document.id },
          status: { notIn: ['CONCLUIDO', 'CANCELADO', 'EXPIRADO'] },
        },
        include: { signers: true },
      });

      for (const companion of companionDocuments) {
        if (await isIndividualRetry(prisma, companion.id)) continue;
        const sourceParticipants = rawSigners.filter((item) => item.name && item.status === 'ASSINADO');
        const sameParticipants = sourceParticipants.length === companion.signers.length
          && sourceParticipants.every((source) => companion.signers.some((target) =>
            target.signatureOrder === source.signatureOrder
            && target.role === source.role
            && target.cpf.replace(/\D/g, '') === source.cpf.replace(/\D/g, '')
          ));
        if (!sameParticipants) continue;

        // Copia cada participante pela função, ordem e CPF. Isso funciona para
        // cliente, representante a rogo e testemunhas, independentemente de quem
        // tenha sido o último a concluir o fluxo.
        for (const source of sourceParticipants) {
          const target = companion.signers.find((item) =>
            item.signatureOrder === source.signatureOrder
            && item.role === source.role
            && item.cpf.replace(/\D/g, '') === source.cpf.replace(/\D/g, '')
          );
          if (!target || target.status === 'ASSINADO') continue;
          await prisma.signer.update({
            where: { id: target.id },
            data: {
              status: 'ASSINADO', signatureType: source.signatureType || 'SELO_DIGITAL', signatureImage: source.signatureImage || null,
              signedConsentText: source.signedConsentText || `Participação registrada na mesma sessão deste envio, incluindo "${companion.title}".`,
              selfieCenterImage: source.selfieCenterImage, selfieLeftImage: source.selfieLeftImage, selfieRightImage: source.selfieRightImage,
              documentFrontImage: source.documentFrontImage, documentBackImage: source.documentBackImage,
              signedAt: source.signedAt || new Date(), geoLat: source.geoLat, geoLng: source.geoLng, geoAccuracy: source.geoAccuracy,
              geoCity: source.geoCity, geoState: source.geoState, ipAddress: source.ipAddress || clientIp, userAgent: source.userAgent || userAgent,
            },
          });
        }
        const sourceClient = sourceParticipants.find((item) => item.role === 'CLIENTE') || sourceParticipants[0];
        const companionClient = companion.signers.find((item) =>
          item.signatureOrder === sourceClient.signatureOrder
          && item.role === sourceClient.role
          && item.cpf.replace(/\D/g, '') === sourceClient.cpf.replace(/\D/g, '')
        );
        if (!companionClient) continue;

        await prisma.document.update({ where: { id: companion.id }, data: { status: 'CONCLUIDO', completedAt: new Date(), reviewStatus: 'PENDENTE_REVISAO' } });
        await prisma.documentEvent.createMany({ data: [
          {
            documentId: companion.id, signerId: companionClient.id, eventType: 'LIVENESS_CAPTURED',
            description: `Prova de presença de ${sourceClient.name} vinculada a este documento na mesma sessão de assinatura.`, ipAddress: clientIp, userAgent,
          },
          {
            documentId: companion.id, signerId: companionClient.id, eventType: 'SIGNATURE_SUBMITTED',
            description: `Assinatura eletrônica de ${sourceClient.name} registrada nesta sessão única de assinatura.`, ipAddress: clientIp, userAgent,
          },
          {
            documentId: companion.id, signerId: companionClient.id, eventType: 'DOCUMENT_COMPLETED',
            description: 'Documento concluído, com evidências de identidade, presença e consentimento preservadas no certificado individual.', ipAddress: clientIp, userAgent,
          },
        ] });
        completedCompanionIds.push(companion.id);
        kitDocumentsSigned += 1;
      }
    }

    await prisma.auditLog.create({ data: {
      officeId: signer.document.officeId,
      eventType: 'DOCUMENT_SIGNED',
      description: `Documento "${signer.document.title}" assinado por ${signer.name}. Status atual: ${newDocStatus}.`,
    } });

    return NextResponse.json({
      success: true,
      message: allCompleted ? 'Assinatura realizada com sucesso!' : 'Participação registrada. Aguardando os demais participantes.',
      signer: { id: updatedSigner.id, status: updatedSigner.status },
      finalizeIds: allCompleted ? [signer.document.id, ...completedCompanionIds] : [],
      documentStatus: newDocStatus,
      kitDocumentsSigned,
      nextSigner: nextSigner && nextSigner.signingMode === 'SAME_DEVICE' ? { token: nextSigner.token, name: nextSigner.name, role: nextSigner.role } : null,
      pendingParticipants: allSigners.filter((item) => item.status !== 'ASSINADO').map((item) => ({ name: item.name, role: item.role, signingMode: item.signingMode })),
    });
    }, { isolationLevel: 'Serializable', timeout: 20000, maxWait: 10000 });
    if (!result.ok) return result;
    const { finalizeIds = [], ...payload } = await result.json();
    // Falhar aqui não desfaz as assinaturas já confirmadas no banco.
    let certificatePending = payload.certificatePending === true;
    for (const documentId of finalizeIds) {
      try { await generateFinalPdfCertificate(documentId); }
      catch { certificatePending = true; }
      try { await queueSignatureCompletionMessages(documentId); }
      catch { /* A assinatura permanece salva mesmo se o aviso falhar. */ }
    }
    return NextResponse.json({ ...payload, certificatePending });
  } catch (error: any) {
    console.error('Erro na submissão de assinatura:', error);
    return NextResponse.json({ error: 'Não foi possível confirmar agora. Suas etapas salvas foram mantidas. Tente novamente.', retryable: true }, { status: error?.code === 'P2034' || (error?.code === 'P2010' && ['40001', '40P01'].includes(error?.meta?.code)) ? 409 : 503 });
  }
}
