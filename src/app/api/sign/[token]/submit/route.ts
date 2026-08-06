import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';
import { generateFinalPdfCertificate } from '@/lib/pdfCertificate';

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
      return NextResponse.json({ error: 'Signatário inválido.' }, { status: 404 });
    }

    if (signer.status === 'ASSINADO') {
      return NextResponse.json({ error: 'Você já assinou este documento.' }, { status: 400 });
    }

    // 1. Validação do CPF informado
    const cleanConfirmCpf = (confirmCpf || '').replace(/\D/g, '');
    const cleanSignerCpf = (signer.cpf || '').replace(/\D/g, '');

    if (cleanConfirmCpf !== cleanSignerCpf) {
      return NextResponse.json(
        { error: 'O CPF informado não corresponde ao CPF cadastrado para esta assinatura.' },
        { status: 400 }
      );
    }

    // 2. Validação da Prova de Presença ao Vivo (3 selfies obrigatórias)
    if (!selfieCenterImage || !selfieLeftImage || !selfieRightImage) {
      return NextResponse.json(
        { error: 'É necessário concluir a prova de presença ao vivo (3 fotos) antes de assinar.' },
        { status: 400 }
      );
    }

    // 3. Captura do Endereço IP e Dispositivo
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Mobile Browser';

    // 4. Gravação da Assinatura do Signatário
    const updatedSigner = await prisma.signer.update({
      where: { id: signer.id },
      data: {
        status: 'ASSINADO',
        signatureType: signatureType || 'DESENHADA',
        signatureImage: signatureImage || null,
        signedConsentText: signedConsentText || 'Declaro que li os documentos, concordo com seu conteúdo e reconheço esta manifestação como minha assinatura eletrônica.',
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

    // 5. Atualização do Status do Documento
    const allSigners = signer.document.signers;
    const otherSigners = allSigners.filter((s) => s.id !== signer.id);
    const allCompleted = otherSigners.every((s) => s.status === 'ASSINADO');

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

    // 6. Registros de Trilha de Auditoria
    await prisma.documentEvent.create({
      data: {
        documentId: signer.document.id,
        signerId: signer.id,
        eventType: 'LIVENESS_CAPTURED',
        description: `Prova de presença ao vivo capturada (3 fotos: centro, lado 1 e lado 2) para ${signer.name}.`,
        ipAddress: clientIp,
        userAgent,
        metadata: JSON.stringify({
          geoLat: typeof geoLat === 'number' ? geoLat : null,
          geoLng: typeof geoLng === 'number' ? geoLng : null,
          geoCity: geoCity || null,
          geoState: geoState || null,
        }),
      },
    });

    await prisma.documentEvent.create({
      data: {
        documentId: signer.document.id,
        signerId: signer.id,
        eventType: 'SIGNATURE_SUBMITTED',
        description: `Assinatura eletrônica concluída com sucesso pelo signatário ${signer.name} (${signer.role}).`,
        ipAddress: clientIp,
        userAgent,
        metadata: JSON.stringify({
          signatureType,
          authMethod: 'CPF_LIVENESS_3SELFIES',
          cpfConfirmed: true,
        }),
      },
    });

    // 7. Se todas as assinaturas forem concluídas, GERA O PDF FINAL E CERTIFICADO DE EVIDÊNCIAS
    if (allCompleted) {
      await prisma.documentEvent.create({
        data: {
          documentId: signer.document.id,
          eventType: 'DOCUMENT_COMPLETED',
          description: 'Todas as assinaturas foram colhidas. Disparando geração do Certificado de Evidências.',
          ipAddress: clientIp,
          userAgent,
        },
      });

      // Dispara a geração automatizada do PDF Final com Certificado de Evidências e QR Code
      await generateFinalPdfCertificate(signer.document.id);
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
