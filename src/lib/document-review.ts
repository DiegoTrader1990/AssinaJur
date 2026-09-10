import { randomUUID } from 'crypto';
import type { PrismaClient } from '@prisma/client';
import type { AuthUser } from './auth';
import { pendingPhotoCorrection } from './photo-review';

export const reviewActions = new Set(['approve-document', 'approve-package', 'unapprove-document', 'unapprove-package', 'redo-document', 'redo-package', 'redo-photo', 'restart-document', 'restart-package']);
export const canCorrectDocuments = (role: string) => ['OFFICE_ADMIN', 'LAWYER', 'STAFF'].includes(role);
export const isApprovedDocument = (doc: { status: string; reviewStatus: string }) => doc.status === 'CONCLUIDO' && doc.reviewStatus === 'APROVADO';
export class DocumentReviewError extends Error {
  constructor(message: string, public status = 409) { super(message); }
}

export async function reviewDocument(db: PrismaClient, user: AuthUser, id: string, body: Record<string, unknown>) {
  const action = String(body.action);
  if (!canCorrectDocuments(user.role)) throw new DocumentReviewError('Seu acesso permite apenas consultas.', 403);
  if (action.startsWith('unapprove-')) throw new DocumentReviewError('A aprovação é definitiva. Crie um novo envio para refazer o documento completo.');
  if (action.startsWith('approve-') && user.role !== 'OFFICE_ADMIN') throw new DocumentReviewError('Apenas o administrador pode aprovar documentos.', 403);
  const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : '';
  const restart = action.startsWith('restart-');
  const requestId = typeof body.requestId === 'string' ? body.requestId : '';
  if (restart && !/^[0-9a-f-]{36}$/i.test(requestId)) throw new DocumentReviewError('Identificador do novo envio inválido.', 400);

  return db.$transaction(async (tx) => {
    // Serializa revisão e criação de novos envios por escritório sem alterar o aprovado.
    await tx.$queryRaw`SELECT id FROM "Office" WHERE id = ${user.officeId} FOR UPDATE`;
    const source = await tx.document.findFirst({ where: { id, officeId: user.officeId }, include: { signers: true } });
    if (!source) throw new DocumentReviewError('Documento não encontrado.', 404);
    let targets = [source];
    if (action.endsWith('-package')) {
      if (source.kitBatchId) {
        targets = await tx.document.findMany({ where: { officeId: user.officeId, clientId: source.clientId, kitBatchId: source.kitBatchId }, include: { signers: true } });
      } else if (source.kitId) {
        targets = await tx.document.findMany({ where: { officeId: user.officeId, clientId: source.clientId, kitId: source.kitId, kitBatchId: null,
          createdAt: { gte: new Date(source.createdAt.getTime() - 7200000), lte: new Date(source.createdAt.getTime() + 7200000) } }, include: { signers: true } });
      }
    }
    for (const target of [...targets].sort((a, b) => a.id.localeCompare(b.id))) {
      await tx.$queryRaw`SELECT id FROM "Document" WHERE id = ${target.id} FOR UPDATE`;
    }
    if (restart) {
      const previous = await tx.documentEvent.findFirst({ where: { eventType: 'DOCUMENT_RESTARTED', metadata: requestId, document: { officeId: user.officeId } } });
      if (previous) return { success: true, newDocumentId: previous.documentId, alreadyCreated: true };
      if (targets.some((doc) => !isApprovedDocument(doc))) throw new DocumentReviewError('O novo envio a partir de aprovado exige que todos os documentos selecionados estejam aprovados.');
      const office = await tx.office.findUniqueOrThrow({ where: { id: user.officeId } });
      if (office.planStatus !== 'ACTIVE') throw new DocumentReviewError('O plano do escritório está inativo.', 403);
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const used = await tx.document.count({ where: { officeId: user.officeId, createdAt: { gte: monthStart } } });
      if (used + targets.length > office.monthlyDocLimit + office.additionalCredits) throw new DocumentReviewError('O limite do plano não comporta este novo envio.', 403);
      const kitBatchId = action === 'restart-package' || source.kitId || source.kitBatchId ? randomUUID() : null;
      const newIds: string[] = [];
      for (const doc of targets) {
        const copy = await tx.document.create({ data: {
          officeId: user.officeId, clientId: doc.clientId, templateId: doc.templateId, kitId: doc.kitId, kitBatchId,
          processId: doc.processId, title: doc.title, documentType: doc.documentType, signaturePosition: doc.signaturePosition,
          originalFileId: doc.originalFileId, originalHash: doc.originalHash, customMessage: doc.customMessage,
          createdById: user.id, status: 'PRONTO_PARA_ENVIO', reviewStatus: 'PENDENTE_REVISAO',
          isIlliterate: doc.isIlliterate, rogoName: doc.rogoName, rogoCpf: doc.rogoCpf, rogoRg: doc.rogoRg,
          rogoBirthDate: doc.rogoBirthDate, rogoAddress: doc.rogoAddress, rogoSameAddress: doc.rogoSameAddress, rogoRelationship: doc.rogoRelationship,
          signers: { create: doc.signers.map((s) => ({ name: s.name, cpf: s.cpf, email: s.email, phone: s.phone,
            role: s.role, signatureOrder: s.signatureOrder, signingMode: s.signingMode, authMethod: s.authMethod, status: 'PENDENTE' })) },
          events: { create: { userId: user.id, eventType: 'DOCUMENT_RESTARTED', metadata: requestId,
            description: `Novo envio criado a partir do documento aprovado ${doc.id}, que permanece intacto.${reason ? ` Motivo: ${reason}` : ''}` } },
        } });
        newIds.push(copy.id);
        const ordered = await tx.documentEvent.findFirst({ where: { documentId: doc.id, eventType: 'SIGNATURE_ORDER_ENFORCED' } });
        if (ordered || doc.isIlliterate) await tx.documentEvent.create({ data: { documentId: copy.id, userId: user.id,
          eventType: 'SIGNATURE_ORDER_ENFORCED', description: 'Ordem de participação mantida no novo envio.' } });
      }
      await tx.auditLog.create({ data: { officeId: user.officeId, userId: user.id, eventType: 'DOCUMENT_RESTARTED', description: `${newIds.length} novo(s) envio(s) criado(s) por ${user.name}; documentos aprovados preservados.` } });
      return { success: true, newDocumentId: newIds[0], newDocumentIds: newIds, createdCount: newIds.length };
    }
    if (action === 'redo-photo') {
      if (isApprovedDocument(source) || ['CANCELADO', 'EXPIRADO'].includes(source.status)) throw new DocumentReviewError('Este documento não permite refazer etapas. Se estiver aprovado, crie um novo envio completo.');
      const field = String(body.field);
      if (!['documentFrontImage', 'documentBackImage', 'selfieCenterImage'].includes(field)) throw new DocumentReviewError('Etapa inválida.', 400);
      const signer = source.signers.find((s) => s.id === body.signerId);
      if (!signer) throw new DocumentReviewError('Participante não encontrado.', 404);
      if (!signer[field as 'documentFrontImage' | 'documentBackImage' | 'selfieCenterImage']) throw new DocumentReviewError('Esta foto ainda não foi enviada ou já aguarda correção.', 400);
      await tx.signer.update({ where: { id: signer.id }, data: { [field]: null } });
      await tx.document.update({ where: { id }, data: { signedFileId: null, signedHash: null, reviewStatus: 'PENDENTE_REVISAO' } });
      await tx.documentEvent.create({ data: { documentId: id, signerId: signer.id, userId: user.id, eventType: 'PHOTO_REDO_REQUESTED', metadata: JSON.stringify({ field }),
        description: `Nova foto (${field}) solicitada por ${user.name}.${reason ? ` Motivo: ${reason}` : ''}` } });
      await tx.auditLog.create({ data: { officeId: user.officeId, userId: user.id, eventType: 'PHOTO_REDO_REQUESTED', description: `Correção de ${field} solicitada no documento ${id} por ${user.name}.${reason ? ` Motivo: ${reason}` : ''}` } });
      return { success: true };
    }
    if (targets.some((doc) => doc.status !== 'CONCLUIDO')) throw new DocumentReviewError('Todos os documentos selecionados precisam estar concluídos.');
    const approve = action.startsWith('approve-');
    if (!approve && targets.some(isApprovedDocument)) throw new DocumentReviewError('O conjunto inclui um documento aprovado. Ele não pode ser reaberto; crie um novo envio.');
    for (const doc of targets) {
      if (approve && isApprovedDocument(doc)) continue;
      if (approve) {
        const missingPhoto = (await Promise.all(doc.signers.map((signer) => pendingPhotoCorrection(tx, signer)))).some(Boolean);
        if (missingPhoto || !doc.signedFileId || !doc.signedHash || !doc.verificationCode || doc.signers.some((s) => s.status !== 'ASSINADO')) throw new DocumentReviewError('Conclua as correções e gere o PDF atualizado antes de aprovar.');
        await tx.document.update({ where: { id: doc.id }, data: { reviewStatus: 'APROVADO' } });
      } else {
        await tx.signer.updateMany({ where: { documentId: doc.id }, data: {
          status: 'PENDENTE', signatureType: null, signatureImage: null, signedConsentText: null, signedAt: null,
          selfieCenterImage: null, selfieLeftImage: null, selfieRightImage: null, documentFrontImage: null, documentBackImage: null,
          geoLat: null, geoLng: null, geoAccuracy: null, geoCity: null, geoState: null, ipAddress: null, userAgent: null, otpCode: null, otpExpiresAt: null,
        } });
        await tx.document.update({ where: { id: doc.id }, data: { status: 'ENVIADO', reviewStatus: 'PENDENTE_REVISAO', completedAt: null, signedFileId: null, signedHash: null, expirationDate: null } });
      }
      await tx.documentEvent.create({ data: { documentId: doc.id, userId: user.id, eventType: approve ? 'DOCUMENT_APPROVED' : 'SIGNATURE_RESET',
        metadata: approve ? null : JSON.stringify({ scope: action === 'redo-document' ? 'DOCUMENT' : 'PACKAGE' }),
        description: `${approve ? 'Documento aprovado' : 'Assinatura reaberta para nova captura completa'} por ${user.name}.${reason ? ` Motivo: ${reason}` : ''}` } });
    }
    await tx.auditLog.create({ data: { officeId: user.officeId, userId: user.id, eventType: approve ? 'DOCUMENT_APPROVED' : 'SIGNATURE_RESET', description: `${targets.length} documento(s) ${approve ? 'aprovado(s)' : 'reaberto(s)'} por ${user.name}.${reason ? ` Motivo: ${reason}` : ''}` } });
    return { success: true, ...(approve ? { approvedCount: targets.length } : { resetCount: targets.length }) };
  }, { isolationLevel: 'Serializable', timeout: 20000 });
}
