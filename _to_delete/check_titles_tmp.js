const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const docs = await prisma.document.findMany({ take: 6, orderBy: { createdAt: 'desc' }, select: { id: true, title: true, documentType: true, templateId: true } });
  console.log('DOCUMENTS:');
  docs.forEach(d => console.log(JSON.stringify(d)));
  const templates = await prisma.template.findMany({ take: 6, select: { id: true, title: true, documentType: true } });
  console.log('TEMPLATES:');
  templates.forEach(t => console.log(JSON.stringify(t)));
  await prisma.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
