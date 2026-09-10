// Auditoria local. Todas as dependências de banco/sessão são doubles, sem rede.
const fs = require('fs');
const ts = require('typescript');
function load(file, deps) {
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', js)((id) => {
    if (id === 'next/server') return { NextResponse: Response };
    if (Object.hasOwn(deps, id)) return deps[id];
    throw new Error('Dependência real bloqueada: ' + id);
  }, module, module.exports);
  return module.exports;
}
const results = [];
const check = (name, reproduced, evidence) => { results.push({ name, reproduzido: reproduced, evidence }); if (!reproduced) process.exitCode = 1; };
const user = { id: 'usuario-ficticio', officeId: 'escritorio-a', name: 'Auditoria', role: 'VIEWER' };
const auth = { getSessionUser: async () => user };
const audit = { logAuditEvent: async () => {} };
const req = (body) => new Request('http://audit.local', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
(async () => {
  let savedOffice;
  const office = load('src/app/api/office/route.ts', { '@/lib/auth': auth, '@/lib/audit': audit, '@/lib/prisma': { prisma: { office: { update: async (args) => { savedOffice = args; return args.data; } } } } });
  let response = await office.PUT(req({ name: 'Alterado por observador' }));
  check('VIEWER pode alterar dados institucionais', response.status === 200 && savedOffice.data.name === 'Alterado por observador', { status: response.status });
  let savedPendency;
  const pendency = load('src/app/api/pendencias/[id]/route.ts', { '@/lib/auth': auth, '@/lib/prisma': { prisma: { clientPendency: { findFirst: async () => ({ id: 'pendencia-a', status: 'PARA_FAZER' }), update: async (args) => { savedPendency = args; return { client: { name: 'Cliente externo ficticio' } }; } } } } });
  response = await pendency.PATCH(req({ clientId: 'cliente-de-outro-escritorio' }), { params: { id: 'pendencia-a' } });
  check('Pendência aceita vínculo externo sem validar cliente', response.status === 200 && savedPendency.data.clientId === 'cliente-de-outro-escritorio' && savedPendency.include.client.select.cpfCnpj, { status: response.status, foreignIdAccepted: true, includesCpf: savedPendency.include.client.select.cpfCnpj });
  let savedItem;
  const tx = { legalKit: { create: async () => ({ id: 'kit-a', name: 'Ficticio' }) }, kitItem: { create: async (args) => { savedItem = args; return args.data; } } };
  const kit = load('src/app/api/kits/route.ts', { '@/lib/auth': auth, '@/lib/audit': audit, '@/lib/defaultLegalLibrary': { ensureDefaultLegalLibrary: async () => {} }, '@/lib/prisma': { prisma: { $transaction: async (callback) => callback(tx) } } });
  response = await kit.POST(req({ name: 'Ficticio', templateIds: ['modelo-de-outro-escritorio'] }));
  check('Kit aceita modelo externo sem consulta de titularidade', response.status === 200 && savedItem.data.templateId === 'modelo-de-outro-escritorio', { status: response.status });
  const normalization = load('src/lib/kitTemplateNormalization.ts', {});
  const normalized = normalization.ensureClientQualificationTokens('<p>Texto</p><img src="x" onerror="void(0)">', 'Teste', 'OUTRO');
  check('Normalização preserva atributo executável no HTML', normalized.includes('onerror='), { attributePreserved: normalized.includes('onerror='), note: 'Não executa JavaScript em navegador; a inserção innerHTML foi inspecionada no código.' });
  console.log(JSON.stringify({ scope: 'Handlers reais transpilados; banco e sessão simulados. Não comprova exploração em produção.', checks: results.length, results }, null, 2));
})().catch((error) => { console.error(error); process.exitCode = 1; });
