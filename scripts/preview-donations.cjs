const {chromium}=require('C:/Users/rodri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try {
  const contextA=await browser.newContext({viewport:{width:1440,height:1000}}),contextB=await browser.newContext();
  const a=await contextA.newPage(),b=await contextB.newPage();
  const errors=[];for(const p of [a,b])p.on('pageerror',e=>errors.push(e.message));
  async function login(p,n){await p.goto('http://localhost:5173');await p.getByLabel('Correo institucional').fill(`prueba${n}@itesa.edu.mx`);await p.getByLabel('Contraseña',{exact:true}).fill(`Prueba${n}!`);await p.getByRole('button',{name:'Entrar',exact:true}).click();await p.getByRole('button',{name:'Donaciones',exact:true}).click();await p.getByRole('heading',{name:'Bata de laboratorio',exact:true}).waitFor();}
  await login(a,'123');await login(b,'456');
  await a.screenshot({path:'outputs/donaciones-historial/catalogo.png',fullPage:true});
  await a.getByRole('button',{name:'Donar un artículo',exact:true}).click();
  await a.screenshot({path:'outputs/donaciones-historial/formulario.png',fullPage:true});
  const title=`Prueba funcional de donación ${Date.now()}`;
  await a.getByLabel('Nombre del artículo').fill(title);await a.getByLabel('Descripción',{exact:true}).fill('Artículo ficticio creado para verificar la entrega entre dos cuentas.');await a.getByRole('button',{name:'Publicar donación',exact:true}).click();
  const offerA=a.locator('article.listing-card').filter({has:a.getByRole('heading',{name:title,exact:true})});await offerA.waitFor();
  const offerB=b.locator('article.listing-card').filter({has:b.getByRole('heading',{name:title,exact:true})});await offerB.getByRole('button',{name:'Me interesa',exact:true}).click();await b.getByRole('dialog').getByRole('button',{name:'Confirmar',exact:true}).click();
  await offerA.getByRole('button',{name:'Elegir destinatario',exact:true}).click();await a.getByRole('dialog').getByRole('button',{name:'Confirmar',exact:true}).click();
  await b.getByRole('button',{name:'Solicitudes y recibidas',exact:true}).click();
  const privateB=b.locator('article.loan-card').filter({has:b.getByRole('heading',{name:title,exact:true})});await privateB.getByRole('button',{name:'Aceptar',exact:true}).click();await b.getByRole('dialog').getByRole('button',{name:'Confirmar',exact:true}).click();
  const privateA=a.locator('article.loan-card').filter({has:a.getByRole('heading',{name:title,exact:true})});await privateA.getByRole('button',{name:'Informar entrega',exact:true}).click();await a.getByRole('dialog').getByRole('button',{name:'Confirmar',exact:true}).click();
  await privateB.getByRole('button',{name:'Confirmar recepción',exact:true}).click();await b.getByRole('dialog').getByRole('button',{name:'Confirmar',exact:true}).click();await privateB.getByText('Entregada',{exact:true}).waitFor();
  await b.getByRole('button',{name:'Mi historial',exact:true}).click();await b.getByText('Donación recibida: Entregada',{exact:true}).waitFor();
  await b.screenshot({path:'outputs/donaciones-historial/historial-recepcion.png',fullPage:true});
  await a.getByRole('button',{name:'Mi historial',exact:true}).click();await a.getByText('Donación enviada: Entregada',{exact:true}).waitFor();
  await a.screenshot({path:'outputs/donaciones-historial/historial.png',fullPage:true});
  await a.setViewportSize({width:390,height:844});await a.locator('.sidebar').waitFor({state:'hidden'});await a.screenshot({path:'outputs/donaciones-historial/movil.png',fullPage:true,animations:'disabled'});
  assert.equal(await a.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
  assert.deepEqual(errors,[]);
  console.log('PASS browser: public creation, request, selection, acceptance, donor delivery, recipient receipt, history for both accounts, responsive layout; zero page errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
