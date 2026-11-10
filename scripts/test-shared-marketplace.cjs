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
 const users=load('users-db'),listings=load('listings-db'),catalog=load('catalog-db'),loans=load('loans-db'),messages=load('messages-db'),notifications=load('notifications-db'),donations=load('public-donations-db'),reports=load('reports-db');
 const a=await users.login('prueba123@itesa.edu.mx','Prueba123!'),b=await users.login('prueba456@itesa.edu.mx','Prueba456!'),c=await users.login('prueba789@itesa.edu.mx','Prueba789!'),admin=await users.login('admin123@itesa.edu.mx','Admin123!');
 await loans.getLoans(a);const entries=await catalog.getCatalog();
 const image='data:image/png;base64,iVBORw0KGgo=';
 const draft={title:'Recurso compartido',description:'Prueba de publicación',condition:'Bueno',category:entries.find(e=>e.kind==='category').name,career:entries.find(e=>e.kind==='career'&&e.enabled).name,semester:2,mode:'Préstamo',returnDays:7,image};
 for(const days of [-6,0,1.5,366,'7',NaN])await assert.rejects(listings.createListing(a,{...draft,returnDays:days}),e=>e.status===400);
 await assert.rejects(listings.createListing(a,{...draft,image:'javascript:alert(1)'}),e=>e.status===400);
 await listings.createListing(a,draft);const item=(await listings.getListings(b))[0];assert.ok(item.id>1000);assert.equal(item.image,image);assert.equal(item.ownerId,a.id);assert.equal(item.mine,false);
 await assert.rejects(listings.changeListing(b,{id:item.id,action:'status',status:'Cerrado'}),e=>e.status===409);
 await listings.changeListing(b,{id:item.id,action:'request'});await listings.changeListing(c,{id:item.id,action:'request'});
 assert.equal((await listings.getListings(a))[0].applicants.length,2);assert.equal((await listings.getListings(b))[0].applicants.length,0);
 await assert.rejects(listings.changeListing(b,{id:item.id,action:'request'}),e=>e.status===409);
 const notice=(await notifications.getNotifications(a)).find(n=>n.section==='publicaciones');assert.equal(notice.count,2);
 await notifications.markSectionRead(a,'publicaciones',notice.lastId);assert.equal((await notifications.getNotifications(a)).find(n=>n.section==='publicaciones').count,0);
 await listings.changeListing(a,{id:item.id,action:'lend',recipientId:b.id});
 await assert.rejects(listings.changeListing(a,{id:item.id,action:'lend',recipientId:c.id}),e=>e.status===409);
 assert.equal((await listings.getListings(c))[0].status,'Prestado');
 await assert.rejects(listings.changeListing(c,{id:item.id,action:'request'}),e=>e.status===409);
 const loan=(await loans.getLoans(b)).loans.find(l=>l.listingId===item.id);await assert.rejects(loans.confirmReturn(a,loan.id),e=>e.status===409);
 await loans.confirmReturn(b,loan.id);assert.equal((await listings.getListings(c))[0].status,'Prestado');await loans.confirmReturn(a,loan.id);assert.equal((await listings.getListings(c))[0].status,'Disponible');
 await listings.changeListing(a,{id:item.id,action:'status',status:'Cerrado'});assert.equal((await listings.getListings(b))[0].status,'Cerrado');
 const chat=await messages.startConversation(a,b.id);await messages.sendChatMessage(a,chat,'Uno');const received=(await messages.getConversations(b))[0];assert.equal(received.unread,1);
 await messages.sendChatMessage(a,chat,'Dos');await messages.markConversationRead(b,chat,received.messages[0].id);assert.equal((await messages.getConversations(b))[0].unread,1);
 await assert.rejects(messages.markConversationRead(c,chat,999),e=>e.status===403);
 await messages.markConversationRead(b,chat,(await messages.getConversations(b))[0].messages.at(-1).id);assert.equal((await messages.getConversations(b))[0].unread,0);
 await donations.publishDonation(a,{...draft,title:'Donación con imagen'});const offer=(await donations.getPublicDonations(b)).find(o=>o.title==='Donación con imagen');assert.equal(offer.image,image);
 await donations.actOnPublicDonation(b,{id:offer.id,action:'request'});assert.ok((await notifications.getNotifications(a)).find(n=>n.section==='donaciones').count>0);
 assert.equal(await reports.reportListing(b,item.id),true);assert.equal((await reports.getReports(c)).length,0);assert.equal((await reports.getReports(admin)).length,1);
 await reports.resolveReport(admin,(await reports.getReports(admin))[0].id,'hide');assert.equal((await listings.getListings(b)).some(i=>i.id===item.id),false);
 console.log('PASS: shared listings and images, invalid periods, ownership, requests, exclusive lending, two-party returns, persistent unread counts, privacy, public donation photos and shared moderation.');database.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
