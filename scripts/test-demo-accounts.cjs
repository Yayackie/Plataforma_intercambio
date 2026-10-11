const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { DatabaseSync } = require('node:sqlite');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');
const source = ts.transpileModule(readFileSync('lib/users-db.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function setup() {
  const database = new DatabaseSync(':memory:');
  database.exec(`CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, career TEXT, semester INTEGER,
    role TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL)`);
  function prepare(sql) {
    let values = [];
    return {
      bind(...args) { values = args; return this; },
      async first() { return database.prepare(sql).get(...values) ?? null; },
      async all() { return { results: database.prepare(sql).all(...values) }; },
      async run() { const result = database.prepare(sql).run(...values); return { meta: { last_row_id: Number(result.lastInsertRowid) } }; },
    };
  }
  const binding = { prepare, async batch(statements) {
    database.exec('BEGIN');
    try { const results = []; for (const statement of statements) results.push(await statement.run()); database.exec('COMMIT'); return results; }
    catch (error) { database.exec('ROLLBACK'); throw error; }
  } };
  const module = { exports: {} };
  runInNewContext(source, { exports: module.exports, require(name) {
    if (name === 'server-only') return {};
    if (name === 'cloudflare:workers') return { env: { DB: binding } };
    throw new Error(`Unexpected import: ${name}`);
  }, crypto: globalThis.crypto, TextEncoder });
  return { database, api: module.exports };
}
const accounts = [
  ['prueba123@itesa.edu.mx', 'Prueba123!', 'Estudiante'],
  ['prueba456@itesa.edu.mx', 'Prueba456!', 'Estudiante'],
  ['prueba789@itesa.edu.mx', 'Prueba789!', 'Estudiante'],
  ['admin123@itesa.edu.mx', 'Admin123!', 'Administrador'],
];
(async () => {
  for (const populated of [false, true]) {
    const { database, api } = setup();
    if (populated) database.prepare('INSERT INTO users VALUES (1, ?, ?, ?, NULL, NULL, ?, ?, ?)').run('Existing Test', 'existing@example.com', 'keep-this-hash', 'Estudiante', 'Activo', '2026-01-01');
    for (const [email, password, role] of accounts) assert.equal((await api.login(email, password)).role, role);
    assert.equal((await api.listUsers()).length, populated ? 5 : 4);
    assert.equal(await api.login(accounts[0][0], 'incorrect-password'), null);
    if (populated) assert.equal(database.prepare('SELECT password_hash FROM users WHERE id=1').get().password_hash, 'keep-this-hash');
    database.prepare('UPDATE users SET password_hash=? WHERE email=?').run('changed-hash', accounts[0][0]);
    database.prepare('DELETE FROM users WHERE email=?').run(accounts[1][0]);
    await api.listUsers();
    assert.equal(await api.login(accounts[0][0], accounts[0][1]), null);
    assert.equal(await api.login(accounts[1][0], accounts[1][1]), null);
    database.close();
  }
  console.log('PASS: all four demo logins, empty/existing database, idempotence, existing account preservation, changed passwords and deleted accounts.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
