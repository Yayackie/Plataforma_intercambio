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
let queue = Promise.resolve();
const DB = { prepare, batch(statements) { const result=queue.then(()=>runBatch(statements)); queue=result.catch(()=>{}); return result; } };
async function runBatch(statements) {
  database.exec('BEGIN');
  try { const result = []; for (const statement of statements) result.push(await statement.run()); database.exec('COMMIT'); return result; }
  catch (error) { database.exec('ROLLBACK'); throw error; }
}
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
 const users=load('users-db'),pub=load('public-donations-db'),privateDonations=load('donations-db'),activity=load('activity-db');
 const a=await users.login('prueba123@itesa.edu.mx','Prueba123!'),b=await users.login('prueba456@itesa.edu.mx','Prueba456!'),c=await users.login('prueba789@itesa.edu.mx','Prueba789!');
 const first=await pub.getPublicDonations(a);assert.equal(first.length,3);assert.ok(first.every(x=>x.demo));
 assert.equal((await pub.getPublicDonations(a)).length,3);
 const offer=first.find(o=>o.donorId===b.id);
 await assert.rejects(pub.actOnPublicDonation(b,{id:offer.id,action:'request'}),e=>e.status===409);
 await pub.actOnPublicDonation(a,{id:offer.id,action:'request'});
 await assert.rejects(pub.actOnPublicDonation(a,{id:offer.id,action:'request'}),e=>e.status===409);
 await pub.actOnPublicDonation(c,{id:offer.id,action:'request'});
 assert.equal((await pub.getPublicDonations(a)).find(o=>o.id===offer.id).applicants.length,0);
 assert.equal((await pub.getPublicDonations(b)).find(o=>o.id===offer.id).applicants.length,2);
 await assert.rejects(pub.actOnPublicDonation(a,{id:offer.id,action:'select',recipientId:c.id}),e=>e.status===409);
 const results=await Promise.allSettled([pub.actOnPublicDonation(b,{id:offer.id,action:'select',recipientId:a.id}),pub.actOnPublicDonation(b,{id:offer.id,action:'select',recipientId:c.id})]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 const awarded=database.prepare('SELECT * FROM public_donations WHERE id=?').get(offer.id);
 const d=database.prepare('SELECT * FROM donations WHERE id=?').get(awarded.donation_id);
 assert.equal(d.recipient_id,awarded.selected_id);assert.equal(d.donor_id,b.id);
 const winner=awarded.selected_id===a.id?a:c,loser=awarded.selected_id===a.id?c:a;
 assert.equal((await privateDonations.getDonations(loser)).length,0);
 await privateDonations.updateDonation(winner,d.id,'accept');await privateDonations.updateDonation(b,d.id,'deliver');await privateDonations.updateDonation(winner,d.id,'receive');
 const history=await activity.getActivity(winner.id);
 assert.ok(history.some(e=>e.detail.includes('Entregada')));
 assert.ok(history.some(e=>e.detail==='Solicitud enviada'));
 assert.ok(!(await activity.getActivity(loser.id)).some(e=>e.detail.includes('Entregada')));
 const count=history.length;await privateDonations.getDonations(winner);assert.equal((await activity.getActivity(winner.id)).length,count);
 await pub.publishDonation(a,{title:'Material nuevo',description:'Descripción',condition:'Bueno'});
 const own=(await pub.getPublicDonations(a)).find(o=>o.title==='Material nuevo');assert.equal(own.demo,false);
 await pub.actOnPublicDonation(a,{id:own.id,action:'withdraw'});assert.ok(!(await pub.getPublicDonations(b)).some(o=>o.id===own.id));
 const hidden=await privateDonations.createDonation(a,{recipientId:b.id,title:'Privada',description:'No publicar',condition:'Bueno'});
 assert.ok(!(await pub.getPublicDonations(c)).some(o=>o.title==='Privada'));
 const loans=load('loans-db');const snapshot=await loans.getLoans(a);const loan=snapshot.loans.find(l=>l.role==='owner');
 await loans.confirmReturn(b,loan.id);await loans.confirmReturn(a,loan.id);
 assert.ok((await activity.getActivity(a.id)).some(e=>e.category==='Préstamo'&&e.detail.includes('confirmada')));
 console.log('PASS: stable demo catalog, request privacy, duplicate/self requests, competing assignments, atomic link, private handoff, two-party delivery, per-user history, withdrawal, public creation and loan history.');database.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
