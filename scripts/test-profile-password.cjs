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
(async()=>{
const users=load('users-db'),sessions=load('session');const a=await users.login('prueba123@itesa.edu.mx','Prueba123!'),admin=await users.login('admin123@itesa.edu.mx','Admin123!');
const token=await sessions.createSession(a.id),other=await sessions.createSession(a.id),adminToken=await sessions.createSession(admin.id);
const exports={};runInNewContext(ts.transpileModule(readFileSync('app/api/users/[id]/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require(name){if(name==='next/server')return {NextResponse:{json:(data,options)=>new Response(JSON.stringify(data),options)}};if(name.startsWith('@/lib/'))return load(name.slice(6));throw Error(name);},URL});
function request(token,body){return new Request('http://localhost/api/users/'+a.id,{method:'PATCH',headers:{cookie:'campus_session='+token,origin:'http://localhost','Content-Type':'application/json'},body:JSON.stringify(body)});}
async function patch(token,id,body){return exports.PATCH(request(token,body),{params:Promise.resolve({id:String(id)})});}
assert.equal((await patch(token,a.id,{password:'Nueva123!'})).status,403);
assert.equal((await patch(token,a.id,{password:'Nueva123!',currentPassword:'incorrecta'})).status,403);
assert.equal((await patch(token,a.id,{password:123,currentPassword:'Prueba123!'})).status,400);
assert.equal((await patch(token,admin.id,{password:'Nueva123!',currentPassword:'Prueba123!'})).status,403);
const result=await patch(token,a.id,{password:'Nueva123!',currentPassword:'Prueba123!'});assert.equal(result.status,200);const payload=await result.json();assert.equal(payload.user.password,undefined);assert.equal(payload.user.password_hash,undefined);
assert.equal(await users.login(a.email,'Prueba123!'),null);assert.ok(await users.login(a.email,'Nueva123!'));
assert.equal((await sessions.requireSession(request(token,{}))).id,a.id);await assert.rejects(sessions.requireSession(request(other,{})),e=>e.status===401);
assert.equal((await patch(adminToken,a.id,{password:'Reset123!',adminPassword:'Admin123!'})).status,200);assert.ok(await users.login(a.email,'Reset123!'));await assert.rejects(sessions.requireSession(request(token,{})),e=>e.status===401);
assert.equal((await patch(adminToken,admin.id,{password:'AdminNueva123!',adminPassword:'Admin123!'})).status,200);assert.ok(await users.login(admin.email,'AdminNueva123!'));assert.equal(await users.login(admin.email,'Admin123!'),null);
console.log('PASS: own password requires current credential, admin reset and own change, login uses new password, no credential exposure and other sessions revoked.');database.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
