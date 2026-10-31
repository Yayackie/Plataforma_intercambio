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
 const users=load('users-db'), donations=load('donations-db');
 const a=await users.login('prueba123@itesa.edu.mx','Prueba123!');
 const b=await users.login('prueba456@itesa.edu.mx','Prueba456!');
 const c=await users.login('prueba789@itesa.edu.mx','Prueba789!');
 const input={recipientId:b.id,title:'Libro de prueba',description:'Ejemplar completo',condition:'Bueno'};
 await assert.rejects(donations.createDonation(a,{...input,recipientId:a.id}),e=>e.status===400);
 await assert.rejects(donations.createDonation(a,{...input,title:'  '}),e=>e.status===400);
 await assert.rejects(donations.createDonation(a,{...input,description:'x'.repeat(2001)}),e=>e.status===400);
 await assert.rejects(donations.createDonation(a,{...input,recipientId:99999}),e=>e.status===404);
 await donations.createDonation(a,input);
 const id=(await donations.getDonations(a))[0].id;
 assert.equal((await donations.getDonations(b))[0].id,id);
 assert.equal((await donations.getDonations(c)).length,0);
 await assert.rejects(donations.updateDonation(c,id,'accept'),e=>e.status===403);
 await assert.rejects(donations.updateDonation(a,id,'accept'),e=>e.status===403);
 await assert.rejects(donations.updateDonation(b,id,'receive'),e=>e.status===409);
 await assert.rejects(donations.updateDonation(a,id,'deliver'),e=>e.status===409);
 await donations.updateDonation(b,id,'accept');
 assert.equal((await donations.getDonations(a))[0].status,'Aceptada');
 await donations.updateDonation(a,id,'deliver');
 await assert.rejects(donations.updateDonation(a,id,'cancel'),e=>e.status===409);
 await assert.rejects(donations.updateDonation(a,id,'receive'),e=>e.status===403);
 await donations.updateDonation(b,id,'receive');
 assert.equal((await donations.getDonations(a))[0].status,'Entregada');
 await assert.rejects(donations.updateDonation(b,id,'receive'),e=>e.status===409);
 await donations.createDonation(a,input);
 let next=(await donations.getDonations(a))[0].id;
 await donations.updateDonation(b,next,'reject');
 await assert.rejects(donations.updateDonation(b,next,'accept'),e=>e.status===409);
 await donations.createDonation(a,input);next=(await donations.getDonations(a))[0].id;
 const results=await Promise.allSettled([donations.updateDonation(b,next,'accept'),donations.updateDonation(a,next,'cancel')]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 database.prepare("UPDATE users SET status='Suspendido' WHERE id=?").run(b.id);
 await assert.rejects(donations.createDonation(a,input),e=>e.status===404);
 const exports={};
 const source=ts.transpileModule(readFileSync('app/api/donations/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 runInNewContext(source,{exports,require(name){if(name==='next/server')return {NextResponse:{json:(data,options)=>new Response(JSON.stringify(data),options)}};if(name.startsWith('@/lib/'))return load(name.slice(6));throw Error(name);},URL});
 assert.equal((await exports.GET(new Request('http://localhost/api/donations'))).status,401);
 const token=await load('session').createSession(a.id);
 assert.equal((await exports.POST(new Request('http://localhost/api/donations',{method:'POST',headers:{origin:'http://evil.example',cookie:`campus_session=${token}`},body:JSON.stringify(input)}))).status,403);
 const response=await exports.POST(new Request('http://localhost/api/donations',{method:'POST',headers:{origin:'http://localhost',cookie:`campus_session=${token}`},body:JSON.stringify({...input,recipientId:c.id,donorId:b.id})}));
 assert.equal(response.status,201);
 assert.equal((await donations.getDonations(c))[0].donorId,a.id);
 database.close();
 console.log('PASS: shared donation records, privacy, recipient validation, authenticated donor, acceptance, rejection, cancellation, two-party delivery, invalid transitions, concurrent changes, suspended recipients and origin protection.');
})().catch(error=>{console.error(error);process.exitCode=1;});
