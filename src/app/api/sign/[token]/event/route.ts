import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pendingPhotoCorrection, isIndividualRetry } from '@/lib/photo-review';

export const dynamic = 'force-dynamic';

const EVENT_DESCRIPTIONS: Record<string, string> = {
  DOCUMENT_VIEWED: 'Documento aberto pelo signatário para leitura.',
  CAMERA_PERMITTED: 'Permissão de câmera concedida pelo signatário.',
  // Etapa de foto do documento de identificação (RG/CNH), que acontece antes da
  // prova de presença. Esses códigos já eram emitidos pelo componente de captura
  // (DocumentCapture), mas por não estarem nesta lista o registro era rejeitado
  // silenciosamente e nunca aparecia na trilha do certificado.
  CAMERA_FRONT_OPENED: 'Câmera aberta para fotografar a frente do documento.',
  FRONT_CAPTURED: 'Foto da frente do documento de identificação capturada.',
  FRONT_CONTINUED_UNVALIDATED: 'Foto da frente do documento aceita mesmo sem validação automática completa.',
  CAMERA_BACK_OPENED: 'Câmera aberta para fotografar o verso do documento.',
  BACK_CAPTURED: 'Foto do verso do documento de identificação capturada.',
  BACK_CONTINUED_UNVALIDATED: 'Foto do verso do documento aceita mesmo sem validação automática completa.',
  DOCUMENT_COMPLETED: 'Captura do documento de identificação concluída.',
  LIVENESS_STARTED: 'Prova de presença ao vivo iniciada pelo signatário.',
  SELFIE_CENTER_VALIDATED: 'Registro facial frontal capturado durante a prova de presença.',
  SELFIE_LEFT_VALIDATED: 'Registro facial de perfil esquerdo capturado durante a prova de presença.',
  SELFIE_RIGHT_VALIDATED: 'Registro facial de perfil direito capturado durante a prova de presença.',
  CONSENT_ACCEPTED: 'Declaração de ciência e concordância aceita pelo signatário.',
};

// Campos que podem ser salvos incrementalmente durante a captura, para que
// o que já foi feito (foto do documento, selfie) não se perca se a pessoa
// fechar a aba, cair a conexão ou se atrapalhar antes do envio final -
// antes disso, TUDO ficava só na memória do navegador até o clique final de
// "assinar", então qualquer interrupção no meio do caminho apagava a
// captura inteira, mesmo etapas que já tinham sido concluídas com sucesso.
const SAVABLE_IMAGE_FIELDS = new Set(['documentFrontImage', 'documentBackImage', 'selfieCenterImage']);

export async function POST(req: Request, { params }: { params: { token: string } }) {
  try {
    const { eventType, imageField, imageData, forRogo } = await req.json();
    if (eventType && !EVENT_DESCRIPTIONS[eventType]) return NextResponse.json({ error: 'Evento inválido.' }, { status: 400 });
    const result = await prisma.$transaction(async (tx) => {
      const link = await tx.signer.findUnique({ where: { token: params.token }, select: { documentId: true } });
      if (!link) return { status: 404, body: { error: 'Link não encontrado.' } };
      await tx.$queryRaw`SELECT id FROM "Document" WHERE id = ${link.documentId} FOR UPDATE`;
      const signer = await tx.signer.findUniqueOrThrow({ where: { token: params.token }, include: { document: true } });
      const document = signer.document;
      if (document.status === 'CONCLUIDO' && document.reviewStatus === 'APROVADO') {
        return imageField ? { status: 409, body: { error: 'O documento aprovado não pode ser alterado.' } } : { status: 200, body: { success: true } };
      }
      if (['CANCELADO', 'EXPIRADO'].includes(document.status) || (document.status !== 'CONCLUIDO' && document.expirationDate && document.expirationDate.getTime() < Date.now())) {
        return { status: 409, body: { error: 'Este documento foi cancelado ou o convite expirou.' } };
      }
      if (forRogo && (signer.role !== 'CLIENTE' || !document.isIlliterate)) return { status: 403, body: { error: 'Participante não autorizado.' } };
      const target = forRogo
        ? await tx.signer.findFirst({ where: { documentId: document.id, role: 'ASSINANTE_A_ROGO', signingMode: 'SAME_DEVICE' } })
        : signer;
      if (!target) return { status: 403, body: { error: 'Participante não autorizado neste aparelho.' } };
      const correction = imageField ? await pendingPhotoCorrection(tx, target, imageField) : null;
      if (target.status === 'ASSINADO' && !correction) {
        // A resposta pode ter se perdido depois de a correção ser salva.
        // Aceitar somente a mesma foto confirma o recebimento sem outra substituição.
        if (imageField && SAVABLE_IMAGE_FIELDS.has(imageField) && imageData && target[imageField as keyof typeof target] === imageData) {
          return { status: 200, body: { success: true } };
        }
        return imageField ? { status: 409, body: { error: 'Não há solicitação de correção para esta etapa.' } } : { status: 200, body: { success: true } };
      }
      const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
      const userAgent = req.headers.get('user-agent') || 'Navegador';
      if (imageField && imageData && SAVABLE_IMAGE_FIELDS.has(imageField)) {
        await tx.signer.update({ where: { id: target.id }, data: { [imageField]: imageData,
          status: ['PENDENTE', 'VISUALIZADO'].includes(target.status) ? 'EM_ANDAMENTO' : target.status } });
        if (correction) await tx.documentEvent.create({ data: { documentId: document.id, signerId: target.id,
          eventType: 'PHOTO_REDO_COMPLETED', metadata: JSON.stringify({ field: imageField, requestId: correction.id }),
          description: 'Foto solicitada pelo escritório foi reenviada.', ipAddress, userAgent } });
        if (target.status === 'ASSINADO') await tx.document.update({ where: { id: document.id }, data: { signedFileId: null, signedHash: null } });
      }
      if (eventType) {
        // Não acrescentar eventos em documentos aprovados do mesmo pacote.
        const targets = document.kitBatchId && signer.role === 'CLIENTE' && !(await isIndividualRetry(tx, document.id))
          ? await tx.document.findMany({ where: { officeId: document.officeId, kitBatchId: document.kitBatchId, clientId: document.clientId,
            status: { notIn: ['CANCELADO', 'EXPIRADO'] }, NOT: { status: 'CONCLUIDO', reviewStatus: 'APROVADO' } },
            include: { signers: { where: { role: 'CLIENTE' }, select: { id: true } } } })
          : [{ id: document.id, signers: [{ id: target.id }] }];
        await tx.documentEvent.createMany({ data: targets.flatMap((doc) => doc.signers[0] ? [{ documentId: doc.id, signerId: doc.signers[0].id,
          eventType, description: EVENT_DESCRIPTIONS[eventType], ipAddress, userAgent }] : []) });
      }
      return { status: 200, body: { success: true } };
    }, { isolationLevel: 'Serializable' });
    return NextResponse.json(result.body, { status: result.status });
  } catch {
    return NextResponse.json({ error: 'Não foi possível salvar. Atualize a página e tente novamente.' }, { status: 409 });
  }
}
