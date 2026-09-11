// Handlers reais, banco e cookies simulados; sem carregar .env ou acessar serviços.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const jwt = require('jsonwebtoken');
const root = path.resolve(__dirname, '..');

function load(file, dependencies = {}, env = {}) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    module, exports: module.exports, process: { env }, Buffer, URL, Response,
    console: { ...console, error: () => {} },
    require(id) {
      if (id === '@/lib/participant-qualification') return load('src/lib/participant-qualification.ts');
      if (id === '@/lib/participant-groups') return load('src/lib/participant-groups.ts');
      if (id === '@/lib/signer-stamps') return load('src/lib/signer-stamps.ts');
      if (id === 'next/server') return { NextResponse: Response };
      if (Object.hasOwn(dependencies, id)) return dependencies[id];
      throw new Error(`Dependência não simulada bloqueada: ${id}`);
    },
  }, { filename: file });
  return module.exports;
}

const secret = 'chave-ficticia-exclusiva-dos-testes-000000000';
const actor = { id: 'user-a', officeId: 'office-a', name: 'Teste', email: 'teste@example.invalid', role: 'OFFICE_ADMIN' };
const payload = { userId: actor.id, officeId: actor.officeId, email: actor.email, role: actor.role };
const request = (body) => new Request('https://example.invalid/api', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
const audit = { logAuditEvent: async () => {} };
const kitSecurity = load('src/lib/kit-security.ts');
const matches = (row, where) => Object.entries(where).every(([key, value]) => {
  if (value && typeof value === 'object' && 'in' in value) return value.in.includes(row[key]);
  return row[key] === value;
});

test('publicação gera o cliente e compila, sem sincronizar ou apagar banco', () => {
  const { scripts } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(scripts.build, 'prisma generate && next build');
  assert.equal(scripts.prebuild, 'npm run test:security');
  assert.equal(scripts.postbuild, undefined);
});

for (const env of [{}, { JWT_SECRET: '   ' }]) {
  test(`configuração sem chave utilizável recusa emissão (${JSON.stringify(env)})`, () => {
    const config = load('src/lib/server-config.ts', {}, env);
    assert.throws(() => config.getJwtSecret(), /JWT_SECRET/);
  });
}

test('conexão ausente falha sem escolher um banco alternativo embutido', () => {
  let constructed = false;
  const config = load('src/lib/server-config.ts');
  assert.throws(() => load('src/lib/prisma.ts', {
    './server-config': config,
    '@prisma/client': { PrismaClient: class { constructor() { constructed = true; } } },
  }), /banco não configurada/);
  assert.equal(constructed, false);
});

test('conexão configurada mantém prioridade e compatibilidade dos nomes existentes', () => {
  const env = { POSTGRES_PRISMA_URL: 'postgresql://pool.invalid/db', DATABASE_URL: 'postgresql://dev.invalid/db', POSTGRES_URL: 'postgresql://legacy.invalid/db' };
  const config = load('src/lib/server-config.ts', {}, env);
  assert.equal(config.getDatabaseUrl(), env.POSTGRES_PRISMA_URL);
  delete env.POSTGRES_PRISMA_URL;
  assert.equal(config.getDatabaseUrl(), env.DATABASE_URL);
  delete env.DATABASE_URL;
  assert.equal(config.getDatabaseUrl(), env.POSTGRES_URL);
});

function authModule({ env = { JWT_SECRET: secret }, token, user } = {}) {
  return load('src/lib/auth.ts', {
    './server-config': load('src/lib/server-config.ts', {}, env),
    './prisma': { prisma: { user: { findUnique: async () => user } } },
    'next/headers': { cookies: () => ({ get: () => token ? { value: token } : undefined }) },
    bcryptjs: {}, jsonwebtoken: jwt,
  }, env);
}

test('sessão anterior HS256 continua válida com a mesma chave configurada', () => {
  const token = jwt.sign(payload, secret, { expiresIn: '7d' });
  const decoded = authModule().verifyToken(token);
  assert.equal(decoded.userId, actor.id);
  assert.equal(decoded.officeId, actor.officeId);
  assert.equal(authModule().verifyToken(authModule().signToken(payload)).userId, actor.id);
});

test('ausência de chave impede inicialização da autenticação', () => {
  assert.throws(() => authModule({ env: {} }), /JWT_SECRET/);
});

for (const [name, token] of [
  ['assinatura falsificada', jwt.sign(payload, 'outra-chave-ficticia')],
  ['token expirado', jwt.sign(payload, secret, { expiresIn: -1 })],
  ['algoritmo diferente', jwt.sign(payload, secret, { algorithm: 'HS384' })],
  ['estado OAuth usado como sessão', jwt.sign({ officeId: actor.officeId, userId: actor.id, action: 'google_drive_connect' }, secret)],
  ['cargo desconhecido', jwt.sign({ ...payload, role: 'ROOT' }, secret)],
]) {
  test(`sessão recusa ${name}`, () => assert.equal(authModule().verifyToken(token), null));
}

const activeUser = { ...actor, active: true, office: { name: 'Escritório A', active: true }, permissions: [] };
for (const [name, user, allowed] of [
  ['usuário ativo', activeUser, true],
  ['usuário de outro escritório', { ...activeUser, officeId: 'office-b' }, false],
  ['usuário inativo', { ...activeUser, active: false }, false],
  ['escritório inativo', { ...activeUser, office: { active: false } }, false],
  ['escritório ausente', { ...activeUser, office: null }, false],
]) {
  test(`resolução de sessão: ${name}`, async () => {
    const auth = authModule({ token: jwt.sign(payload, secret), user });
    assert.equal(Boolean(await auth.getSessionUser()), allowed);
  });
}

function kitRoute(file, user = actor) {
  const writes = [];
  const templates = [
    { id: 'template-a', officeId: 'office-a', active: true },
    { id: 'template-b', officeId: 'office-b', active: true },
    { id: 'template-inactive', officeId: 'office-a', active: false },
  ];
  const save = async (args) => { writes.push(args); return { id: 'kit-a', name: 'Kit' }; };
  const tx = {
    template: { count: async ({ where }) => templates.filter((t) => matches(t, where)).length },
    legalKit: { create: save, update: save }, kitItem: { create: save, deleteMany: save },
  };
  const prisma = {
    $transaction: async (callback) => callback(tx),
    legalKit: { findFirst: async ({ where }) => matches({ id: 'kit-a', officeId: 'office-a' }, where) ? { id: 'kit-a' } : null, update: save },
  };
  return { writes, routes: load(file, {
    '@/lib/kit-security': kitSecurity, '@/lib/prisma': { prisma },
    '@/lib/auth': { getSessionUser: async () => user }, '@/lib/audit': audit,
    '@/lib/defaultLegalLibrary': { ensureDefaultLegalLibrary: async () => {} },
  }) };
}

for (const method of ['POST', 'PUT']) {
  const file = method === 'POST' ? 'src/app/api/kits/route.ts' : 'src/app/api/kits/[id]/route.ts';
  for (const [name, ids, expected] of [
    ['modelo do próprio escritório', ['template-a'], 200],
    ['modelo externo', ['template-b'], 400],
    ['mistura de modelos próprios e externos', ['template-a', 'template-b'], 400],
    ['modelo inativo', ['template-inactive'], 400],
    ['modelo inexistente', ['missing'], 400],
    ['modelos duplicados', ['template-a', 'template-a'], 400],
    ['identificador malformado', [{}], 400],
    ['lista vazia', [], 400],
  ]) {
    test(`kit ${method}: ${name}`, async () => {
      const { routes, writes } = kitRoute(file);
      const response = await routes[method](request({ name: 'Kit', templateIds: ids }), { params: { id: 'kit-a' } });
      assert.equal(response.status, expected);
      assert.equal(writes.length > 0, expected === 200, 'nenhuma alteração antes de validar todos os modelos');
    });
  }
}

function pendencyRoute(file, user = actor) {
  const writes = [];
  const existing = { id: 'pendency-a', officeId: 'office-a', status: 'PARA_FAZER', responsibleId: 'user-a' };
  const clients = [{ id: 'client-a', officeId: 'office-a' }, { id: 'client-b', officeId: 'office-b' }];
  const users = [activeUser, { id: 'user-b', officeId: 'office-b', active: true }, { id: 'inactive', officeId: 'office-a', active: false }];
  const save = async (args) => { writes.push(args); return { ...existing, ...args.data }; };
  const prisma = {
    client: { findFirst: async ({ where }) => clients.find((row) => matches(row, where)) || null },
    user: { findFirst: async ({ where }) => users.find((row) => matches(row, where)) || null },
    clientPendency: {
      findFirst: async ({ where }) => matches(existing, where) ? existing : null,
      create: save, update: save, delete: save,
    },
  };
  return { writes, routes: load(file, { '@/lib/prisma': { prisma }, '@/lib/auth': { getSessionUser: async () => user } }) };
}

for (const method of ['POST', 'PATCH']) {
  const file = method === 'POST' ? 'src/app/api/pendencias/route.ts' : 'src/app/api/pendencias/[id]/route.ts';
  for (const [name, body, expected] of [
    ['vínculos próprios', { clientId: 'client-a', responsibleId: 'user-a' }, method === 'POST' ? 201 : 200],
    ['cliente externo', { clientId: 'client-b' }, 404],
    ['responsável externo', { responsibleId: 'user-b' }, 404],
    ['responsável inativo', { responsibleId: 'inactive' }, 404],
    ['cliente inexistente', { clientId: 'missing' }, 404],
    ['referência malformada', { responsibleId: {} }, 400],
    ['prazo inválido', { dueDate: 'nao-e-data' }, 400],
    ['sem cliente associado', { clientId: null }, method === 'POST' ? 201 : 200],
  ]) {
    test(`pendência ${method}: ${name}`, async () => {
      const { routes, writes } = pendencyRoute(file);
      const response = await routes[method](request({ title: 'Teste', ...body }), { params: { id: 'pendency-a' } });
      assert.equal(response.status, expected);
      assert.equal(writes.length > 0, expected < 300);
    });
  }
}

for (const method of ['GET', 'PATCH', 'DELETE']) {
  test(`pendência ${method}: outro escritório não acessa nem altera o registro`, async () => {
    const { routes, writes } = pendencyRoute('src/app/api/pendencias/[id]/route.ts', { ...actor, officeId: 'office-b' });
    const response = await routes[method](request({ title: 'Teste' }), { params: { id: 'pendency-a' } });
    assert.equal(response.status, 404);
    assert.equal(writes.length, 0);
  });
}

for (const [file, method, loader] of [
  ['src/app/api/kits/route.ts', 'POST', kitRoute],
  ['src/app/api/kits/[id]/route.ts', 'PUT', kitRoute],
  ['src/app/api/kits/[id]/route.ts', 'DELETE', kitRoute],
  ['src/app/api/pendencias/route.ts', 'POST', pendencyRoute],
  ['src/app/api/pendencias/[id]/route.ts', 'PATCH', pendencyRoute],
  ['src/app/api/pendencias/[id]/route.ts', 'DELETE', pendencyRoute],
]) {
  for (const [name, user, status] of [['visualizador', { ...actor, role: 'VIEWER' }, 403], ['sem sessão', null, 401]]) {
    test(`${name} não altera ${file} ${method}`, async () => {
      const { routes, writes } = loader(file, user);
      const response = await routes[method](request({ name: 'Kit', templateIds: ['template-a'], title: 'Teste' }), { params: { id: method === 'PATCH' ? 'pendency-a' : 'kit-a' } });
      assert.equal(response.status, status);
      assert.equal(writes.length, 0);
    });
  }
}

for (const role of ['OFFICE_ADMIN', 'LAWYER', 'STAFF', 'VIEWER']) {
  test(`configurações institucionais: cargo ${role}`, async () => {
    let saved = false;
    const routes = load('src/app/api/office/route.ts', {
      '@/lib/auth': { getSessionUser: async () => ({ ...actor, role }) }, '@/lib/audit': audit,
      '@/lib/prisma': { prisma: { office: { update: async () => { saved = true; return {}; } } } },
    });
    const response = await routes.PUT(request({ name: 'Escritório' }));
    assert.equal(response.status, role === 'OFFICE_ADMIN' ? 200 : 403);
    assert.equal(saved, role === 'OFFICE_ADMIN');
  });
}

test('listagem de kits omite kit com vínculo legado de outro escritório', async () => {
  const fixtures = [
    { id: 'kit-a', officeId: 'office-a', active: true, items: [{ template: { officeId: 'office-a', contentHtml: 'próprio' } }] },
    { id: 'kit-corrompido', officeId: 'office-a', active: true, items: [{ template: { officeId: 'office-b', contentHtml: 'restrito' } }] },
    { id: 'kit-b', officeId: 'office-b', active: true, items: [{ template: { officeId: 'office-b', contentHtml: 'restrito' } }] },
  ];
  const routes = load('src/app/api/kits/route.ts', {
    '@/lib/kit-security': kitSecurity, '@/lib/auth': { getSessionUser: async () => actor }, '@/lib/audit': audit,
    '@/lib/defaultLegalLibrary': { ensureDefaultLegalLibrary: async () => {} },
    '@/lib/prisma': { prisma: { legalKit: { findMany: async ({ where }) => fixtures.filter((kit) =>
      (!where.officeId || kit.officeId === where.officeId) &&
      (!where.items?.every?.template?.officeId || kit.items.every((item) => item.template.officeId === where.items.every.template.officeId))
    ) } } },
  });
  const response = await routes.GET(request({}));
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(data.kits.map((kit) => kit.id), ['kit-a']);
});

for (const [name, kit, user, expected] of [
  ['vínculo legado externo', { active: true, items: [{ template: { officeId: 'office-b', active: true } }] }, actor, 400],
  ['modelo inativo', { active: true, items: [{ template: { officeId: 'office-a', active: false } }] }, actor, 400],
  ['kit inativo', { active: false, items: [{ template: { officeId: 'office-a', active: true } }] }, actor, 400],
  ['visualizador', null, { ...actor, role: 'VIEWER' }, 403],
]) {
  test(`geração não cria documentos para ${name}`, async () => {
    let sideEffect = false;
    const blocked = () => { sideEffect = true; throw new Error('Efeito inesperado'); };
    const routes = load('src/app/api/kits/generate-package/route.ts', {
      '@/lib/auth': { getSessionUser: async () => user }, '@/lib/audit': { logAuditEvent: blocked },
      '@/lib/templateCompiler': { compileTemplateToPdf: blocked },
      '@/lib/documentLetterhead': { getDocumentLetterheadBuffer: blocked },
      '@/lib/kitTemplateNormalization': {}, crypto: { randomUUID: blocked },
      '@/lib/prisma': { prisma: {
        client: { findFirst: async () => ({ id: 'client-a', name: 'Fictício' }) },
        office: { findUnique: async () => ({ id: 'office-a' }) },
        legalKit: { findFirst: async () => kit },
        user: { findMany: blocked }, document: { create: blocked },
      } },
    });
    const response = await routes.POST(request({ clientId: 'client-a', kitId: 'kit-a' }));
    assert.equal(response.status, expected);
    assert.equal(sideEffect, false);
  });
}
