// Testes exploratórios do endpoint real. Nenhuma conexão, .env, arquivo de
// cliente, mensagem ou certificado real é carregado. Não habilita modalidade.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function fixture({ status = 'ENVIADO', signed = false, expired = false, blocked = false, found = true } = {}) {
  let mutations = 0;
  const mutation = () => { mutations++; throw new Error('Escrita inesperada no ensaio'); };
  const signer = { id: 'ficticio', token: 'link-ficticio', name: 'Participante fictícia', cpf: '00000000000', role: 'CLIENTE', signatureOrder: 1, status: signed ? 'ASSINADO' : 'PENDENTE' };
  signer.document = { id: 'doc-ficticio', officeId: 'escritorio-ficticio', kitBatchId: 'kit-ficticio', status, reviewStatus: 'APROVADO', signedFileId: signed ? 'pdf-ficticio' : null, expirationDate: expired ? new Date('2000-01-01') : null, signers: [signer] };
  const db = {
    signer: { findUnique: async () => found ? signer : null, update: mutation },
    document: { update: mutation }, documentEvent: { create: mutation, createMany: mutation },
    auditLog: { create: mutation }, $queryRaw: async () => [],
  };
  db.$transaction = async fn => fn(db);
  const dependencies = {
    'next/server': { NextResponse: Response },
    '@/lib/prisma': { prisma: db },
    '@/lib/evidence-image': { validateEvidenceImage: async () => { throw new Error('Foto fictícia não é evidência'); } },
    '@/lib/participant-groups': { loadParticipantGroups: async () => [] },
    '@/lib/pdfCertificate': { generateFinalPdfCertificate: mutation },
    '@/lib/whatsapp/signatureCompletion': { queueSignatureCompletionMessages: mutation },
    '@/lib/signatureOrder': { getSignatureOrderBlock: async () => blocked ? { name: 'Participante anterior' } : null, signatureOrderError: () => 'Aguarde a ordem' },
    '@/lib/photo-review': { isIndividualRetry: async () => false },
  };
  const source = fs.readFileSync('src/app/api/sign/[token]/submit/route.ts', 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(id => {
    if (!(id in dependencies)) throw new Error('Dependência externa bloqueada: ' + id);
    return dependencies[id];
  }, module, module.exports);
  return {
    mutations: () => mutations,
    submit: async (extra = {}) => module.exports.POST(new Request('https://example.invalid/api/sign/link-ficticio/submit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmCpf: '00000000000', signatureType: 'DIGITADA', signedConsentText: 'Li e concordo com este documento de teste.', geoLat: -23.5, geoLng: -46.6, geoAccuracy: 25, ...extra }),
    }), { params: { token: 'link-ficticio' } }),
  };
}

for (const extra of [{}, { authMethod: 'FACILITADA', skipPhotos: true }, { selfieCenterImage: 'data:image/png;base64,AAAA', documentFrontImage: 'data:image/png;base64,AAAA', documentBackImage: 'data:image/png;base64,AAAA' }]) {
  test(`fluxo atual recusa conclusão sem fotos válidas: ${JSON.stringify(extra)}`, async () => {
    const f = fixture(); const response = await f.submit(extra); const body = await response.json();
    assert.equal(response.status, 400); assert.match(body.error, /fotos|foto/); assert.equal(f.mutations(), 0);
  });
}
for (const [name, options, extra, expected] of [
  ['link desconhecido', { found: false }, {}, 404],
  ['link cancelado', { status: 'CANCELADO' }, {}, 400],
  ['link expirado', { expired: true }, {}, 400],
  ['CPF divergente', {}, { confirmCpf: '11111111111' }, 400],
  ['ordem pendente', { blocked: true }, {}, 409],
  ['documento concluído e aprovado', { status: 'CONCLUIDO' }, {}, 409],
]) {
  test(`proteção preservada: ${name}`, async () => {
    const f = fixture(options); const response = await f.submit(extra);
    assert.equal(response.status, expected); assert.equal(f.mutations(), 0);
  });
}
test('reabrir o mesmo link após assinatura não sobrescreve dados', async () => {
  const f = fixture({ signed: true, status: 'CONCLUIDO' });
  const response = await f.submit(); const body = await response.json();
  assert.equal(response.status, 200); assert.equal(body.alreadySigned, true); assert.equal(f.mutations(), 0);
});
