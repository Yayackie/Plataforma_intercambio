const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { DatabaseSync } = require('node:sqlite');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');
const database = new DatabaseSync(':memory:');
database.exec(`CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, career TEXT, semester INTEGER,
  role TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL)`);
function prepare(sql) {
  let values = [];
  return { bind(...args) { values = args; return this; },
    async first() { return database.prepare(sql).get(...values) ?? null; },
    async all() { return { results: database.prepare(sql).all(...values) }; },
    async run() { const result = database.prepare(sql).run(...values); return { meta: { changes: result.changes, last_row_id: Number(result.lastInsertRowid) } }; }
  };
}
const DB = { prepare, async batch(statements) {
  database.exec('BEGIN');
  try { const result = []; for (const statement of statements) result.push(await statement.run()); database.exec('COMMIT'); return result; }
  catch (error) { database.exec('ROLLBACK'); throw error; }
} };
const modules = {};
function load(name) {
  if (modules[name]) return modules[name];
  const exports = {}; modules[name] = exports;
  const source = ts.transpileModule(readFileSync(`lib/${name}.ts`, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(source, { exports, require(path) {
    if (path === 'server-only') return {};
    if (path === 'cloudflare:workers') return { env: { DB } };
    if (path.startsWith('./')) return load(path.slice(2));
    throw new Error(path);
  }, crypto: globalThis.crypto, TextEncoder, URL });
  return exports;
}
(async () => {
  const users = load('users-db'); const sessions = load('session'); const loans = load('loans-db');
  const owner = await users.login('prueba123@itesa.edu.mx', 'Prueba123!');
  const borrower = await users.login('prueba456@itesa.edu.mx', 'Prueba456!');
  const outsider = await users.login('prueba789@itesa.edu.mx', 'Prueba789!');
  assert.equal(await users.login('alex.rivera@example.com', 'DemoAlex2026!'), null);
  let snapshot = await loans.getLoans(owner);
  const id = snapshot.loans.find(item => item.listingId === 1).id;
  assert.equal(snapshot.loans.find(item => item.id === id).borrowerConfirmed, false);
  assert.equal(snapshot.listingStates.find(item => item.listingId === 1).status, 'Prestado');
  await assert.rejects(loans.confirmReturn(owner, id), error => error.status === 409);
  await assert.rejects(loans.confirmReturn(outsider, id), error => error.status === 403);
  snapshot = await loans.confirmReturn(borrower, id);
  assert.equal(snapshot.loans.find(item => item.id === id).ownerConfirmed, false);
  assert.equal(snapshot.listingStates.find(item => item.listingId === 1).status, 'Prestado');
  await loans.confirmReturn(borrower, id);
  snapshot = await loans.confirmReturn(owner, id);
  assert.equal(snapshot.loans.find(item => item.id === id).ownerConfirmed, true);
  assert.equal(snapshot.listingStates.find(item => item.listingId === 1).status, 'Disponible');
  snapshot = await loans.getLoans(borrower);
  assert.equal(snapshot.loans.find(item => item.id === id).role, 'borrower');
  assert.equal(snapshot.loans.find(item => item.id === id).ownerConfirmed, true);
  assert.equal((await loans.getLoans(outsider)).loans.some(item => item.id === id), false);
  assert.equal(database.prepare('SELECT COUNT(*) AS total FROM loans').get().total, 2);
  const token = await sessions.createSession(owner.id);
  const request = new Request('http://localhost/api/loans', { headers: { cookie: `campus_session=${token}` } });
  assert.equal((await sessions.requireSession(request)).id, owner.id);
  await assert.rejects(sessions.requireSession(new Request('http://localhost/api/loans')), error => error.status === 401);
  assert.throws(() => sessions.checkOrigin(new Request('http://localhost/api/loans', { headers: { origin: 'https://untrusted.invalid' } })), error => error.status === 403);
  await sessions.deleteSession(request);
  await assert.rejects(sessions.requireSession(request), error => error.status === 401);
  const suspendedToken = await sessions.createSession(borrower.id);
  database.prepare("UPDATE users SET status='Suspendido' WHERE id=?").run(borrower.id);
  await assert.rejects(sessions.requireSession(new Request('http://localhost/api/loans', { headers: { cookie: `campus_session=${suspendedToken}` } })), error => error.status === 401);
  database.close();
  console.log('PASS: ordered two-party returns, unauthorized participant, status persistence, repeated requests, per-account visibility, institutional login, sessions, logout, origin protection and suspended users.');
})().catch(error => { console.error(error); process.exitCode = 1; });
