const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const doc = await prisma.document.findFirst({
    where: { verificationCode: 'AJ-Z4J2-LSAA' },
    include: { signers: true },
  });
  if (!doc) { console.log('NAO ENCONTRADO'); return; }
  console.log(JSON.stringify({
    id: doc.id, status: doc.status, reviewStatus: doc.reviewStatus,
    signedFileId: doc.signedFileId, signedHash: doc.signedHash,
    signers: doc.signers.map(s => ({ id: s.id, name: s.name, status: s.status,
      hasFront: !!s.documentFrontImage, hasBack: !!s.documentBackImage, hasSelfie: !!s.selfieCenterImage })),
  }, null, 2));
})().catch(e => console.error(e)).finally(() => prisma.$disconnect());
