import { loadParticipantGroups } from '@/lib/participant-groups';
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

// A transação abaixo roda em isolamento Serializable e ainda trava a linha do
// documento com SELECT ... FOR UPDATE. Quando duas chamadas desta rota chegam
// ao mesmo tempo para o MESMO documento, o Postgres aborta uma delas com erro
// de serialização (40001) ou deadlock (40P01) - o próprio manual do Postgres
// diz que a aplicação deve simplesmente repetir a transação nesses casos.
// Era exatamente o que acontecia na selfie: a tela dispara o evento da trilha
// e o salvamento da foto praticamente no mesmo instante (a captura é
// automática, por contagem regressiva, sem um toque humano separando os dois),
// as duas transações colidiam e o signatário via "Não foi possível salvar.
// Atualize a página e tente novamente." logo depois de tirar a foto. Tocar em
// "Tentar salvar novamente" funcionava porque aí não havia mais concorrência.
const MAX_TRANSACTION_ATTEMPTS = 4;

function isRetryableConflict(error: unknown): boolean {
  const code = String((error as { code?: unknown })?.code ?? '');
  const message = String((error as { message?: unknown })?.message ?? '');
  // P2034 é o código do Prisma para "write conflict or deadlock, please retry";
  // os demais cobrem o erro cru do Postgres quando ele chega pela query raw.
  return code === 'P2034' || /40001|40P01|could not serialize|deadlock detected/i.test(`${code} ${message}`);
}

export async function POST(req: Request, { params }: { params: { token: string } }) {
  // O corpo é lido UMA vez, fora do laço: um Request só pode ser consumido uma
  // vez, então tentar reler dentro da repetição quebraria a segunda tentativa.
  let body: { eventType?: string; imageField?: string; imageData?: string; forRogo?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 });
  }

  const { eventType, imageField, imageData, forRogo } = body;
  if (eventType && !EVENT_DESCRIPTIONS[eventType]) return NextResponse.json({ error: 'Evento inválido.' }, { status: 400 });

  for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
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
        const participants = forRogo ? await tx.signer.findMany({ where: { documentId: document.id } }) : [];
        const pair = forRogo ? (await loadParticipantGroups(tx, document, participants)).find(g => g.partyOrder === signer.signatureOrder) : null;
        const target = forRogo ? participants.find(p => p.signatureOrder === pair?.rogoOrder && p.signingMode === 'SAME_DEVICE') : signer;
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
          const targets = document.kitBatchId && !(await isIndividualRetry(tx, document.id))
            ? await tx.document.findMany({ where: { officeId: document.officeId, kitBatchId: document.kitBatchId, clientId: document.clientId,
              status: { notIn: ['CANCELADO', 'EXPIRADO'] }, NOT: { status: 'CONCLUIDO', reviewStatus: 'APROVADO' } },
              include: { signers: { where: { role: target.role, cpf: target.cpf, signatureOrder: target.signatureOrder }, select: { id: true } } } })
            : [{ id: document.id, signers: [{ id: target.id }] }];
          await tx.documentEvent.createMany({ data: targets.flatMap((doc) => doc.signers[0] ? [{ documentId: doc.id, signerId: doc.signers[0].id,
            eventType, description: EVENT_DESCRIPTIONS[eventType], ipAddress, userAgent }] : []) });
        }
        return { status: 200, body: { success: true } };
      }, { isolationLevel: 'Serializable' });
      return NextResponse.json(result.body, { status: result.status });
    } catch (error) {
      if (isRetryableConflict(error) && attempt < MAX_TRANSACTION_ATTEMPTS) {
        // Espera crescente com um pouco de aleatoriedade, para as duas chamadas
        // concorrentes não voltarem a colidir exatamente no mesmo instante.
        await new Promise((resolve) => setTimeout(resolve, attempt * 60 + Math.floor(Math.random() * 50)));
        continue;
      }
      // O catch anterior era vazio: o erro real nunca aparecia no log e não
      // havia como diagnosticar por que a foto não salvava.
      console.error(`Erro ao registrar evento/foto do signatário (tentativa ${attempt}):`, error);
      // "retryable" avisa a tela de que esta falha é passageira e vale tentar de
      // novo sozinha, sem mostrar nada ao signatário. As recusas por regra
      // (link cancelado, documento aprovado, sem pedido de correção) não levam
      // essa marca: repetir não mudaria nada e a pessoa precisa saber na hora.
      // A mensagem não manda mais "atualize a página": a foto está guardada na
      // própria página e recarregar seria justamente o que a faria se perder.
      return NextResponse.json(
        { error: 'Não foi possível salvar a foto agora. Tente novamente em instantes.', retryable: true },
        { status: 409 },
      );
    }
  }

  // Inalcançável na prática: a última tentativa do laço sempre retorna. Mantido
  // idêntico ao retorno de falha acima para não existirem duas mensagens
  // diferentes para a mesma situação.
  return NextResponse.json(
    { error: 'Não foi possível salvar a foto agora. Tente novamente em instantes.', retryable: true },
    { status: 409 },
  );
}
