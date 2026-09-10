const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const crypto = require('node:crypto');

module.exports = async function run(prisma, admin, outsider) {
  let checks = 0;
  let actor = admin;
  let deletedFiles = 0;
  const deps = {
    '@/lib/prisma': { prisma }, './prisma': { prisma }, crypto,
    '@/lib/auth': { getSessionUser: async () => actor },
    '@/lib/audit': { logAuditEvent: async () => {} },
    '@/lib/pdfCertificate': { generateFinalPdfCertificate: async () => { throw new Error('PDF externo bloqueado'); } },
    '@/lib/whatsapp/signatureCompletion': { queueSignatureCompletionMessages: async () => { throw new Error('Mensagens bloqueadas'); } },
    './storage': { deleteFile: async () => { deletedFiles++; } },
    '@/lib/signatureOrder': { getSignatureOrderBlock: async () => null, signatureOrderError: () => 'Aguarde' },
  };
  function load(file) {
    const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
    const module = { exports: {} };
    vm.runInNewContext(code, { module, exports: module.exports, URL, Response, Buffer, console: { error: () => {} },
      require(id) { if (id === 'next/server') return { NextResponse: Response }; if (deps[id]) return deps[id]; throw new Error(`Import bloqueado: ${id}`); } });
    return module.exports;
  }
  deps['./photo-review'] = deps['@/lib/photo-review'] = load('src/lib/photo-review.ts');
  const review = deps['@/lib/document-review'] = load('src/lib/document-review.ts');
  deps['@/lib/document-files'] = load('src/lib/document-files.ts');
  const route = load('src/app/api/documents/[id]/route.ts');
  const event = load('src/app/api/sign/[token]/event/route.ts');
  const submit = load('src/app/api/sign/[token]/submit/route.ts');
  const getSign = load('src/app/api/sign/[token]/route.ts');
  const request = (body) => new Request('http://127.0.0.1/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  async function status(result, expected) { const response = await result; assert.equal(response.status, expected); checks++; return response.json(); }
  const params = (doc) => ({ params: { id: doc.id } });
  const tokenParams = (signer) => ({ params: { token: signer.token } });
  const original = await prisma.storageFile.create({ data: { officeId: admin.officeId, originalName: 'ficticio.pdf', mimeType: 'application/pdf', sizeBytes: 100, storageKey: 'somente-local/ficticio.pdf' } });
  await prisma.office.update({ where: { id: admin.officeId }, data: { monthlyDocLimit: 100 } });
  const batch = crypto.randomUUID();
  async function make(reviewStatus = 'APROVADO', kitBatchId = batch) {
    return prisma.document.create({ data: { officeId: admin.officeId, title: 'Documento fictício', originalFileId: original.id, originalHash: 'hash-original-ficticio',
      signedFileId: original.id, signedHash: 'hash-assinado-ficticio', verificationCode: crypto.randomUUID(), status: 'CONCLUIDO', reviewStatus,
      kitBatchId, completedAt: new Date(), expirationDate: new Date('2020-01-01'), isIlliterate: true, rogoName: 'A rogo fictício', rogoCpf: '11144477735',
      signers: { create: [{ name: 'Cliente fictício', cpf: '52998224725', role: 'CLIENTE', signatureOrder: 1, status: 'ASSINADO', selfieCenterImage: 'foto-ficticia', documentFrontImage: 'frente-ficticia', signedAt: new Date() },
        { name: 'A rogo fictício', cpf: '11144477735', role: 'ASSINANTE_A_ROGO', signingMode: 'SAME_DEVICE', signatureOrder: 2, status: 'ASSINADO', selfieCenterImage: 'foto-rogo-ficticia', signedAt: new Date() }] },
    }, include: { signers: true } });
  }
  const a = await make(); const b = await make();
  const approvedBefore = JSON.stringify(await prisma.document.findMany({ where: { id: { in: [a.id, b.id] } }, include: { signers: true, events: true }, orderBy: { id: 'asc' } }));
  for (const action of ['unapprove-document', 'unapprove-package', 'redo-document', 'redo-package']) await status(route.POST(request({ action }), params(a)), 409);
  await status(route.POST(request({ action: 'redo-photo', signerId: a.signers[0].id, field: 'selfieCenterImage' }), params(a)), 409);
  await status(route.DELETE(request({}), params(a)), 409);
  await status(event.POST(request({ imageField: 'selfieCenterImage', imageData: 'substituicao' }), tokenParams(a.signers[0])), 409);
  await status(getSign.GET(request({}), tokenParams(a.signers[0])), 200); // Prazo antigo não expira aprovado.
  actor = { ...admin, role: 'STAFF' };
  const requestId = crypto.randomUUID();
  const copy = await status(route.POST(request({ action: 'restart-package', requestId }), params(a)), 200);
  assert.equal(copy.createdCount, 2);
  const duplicated = await status(route.POST(request({ action: 'restart-package', requestId }), params(a)), 200);
  assert.equal(duplicated.newDocumentId, copy.newDocumentId); checks++;
  const copies = await prisma.document.findMany({ where: { id: { in: copy.newDocumentIds } }, include: { signers: true, events: true } });
  for (const doc of copies) {
    assert.equal(doc.status, 'PRONTO_PARA_ENVIO'); assert.equal(doc.signedFileId, null); assert.equal(doc.signedHash, null); assert.equal(doc.expirationDate, null);
    assert.notEqual(doc.kitBatchId, batch); assert.equal(doc.originalFileId, original.id);
    assert(doc.signers.every((s) => s.status === 'PENDENTE' && !s.selfieCenterImage && !s.signedAt && !a.signers.some((old) => old.token === s.token)));
    assert(doc.events.some((e) => e.eventType === 'SIGNATURE_ORDER_ENFORCED')); checks++;
  }
  const approvedAfter = JSON.stringify(await prisma.document.findMany({ where: { id: { in: [a.id, b.id] } }, include: { signers: true, events: true }, orderBy: { id: 'asc' } }));
  assert.equal(approvedAfter, approvedBefore); checks++;
  actor = { ...admin, role: 'VIEWER' };
  await status(route.POST(request({ action: 'restart-document', requestId: crypto.randomUUID() }), params(a)), 403);
  actor = outsider;
  await status(route.POST(request({ action: 'restart-document', requestId: crypto.randomUUID() }), params(a)), 404);
  actor = admin;
  await status(route.DELETE(request({}), { params: { id: copies[0].id } }), 200);
  assert(await prisma.storageFile.findUnique({ where: { id: original.id } })); assert.equal(deletedFiles, 0); checks++;
  const pending = await make('PENDENTE_REVISAO', null);
  actor = { ...admin, role: 'LAWYER' };
  await status(route.POST(request({ action: 'redo-photo', signerId: pending.signers[0].id, field: 'selfieCenterImage' }), params(pending)), 200);
  await status(route.POST(request({ action: 'redo-photo', signerId: pending.signers[0].id, field: 'documentFrontImage' }), params(pending)), 200);
  actor = admin;
  await status(route.POST(request({ action: 'approve-document' }), params(pending)), 409);
  for (const field of ['selfieCenterImage', 'documentFrontImage']) await status(event.POST(request({ imageField: field, imageData: 'nova-foto-ficticia' }), tokenParams(pending.signers[0])), 200);
  await status(event.POST(request({ imageField: 'selfieCenterImage', imageData: 'nao-autorizada' }), tokenParams(pending.signers[0])), 409);
  await prisma.document.update({ where: { id: pending.id }, data: { signedFileId: original.id, signedHash: 'novo-hash-ficticio' } });
  await status(route.POST(request({ action: 'approve-document' }), params(pending)), 200);
  await status(event.POST(request({ imageField: 'selfieCenterImage', imageData: 'nao-autorizada' }), tokenParams(pending.signers[0])), 409);
  const redo = await make('PENDENTE_REVISAO', crypto.randomUUID());
  actor = { ...admin, role: 'STAFF' };
  await status(route.POST(request({ action: 'redo-package' }), params(redo)), 200);
  const reset = await prisma.document.findUnique({ where: { id: redo.id }, include: { signers: true } });
  assert.equal(reset.signedFileId, null); assert(reset.signers.every((s) => s.status === 'PENDENTE' && !s.selfieCenterImage && !s.signedAt)); checks++;
  const signedWitness = await prisma.signer.create({ data: { documentId: redo.id, name: 'Testemunha fictícia', cpf: '12345678900', role: 'TESTEMUNHA_1', status: 'ASSINADO', signingMode: 'INDIVIDUAL' } });
  await status(submit.POST(request({ witness1: { name: 'Outra pessoa', cpf: '12345678900', selfieCenterImage: 'ficticia' } }), tokenParams(reset.signers[0])), 403);
  assert.equal((await prisma.signer.findUnique({ where: { id: signedWitness.id } })).name, 'Testemunha fictícia'); checks++;
  // O fluxo legítimo de cliente + a rogo continua funcionando no mesmo aparelho.
  const clientSigner = reset.signers.find((s) => s.role === 'CLIENTE');
  await status(event.POST(request({ forRogo: true, imageField: 'selfieCenterImage', imageData: 'foto-rogo-ficticia' }), tokenParams(clientSigner)), 200);
  await status(submit.POST(request({ confirmCpf: clientSigner.cpf, selfieCenterImage: 'foto-cliente-ficticia', signatureType: 'SELO_DIGITAL', signedConsentText: 'Aceite fictício',
    rogo: { name: 'A rogo fictício', cpf: '11144477735', selfieCenterImage: 'foto-rogo-ficticia', signatureType: 'SELO_DIGITAL' } }), tokenParams(clientSigner)), 200);
  const completed = await prisma.document.findUnique({ where: { id: redo.id }, include: { signers: true } });
  assert.equal(completed.status, 'CONCLUIDO'); assert(completed.signers.every((s) => s.status === 'ASSINADO')); checks++;
  Object.assign(deps, { 'pdf-lib': require('pdf-lib'), fs, path, qrcode: require('qrcode'), sharp: require('sharp'),
    './pdfHash': { calculateHash: () => { throw new Error('Não deve recalcular o aprovado'); } },
    './dateUtils': { formatBrasiliaDateTime: () => 'ficticio' }, './publicAuditTrail': { dedupePublicAuditEvents: (events) => events },
    './storage': { getFileBuffer: async () => { throw new Error('Não deve ler para regenerar aprovado'); }, saveFile: async () => { throw new Error('Não deve gerar outro arquivo aprovado'); } },
  });
  const certificate = load('src/lib/pdfCertificate.ts');
  const unchangedPdf = await certificate.generateFinalPdfCertificate(a.id);
  assert.equal(unchangedPdf.signedStorageFile.id, original.id); assert.equal(unchangedPdf.signedHash, a.signedHash); checks++;
  const missing = await make('APROVADO', null);
  await prisma.document.update({ where: { id: missing.id }, data: { signedFileId: null } });
  await assert.rejects(certificate.generateFinalPdfCertificate(missing.id), /recuperado/); checks++;
  const single = await make('PENDENTE_REVISAO', crypto.randomUUID());
  const sibling = await make('PENDENTE_REVISAO', single.kitBatchId);
  const siblingBefore = JSON.stringify(await prisma.document.findUnique({ where: { id: sibling.id }, include: { signers: true } }));
  await status(route.POST(request({ action: 'redo-document' }), params(single)), 200);
  assert.equal(await deps['@/lib/photo-review'].isIndividualRetry(prisma, single.id), true);
  assert.equal(JSON.stringify(await prisma.document.findUnique({ where: { id: sibling.id }, include: { signers: true } })), siblingBefore); checks++;
  const singleClient = single.signers.find((s) => s.role === 'CLIENTE');
  await status(submit.POST(request({ confirmCpf: singleClient.cpf, selfieCenterImage: 'foto-cliente-ficticia', signatureType: 'SELO_DIGITAL', signedConsentText: 'Aceite fictício',
    rogo: { name: 'A rogo fictício', cpf: '11144477735', selfieCenterImage: 'foto-rogo-ficticia', signatureType: 'SELO_DIGITAL' } }), tokenParams(singleClient)), 200);
  assert.equal(JSON.stringify(await prisma.document.findUnique({ where: { id: sibling.id }, include: { signers: true } })), siblingBefore); checks++;
  return checks;
};
