// Exercita os handlers reais com armazenamento em memória. Sem .env, rede ou clientes reais.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(file, deps = {}) {
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', compiled)(id => {
    if (id === '@/lib/photo-policy' || id === './photo-policy') return policy;
    if (!(id in deps)) throw Error('Dependência externa bloqueada: ' + id);
    return deps[id];
  }, mod, mod.exports);
  return mod.exports;
}
const policy = load('src/lib/photo-policy.ts');
const req = body => new Request('https://example.invalid/sign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const consent = { signatureType: 'SELO_DIGITAL', signedConsentText: 'Li e concordo com todos os documentos apresentados.' };
function fixture({ mode = 'SEM_FOTOS', role = 'CLIENTE', rogo = false, witness = false, kit = false, photos = false, blocked = false, approved = false, expired = false, cancelled = false, malformed = false } = {}) {
  const events = mode ? [{ documentId: 'd1', ...policy.photoPolicyEvent(mode, 'u1') }] : [];
  if (malformed) events[0].metadata = 'invalid';
  let writes = 0, finalized = 0;
  const image = 'fixture-photo';
  const createPerson = (id, role, signatureOrder, docId = 'd1') => ({ id, documentId: docId, name: 'Pessoa ' + id, cpf: id === 's1' ? '12345678901' : '98765432100', role, signatureOrder, signingMode: 'SAME_DEVICE', status: 'PENDENTE', ...(photos ? { documentFrontImage: image, documentBackImage: image, selfieCenterImage: image } : {}) });
  const people = [createPerson('s1', role, 1)];
  if (rogo) people.push(createPerson('r1', 'ASSINANTE_A_ROGO', 2));
  if (witness) people.push(createPerson('w1', 'TESTEMUNHA_1', 2));
  const document = { id: 'd1', officeId: 'o1', clientId: 'c1', kitBatchId: kit ? 'b1' : null, title: 'Documento fictício', status: approved ? 'CONCLUIDO' : cancelled ? 'CANCELADO' : 'ENVIADO', reviewStatus: approved ? 'APROVADO' : 'PENDENTE_REVISAO', expirationDate: expired ? new Date('2000-01-01') : null, signers: people };
  const docs = [document];
  if (kit) { docs.push({ ...document, id: 'd2', signers: people.map(p => ({ ...p, id: p.id + 'b', documentId: 'd2' })) }); events.push({ documentId: 'd2', ...policy.photoPolicyEvent(mode, 'u1') }); }
  const allPeople = () => docs.flatMap(d => d.signers);
  const match = (e, w) => (!w.documentId || e.documentId === w.documentId) && (!w.eventType || e.eventType === w.eventType) && (!w.signerId || e.signerId === w.signerId);
  const db = {
    $queryRaw: async () => [],
    signer: {
      findUnique: async () => ({ ...people[0], document }),
      findMany: async ({ where }) => allPeople().filter(p => p.documentId === where.documentId),
      update: async ({ where, data }) => { writes++; const p = allPeople().find(p => p.id === where.id); Object.assign(p, data); return p; },
      create: async () => { throw Error('Participante não previsto'); },
    },
    document: {
      findUnique: async ({ where }) => docs.find(d => d.id === where.id),
      findMany: async () => docs.slice(1),
      update: async ({ where, data }) => { writes++; const d = docs.find(d => d.id === where.id); Object.assign(d, data); return d; },
    },
    documentEvent: {
      findMany: async ({ where }) => events.filter(e => match(e, where)),
      findFirst: async ({ where }) => events.find(e => match(e, where)) || null,
      create: async ({ data }) => { writes++; events.push(data); return data; },
      createMany: async ({ data }) => { writes++; events.push(...data); return { count: data.length }; },
    },
    auditLog: { create: async () => { writes++; } },
  };
  db.$transaction = async fn => fn(db);
  const deps = {
    'next/server': { NextResponse: Response }, '@/lib/prisma': { prisma: db },
    '@/lib/evidence-image': { validateEvidenceImage: async x => { if (x !== image) throw Error('Foto inválida'); } },
    '@/lib/participant-groups': { loadParticipantGroups: async () => rogo ? [{ partyOrder: 1, rogoOrder: 2 }] : [] },
    '@/lib/pdfCertificate': { generateFinalPdfCertificate: async () => { finalized++; } },
    '@/lib/whatsapp/signatureCompletion': { queueSignatureCompletionMessages: async () => {} },
    '@/lib/signatureOrder': { getSignatureOrderBlock: async () => blocked ? { name: 'Anterior' } : null, signatureOrderError: () => 'Aguarde a ordem.' },
    '@/lib/photo-review': { isIndividualRetry: async () => false, pendingPhotoCorrection: async () => null },
  };
  const endpoint = load('src/app/api/sign/[token]/submit/route.ts', deps);
  const base = { confirmCpf: people[0].cpf, ...consent, ...(photos ? { documentFrontImage: image, documentBackImage: image, selfieCenterImage: image } : {}) };
  if (rogo) { base.signatureType = 'CONSENTIMENTO_A_ROGO'; base.rogo = { ...people[1], ...consent }; }
  if (witness) base.witness1 = { ...people[1], ...consent };
  return { db, deps, people, docs, events, writes: () => writes, finalized: () => finalized, submit: (extra = {}) => endpoint.POST(req({ ...base, ...extra }), { params: { token: 'fake' } }) };
}

test('política legada exige fotos e valores desconhecidos não dispensam identificação', () => {
  assert.equal(policy.photoPolicyFromEvents([]), 'COM_FOTOS');
  for (const bad of [null, false, 'false', 'SEM_FOTO', {}]) assert.throws(() => policy.parsePhotoPolicy(bad));
  assert.throws(() => policy.photoPolicyFromEvents([{ eventType: policy.PHOTO_POLICY_EVENT, metadata: '{}' }]));
  assert.throws(() => policy.photoPolicyFromEvents([policy.photoPolicyEvent('SEM_FOTOS','u'), policy.photoPolicyEvent('COM_FOTOS','u')]));
});
for (const options of [{}, { role: 'PARTE' }, { role: 'TESTEMUNHA_1' }, { role: 'REPRESENTANTE_LEGAL' }, { rogo: true }, { witness: true }, { kit: true }, { rogo: true, kit: true }]) {
  test('assinatura sem fotos conclui com evidências verdadeiras: ' + JSON.stringify(options), async () => {
    const f = fixture(options); const response = await f.submit(); const body = await response.json();
    assert.equal(response.status, 200, JSON.stringify(body)); assert.equal(body.certificatePending, false);
    for (const d of f.docs) { assert.equal(d.status, 'CONCLUIDO'); for (const p of d.signers) { assert.equal(p.status, 'ASSINADO'); assert.equal(p.selfieCenterImage, null); assert.ok(p.signedConsentText); } }
    assert.equal(f.events.some(e => e.eventType === 'LIVENESS_CAPTURED'), false);
    assert.equal(f.finalized(), f.docs.length);
    const before = f.writes(); assert.equal((await f.submit()).status, 200); assert.equal(f.writes(), before);
  });
}
for (const mode of [null, 'COM_FOTOS']) test('modo com fotos e legado resistem a bypass: ' + mode, async () => {
  const f = fixture({ mode }); const response = await f.submit({ photoPolicy: 'SEM_FOTOS', skipPhotos: true });
  assert.equal(response.status, 409); assert.equal(f.writes(), 0);
});
test('modo com fotos continua concluindo quando as fotos são válidas', async () => {
  const f = fixture({ mode: 'COM_FOTOS', photos: true }); const r = await f.submit();
  assert.equal(r.status, 200, JSON.stringify(await r.json())); assert.ok(f.events.some(e => e.eventType === 'LIVENESS_CAPTURED'));
});
test('modo com fotos recusa foto inválida antes de gravar', async () => {
  const f = fixture({ mode: 'COM_FOTOS', photos: true }); assert.equal((await f.submit({ selfieCenterImage: 'bad' })).status, 400); assert.equal(f.writes(), 0);
});
for (const [options, extra, status] of [
  [{}, { signedConsentText: '' }, 400], [{}, { signatureType: 'DESENHADA', signatureImage: 'data:image/png;base64,@@invalida' }, 400], [{}, { signatureType: 'ASSINATURA_FALSA' }, 400],
  [{}, { signatureType: 'inventada' }, 400], [{}, { confirmCpf: '999' }, 400],
  [{ blocked: true }, {}, 409], [{ approved: true }, {}, 409], [{ expired: true }, {}, 400], [{ cancelled: true }, {}, 400],
  [{ rogo: true }, { rogo: null }, 400], [{ malformed: true }, {}, 503],
]) test('proteções preservadas ' + JSON.stringify([options, extra]), async () => {
  const f = fixture(options); assert.equal((await f.submit(extra)).status, status); assert.equal(f.writes(), 0);
});
test('sem fotos descarta imagens enviadas pelo navegador', async () => {
  const f = fixture(); assert.equal((await f.submit({ selfieCenterImage: 'qualquer imagem', documentFrontImage: 'foto' })).status, 200);
  assert.equal(f.people[0].selfieCenterImage, null); assert.equal(f.people[0].documentFrontImage, null);
});
test('endpoint de eventos não aceita fotos nem falsa prova de presença em envio sem fotos', async () => {
  const f = fixture(); f.db.signer.findUniqueOrThrow = f.db.signer.findUnique;
  const route = load('src/app/api/sign/[token]/event/route.ts', f.deps);
  for (const payload of [{ imageField: 'selfieCenterImage', imageData: 'fake' }, { eventType: 'FRONT_CAPTURED' }, { eventType: 'LIVENESS_STARTED' }]) {
    assert.equal((await route.POST(req(payload), { params: { token: 'fake' } })).status, 400);
  }
  assert.equal(f.writes(), 0);
});
