import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { removeUnusedDocumentFile } from '@/lib/document-files';
import { reviewActions, reviewDocument, DocumentReviewError, canCorrectDocuments, isApprovedDocument } from '@/lib/document-review';
import { isIndividualRetry } from '@/lib/photo-review';
import { generateFinalPdfCertificate } from '@/lib/pdfCertificate';
import { queueSignatureCompletionMessages } from '@/lib/whatsapp/signatureCompletion';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const document = await prisma.document.findFirst({
      where: {
        id: params.id,
        officeId: user.officeId, // INJEÇÃO RIGOROSA DO TENANT
      },
      include: {
        client: true,
        signers: {
          orderBy: { signatureOrder: 'asc' },
        },
        originalFile: true,
        signedFile: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        tags: {
          select: { id: true, name: true, color: true },
        },
        events: {
          include: {
            signer: { select: { id: true, name: true, role: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 });
    }
    return NextResponse.json({ document });
  } catch (error: any) {
    console.error('Erro ao buscar documento:', error);
    return NextResponse.json({ error: 'Erro ao carregar detalhes do documento.' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const body = await req.json();
    const action = body.action; // 'send' ou 'cancel'

    const document = await prisma.document.findFirst({
      where: {
        id: params.id,
        officeId: user.officeId,
      },
      include: { signers: true },
    });

    if (!document) {
      return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 });
    }

    // Kits mais antigos (gerados antes de o campo kitBatchId existir/estar
    // preenchido de forma consistente) têm kitId preenchido mas kitBatchId
    // nulo. Sem este fallback, qualquer ação "-package" enxergava só o
    // documento em que o botão foi clicado, deixando os demais documentos do
    // mesmo kit para trás (o clique em "Refazer"/"Aprovar" no pacote só
    // afetava 1 de N documentos). Agrupa por kitId + mesmo cliente + criados
    // dentro de uma janela de 2h um do outro - tempo generoso para cobrir a
    // geração sequencial de vários PDFs na mesma sessão de criação do kit.
    const resolvePackageTargets = async (extraWhere: Record<string, any> = {}) => {
      if (document.kitBatchId) {
        return prisma.document.findMany({
          where: { officeId: user.officeId, kitBatchId: document.kitBatchId, clientId: document.clientId, ...extraWhere },
        });
      }
      if (document.kitId) {
        const candidates = await prisma.document.findMany({
          where: { officeId: user.officeId, kitId: document.kitId, clientId: document.clientId, kitBatchId: null, ...extraWhere },
        });
        const windowMs = 2 * 60 * 60 * 1000;
        return candidates.filter((item) => Math.abs(item.createdAt.getTime() - document.createdAt.getTime()) <= windowMs);
      }
      return [document];
    };

    if (reviewActions.has(action)) return NextResponse.json(await reviewDocument(prisma, user, document.id, body));
    if (!canCorrectDocuments(user.role)) return NextResponse.json({ error: 'Seu acesso permite apenas consultas.' }, { status: 403 });

    if (action === 'sync-package-signature') {
      if (await isIndividualRetry(prisma, document.id)) return NextResponse.json({ error: 'Esta nova tentativa é individual e não pode assinar os demais documentos.' }, { status: 409 });
      if (document.status !== 'CONCLUIDO' || !document.kitBatchId) {
        return NextResponse.json({ error: 'Este documento não possui uma assinatura de pacote concluída para sincronizar.' }, { status: 400 });
      }
      const sourceSigners = document.signers.filter((item) => item.name && item.status === 'ASSINADO');
      const companions = await prisma.document.findMany({
        where: { officeId: user.officeId, kitBatchId: document.kitBatchId, clientId: document.clientId, id: { not: document.id }, status: { notIn: ['CONCLUIDO', 'CANCELADO', 'EXPIRADO'] } },
        include: { signers: true },
      });
      let synchronized = 0;
      for (const companion of companions) {
        if (await isIndividualRetry(prisma, companion.id)) continue;
        const sameParticipants = companion.signers.length === sourceSigners.length && sourceSigners.every((source) => companion.signers.some((target) => target.signatureOrder === source.signatureOrder && target.role === source.role && target.cpf.replace(/\D/g, '') === source.cpf.replace(/\D/g, '')));
        if (!sameParticipants) continue;
        for (const source of sourceSigners) {
          const target = companion.signers.find((item) => item.signatureOrder === source.signatureOrder && item.role === source.role && item.cpf.replace(/\D/g, '') === source.cpf.replace(/\D/g, ''));
          if (!target) continue;
          await prisma.signer.update({ where: { id: target.id }, data: { status: 'ASSINADO', signatureType: source.signatureType, signatureImage: source.signatureImage, signedConsentText: source.signedConsentText, selfieCenterImage: source.selfieCenterImage, selfieLeftImage: source.selfieLeftImage, selfieRightImage: source.selfieRightImage, documentFrontImage: source.documentFrontImage, documentBackImage: source.documentBackImage, geoLat: source.geoLat, geoLng: source.geoLng, geoAccuracy: source.geoAccuracy, geoCity: source.geoCity, geoState: source.geoState, signedAt: source.signedAt || new Date(), ipAddress: source.ipAddress, userAgent: source.userAgent } });
        }
        await prisma.document.update({ where: { id: companion.id }, data: { status: 'CONCLUIDO', completedAt: new Date(), reviewStatus: 'PENDENTE_REVISAO' } });
        await prisma.documentEvent.create({ data: { documentId: companion.id, userId: user.id, eventType: 'PACKAGE_SIGNATURE_SYNCHRONIZED', description: `Assinatura do pacote sincronizada a partir de "${document.title}"; evidências dos participantes preservadas.` } });
        try { await generateFinalPdfCertificate(companion.id); await queueSignatureCompletionMessages(companion.id); } catch (error) { console.error('Erro ao emitir PDF do pacote sincronizado:', error); }
        synchronized += 1;
      }
      await logAuditEvent({ officeId: user.officeId, userId: user.id, eventType: 'PACKAGE_SIGNATURE_SYNCHRONIZED', description: `${synchronized} documento(s) do pacote "${document.title}" foram sincronizados.` });
      return NextResponse.json({ success: true, synchronized });
    }

    if (action === 'send') {
      if (document.status === 'CONCLUIDO' || document.status === 'CANCELADO') {
        return NextResponse.json(
          { error: `Documento já está ${document.status.toLowerCase()} e não pode ser reenviado.` },
          { status: 400 }
        );
      }

      await prisma.document.update({
        where: { id: document.id },
        data: { status: 'ENVIADO' },
      });

      await prisma.documentEvent.create({
        data: {
          documentId: document.id,
          userId: user.id,
          eventType: 'LINK_SENT',
          description: `Link de assinatura ativado e enviado aos signatários por ${user.name}.`,
        },
      });

      await logAuditEvent({
        officeId: user.officeId,
        userId: user.id,
        eventType: 'DOCUMENT_SENT',
        description: `Links de assinatura do documento "${document.title}" disparados.`,
      });

      return NextResponse.json({
        success: true,
        message: 'Links de assinatura disponibilizados com sucesso!',
      });
    }

    if (action === 'cancel') {
      if (document.status === 'CONCLUIDO') {
        return NextResponse.json(
          { error: 'Documentos já concluídos não podem ser cancelados.' },
          { status: 400 }
        );
      }

      await prisma.document.update({
        where: { id: document.id },
        data: { status: 'CANCELADO' },
      });

      await prisma.documentEvent.create({
        data: {
          documentId: document.id,
          userId: user.id,
          eventType: 'DOCUMENT_CANCELLED',
          description: `Documento cancelado por ${user.name}.`,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Documento cancelado com sucesso.',
      });
    }

    // Define o conjunto de tags do documento (substitui todas de uma vez).
    // Usado pelo seletor de tags na tela de detalhes do documento — não tem
    // restrição de status, já que é só organização, não afeta a assinatura.
    if (action === 'set-tags') {
      const tagIds: string[] = Array.isArray(body.tagIds) ? body.tagIds : [];

      // Valida que todas as tags pertencem ao mesmo escritório (isolamento de tenant)
      // antes de vinculá-las, para nunca conectar uma tag de outro escritório.
      const validTags = tagIds.length
        ? await prisma.tag.findMany({
            where: { id: { in: tagIds }, officeId: user.officeId },
          })
        : [];

      const updated = await prisma.document.update({
        where: { id: document.id },
        data: { tags: { set: validTags.map((t) => ({ id: t.id })) } },
        include: { tags: { select: { id: true, name: true, color: true } } },
      });

      return NextResponse.json({ success: true, document: updated });
    }

    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
  } catch (error: any) {
    if (error instanceof DocumentReviewError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error?.code === 'P2034') return NextResponse.json({ error: 'O documento foi atualizado durante a operação. Atualize a tela e tente novamente.' }, { status: 409 });
    console.error('Erro na ação do documento:', error);
    return NextResponse.json({ error: 'Erro ao processar ação no documento.' }, { status: 500 });
  }
}

// Exclusão permanente apenas de documentos ainda não concluídos. Documentos assinados
// preservam o certificado e a trilha de evidências; futuramente poderão ser arquivados.
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const document = await prisma.document.findFirst({
      where: {
        id: params.id,
        officeId: user.officeId, // INJEÇÃO RIGOROSA DO TENANT
      },
      include: { originalFile: true, signedFile: true },
    });

    if (!document) {
      return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 });
    }
    if (user.role !== 'OFFICE_ADMIN') {
      return NextResponse.json({ error: 'Apenas o administrador pode excluir documentos.' }, { status: 403 });
    }
    if (isApprovedDocument(document)) return NextResponse.json({ error: 'O documento aprovado deve ser preservado.' }, { status: 409 });
    // Permite a exclusão de qualquer documento do escritório (rascunhos, em andamento ou concluídos)
    // pelo usuário autorizado do escritório.

    const documentTitle = document.title;
    const removed = await prisma.document.deleteMany({ where: { id: document.id, officeId: user.officeId, NOT: { status: 'CONCLUIDO', reviewStatus: 'APROVADO' } } });
    if (!removed.count) return NextResponse.json({ error: 'O documento foi aprovado e deve ser preservado.' }, { status: 409 });
    for (const file of [document.originalFile, document.signedFile]) {
      if (file) await removeUnusedDocumentFile(file.id, file.storageKey);
    }

    await logAuditEvent({
      officeId: user.officeId,
      userId: user.id,
      eventType: 'DOCUMENT_DELETED',
      description: `Documento "${documentTitle}" excluído permanentemente por ${user.name}.`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao excluir documento:', error);
    return NextResponse.json({ error: 'Erro ao excluir documento.' }, { status: 500 });
  }
}
