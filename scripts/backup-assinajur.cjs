// Operação local autorizada: nunca restaura no banco remoto, não altera arquivos no Blob.
// Os relatórios públicos contêm somente totais. Conteúdo, hashes por registro e chaves ficam cifrados.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const ROOT = 'C:\\Users\\diego\\AssinaJur-Backups';
const PROJECT = 'ngprverpvbztptshbnsp';
const BLOB_HOST = 'zwfqx2grlcanbrrd.private.blob.vercel-storage.com';
const MAGIC = Buffer.from('ASJBACKUP1\n');
const mode = process.argv[2];
const run = process.argv[3];
const pgBin = process.argv[4];
let encryptionKey;

function ps(code, input) {
  return cp.execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from("$ProgressPreference='SilentlyContinue'; " + code, 'utf16le').toString('base64')], {
    input, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024,
  }).trim();
}
function dpapi(buffer, decrypt = false) {
  const action = decrypt ? 'Unprotect' : 'Protect';
  const script = `Add-Type -AssemblyName System.Security; $b=[Convert]::FromBase64String([Console]::In.ReadToEnd()); $r=[Security.Cryptography.ProtectedData]::${action}($b,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Write([Convert]::ToBase64String($r))`;
  return Buffer.from(ps(script, buffer.toString('base64')), 'base64');
}
const digest = (value) => crypto.createHash('sha256').update(value).digest('hex');
function seal(value, destination) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value);
  const nonce = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, nonce);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  fs.writeFileSync(destination, Buffer.concat([MAGIC, nonce, cipher.getAuthTag(), encrypted]), { flag: 'wx' });
  assert.equal(digest(unseal(destination)), digest(buffer), 'Falha na verificação da cópia cifrada');
  return { file: path.relative(run, destination), bytes: buffer.length, sha256: digest(buffer) };
}
function unseal(file) {
  const buffer = fs.readFileSync(file);
  assert(buffer.length >= MAGIC.length + 28 && buffer.subarray(0, MAGIC.length).equals(MAGIC), 'Formato de backup inválido');
  const offset = MAGIC.length;
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey, buffer.subarray(offset, offset + 12));
  decipher.setAuthTag(buffer.subarray(offset + 12, offset + 28));
  return Buffer.concat([decipher.update(buffer.subarray(offset + 28)), decipher.final()]);
}
function protectDirectory(directory) {
  fs.mkdirSync(directory, { recursive: true });
  const sid = ps('[Security.Principal.WindowsIdentity]::GetCurrent().User.Value');
  cp.execFileSync('icacls.exe', [directory, '/inheritance:r', '/grant:r', `*${sid}:(OI)(CI)F`, '*S-1-5-18:(OI)(CI)F'], { windowsHide: true, stdio: 'pipe' });
}
function checkRun() {
  assert(run && path.dirname(path.resolve(run)).toLowerCase() === ROOT.toLowerCase(), 'Destino fora da pasta autorizada');
  assert(/^snapshot-[0-9TZ-]+$/.test(path.basename(run)), 'Nome de snapshot inválido');
  assert(!fs.lstatSync(run).isSymbolicLink(), 'Links não são permitidos no destino');
  encryptionKey = dpapi(fs.readFileSync(path.join(run, 'backup-key.dpapi')), true);
}
function report(name, value) {
  const target = path.join(run, name + '.json');
  fs.writeFileSync(fs.existsSync(target) ? path.join(run, `${name}-${Date.now()}.json`) : target, JSON.stringify(value, null, 2), { flag: 'wx' });
  console.log(JSON.stringify(value));
}
function execute(binary, args, env, timeout = 180000) {
  const result = cp.spawnSync(path.join(pgBin, binary + '.exe'), args, {
    env, encoding: 'utf8', windowsHide: true, timeout, maxBuffer: 64 * 1024 * 1024,
    // O servidor Windows pode herdar pipes e impedir o retorno mesmo após pg_ctl sair.
    ...(binary === 'pg_ctl' ? { stdio: 'ignore' } : {}),
  });
  if (result.status !== 0 || result.error) {
    const name = `error-${Date.now()}.enc`;
    seal(JSON.stringify({ binary, status: result.status, error: result.error?.message, stderr: result.stderr, stdout: result.stdout }), path.join(run, name));
    throw new Error(`${binary} falhou; detalhes protegidos em ${name}`);
  }
  return (result.stdout || '').trim();
}
function baseEnv() {
  return Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('PG')));
}
function remoteEnv() {
  const content = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
  const match = content.match(/^POSTGRES_URL_NON_POOLING\s*=\s*(.+)$/m);
  assert(match, 'Conexão direta não configurada');
  const uri = new URL(match[1].trim().replace(/^["']|["']$/g, ''));
  assert.equal(uri.hostname, 'aws-0-us-east-2.pooler.supabase.com');
  assert.equal(uri.port, '5432');
  assert.equal(decodeURIComponent(uri.username), `postgres.${PROJECT}`);
  return { ...baseEnv(), PGHOST: uri.hostname, PGPORT: uri.port, PGUSER: decodeURIComponent(uri.username), PGPASSWORD: decodeURIComponent(uri.password), PGDATABASE: uri.pathname.slice(1), PGSSLMODE: 'require', PGCONNECT_TIMEOUT: '15', PGTZ: 'UTC', PGCLIENTENCODING: 'UTF8' };
}
function query(env, sql) {
  return JSON.parse(execute('psql', ['-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-c', sql], env));
}
const quoteIdentifier = (value) => '"' + value.replaceAll('"', '""') + '"';
const quoteLiteral = (value) => "'" + value.replaceAll("'", "''") + "'";
function summary(env) {
  return query(env, `SELECT json_build_object('clients',(SELECT count(*) FROM public."Client"),'documents',(SELECT count(*) FROM public."Document"),'completedDocuments',(SELECT count(*) FROM public."Document" WHERE status='CONCLUIDO'),'completedBatches',(SELECT count(DISTINCT "kitBatchId") FROM public."Document" WHERE status='CONCLUIDO'),'storageFiles',(SELECT count(*) FROM public."StorageFile"))`);
}
function fingerprints(env) {
  // Supabase usa 0; PostgreSQL local usa 1 por padrão. Padronizar somente a
  // representação textual da sessão, sem alterar os números armazenados.
  env = { ...env, PGOPTIONS: '-c extra_float_digits=0' };
  const tables = query(env, "SELECT json_agg(tablename ORDER BY tablename) FROM pg_tables WHERE schemaname='public'");
  return tables.map((table) => query(env, `SELECT json_build_object('table',${quoteLiteral(table)},'rows',count(*),'sha256',encode(sha256(convert_to(coalesce(string_agg(row_hash,'' ORDER BY row_hash),''),'UTF8')),'hex')) FROM (SELECT encode(sha256(convert_to(row_to_json(t)::text,'UTF8')),'hex') AS row_hash FROM public.${quoteIdentifier(table)} t) hashes`));
}

async function main() {
  if (mode === 'init') {
    assert(!run, 'Inicialização não aceita destino arbitrário');
    protectDirectory(ROOT);
    const destination = path.join(ROOT, 'snapshot-' + new Date().toISOString().replaceAll(':', '-').replace(/\.\d+Z$/, 'Z'));
    fs.mkdirSync(destination);
    encryptionKey = crypto.randomBytes(32);
    fs.writeFileSync(path.join(destination, 'backup-key.dpapi'), dpapi(encryptionKey), { flag: 'wx' });
    // Transporte da credencial do navegador ao processo local sem exibi-la na conversa.
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048, publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } });
    // seal requer o caminho da execução para o manifesto; a chave de transporte é pequena.
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(privateKey), cipher.final()]);
    fs.writeFileSync(path.join(destination, 'transport-key.enc'), Buffer.concat([MAGIC, iv, cipher.getAuthTag(), encrypted]), { flag: 'wx' });
    fs.writeFileSync(path.join(destination, 'transport-public.pem'), publicKey, { flag: 'wx' });
    console.log(JSON.stringify({ runDirectory: destination, publicKey }));
    return;
  }
  checkRun();
  if (mode === 'diagnose') {
    for (const file of fs.readdirSync(run).filter((name) => /^(error|failure)-.*\.enc$/.test(name))) {
      const detail = JSON.parse(unseal(path.join(run, file)));
      const message = String(detail.message || detail.stderr || detail.error || '');
      console.log(JSON.stringify({ file, binary: detail.binary, status: detail.status,
        categories: ['pg_ctl', 'createdb', 'pg_restore', 'permission denied', 'does not exist', 'already exists', 'could not', 'timeout', 'Conteúdo restaurado', 'Hash do documento', 'Tamanho do arquivo', 'Arquivo referenciado'].filter((term) => message.includes(term)),
        operationalErrors: message.split('\n').filter((line) => /ERROR:|FATAL:/.test(line)).map((line) => line.replace(/"[^"]*"|'[^']*'/g, '[identificador]')).slice(0, 5) }));
    }
  } else if (mode === 'self-test') {
    const value = crypto.randomBytes(1024 * 1024);
    const file = path.join(run, 'encryption-test.enc');
    seal(value, file);
    assert.deepEqual(unseal(file), value);
    const changed = fs.readFileSync(file); changed[changed.length - 1] ^= 1;
    const corrupt = path.join(run, 'encryption-corrupt-test.enc'); fs.writeFileSync(corrupt, changed, { flag: 'wx' });
    assert.throws(() => unseal(corrupt));
    report('encryption-check', { encryptionRoundTrip: true, tamperRejected: true, keyProtection: 'Windows DPAPI CurrentUser', cipher: 'AES-256-GCM' });
  } else if (mode === 'capture-db') {
    const env = remoteEnv();
    const current = summary(env);
    assert(current.clients >= 20 && current.documents >= 8 && current.completedBatches >= 2, 'A conexão não corresponde ao inventário esperado');
    const before = fingerprints(env);
    const work = path.join(run, 'work'); fs.mkdirSync(work, { recursive: true });
    const artifacts = [];
    for (const [name, args] of [['database-full', []], ['application-public', ['--schema=public']]]) {
      const file = path.join(work, name + '.dump');
      execute('pg_dump', ['--format=custom', '--lock-wait-timeout=15s', '--file', file, ...args], env);
      artifacts.push(seal(fs.readFileSync(file), path.join(run, name + '.dump.enc')));
      fs.unlinkSync(file);
    }
    const after = fingerprints(env);
    assert.deepEqual(after, before, 'Banco mudou durante a cópia; repetir em um novo snapshot');
    const files = query(env, `SELECT coalesce(json_agg(json_build_object('id',id,'key',"storageKey",'bytes',"sizeBytes") ORDER BY id),'[]'::json) FROM public."StorageFile"`);
    const documents = query(env, `SELECT coalesce(json_agg(json_build_object('id',id,'status',status,'originalFileId',"originalFileId",'signedFileId',"signedFileId",'originalHash',"originalHash",'signedHash',"signedHash") ORDER BY id),'[]'::json) FROM public."Document"`);
    seal(JSON.stringify({ capturedAt: new Date().toISOString(), summary: current, fingerprints: before, files, documents, artifacts }), path.join(run, 'database-manifest.enc'));
    report('database-summary', { capturedAt: new Date().toISOString(), ...current, applicationTables: before.length, unchangedDuringCapture: true, fullDatabaseDumpEncrypted: true, publicSchemaDumpEncrypted: true });
  } else if (mode === 'capture-blobs') {
    const ciphertext = fs.readFileSync(path.join(run, 'blob-token.rsa'));
    const token = crypto.privateDecrypt({ key: unseal(path.join(run, 'transport-key.enc')), oaepHash: 'sha256', padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, ciphertext).toString('utf8');
    assert(/^vercel_blob_rw_/i.test(token), 'Credencial do armazenamento inválida');
    const { list, get } = require('@vercel/blob');
    async function inventory() {
      const result = []; let cursor;
      do {
        const page = await list({ token, cursor, limit: 1000 });
        result.push(...page.blobs);
        cursor = page.hasMore ? page.cursor : undefined;
        assert(!page.hasMore || cursor, 'Paginação incompleta');
      } while (cursor);
      return result.sort((a, b) => a.pathname.localeCompare(b.pathname));
    }
    const before = await inventory();
    assert(before.length > 0 && before.every((item) => new URL(item.url).hostname === BLOB_HOST), 'Armazenamento inesperado');
    const totalSize = before.reduce((sum, item) => sum + item.size, 0);
    assert(totalSize < 1024 * 1024 * 1024, 'Volume acima do escopo de 1 GB; revisar antes de copiar');
    const destination = path.join(run, 'blobs'); fs.mkdirSync(destination);
    const manifest = [];
    for (const item of before) {
      const result = await get(item.url, { access: 'private', token, useCache: false });
      assert(result?.statusCode === 200 && result.stream, 'Arquivo ausente no armazenamento');
      const chunks = []; for await (const chunk of result.stream) chunks.push(Buffer.from(chunk));
      const buffer = Buffer.concat(chunks);
      assert.equal(buffer.length, item.size, 'Arquivo mudou de tamanho durante a cópia');
      const file = path.join(destination, digest(item.pathname) + '.enc');
      manifest.push({ key: item.pathname, etag: item.etag, uploadedAt: item.uploadedAt, ...seal(buffer, file) });
      if (manifest.length % 20 === 0) console.log(JSON.stringify({ copiedFiles: manifest.length, totalFiles: before.length }));
    }
    const signature = (items) => items.map(({ pathname, size, etag, uploadedAt }) => ({ pathname, size, etag, uploadedAt }));
    assert.deepEqual(signature(await inventory()), signature(before), 'Armazenamento mudou durante a cópia');
    seal(JSON.stringify(manifest), path.join(run, 'blobs-manifest.enc'));
    report('blobs-summary', { capturedAt: new Date().toISOString(), files: manifest.length, bytes: totalSize, encryptedAndReadBack: true, unchangedDuringCapture: true });
  } else if (mode === 'restore-test' || mode === 'homologate') {
    const db = JSON.parse(unseal(path.join(run, 'database-manifest.enc')));
    const blobs = JSON.parse(unseal(path.join(run, 'blobs-manifest.enc')));
    const work = path.join(run, mode === 'homologate' ? 'work-homologation' : 'work'); fs.mkdirSync(work, { recursive: true });
    const cluster = path.join(work, 'restore-cluster');
    assert(!fs.existsSync(cluster), 'Cluster de teste já existe; não sobrescrever');
    const password = crypto.randomBytes(32).toString('hex');
    const passwordFile = path.join(work, 'restore-password.tmp');
    fs.writeFileSync(passwordFile, password, { flag: 'wx' });
    const local = { ...baseEnv(), PGHOST: '127.0.0.1', PGPORT: '55483', PGUSER: 'backup_restore', PGPASSWORD: password, PGDATABASE: 'backup_restore_db', PGCONNECT_TIMEOUT: '10', PGTZ: 'UTC', PGCLIENTENCODING: 'UTF8', PGSSLMODE: 'disable' };
    // Destino fixo de teste. Não aceita URL, host, porta ou banco remoto como argumento.
    assert.equal(local.PGHOST, '127.0.0.1');
    execute('initdb', ['-D', cluster, '-U', 'backup_restore', '--pwfile', passwordFile, '--auth=scram-sha-256', '--encoding=UTF8', '--locale=C'], baseEnv());
    fs.unlinkSync(passwordFile);
    const dump = unseal(path.join(run, 'application-public.dump.enc'));
    assert.equal(digest(dump), db.artifacts.find((item) => item.file === 'application-public.dump.enc').sha256);
    const dumpFile = path.join(work, 'restore.dump'); fs.writeFileSync(dumpFile, dump, { flag: 'wx' });
    let started = false;
    try {
      execute('pg_ctl', ['-D', cluster, '-l', path.join(work, 'postgres.log'), '-o', '-h 127.0.0.1 -p 55483', '-w', 'start'], baseEnv());
      started = true;
      if (mode === 'homologate') {
        const testEnv = { ...local, PGDATABASE: 'security_integration_db' };
        execute('createdb', ['--template=template0', 'security_integration_db'], { ...local, PGDATABASE: 'postgres' });
        execute('pg_restore', ['--schema-only', '--clean', '--if-exists', '--no-owner', '--no-acl', '--exit-on-error', '--dbname=security_integration_db', dumpFile], testEnv);
        const result = cp.spawnSync(process.execPath, [path.join(__dirname, 'security-postgres-integration.cjs')], {
          env: { ...baseEnv(), ASSINAJUR_TEST_DATABASE_URL: `postgresql://backup_restore:${password}@127.0.0.1:55483/security_integration_db` },
          encoding: 'utf8', windowsHide: true, timeout: 120000,
        });
        assert.equal(result.status, 0, 'Homologação PostgreSQL falhou: ' + result.stdout + result.stderr);
        report('integration-summary', JSON.parse(result.stdout.trim()));
        return;
      }
      execute('createdb', ['--template=template0', 'backup_restore_db'], { ...local, PGDATABASE: 'postgres' });
      execute('pg_restore', ['--clean', '--if-exists', '--no-owner', '--no-acl', '--exit-on-error', '--dbname=backup_restore_db', dumpFile], local);
      const restored = fingerprints(local);
      const differentTables = restored.filter((item) => {
        const source = db.fingerprints.find((entry) => entry.table === item.table);
        return !source || item.rows !== source.rows || item.sha256 !== source.sha256;
      }).map((item) => ({ table: item.table, restoredRows: item.rows, sourceRows: db.fingerprints.find((entry) => entry.table === item.table)?.rows }));
      console.log(JSON.stringify({ differentTables }));
      if (differentTables.length) {
        const sourceEnv = remoteEnv();
        for (const item of differentTables) {
          const columns = query(local, `SELECT json_agg(json_build_object('name',column_name,'type',data_type) ORDER BY ordinal_position) FROM information_schema.columns WHERE table_schema='public' AND table_name=${quoteLiteral(item.table)}`);
          for (const column of columns) {
            const col = quoteIdentifier(column.name);
            const hashSql = (expression) => `SELECT json_build_object('hash',encode(sha256(convert_to(coalesce(string_agg(v,'' ORDER BY v),''),'UTF8')),'hex')) FROM (SELECT encode(sha256(convert_to(coalesce(${expression},'NULL'),'UTF8')),'hex') AS v FROM public.${quoteIdentifier(item.table)}) rows`;
            const textSql = hashSql(`${col}::text`);
            if (query(local, textSql).hash !== query(sourceEnv, textSql).hash) {
              const binarySql = column.type === 'double precision' ? hashSql(`encode(float8send(${col}),'hex')`) : null;
              console.log(JSON.stringify({ differentColumn: column.name, type: column.type, binaryEqual: binarySql ? query(local, binarySql).hash === query(sourceEnv, binarySql).hash : null }));
              const valuesSql = `SELECT json_agg(json_build_object('id',id,'value',${col}::text)) FROM public.${quoteIdentifier(item.table)}`;
              const sourceValues = query(sourceEnv, valuesSql);
              const targetValues = query(local, valuesSql);
              const differences = sourceValues.filter((entry) => targetValues.find((other) => other.id === entry.id)?.value !== entry.value);
              console.log(JSON.stringify({ column: column.name, differingRows: differences.length, sourceFloatDigits: query(sourceEnv, "SELECT json_build_object('digits',current_setting('extra_float_digits'))").digits, localFloatDigits: query(local, "SELECT json_build_object('digits',current_setting('extra_float_digits'))").digits }));
            }
          }
        }
      }
      assert.deepEqual(restored, db.fingerprints, 'Conteúdo restaurado diverge do inventário original');
      let validatedFiles = 0;
      for (const entry of blobs) {
        const buffer = unseal(path.join(run, entry.file));
        assert.equal(buffer.length, entry.bytes); assert.equal(digest(buffer), entry.sha256); validatedFiles++;
      }
      const byKey = new Map(blobs.map((item) => [item.key, item]));
      const byId = new Map(db.files.map((item) => [item.id, item]));
      for (const file of db.files) {
        const archived = byKey.get(file.key);
        assert(archived, 'Arquivo referenciado pelo banco ausente da cópia');
        assert.equal(archived.bytes, file.bytes, 'Tamanho do arquivo diverge do cadastro');
      }
      let validatedDocumentFiles = 0;
      for (const document of db.documents) {
        for (const [id, expectedHash] of [[document.originalFileId, document.originalHash], [document.signedFileId, document.signedHash]]) {
          if (!id) { assert(document.status !== 'CONCLUIDO', 'Documento concluído sem arquivo assinado'); continue; }
          const file = byId.get(id); assert(file, 'Registro do arquivo do documento ausente');
          assert.equal(byKey.get(file.key)?.sha256, expectedHash, 'Hash do documento difere do arquivo armazenado');
          validatedDocumentFiles++;
        }
      }
      assert.deepEqual(summary(local), db.summary);
      report('restore-summary', { completedAt: new Date().toISOString(), restoredApplicationTables: restored.length, allApplicationRowsMatch: true, ...db.summary, archivedFilesReadAndVerified: validatedFiles, referencedFilesVerified: db.files.length, documentFileHashesVerified: validatedDocumentFiles, destination: 'Local isolated PostgreSQL, loopback only', sourceDatabaseModified: false });
    } finally {
      if (started) execute('pg_ctl', ['-D', cluster, '-m', 'fast', '-w', 'stop'], baseEnv());
      const resolvedWork = fs.realpathSync(work);
      assert.equal(path.dirname(resolvedWork).toLowerCase(), fs.realpathSync(run).toLowerCase());
      assert(['work', 'work-homologation'].includes(path.basename(resolvedWork)));
      assert(!fs.existsSync(path.join(cluster, 'postmaster.pid')), 'Servidor ainda ativo');
      fs.rmSync(resolvedWork, { recursive: true });
    }
  } else if (mode === 'compatibility') {
    const result = query(remoteEnv(), `SELECT json_build_object(
      'kitItemsFromOtherOffice',(SELECT count(*) FROM public."KitItem" i JOIN public."LegalKit" k ON k.id=i."kitId" JOIN public."Template" t ON t.id=i."templateId" WHERE k."officeId"<>t."officeId"),
      'pendenciesWithExternalClient',(SELECT count(*) FROM public."ClientPendency" p JOIN public."Client" c ON c.id=p."clientId" WHERE p."officeId"<>c."officeId"),
      'pendenciesWithExternalResponsible',(SELECT count(*) FROM public."ClientPendency" p JOIN public."User" u ON u.id=p."responsibleId" WHERE p."officeId"<>u."officeId"),
      'activeAdministrators',(SELECT count(*) FROM public."User" u JOIN public."Office" o ON o.id=u."officeId" WHERE u.active AND o.active AND u.role='OFFICE_ADMIN'))`);
    assert.equal(result.kitItemsFromOtherOffice, 0);
    assert.equal(result.pendenciesWithExternalClient, 0);
    assert.equal(result.pendenciesWithExternalResponsible, 0);
    assert(result.activeAdministrators > 0);
    report('compatibility-summary', result);
  } else if (mode === 'compare-live') {
    const db = JSON.parse(unseal(path.join(run, 'database-manifest.enc')));
    const current = fingerprints(remoteEnv());
    console.log(JSON.stringify({ differentTables: current.filter((item) => {
      const saved = db.fingerprints.find((entry) => entry.table === item.table);
      return !saved || saved.rows !== item.rows || saved.sha256 !== item.sha256;
    }).map((item) => ({ table: item.table, currentRows: item.rows, savedRows: db.fingerprints.find((entry) => entry.table === item.table)?.rows })) }));
    assert.deepEqual(current, db.fingerprints, 'Banco atual diverge do backup; revisar antes de publicar');
    console.log(JSON.stringify({ allApplicationTablesUnchanged: true, ...summary(remoteEnv()) }));
  } else {
    throw new Error('Modo esperado: init, self-test, capture-db, capture-blobs, restore-test ou compare-live');
  }
}
main().catch((error) => {
  // Erros de provedores podem conter informações privadas; não imprimir mensagens arbitrárias.
  if (run && encryptionKey && fs.existsSync(run)) {
    const file = path.join(run, `failure-${Date.now()}.enc`);
    seal(JSON.stringify({ message: error.message, stack: error.stack }), file);
    console.error(JSON.stringify({ failed: true, mode, protectedDetails: path.basename(file) }));
  } else console.error(JSON.stringify({ failed: true, mode, errorType: error.name, setupError: mode === 'init' ? error.message : undefined }));
  process.exitCode = 1;
});
