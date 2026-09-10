// Somente banco local dedicado, schema vazio, dados fictícios; sem .env ou provedores.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { PrismaClient } = require('@prisma/client');
const uri = new URL(process.env.ASSINAJUR_TEST_DATABASE_URL);
assert.equal(uri.hostname, '127.0.0.1');
assert.equal(uri.port, '55483');
assert.equal(uri.pathname, '/security_integration_db');
const prisma = new PrismaClient({ datasources: { db: { url: uri.href } } });
let actor;
let checks = 0;
const dependencies = {
  '@/lib/prisma': { prisma },
  '@/lib/auth': { getSessionUser: async () => actor },
  '@/lib/audit': { logAuditEvent: async (data) => prisma.auditLog.create({ data }) },
  '@/lib/defaultLegalLibrary': { ensureDefaultLegalLibrary: async () => {} },
};
function load(file) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, URL, Response, Buffer,
    console: { error: () => {} },
    require(id) { if (id === 'next/server') return { NextResponse: Response }; if (dependencies[id]) return dependencies[id]; throw new Error('Dependência externa bloqueada'); },
  });
  return module.exports;
}
const request = (body = {}) => new Request('http://127.0.0.1/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
async function status(promise, expected) { const response = await promise; assert.equal(response.status, expected); checks++; return response.json(); }
async function main() {
  assert.equal(await prisma.office.count(), 0, 'Banco de homologação deve começar vazio');
  const offices = [];
  for (const suffix of ['a', 'b']) offices.push(await prisma.office.create({ data: { name: `Fictício ${suffix}`, cpfCnpj: `ficticio-${suffix}`, oabNumber: 'TESTE', phone: '00000000000', email: `${suffix}@example.invalid` } }));
  const users = [];
  const clients = [];
  const templates = [];
  for (let i = 0; i < 2; i++) {
    users.push(await prisma.user.create({ data: { officeId: offices[i].id, name: `Teste ${i}`, email: `user${i}@example.invalid`, passwordHash: 'nao-e-uma-senha-utilizavel', role: 'OFFICE_ADMIN' } }));
    clients.push(await prisma.client.create({ data: { officeId: offices[i].id, name: `Cliente fictício ${i}`, cpfCnpj: `ficticio-${i}`, phone: '00000000000' } }));
    templates.push(await prisma.template.create({ data: { officeId: offices[i].id, title: `Modelo fictício ${i}`, contentHtml: '<p>Somente teste</p>' } }));
  }
  const inactive = await prisma.template.create({ data: { officeId: offices[0].id, title: 'Inativo fictício', contentHtml: '<p>Teste</p>', active: false } });
  dependencies['@/lib/kit-security'] = load('src/lib/kit-security.ts');
  const kits = load('src/app/api/kits/route.ts');
  const kit = load('src/app/api/kits/[id]/route.ts');
  const pendencies = load('src/app/api/pendencias/route.ts');
  const pendency = load('src/app/api/pendencias/[id]/route.ts');
  const office = load('src/app/api/office/route.ts');
  actor = users[0];
  const validKit = { name: 'Kit fictício', templateIds: [templates[0].id] };
  const created = await status(kits.POST(request(validKit)), 200);
  const kitParams = { params: { id: created.kit.id } };
  for (const templateIds of [[templates[1].id], [inactive.id], [templates[0].id, templates[0].id]]) {
    await status(kits.POST(request({ ...validKit, templateIds })), 400);
    await status(kit.PUT(request({ ...validKit, templateIds }), kitParams), 400);
  }
  assert.equal(await prisma.legalKit.count(), 1);
  assert.equal((await prisma.kitItem.findFirst({ where: { kitId: created.kit.id } })).templateId, templates[0].id); checks++;
  await status(kit.PUT(request({ ...validKit, name: 'Atualizado' }), kitParams), 200);
  const base = { title: 'Pendência fictícia', clientId: clients[0].id, responsibleId: users[0].id };
  const createdPendency = await status(pendencies.POST(request(base)), 201);
  const params = { params: { id: createdPendency.pendency.id } };
  for (const invalid of [{ clientId: clients[1].id }, { responsibleId: users[1].id }]) {
    await status(pendencies.POST(request({ ...base, ...invalid })), 404);
    await status(pendency.PATCH(request(invalid), params), 404);
  }
  await status(pendency.PATCH(request({ title: 'Alteração permitida' }), params), 200);
  await status(office.PUT(request({ name: 'Escritório fictício atualizado' })), 200);
  actor = { ...users[0], role: 'VIEWER' };
  await status(kits.POST(request(validKit)), 403);
  await status(kit.PUT(request(validKit), kitParams), 403);
  await status(kit.DELETE(request(), kitParams), 403);
  await status(pendencies.POST(request(base)), 403);
  await status(pendency.PATCH(request({ title: 'Negada' }), params), 403);
  await status(pendency.DELETE(request(), params), 403);
  await status(office.PUT(request({ name: 'Negado' })), 403);
  actor = users[1];
  assert.equal((await status(kits.GET(request()), 200)).kits.length, 0);
  await status(kit.PUT(request({ ...validKit, templateIds: [templates[1].id] }), kitParams), 404);
  await status(pendency.GET(request(), params), 404);
  assert.equal((await status(pendencies.GET(request()), 200)).pendencies.length, 0);
  assert.equal(await prisma.legalKit.count(), 1);
  assert.equal(await prisma.clientPendency.count(), 1); checks++;
  const reviewChecks = await require('./document-review-integration.cjs')(prisma, users[0], users[1]);
  console.log(JSON.stringify({ passed: true, checks, reviewChecks, database: 'PostgreSQL local vazio com dois escritórios fictícios', providersCalled: false }));
}
main().catch((error) => { console.error(JSON.stringify({ passed: false, checks, errorType: error.name, message: error.message })); process.exitCode = 1; }).finally(() => prisma.$disconnect());
