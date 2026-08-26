import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { saveFile, getFileBuffer, deleteFile } from '@/lib/storage';
import { calculateHash } from '@/lib/pdfHash';
import { generateFinalPdfCertificate } from '@/lib/pdfCertificate';
import { SAMPLE_SELFIE, SAMPLE_DOC_FRONT, SAMPLE_DOC_BACK } from '@/lib/sampleAssets';

export const dynamic = 'force-dynamic';

// Gera um PDF de exemplo (documento fictício "assinado" por uma cliente e por
// um acompanhante a rogo) e devolve o certificado final já pronto, exatamente
// como sairia de uma assinatura de verdade - mas sem precisar passar pelo
// fluxo de assinatura real. Cria os registros temporários necessários
// (Document, Signers, eventos da trilha), gera o PDF e apaga tudo em
// seguida, então não deixa nenhum rastro no sistema nem conta como
// documento de cliente real.
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const url = new URL(req.url);
  // ?rogo=0 gera o exemplo só com a cliente titular (sem acompanhante a rogo).
  const withRogo = url.searchParams.get('rogo') !== '0';

  let documentId: string | null = null;
  let originalFileId: string | null = null;
  let originalStorageKey: string | null = null;
  let signedFileId: string | null = null;
  let signedStorageKey: string | null = null;

  try {
    // 1. Documento original fictício (uma folha simples, só para ter algo
    // para "carimbar" - o conteúdo não importa, é sempre descartado).
    const originalPdf = await PDFDocument.create();
    const page = originalPdf.addPage([595.28, 841.89]);
    const font = await originalPdf.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await originalPdf.embedFont(StandardFonts.Helvetica);
    page.drawText('DOCUMENTO DE EXEMPLO', { x: 56, y: 760, size: 18, font, color: rgb(0.04, 0.11, 0.24) });
    page.drawText('Este é um documento fictício gerado apenas para pré-visualizar', { x: 56, y: 720, size: 11, font: fontRegular });
    page.drawText('o layout do certificado de evidências do AssinaJur.', { x: 56, y: 704, size: 11, font: fontRegular });
    page.drawText('Nenhum dado aqui é real.', { x: 56, y: 680, size: 11, font: fontRegular, color: rgb(0.6, 0.1, 0.1) });
    const originalBytes = Buffer.from(await originalPdf.save());
    const originalHash = calculateHash(originalBytes);

    const storageFile = await saveFile({
      officeId: user.officeId,
      uploadedBy: user.id,
      fileBuffer: originalBytes,
      originalName: 'exemplo-certificado.pdf',
      mimeType: 'application/pdf',
    });
    originalFileId = storageFile.id;
    originalStorageKey = storageFile.storageKey;

    const now = new Date();
    const minutesAgo = (min: number) => new Date(now.getTime() - min * 60000);

    const document = await prisma.document.create({
      data: {
        officeId: user.officeId,
        title: 'Documento de Exemplo (prévia de certificado)',
        documentType: 'DOCUMENTO',
        originalFileId: storageFile.id,
        originalHash,
        status: 'CONCLUIDO',
        reviewStatus: 'APROVADO',
        isIlliterate: withRogo,
        rogoName: withRogo ? 'ACOMPANHANTE EXEMPLO DA SILVA' : null,
        rogoCpf: withRogo ? '98765432100' : null,
        rogoRg: withRogo ? '9.876.543-2' : null,
        rogoRelationship: withRogo ? 'Filho(a)' : null,
        createdById: user.id,
        completedAt: now,
      },
    });
    documentId = document.id;

    const clientSelfie = SAMPLE_SELFIE;
    const clientFront = SAMPLE_DOC_FRONT;
    const clientBack = SAMPLE_DOC_BACK;

    const clientSigner = await prisma.signer.create({
      data: {
        documentId: document.id,
        name: 'CLIENTE EXEMPLO DA SILVA',
        cpf: '12345678900',
        email: 'cliente.exemplo@assinajur.test',
        phone: '73988250000',
        role: 'CLIENTE',
        signatureOrder: 1,
        status: 'ASSINADO',
        signatureType: 'DESENHADA',
        selfieCenterImage: clientSelfie,
        selfieLeftImage: withRogo ? clientSelfie : null,
        selfieRightImage: withRogo ? clientSelfie : null,
        documentFrontImage: clientFront,
        documentBackImage: clientBack,
        signedAt: minutesAgo(withRogo ? 12 : 6),
        ipAddress: '189.45.12.30',
        userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-A536E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36',
        geoLat: -16.4498,
        geoLng: -39.0658,
        geoAccuracy: 18,
        geoCity: 'Porto Seguro',
        geoState: 'BA',
      },
    });

    let rogoSigner: Awaited<ReturnType<typeof prisma.signer.create>> | null = null;
    if (withRogo) {
      rogoSigner = await prisma.signer.create({
        data: {
          documentId: document.id,
          name: 'ACOMPANHANTE EXEMPLO DA SILVA',
          cpf: '98765432100',
          email: null,
          phone: '73988251111',
          role: 'ASSINANTE_A_ROGO',
          signatureOrder: 2,
          status: 'ASSINADO',
          signatureType: 'DESENHADA',
          selfieCenterImage: clientSelfie,
          documentFrontImage: clientFront,
          documentBackImage: clientBack,
          signedAt: minutesAgo(6),
          ipAddress: '189.45.12.30',
          userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-A536E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36',
          geoLat: -16.4498,
          geoLng: -39.0658,
          geoAccuracy: 15,
          geoCity: 'Porto Seguro',
          geoState: 'BA',
        },
      });
    }

    // Trilha de eventos - só o suficiente para o certificado montar a seção
    // de "linha do tempo" com timestamps plausíveis, um signatário de cada vez.
    const buildTrail = (signerId: string, baseMinutesAgo: number, withDocPhotos: boolean) => {
      const steps: Array<{ eventType: string; description: string; offset: number }> = [
        { eventType: 'LINK_OPENED', description: 'Link de assinatura aberto', offset: 0 },
        { eventType: 'DOCUMENT_VIEWED', description: 'Documento visualizado', offset: 0.5 },
        { eventType: 'IDENTITY_CONFIRMED', description: 'Identidade confirmada', offset: 1 },
      ];
      if (withDocPhotos) {
        steps.push(
          { eventType: 'CAMERA_FRONT_OPENED', description: 'Câmera da frente do documento aberta', offset: 1.5 },
          { eventType: 'FRONT_CAPTURED', description: 'Frente do documento fotografada', offset: 2 },
          { eventType: 'CAMERA_BACK_OPENED', description: 'Câmera do verso do documento aberta', offset: 2.5 },
          { eventType: 'BACK_CAPTURED', description: 'Verso do documento fotografado', offset: 3 },
        );
      }
      steps.push(
        { eventType: 'CAMERA_PERMITTED', description: 'Permissão de câmera concedida', offset: 3.5 },
        { eventType: 'LIVENESS_STARTED', description: 'Prova de vida iniciada', offset: 4 },
        { eventType: 'LIVENESS_CAPTURED', description: 'Prova de vida concluída', offset: 4.5 },
        { eventType: 'CONSENT_ACCEPTED', description: 'Consentimento eletrônico aceito', offset: 5 },
        { eventType: 'SIGNATURE_SUBMITTED', description: 'Assinatura enviada', offset: 5.5 },
      );
      return steps.map((step) => ({
        documentId: document.id,
        signerId,
        eventType: step.eventType,
        description: step.description,
        ipAddress: '189.45.12.30',
        createdAt: minutesAgo(baseMinutesAgo - step.offset),
      }));
    };

    const events: Array<{
      documentId: string;
      signerId: string | null;
      eventType: string;
      description: string;
      ipAddress: string | null;
      createdAt: Date;
    }> = [
      ...buildTrail(clientSigner.id, withRogo ? 12 : 6, true),
      ...(rogoSigner ? buildTrail(rogoSigner.id, 6, false) : []),
    ];
    if (withRogo) {
      events.push({
        documentId: document.id,
        signerId: rogoSigner!.id,
        eventType: 'ROGO_CONSENT_RECORDED',
        description: 'Consentimento da assinatura a rogo registrado',
        ipAddress: '189.45.12.30',
        createdAt: minutesAgo(5.8),
      });
    }
    events.push({
      documentId: document.id,
      signerId: null,
      eventType: 'DOCUMENT_COMPLETED',
      description: 'Documento concluído - todas as assinaturas coletadas',
      ipAddress: null,
      createdAt: now,
    });

    await prisma.documentEvent.createMany({ data: events as any });

    const result = await generateFinalPdfCertificate(document.id);
    signedFileId = result.signedStorageFile.id;
    signedStorageKey = result.signedStorageFile.storageKey;
    const finalBuffer = await getFileBuffer(user.officeId, result.signedStorageFile.storageKey);
    if (!finalBuffer) throw new Error('Certificado gerado, mas não foi possível lê-lo de volta do armazenamento.');

    return new NextResponse(finalBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="certificado-exemplo${withRogo ? '-com-rogo' : ''}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('[sample-certificate]', error);
    return NextResponse.json({ error: error?.message || 'Não foi possível gerar o certificado de exemplo.' }, { status: 500 });
  } finally {
    // Limpeza: nunca deixamos o documento fictício no sistema, mesmo se algo
    // no meio do caminho falhar.
    try {
      if (documentId) await prisma.document.delete({ where: { id: documentId } });
    } catch {}
    try {
      if (originalFileId) await prisma.storageFile.delete({ where: { id: originalFileId } });
    } catch {}
    try {
      if (signedFileId) await prisma.storageFile.delete({ where: { id: signedFileId } });
    } catch {}
    try {
      if (originalStorageKey) await deleteFile(originalStorageKey);
    } catch {}
    try {
      if (signedStorageKey) await deleteFile(signedStorageKey);
    } catch {}
  }
}
