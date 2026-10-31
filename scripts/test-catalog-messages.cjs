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
 const users=load('users-db'), chats=load('messages-db'), catalog=load('catalog-db'), confirmation=load('admin-confirm');
 const a=await users.login('prueba123@itesa.edu.mx','Prueba123!');
 const b=await users.login('prueba456@itesa.edu.mx','Prueba456!');
 const outsider=await users.login('prueba789@itesa.edu.mx','Prueba789!');
 const admin=await users.login('admin123@itesa.edu.mx','Admin123!');
 assert.equal((await chats.getConversations(a)).length,0);
 const id=await chats.startConversation(a,b.id);
 assert.equal(await chats.startConversation(b,a.id),id);
 await chats.sendChatMessage(a,id,'Hola desde mi cuenta');
 assert.equal((await chats.getConversations(a))[0].messages[0].from,'me');
 assert.equal((await chats.getConversations(b))[0].messages[0].from,'them');
 assert.equal((await chats.getConversations(outsider)).length,0);
 assert.equal((await chats.getConversations(admin)).length,0);
 await assert.rejects(chats.sendChatMessage(outsider,id,'intruso'),e=>e.status===403);
 await assert.rejects(chats.startConversation(a,a.id),e=>e.status===400);
 await assert.rejects(chats.sendChatMessage(a,id,' '.repeat(2)),e=>e.status===400);
 assert.equal((await chats.searchPeople(a,'admin'))[0].id,admin.id);
 assert.equal((await chats.searchPeople(a,'prueba123')).length,0);
 database.prepare("UPDATE users SET status='Suspendido' WHERE id=?").run(b.id);
 assert.equal((await chats.searchPeople(a,'prueba456')).length,0);
 await assert.rejects(chats.sendChatMessage(a,id,'no'),e=>e.status===403);
 await assert.rejects(confirmation.confirmAdmin(a,'Prueba123!'),e=>e.status===403);
 await assert.rejects(confirmation.confirmAdmin(admin,'wrong'),e=>e.status===403);
 await confirmation.confirmAdmin(admin,'Admin123!');
 const initial=await catalog.getCatalog();const career=initial.find(e=>e.name===a.career);
 await catalog.saveCatalog({id:career.id,name:'Ingeniería de Prueba'});
 assert.equal((await users.login(a.email,'Prueba123!')).career,'Ingeniería de Prueba');
 assert.equal((await catalog.getCatalog()).length,initial.length);
 assert.equal((await catalog.getCatalog()).find(e=>e.id===career.id).aliases[0],a.career);
 await assert.rejects(catalog.saveCatalog({kind:'career',name:a.career}),e=>e.status===409);
 await catalog.saveCatalog({id:career.id,name:a.career});
 assert.equal((await users.login(a.email,'Prueba123!')).career,a.career);
 await catalog.saveCatalog({kind:'category',name:'Nueva categoría de prueba'});
 assert.equal((await catalog.getCatalog()).length,initial.length+1);
 function route(path) {
  const exports={}; const source=ts.transpileModule(readFileSync(`app/api/${path}/route.ts`,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  runInNewContext(source,{exports,require(name){if(name==='next/server')return {NextResponse:{json:(data,options)=>new Response(JSON.stringify(data),options)}};if(name.startsWith('@/lib/'))return load(name.slice(6));throw Error(name);},URL});return exports;
 }
 const sessions=load('session');const tokenAdmin=await sessions.createSession(admin.id), tokenOther=await sessions.createSession(outsider.id);
 function request(path,token,body) {return new Request(`http://localhost/api/${path}`,{method:body?'POST':'GET',headers:{cookie:`campus_session=${token}`,origin:'http://localhost','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});}
 const catalogRoute=route('catalog'),messageRoute=route('messages'),usersRoute=route('users'),userRoute=route('users/[id]');
 assert.equal((await catalogRoute.POST(request('catalog',tokenOther,{name:'No autorizado',kind:'career',adminPassword:'Prueba789!'}))).status,403);
 assert.equal((await catalogRoute.POST(request('catalog',tokenAdmin,{name:'No autorizado',kind:'career'}))).status,403);
 assert.equal((await usersRoute.POST(request('users',tokenAdmin,{name:'Sin confirmación'}))).status,403);
 assert.equal((await userRoute.PATCH(request('users/1',tokenAdmin,{name:'Sin confirmación'}),{params:Promise.resolve({id:String(a.id)})})).status,403);
 assert.equal((await userRoute.DELETE(request('users/1',tokenAdmin,{}),{params:Promise.resolve({id:String(a.id)})})).status,403);
 assert.equal((await messageRoute.PATCH(request('messages',tokenOther,{id,text:'intruso',actorId:a.id,senderId:a.id}))).status,403);
 assert.equal((await (await messageRoute.GET(request('messages',tokenOther))).json()).conversations.length,0);
 assert.equal((await messageRoute.GET(new Request('http://localhost/api/messages'))).status,401);
 await confirmation.confirmAdmin(admin,'Admin123!');
 for(let i=0;i<5;i++)await assert.rejects(confirmation.confirmAdmin(admin,'wrong'),e=>e.status===403);
 await assert.rejects(confirmation.confirmAdmin(admin,'Admin123!'),e=>e.status===429);
 database.close();
 console.log('PASS: private conversations, sender identity, no administrator bypass, duplicate threads, search, suspended users, catalog persistence and profile migration, duplicate names, administrator password and attempt limit.');
})().catch(error=>{console.error(error);process.exitCode=1;});
