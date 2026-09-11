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
    vm.runInNewContext(code, { module, exports: module.exports, URL, Response, Buffer, process: { env: { NEXT_PUBLIC_APP_URL: 'http://127.0.0.1' } }, console: { error: () => {} },
      require(id) { if (id === 'next/server') return { NextResponse: Response }; if (deps[id]) return deps[id]; throw new Error(`Import bloqueado: ${id}`); } });
    return module.exports;
  }
  deps['./participant-qualification'] = deps['@/lib/participant-qualification'] = load('src/lib/participant-qualification.ts');
  deps['./participant-groups'] = deps['@/lib/participant-groups'] = load('src/lib/participant-groups.ts');
  deps['./signer-stamps'] = deps['@/lib/signer-stamps'] = load('src/lib/signer-stamps.ts');
  deps['./photo-review'] = deps['@/lib/photo-review'] = load('src/lib/photo-review.ts');
  const review = deps['@/lib/document-review'] = load('src/lib/document-review.ts');
  deps['@/lib/document-files'] = load('src/lib/document-files.ts');
  const route = load('src/app/api/documents/[id]/route.ts');
  const event = load('src/app/api/sign/[token]/event/route.ts');
  deps['@/lib/signatureOrder'] = load('src/lib/signatureOrder.ts');
  const submit = load('src/app/api/sign/[token]/submit/route.ts');
  const getSign = load('src/app/api/sign/[token]/route.ts');
  const request = (body) => new Request('http://127.0.0.1/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  async function status(result, expected) { const response = await result; const payload = await response.json(); assert.equal(response.status, expected, JSON.stringify(payload)); checks++; return payload; }
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
  await status(submit.POST(request({ confirmCpf: clientSigner.cpf, documentFrontImage: 'frente-cliente', documentBackImage: 'verso-cliente', selfieCenterImage: 'foto-cliente-ficticia', signatureType: 'SELO_DIGITAL', signedConsentText: 'Aceite fictício',
    rogo: { name: 'A rogo fictício', cpf: '11144477735', documentFrontImage: 'frente-rogo', documentBackImage: 'verso-rogo', selfieCenterImage: 'foto-rogo-ficticia', signatureType: 'SELO_DIGITAL' } }), tokenParams(clientSigner)), 200);
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
  await status(submit.POST(request({ confirmCpf: singleClient.cpf, documentFrontImage: 'frente-cliente', documentBackImage: 'verso-cliente', selfieCenterImage: 'foto-cliente-ficticia', signatureType: 'SELO_DIGITAL', signedConsentText: 'Aceite fictício',
    rogo: { name: 'A rogo fictício', cpf: '11144477735', documentFrontImage: 'frente-rogo', documentBackImage: 'verso-rogo', selfieCenterImage: 'foto-rogo-ficticia', signatureType: 'SELO_DIGITAL' } }), tokenParams(singleClient)), 200);
  assert.equal(JSON.stringify(await prisma.document.findUnique({ where: { id: sibling.id }, include: { signers: true } })), siblingBefore); checks++;
  // Falhas reais de transação: nada do envio pode ficar parcialmente assinado.
  const atomic = await make('PENDENTE_REVISAO', crypto.randomUUID());
  const atomicSibling = await make('PENDENTE_REVISAO', atomic.kitBatchId);
  await status(route.POST(request({ action: 'redo-package' }), params(atomic)), 200);
  const atomicClient = atomic.signers.find((s) => s.role === 'CLIENTE');
  const payload = { confirmCpf: atomicClient.cpf, documentFrontImage: 'frente-cliente', documentBackImage: 'verso-cliente', selfieCenterImage: 'foto-cliente-ficticia', signatureType: 'SELO_DIGITAL',
    rogo: { name: 'A rogo fictício', cpf: '11144477735', documentFrontImage: 'frente-rogo', documentBackImage: 'verso-rogo', selfieCenterImage: 'foto-rogo-ficticia', signatureType: 'SELO_DIGITAL' } };
  const state = async () => JSON.stringify(await prisma.document.findMany({ where: { id: { in: [atomic.id, atomicSibling.id] } }, include: { signers: { orderBy: { id: 'asc' } }, events: { orderBy: { id: 'asc' } } }, orderBy: { id: 'asc' } }));
  const beforeFailure = await state();
  for (const failAt of [2, 3]) {
    let writes = 0;
    const failingDb = new Proxy(prisma, { get(target, key) {
      if (key === '$transaction') return (work, options) => target.$transaction((tx) => work(new Proxy(tx, { get(t, k) {
        if (k !== 'signer') return Reflect.get(t, k);
        return new Proxy(t.signer, { get(model, operation) {
          if (operation === 'update') return async (args) => { if (++writes === failAt) throw new Error('Falha fictícia durante gravação'); return model.update(args); };
          return Reflect.get(model, operation);
        } });
      } })), options);
      const value = Reflect.get(target, key); return typeof value === 'function' ? value.bind(target) : value;
    } });
    deps['@/lib/prisma'] = { prisma: failingDb };
    const failingSubmit = load('src/app/api/sign/[token]/submit/route.ts');
    await status(failingSubmit.POST(request(payload), tokenParams(atomicClient)), 503);
    assert.equal(await state(), beforeFailure); checks++;
  }
  deps['@/lib/prisma'] = { prisma };
  const atomicResult = await status(submit.POST(request(payload), tokenParams(atomicClient)), 200);
  assert.equal(atomicResult.kitDocumentsSigned, 2); assert.equal(atomicResult.certificatePending, true); checks++;
  const saved = await state();
  const repeat = await status(submit.POST(request({ ...payload, selfieCenterImage: 'nao-substituir' }), tokenParams(atomicClient)), 200);
  assert.equal(repeat.alreadySigned, true); assert.equal(await state(), saved); checks++;
  const resulting = await prisma.document.findMany({ where: { id: { in: [atomic.id, atomicSibling.id] } } });
  assert(resulting.every((d) => d.status === 'CONCLUIDO' && d.reviewStatus === 'PENDENTE_REVISAO')); checks++;
  // Perda da resposta de uma foto corrigida: confirmar a mesma foto não a troca novamente.
  await status(route.POST(request({ action: 'redo-photo', signerId: atomicClient.id, field: 'selfieCenterImage' }), params(atomic)), 200);
  await status(event.POST(request({ imageField: 'selfieCenterImage', imageData: 'foto-corrigida' }), tokenParams(atomicClient)), 200);
  const photoSaved = await state();
  await status(event.POST(request({ imageField: 'selfieCenterImage', imageData: 'foto-corrigida' }), tokenParams(atomicClient)), 200);
  assert.equal(await state(), photoSaved); checks++;
  await status(event.POST(request({ imageField: 'selfieCenterImage', imageData: 'foto-diferente' }), tokenParams(atomicClient)), 409);
  // Testemunha em outro aparelho e passagem no mesmo aparelho continuam opcionais.
  for (const mode of ['INDIVIDUAL', 'SAME_DEVICE']) {
    const multi = await prisma.document.create({ data: { officeId: admin.officeId, title: 'Participantes fictícios', originalFileId: original.id, originalHash: 'hash-ficticio',
      status: 'ENVIADO', reviewStatus: 'PENDENTE_REVISAO', signers: { create: [
        { name: 'Cliente fictício', cpf: '52998224725', role: 'CLIENTE', signatureOrder: 1 },
        { name: 'Testemunha fictícia', cpf: '11144477735', role: 'TESTEMUNHA_1', signatureOrder: 2, signingMode: mode },
      ] } }, include: { signers: { orderBy: { signatureOrder: 'asc' } } } });
    const send = { confirmCpf: multi.signers[0].cpf, documentFrontImage: 'frente-cliente', documentBackImage: 'verso-cliente', selfieCenterImage: 'foto-cliente' };
    for (const field of ['documentFrontImage', 'documentBackImage', 'selfieCenterImage']) {
      const missing = { ...send }; delete missing[field];
      await status(submit.POST(request(missing), tokenParams(multi.signers[0])), 400);
      assert.equal((await prisma.signer.findUnique({ where: { id: multi.signers[0].id } })).status, 'PENDENTE'); checks++;
    }
    const attempts = await Promise.all([submit.POST(request(send), tokenParams(multi.signers[0])), submit.POST(request(send), tokenParams(multi.signers[0]))]);
    assert(attempts.every((r) => [200, 409].includes(r.status))); assert(attempts.some((r) => r.status === 200)); checks++;
    const resumed = await status(submit.POST(request(send), tokenParams(multi.signers[0])), 200);
    assert.equal(Boolean(resumed.nextSigner), mode === 'SAME_DEVICE'); assert.equal(resumed.pendingParticipants.length, 1); checks++;
    const reopened = await status(getSign.GET(request({}), tokenParams(multi.signers[0])), 200);
    assert.equal(Boolean(reopened.nextSigner), mode === 'SAME_DEVICE'); checks++;
    const witnessPayload = { confirmCpf: multi.signers[1].cpf, documentFrontImage: 'frente-testemunha', documentBackImage: 'verso-testemunha', selfieCenterImage: 'foto-testemunha' };
    for (const field of ['documentFrontImage', 'documentBackImage', 'selfieCenterImage']) {
      const missing = { ...witnessPayload }; delete missing[field];
      await status(submit.POST(request(missing), tokenParams(multi.signers[1])), 400);
    }
    await status(submit.POST(request(witnessPayload), tokenParams(multi.signers[1])), 200);
    assert.equal((await prisma.document.findUnique({ where: { id: multi.id } })).status, 'CONCLUIDO');
    assert.equal(await prisma.documentEvent.count({ where: { documentId: multi.id, signerId: multi.signers[0].id, eventType: 'SIGNATURE_SUBMITTED' } }), 1); checks++;
  }
  // Download nunca apresenta o original como substituto silencioso do certificado que falhou.
  let pdfFailure = true;
  deps['@/lib/pdfCertificate'] = { generateFinalPdfCertificate: async () => { if (pdfFailure) throw new Error('Falha PDF fictícia'); return { signedStorageFile: original }; } };
  deps['@/lib/storage'] = { getFileBuffer: async () => Buffer.from('pdf-final-ficticio') };
  const download = load('src/app/api/documents/[id]/download/route.ts');
  actor = admin;
  await status(download.GET(new Request('http://127.0.0.1/download'), params(atomic)), 503);
  pdfFailure = false;
  const recoveredDownload = await download.GET(new Request('http://127.0.0.1/download'), params(atomic));
  assert.equal(recoveredDownload.status, 200); assert.equal(await recoveredDownload.text(), 'pdf-final-ficticio'); checks++;
  const blankPdf = await require('pdf-lib').PDFDocument.create(); blankPdf.addPage();
  const pdfBytes = Buffer.from(await blankPdf.save());
  deps['@/lib/storage'] = { getFileBuffer: async () => pdfBytes };
  deps['@/lib/pdfHash'] = { calculateHash: () => 'hash-ficticio' };
  const createDoc = load('src/app/api/documents/route.ts');
  const stampLib = deps['@/lib/signer-stamps'];
  const positions = [{ order: 1, page: 1, x: 0.1, y: 0.5, width: 0.35, height: 0.1 }, { order: 2, page: 1, x: 0.55, y: 0.5, width: 0.35, height: 0.1 }];
  const qualificationFixture = { nationality: 'Brasileira', birthDate: '1980-01-01', maritalStatus: 'Solteiro', profession: 'Profissão fictícia', address: 'Endereço fictício', city: 'Cidade fictícia', state: 'BA', cep: '00000000' };
  const creationPayload = { title: 'Novo envio com selos fictícios', originalFileId: original.id, signaturePosition: stampLib.encodeStamps(positions),
    signers: [{ qualification: qualificationFixture, name: 'Pessoa Alfa', cpf: '52998224725', role: 'CLIENTE' }, { qualification: qualificationFixture, name: 'Pessoa Beta', cpf: '11144477735', role: 'PARTE' }] };
  const createdWithStamps = await status(createDoc.POST(request(creationPayload)), 200);
  assert.equal(createdWithStamps.document.signaturePosition, creationPayload.signaturePosition); checks++;
  await status(createDoc.POST(request({ ...creationPayload, signaturePosition: stampLib.encodeStamps([{ ...positions[0], order: 99 }]) })), 400);
  await status(createDoc.POST(request({ ...creationPayload, signaturePosition: stampLib.encodeStamps([{ ...positions[0], page: 2 }]) })), 400);
  // Quatro partes, duas com acompanhantes distintos, mais duas testemunhas.
  const cpfFixture = (n) => { let digits = String(800000000 + n).split('').map(Number); for (const factor of [10, 11]) { const mod = digits.reduce((sum, d, i) => sum + d * (factor - i), 0) * 10 % 11; digits.push(mod === 10 ? 0 : mod); } return digits.join(''); };
  const rogoFixture = (n) => ({ name: `Acompanhante fictício ${n}`, cpf: cpfFixture(n), birthDate: '1980-01-01', address: 'Endereço fictício' });
  const parties = Array.from({ length: 4 }, (_, i) => ({ qualification: qualificationFixture, name: `Parte fictícia ${i}`, cpf: cpfFixture(i + 1), role: i === 0 ? 'CLIENTE' : 'PARTE', signingMode: i % 2 ? 'INDIVIDUAL' : 'SAME_DEVICE', ...(i < 2 ? { rogo: rogoFixture(i + 10) } : {}) }));
  parties.push(...[20, 21].map(n => ({ name: `Testemunha fictícia ${n}`, cpf: cpfFixture(n), role: 'TESTEMUNHA', signingMode: 'INDIVIDUAL' })));
  const grouped = await status(createDoc.POST(request({ ...creationPayload, signaturePosition: 'MULTI:[]', signers: parties })), 200);
  const groupDoc = await prisma.document.findUnique({ where: { id: grouped.document.id }, include: { signers: { orderBy: { signatureOrder: 'asc' } } } });
  const groupPeople = groupDoc.signers;
  assert.equal(groupPeople.length, 8); checks++;
  const pairConfig = await deps['@/lib/participant-groups'].loadParticipantGroups(prisma, groupDoc, groupPeople);
  assert.deepEqual(JSON.parse(JSON.stringify(pairConfig)).map(g => [g.partyOrder, g.rogoOrder]), [[1, 2], [3, 4]]); checks++;
  const photoPayload = { documentFrontImage: 'frente-ficticia', documentBackImage: 'verso-ficticio', selfieCenterImage: 'selfie-ficticia' };
  const partySend = { confirmCpf: groupPeople[0].cpf, ...photoPayload, rogo: { ...photoPayload, name: groupPeople[1].name, cpf: groupPeople[1].cpf } };
  await status(submit.POST(request({ ...partySend, rogo: { ...partySend.rogo, name: groupPeople[3].name, cpf: groupPeople[3].cpf } }), tokenParams(groupPeople[0])), 403);
  assert.equal((await prisma.signer.findUnique({ where: { id: groupPeople[3].id } })).status, 'PENDENTE'); checks++;
  for (const field of Object.keys(photoPayload)) { const incomplete = { ...partySend.rogo }; delete incomplete[field]; await status(submit.POST(request({ ...partySend, rogo: incomplete }), tokenParams(groupPeople[0])), 400); }
  await status(submit.POST(request(partySend), tokenParams(groupPeople[0])), 200);
  const secondView = await status(getSign.GET(request({}), tokenParams(groupPeople[2])), 200);
  assert.equal(secondView.document.isIlliterate, true); assert.equal(secondView.document.rogoCpf, groupPeople[3].cpf); checks++;
  await status(event.POST(request({ forRogo: true, imageField: 'documentFrontImage', imageData: 'frente-da-segunda-dupla' }), tokenParams(groupPeople[2])), 200);
  assert.equal((await prisma.signer.findUnique({ where: { id: groupPeople[1].id } })).documentFrontImage, photoPayload.documentFrontImage); checks++;
  assert.equal((await prisma.signer.findUnique({ where: { id: groupPeople[3].id } })).documentFrontImage, 'frente-da-segunda-dupla'); checks++;
  await status(submit.POST(request({ confirmCpf: groupPeople[2].cpf, ...photoPayload, rogo: { name: groupPeople[3].name, cpf: groupPeople[3].cpf, ...photoPayload } }), tokenParams(groupPeople[2])), 200);
  for (const person of groupPeople.slice(4)) await status(submit.POST(request({ confirmCpf: person.cpf, ...photoPayload }), tokenParams(person)), 200);
  const completedGroup = await prisma.document.findUnique({ where: { id: groupDoc.id }, include: { signers: true } });
  assert.equal(completedGroup.status, 'CONCLUIDO'); assert(completedGroup.signers.every(p => p.documentFrontImage && p.documentBackImage && p.selfieCenterImage)); checks++;
  await prisma.document.update({ where: { id: groupDoc.id }, data: { reviewStatus: 'APROVADO', signedFileId: original.id, signedHash: 'hash-aprovado-ficticio', verificationCode: 'GRUPOS-FICTICIOS' } });
  const approvedGroupBefore = await prisma.document.findUnique({ where: { id: groupDoc.id }, include: { signers: true } });
  const copiedGroup = await status(route.POST(request({ action: 'restart-document', requestId: crypto.randomUUID() }), params(groupDoc)), 200);
  const newGroup = await prisma.document.findUnique({ where: { id: copiedGroup.newDocumentId }, include: { signers: true } });
  assert.equal(JSON.stringify(await deps['@/lib/participant-groups'].loadParticipantGroups(prisma, newGroup, newGroup.signers)), JSON.stringify(pairConfig)); checks++;
  assert(newGroup.signers.every(p => p.status === 'PENDENTE' && !p.selfieCenterImage)); checks++;
  assert.deepEqual(await prisma.document.findUnique({ where: { id: groupDoc.id }, include: { signers: true } }), approvedGroupBefore); checks++;
  // Pacote real na base fictícia: cliente a rogo legado + outra parte com seu a rogo.
  const kitClient = await prisma.client.create({ data: { officeId: admin.officeId, name: 'Cliente de kit fictício', cpfCnpj: cpfFixture(30), phone: '00000000000' } });
  const kitTemplates = await Promise.all([1, 2].map(i => prisma.template.create({ data: { officeId: admin.officeId, title: `Minuta fictícia ${i}`, contentHtml: '<p>Acordo fictício</p>' } })));
  const actualKit = await prisma.legalKit.create({ data: { officeId: admin.officeId, name: 'Kit de grupos fictício', items: { create: kitTemplates.map((t, i) => ({ templateId: t.id, displayOrder: i + 1 })) } } });
  deps['@/lib/kitTemplateNormalization'] = load('src/lib/kitTemplateNormalization.ts');
  deps['@/lib/documentLetterhead'] = { getDocumentLetterheadBuffer: async () => null };
  deps['@/lib/templateCompiler'] = { compileTemplateToPdf: async () => ({ storageRecord: original, hash: 'hash-ficticio', pageCount: 1, signaturePosition: 'BOTTOM', signaturePlacements: [] }) };
  const createKit = load('src/app/api/kits/generate-package/route.ts');
  const kitCreated = await status(createKit.POST(request({ clientId: kitClient.id, kitId: actualKit.id, isIlliterate: true, rogoName: 'A rogo principal fictício', rogoCpf: cpfFixture(31), rogoBirthDate: '1980-01-01', rogoAddress: 'Endereço fictício',
    signers: [{ qualification: qualificationFixture, name: 'Parte adicional fictícia', cpf: cpfFixture(32), role: 'PARTE', rogo: rogoFixture(33), signingMode: 'INDIVIDUAL' }] })), 200);
  assert.equal(kitCreated.participantLinks.length, 2); assert(kitCreated.participantLinks.every(p => p.role !== 'ASSINANTE_A_ROGO')); checks++;
  const kitDocs = await prisma.document.findMany({ where: { kitId: actualKit.id }, include: { signers: { orderBy: { signatureOrder: 'asc' } } }, orderBy: { createdAt: 'asc' } });
  assert.equal(kitDocs.length, 2); assert(kitDocs.every(d => d.signers.length === 4)); checks++;
  const ks = kitDocs[0].signers;
  await status(submit.POST(request({ confirmCpf: ks[0].cpf, ...photoPayload, rogo: { name: ks[1].name, cpf: ks[1].cpf, ...photoPayload } }), tokenParams(ks[0])), 200);
  const kitSecondView = await status(getSign.GET(request({}), tokenParams(ks[2])), 200);
  assert.equal(kitSecondView.document.rogoCpf, ks[3].cpf); assert.equal(kitSecondView.kit.documents.length, 2); checks++;
  await status(submit.POST(request({ confirmCpf: ks[2].cpf, ...photoPayload, rogo: { name: ks[3].name, cpf: ks[3].cpf, ...photoPayload } }), tokenParams(ks[2])), 200);
  const kitCompleted = await prisma.document.findMany({ where: { kitId: actualKit.id }, include: { signers: true } });
  assert(kitCompleted.every(d => d.status === 'CONCLUIDO' && d.signers.every(p => p.status === 'ASSINADO' && p.documentBackImage))); checks++;
  return checks;
};
