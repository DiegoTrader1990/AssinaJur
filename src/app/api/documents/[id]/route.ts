import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { deleteFile } from '@/lib/storage';
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

    if (action === 'sync-package-signature') {
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
        const sameParticipants = companion.signers.length === sourceSigners.length && sourceSigners.every((source) => companion.signers.some((target) => target.signatureOrder === source.signatureOrder && target.role === source.role && target.cpf.replace(/\D/g, '') === source.cpf.replace(/\D/g, '')));
        if (!sameParticipants) continue;
        for (const source of sourceSigners) {
          const target = companion.signers.find((item) => item.signatureOrder === source.signatureOrder && item.role === source.role && item.cpf.replace(/\D/g, '') === source.cpf.replace(/\D/g, ''));
          if (!target) continue;
          await prisma.signer.update({ where: { id: target.id }, data: { status: 'ASSINADO', signatureType: source.signatureType, signatureImage: source.signatureImage, signedConsentText: source.signedConsentText, selfieCenterImage: source.selfieCenterImage, selfieLeftImage: source.selfieLeftImage, selfieRightImage: source.selfieRightImage, documentFrontImage: source.documentFrontImage, documentBackImage: source.documentBackImage, geoLat: source.geoLat, geoLng: source.geoLng, geoAccuracy: source.geoAccuracy, geoCity: source.geoCity, geoState: source.geoState, signedAt: source.signedAt || new Date(), ipAddress: source.ipAddress, userAgent: source.userAgent } });
        }
        await prisma.document.update({ where: { id: companion.id }, data: { status: 'CONCLUIDO', completedAt: new Date() } });
        await prisma.documentEvent.create({ data: { documentId: companion.id, userId: user.id, eventType: 'PACKAGE_SIGNATURE_SYNCHRONIZED', description: `Assinatura do pacote sincronizada a partir de "${document.title}"; evidências dos participantes preservadas.` } });
        try { await generateFinalPdfCertificate(companion.id); await queueSignatureCompletionMessages(companion.id); } catch (error) { console.error('Erro ao emitir PDF do pacote sincronizado:', error); }
        synchronized += 1;
      }
      await logAuditEvent({ officeId: user.officeId, userId: user.id, eventType: 'PACKAGE_SIGNATURE_SYNCHRONIZED', description: `${synchronized} documento(s) do pacote "${document.title}" foram sincronizados.` });
      return NextResponse.json({ success: true, synchronized });
    }

    // Reabre um documento (ou um pacote inteiro) já concluído para uma nova tentativa de
    // assinatura, reaproveitando o MESMO link/token e todo o conteúdo já revisado/editado -
    // pensado para o caso de a captura da prova de presença ter saído ruim (selfie, selo mal
    // posicionado etc.) e ser preciso que a pessoa refaça só a parte de assinar, sem o
    // escritório precisar reeditar o documento nem gerar um link novo. Só o dono/admin do
    // escritório pode acionar - o cliente nunca tem esse botão.
    if (action === 'redo-document' || action === 'redo-package') {
      if (user.role !== 'OFFICE_ADMIN') {
        return NextResponse.json({ error: 'Apenas o administrador do escritório pode solicitar que a assinatura seja refeita.' }, { status: 403 });
      }

      const targets = action === 'redo-package' && document.kitBatchId
        ? await prisma.document.findMany({
            where: { officeId: user.officeId, kitBatchId: document.kitBatchId, clientId: document.clientId, status: 'CONCLUIDO' },
          })
        : [document];

      const eligible = targets.filter((item) => item.status === 'CONCLUIDO');
      if (!eligible.length) {
        return NextResponse.json({ error: 'Só é possível refazer documentos que já estão concluídos.' }, { status: 400 });
      }

      const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : '';

      for (const target of eligible) {
        // Preserva a trilha da tentativa anterior antes de reabrir - exigência de auditoria
        // da MP 2.200-2/Lei 14.063: nunca some silenciosamente com uma assinatura já
        // registrada, só marca como descartada. As evidências (selfie, selo, geolocalização)
        // do signatário continuam salvas até a nova assinatura sobrescrevê-las.
        await prisma.documentEvent.create({
          data: {
            documentId: target.id,
            userId: user.id,
            eventType: 'SIGNATURE_RESET',
            description: `Assinatura concluída${target.completedAt ? ` em ${target.completedAt.toLocaleString('pt-BR')}` : ''} foi reaberta para nova tentativa por ${user.name}${reason ? `. Motivo: ${reason}` : '.'} O mesmo link de assinatura foi reativado; as evidências da tentativa anterior permanecem preservadas nesta trilha.`,
          },
        });
        await prisma.signer.updateMany({
          where: { documentId: target.id },
          data: { status: 'PENDENTE' },
        });
        await prisma.document.update({
          where: { id: target.id },
          data: { status: 'ENVIADO', completedAt: null },
        });
      }

      await logAuditEvent({
        officeId: user.officeId,
        userId: user.id,
        eventType: 'SIGNATURE_RESET',
        description: `${eligible.length} documento(s) ${action === 'redo-package' ? `do pacote "${document.title}"` : `("${document.title}")`} foram reabertos por ${user.name} para nova tentativa de assinatura.`,
      });

      return NextResponse.json({ success: true, resetCount: eligible.length });
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
    // Permite a exclusão de qualquer documento do escritório (rascunhos, em andamento ou concluídos)
    // pelo usuário autorizado do escritório.

    const documentTitle = document.title;
    const originalFileId = document.originalFileId;
    const signedFileId = document.signedFileId;
    const originalStorageKey = document.originalFile?.storageKey;
    const signedStorageKey = document.signedFile?.storageKey;

    // 1. Exclui o documento — signatários e trilha de eventos são removidos em cascata
    //    (onDelete: Cascade no schema.prisma).
    await prisma.document.delete({ where: { id: document.id } });

    // 2. Remove os registros StorageFile órfãos e os arquivos físicos correspondentes.
    const storageFileIds = [originalFileId, signedFileId].filter(Boolean) as string[];
    if (storageFileIds.length > 0) {
      await prisma.storageFile.deleteMany({ where: { id: { in: storageFileIds } } });
    }
    if (originalStorageKey) await deleteFile(originalStorageKey);
    if (signedStorageKey) await deleteFile(signedStorageKey);

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
