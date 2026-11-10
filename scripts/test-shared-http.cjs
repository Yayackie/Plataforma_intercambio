const assert=require('node:assert/strict');
const base=process.env.CAMPUS_TEST_URL||'http://localhost:5173';
if(new URL(base).hostname!=='localhost'||new URL(base).protocol!=='http:')throw Error('This test creates fictitious data and is local-only.');
async function login(n){const r=await fetch(base+'/api/session',{method:'POST',headers:{'Content-Type':'application/json',origin:base},body:JSON.stringify({email:'prueba'+n+'@itesa.edu.mx',password:'Prueba'+n+'!'})});assert.equal(r.status,200);return {cookie:r.headers.get('set-cookie').split(';')[0],user:(await r.json()).user};}
async function api(session,path,method='GET',body){const r=await fetch(base+'/api/'+path,{method,headers:{cookie:session.cookie,origin:base,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};}
(async()=>{const a=await login('123'),b=await login('456'),c=await login('789');const entries=(await api(a,'catalog')).data.entries;
 const title='QA HTTP '+Date.now(),draft={title,description:'Artículo ficticio de verificación local',condition:'Bueno',mode:'Préstamo',returnDays:5,semester:4,career:entries.find(e=>e.kind==='career'&&e.enabled).name,category:entries.find(e=>e.kind==='category').name};
 assert.equal((await api(a,'listings','POST',{...draft,returnDays:-6})).status,400);
 const created=await api(a,'listings','POST',draft);assert.equal(created.status,200);const item=created.data.listings.find(i=>i.title===title);
 assert.ok((await api(b,'listings')).data.listings.some(i=>i.id===item.id));
 for(const actor of [b,c])assert.equal((await api(actor,'listings','PATCH',{id:item.id,action:'request'})).status,200);
 assert.ok((await api(a,'notifications')).data.notifications.find(n=>n.section==='publicaciones').count>=2);
 const winners=await Promise.all([b,c].map(actor=>api(a,'listings','PATCH',{id:item.id,action:'lend',recipientId:actor.user.id})));assert.deepEqual(winners.map(r=>r.status).sort(),[200,409]);
 assert.equal((await api(c,'listings')).data.listings.find(i=>i.id===item.id).status,'Prestado');
 console.log('PASS HTTP: authenticated sessions, shared publication, validation, request notifications and two competing assignments (one winner).');
})().catch(e=>{console.error(e);process.exitCode=1;});
