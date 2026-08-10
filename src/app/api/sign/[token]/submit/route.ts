import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';
import { generateFinalPdfCertificate } from '@/lib/pdfCertificate';
import { queueSignatureCompletionMessages } from '@/lib/whatsapp/signatureCompletion';
import { getSignatureOrderBlock, signatureOrderError } from '@/lib/signatureOrder';

export const dynamic = 'force-dynamic';

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
      geoLat,
      geoLng,
      geoAccuracy,
      geoCity,
      geoState,
      rogo,
      witness1,
      witness2,
    } = body;

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
      return NextResponse.json({ error: 'Você já assinou este documento.' }, { status: 400 });
    }
    if (signer.document.status === 'CANCELADO' || signer.document.status === 'EXPIRADO' || (signer.document.expirationDate && new Date(signer.document.expirationDate).getTime() < Date.now())) {
      return NextResponse.json({ error: 'Este link foi cancelado ou expirou.' }, { status: 400 });
    }

    const blocker = await getSignatureOrderBlock(signer.document.id, signer.id);
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

    // 2. Validação da Prova de Presença (3 selfies do Cliente)
    if (!selfieCenterImage || !selfieLeftImage || !selfieRightImage) {
      return NextResponse.json(
        { error: 'É necessário concluir a prova de presença ao vivo (3 fotos) antes de assinar.' },
        { status: 400 }
      );
    }

    const isRogadoConsent = signer.document.isIlliterate && signer.role === 'CLIENTE';

    // 3. Se for fluxo a rogo e dados do acompanhante foram enviados no mesmo link, validar dados do Acompanhante
    if (isRogadoConsent && rogo) {
      if (!rogo.selfieCenterImage || !rogo.selfieLeftImage || !rogo.selfieRightImage) {
        return NextResponse.json(
          { error: 'O Assinante a Rogo também deve concluir sua prova de presença com 3 fotos no mesmo aparelho.' },
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
        selfieLeftImage,
        selfieRightImage,
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
      const rogoSignerRecord = signer.document.signers.find((s) => s.role === 'ASSINANTE_A_ROGO');
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
            selfieLeftImage: rogo.selfieLeftImage,
            selfieRightImage: rogo.selfieRightImage,
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
      let witness1Signer = signer.document.signers.find((s) => s.role === 'TESTEMUNHA');
      if (!witness1Signer) {
        witness1Signer = await prisma.signer.create({
          data: {
            documentId: signer.document.id,
            name: witness1.name,
            cpf: witness1.cpf.replace(/\D/g, ''),
            role: 'TESTEMUNHA',
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

    let newDocStatus = 'PARCIALMENTE_ASSINADO';
    if (allCompleted) {
      newDocStatus = 'CONCLUIDO';
    }

    await prisma.document.update({
      where: { id: signer.document.id },
      data: {
        status: newDocStatus,
        completedAt: allCompleted ? new Date() : null,
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
        description: `Prova de presença ao vivo concluída com 3 fotos para ${signer.name}.`,
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

    // Se todas as assinaturas forem concluídas, GERA O PDF FINAL E CERTIFICADO DE EVIDÊNCIAS
    if (allCompleted) {
      await prisma.documentEvent.create({
        data: {
          documentId: signer.document.id,
          eventType: 'DOCUMENT_COMPLETED',
          description: 'Todas as assinaturas foram colhidas. Certificado de Evidências Jurídicas emitido.',
          ipAddress: clientIp,
          userAgent,
        },
      });

      try {
        await generateFinalPdfCertificate(signer.document.id);
        await queueSignatureCompletionMessages(signer.document.id);
      } catch (pdfErr) {
        console.error('Erro na compilação ou notificação imediata do PDF:', pdfErr);
      }
    }

    await logAuditEvent({
      officeId: signer.document.officeId,
      eventType: 'DOCUMENT_SIGNED',
      description: `Documento "${signer.document.title}" assinado por ${signer.name}. Status atual: ${newDocStatus}.`,
    });

    return NextResponse.json({
      success: true,
      message: 'Assinatura realizada com sucesso!',
      signer: updatedSigner,
      documentStatus: newDocStatus,
    });
  } catch (error: any) {
    console.error('Erro na submissão de assinatura:', error);
    return NextResponse.json({ error: 'Erro ao processar assinatura: ' + (error?.message || '') }, { status: 500 });
  }
}
