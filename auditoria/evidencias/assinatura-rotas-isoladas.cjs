// Auditoria de 08/09/2026. Executar da raiz: node auditoria/evidencias/assinatura-rotas-isoladas.cjs
// Executa as rotas locais reais após transpilar TypeScript somente em memória.
// Todas as dependências das rotas são doubles: NÃO conecta banco, rede, Blob nem WhatsApp.
// "reproduzido: true" significa que o defeito foi reproduzido, não que o produto passou.
const fs = require('fs');
const ts = require('typescript');
const results = [];

function load(file, deps) {
  const out = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', out)((id) => {
    if (id === 'next/server') return { NextResponse: Response };
    if (id in deps) return deps[id];
    throw new Error('Dependência real bloqueada: ' + id);
  }, module, module.exports);
  return module.exports;
}

function check(name, reproduced, evidence) {
  results.push({ name, reproduzido: reproduced, evidence });
  if (!reproduced) process.exitCode = 1;
}

const headers = { 'Content-Type': 'application/json' };
const request = (body) => new Request('http://audit.local', {
  method: 'POST', headers, body: JSON.stringify(body),
});
const params = { params: { token: 'token-ficticio' } };
const noAudit = { logAuditEvent: async () => {} };
const noOrder = { getSignatureOrderBlock: async () => null };
const noPdf = { generateFinalPdfCertificate: async () => {} };
const noNotify = { queueSignatureCompletionMessages: async () => {} };
const noLogConsole = { ...console, error: () => {} };

(async () => {
  const participants = [
    { id: 'client', name: 'Cliente Ficticio', cpf: '123', role: 'CLIENTE', status: 'PENDENTE', signatureOrder: 1 },
    { id: 'witness', name: 'Original Ficticio', cpf: '456', role: 'TESTEMUNHA_1', status: 'ASSINADO', signingMode: 'INDIVIDUAL', signatureOrder: 2 },
  ];
  const doc = { id: 'doc', officeId: 'office', title: 'Ficticio', status: 'ENVIADO', signers: participants };
  const prisma = {
    signer: {
      findUnique: async () => ({ ...participants[0], document: doc }),
      update: async ({ where, data }) => Object.assign(participants.find((p) => p.id === where.id), data),
    },
    document: {
      findUnique: async () => doc,
      update: async ({ data }) => Object.assign(doc, data),
    },
    documentEvent: { create: async () => ({}), createMany: async () => ({}) },
  };
  const submit = load('src/app/api/sign/[token]/submit/route.ts', {
    '@/lib/prisma': { prisma },
    '@/lib/audit': noAudit,
    '@/lib/pdfCertificate': noPdf,
    '@/lib/whatsapp/signatureCompletion': noNotify,
    '@/lib/signatureOrder': noOrder,
  });
  let res = await submit.POST(request({
    confirmCpf: '123',
    selfieCenterImage: 'not-an-image',
    witness1: { name: 'Substituto Ficticio', cpf: '000', selfieCenterImage: 'also-not-image' },
  }), params);
  let body = await res.json();
  check('Submit aceita selfie texto e consentimento omitido', res.status === 200 && participants[0].status === 'ASSINADO', {
    status: res.status, documentStatus: body.documentStatus,
    selfie: participants[0].selfieCenterImage, defaultConsentAdded: !!participants[0].signedConsentText,
  });
  check('Token cliente sobrescreve testemunha individual já assinada',
    participants[1].cpf === '000' && participants[1].name === 'Substituto Ficticio', {
      cpf: participants[1].cpf, status: participants[1].status, signingMode: participants[1].signingMode,
    });

  for (const fixture of [
    { status: 'PENDENTE', docStatus: 'CANCELADO' },
    { status: 'ASSINADO', docStatus: 'CONCLUIDO' },
  ]) {
    let mutation = null;
    const signer = { id: 's', status: fixture.status, documentFrontImage: null,
      document: { id: 'd', status: fixture.docStatus, expirationDate: new Date(0) } };
    const event = load('src/app/api/sign/[token]/event/route.ts', {
      '@/lib/prisma': { prisma: {
        signer: { findUnique: async () => signer, update: async ({ data }) => { mutation = data; return {}; } },
        document: { update: async () => ({}) },
      } },
    });
    res = await event.POST(request({ imageField: 'documentFrontImage', imageData: 'fake' }), params);
    check('Salvar evidência ' + fixture.docStatus + ' sem autorização de etapa',
      res.status === 200 && mutation?.documentFrontImage === 'fake', { status: res.status, mutation });
  }

  let statusChange;
  const finishedDoc = { id: 'd', isIlliterate: false, status: 'CONCLUIDO', expirationDate: new Date(0) };
  const get = load('src/app/api/sign/[token]/route.ts', {
    '@/lib/prisma': { prisma: {
      signer: { findUnique: async () => ({ id: 's', status: 'ASSINADO', document: finishedDoc }) },
      documentEvent: { findFirst: async () => null },
      document: { update: async ({ data }) => { statusChange = data.status; } },
    } },
    '@/lib/signatureOrder': noOrder,
  });
  res = await get.GET(new Request('http://audit.local'), params);
  check('Abrir link transforma CONCLUIDO em EXPIRADO', statusChange === 'EXPIRADO',
    { responseStatus: res.status, newStatus: statusChange });

  const verify = load('src/app/api/verify/[code]/route.ts', {
    '@/lib/prisma': { prisma: { document: { findUnique: async () => ({
      status: 'CANCELADO', verificationCode: 'FAKE', signers: [], events: [],
    }) } } },
    '@/lib/pdfCertificate': { formatFullCpf: (x) => x, formatFullPhone: (x) => x },
    '@/lib/publicAuditTrail': { dedupePublicAuditEvents: (x) => x },
  });
  res = await verify.GET(new Request('http://audit.local'), { params: { code: 'fake' } });
  body = await res.json();
  check('Verificação retorna valid true para cancelado', body.valid === true && body.status === 'CANCELADO',
    { valid: body.valid, status: body.status });

  const publicDoc = load('src/app/api/sign/[token]/document/route.ts', {
    '@/lib/prisma': { prisma: { signer: { findUnique: async () => ({ document: {
      id: 'd', officeId: 'o', status: 'CANCELADO', expirationDate: new Date(0),
      originalFile: { storageKey: 'fake', mimeType: 'application/pdf' },
    } }) } } },
    '@/lib/storage': { getFileBuffer: async () => Buffer.from('fake-pdf') },
  });
  res = await publicDoc.GET(new Request('http://audit.local'), params);
  check('Download público ignora cancelamento e expiração', res.status === 200, { status: res.status });

  const partialSigner = { id: 's', name: 'Ficticio', cpf: '123', status: 'PENDENTE', role: 'CLIENTE', signatureOrder: 1 };
  const partialDoc = { id: 'd', officeId: 'o', status: 'ENVIADO', signers: [partialSigner] };
  const partialSubmit = load('src/app/api/sign/[token]/submit/route.ts', {
    '@/lib/prisma': { prisma: {
      signer: {
        findUnique: async () => ({ ...partialSigner, document: partialDoc }),
        update: async ({ data }) => Object.assign(partialSigner, data),
      },
      document: { findUnique: async () => { throw new Error('Falha simulada após persistir signatário'); } },
    } },
    '@/lib/audit': noAudit,
    '@/lib/pdfCertificate': noPdf,
    '@/lib/whatsapp/signatureCompletion': noNotify,
    '@/lib/signatureOrder': noOrder,
  });
  const oldConsole = global.console;
  global.console = noLogConsole;
  const first = await partialSubmit.POST(request({ confirmCpf: '123', selfieCenterImage: 'fake' }), params);
  const retry = await partialSubmit.POST(request({ confirmCpf: '123', selfieCenterImage: 'fake' }), params);
  global.console = oldConsole;
  check('Falha parcial impede retentativa de conclusão', first.status === 500 && retry.status === 400 &&
    partialSigner.status === 'ASSINADO' && partialDoc.status === 'ENVIADO', {
      firstStatus: first.status, retryStatus: retry.status, signerStatus: partialSigner.status, documentStatus: partialDoc.status,
    });

  let queueReads = 0;
  const notify = load('src/lib/whatsapp/signatureCompletion.ts', {
    '@/lib/prisma': { prisma: {
      document: { findUnique: async () => ({ status: 'CONCLUIDO', signedFile: null }) },
      whatsAppLog: { findFirst: async () => { queueReads++; return null; }, create: async () => { queueReads++; } },
    } },
  });
  await notify.queueSignatureCompletionMessages('fake');
  check('Conclusão sem PDF não enfileira avisos', queueReads === 0, { outboxOperations: queueReads });

  console.log(JSON.stringify({
    scope: 'Rotas locais reais transpiled; banco, rede, Blob e WhatsApp substituídos por doubles. Não é teste E2E nem produção.',
    checks: results.length,
    results,
  }, null, 2));
})().catch((error) => { console.error(error); process.exitCode = 1; });
