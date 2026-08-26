import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
    // eventType agora é opcional: uma chamada só para salvar o progresso da
    // captura (imageField/imageData), sem gerar um evento novo na trilha,
    // usa isso quando o evento correspondente (ex.: FRONT_CAPTURED) já foi
    // registrado separadamente pelo componente de câmera - evita duplicar a
    // mesma entrada na trilha de auditoria.
    if (eventType && !EVENT_DESCRIPTIONS[eventType]) return NextResponse.json({ error: 'Evento inválido.' }, { status: 400 });
    const signer = await prisma.signer.findUnique({ where: { token: params.token }, include: { document: true } });
    if (!signer?.document || signer.status === 'ASSINADO') return NextResponse.json({ success: true });
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Navegador Mobile';
    if (eventType) {
      const targets = signer.document.kitBatchId && signer.role === 'CLIENTE'
        ? await prisma.document.findMany({
            where: { kitBatchId: signer.document.kitBatchId, clientId: signer.document.clientId, status: { notIn: ['CANCELADO', 'EXPIRADO'] } },
            include: { signers: { where: { role: 'CLIENTE' }, select: { id: true } } },
          })
        : [{ id: signer.document.id, signers: [{ id: signer.id }] }];
      await prisma.documentEvent.createMany({ data: targets.flatMap((document) => {
        const targetSigner = document.signers[0];
        return targetSigner ? [{ documentId: document.id, signerId: targetSigner.id, eventType, description: EVENT_DESCRIPTIONS[eventType], ipAddress, userAgent }] : [];
      }) });
    }

    // Salva a imagem capturada nesta etapa direto no signatário (o próprio
    // titular do link, ou o Assinante a Rogo - que já existe como registro
    // desde a criação do documento, quando capturado no mesmo dispositivo).
    // Marca como "EM_ANDAMENTO" para o painel poder distinguir quem está no
    // meio da captura de quem simplesmente ainda não abriu o link.
    if (imageField && imageData && SAVABLE_IMAGE_FIELDS.has(imageField)) {
      const targetSignerId = forRogo
        ? (await prisma.signer.findFirst({ where: { documentId: signer.document.id, role: 'ASSINANTE_A_ROGO' }, select: { id: true, status: true } }))
        : { id: signer.id, status: signer.status };
      if (targetSignerId && targetSignerId.status !== 'ASSINADO') {
        await prisma.signer.update({
          where: { id: targetSignerId.id },
          data: {
            [imageField]: imageData,
            status: targetSignerId.status === 'PENDENTE' || targetSignerId.status === 'VISUALIZADO' ? 'EM_ANDAMENTO' : targetSignerId.status,
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Não foi possível registrar a evidência.' }, { status: 500 });
  }
}
