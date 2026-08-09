import { prisma } from '@/lib/prisma';

function cleanPhone(value?: string | null): string {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('55') ? digits : `55${digits}`;
}

export async function queueSignatureCompletionMessages(documentId: string): Promise<void> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      office: { include: { whatsAppSession: true } },
      signedFile: true,
      signers: { orderBy: { signatureOrder: 'asc' } },
    },
  });
  if (!document?.signedFile) return;

  const officePhone = cleanPhone(
    document.office.whatsAppSession?.phoneNumber
      || process.env.WHATSAPP_ADMIN_PHONE
      || '5573988250201'
  );
  const ownerAction = `PENDING_COMPLETION_OWNER:${document.id}`;
  if (officePhone) {
    const existingOwnerMessage = await prisma.whatsAppLog.findFirst({
      where: { officeId: document.officeId, actionTaken: ownerAction },
      select: { id: true },
    });
    if (!existingOwnerMessage) {
      await prisma.whatsAppLog.create({
        data: {
          officeId: document.officeId,
          fromNumber: 'AssinaJur',
          toNumber: officePhone,
          direction: 'OUTBOUND',
          messageType: 'DOCUMENT',
          body: `✅ Assinatura concluída\n\n📄 ${document.title}\n👤 ${document.signers.map((item) => item.name).join(', ')}\n\nO PDF final assinado e o certificado de evidências seguem em anexo.`,
          actionTaken: ownerAction,
        },
      });
    }
  }

  const uniqueClientPhones = new Set<string>();
  for (const signer of document.signers) {
    const phone = cleanPhone(signer.phone);
    if (!phone || uniqueClientPhones.has(phone)) continue;
    uniqueClientPhones.add(phone);
    const clientAction = `PENDING_COMPLETION_CLIENT:${document.id}:${signer.id}`;
    const existingClientMessage = await prisma.whatsAppLog.findFirst({
      where: { officeId: document.officeId, actionTaken: clientAction },
      select: { id: true },
    });
    if (existingClientMessage) continue;
    await prisma.whatsAppLog.create({
      data: {
        officeId: document.officeId,
        fromNumber: 'AssinaJur',
        toNumber: phone,
        direction: 'OUTBOUND',
        messageType: 'TEXT',
        body: `Olá, ${signer.name}! ✅\n\nSua assinatura do documento “${document.title}” foi concluída com sucesso.\n\nAgradecemos pela confiança. O escritório ${document.office.tradeName || document.office.name} já recebeu o documento final assinado.`,
        actionTaken: clientAction,
      },
    });
  }
}
