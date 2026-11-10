import { validateImage } from "./image-validation";
import "server-only";
import { db } from "./users-db";
import { AccessError } from "./session";
import { getCatalog } from "./catalog-db";
import { getLoans } from "./loans-db";
import { prepareActivity } from "./activity-db";
import { validateArticle } from "./donations-db";
import type { Listing, UserAccount } from "./marketplace-types";

export async function prepareListings() {
  await prepareActivity();
  await db().prepare(`CREATE TABLE IF NOT EXISTS listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT, owner_id INTEGER NOT NULL, title TEXT NOT NULL,
    description TEXT NOT NULL, category TEXT NOT NULL, career TEXT NOT NULL, semester INTEGER NOT NULL,
    condition TEXT NOT NULL, mode TEXT NOT NULL, price REAL, return_days INTEGER, image TEXT,
    status TEXT NOT NULL DEFAULT 'Disponible', hidden INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL, CHECK(mode IN ('Venta','Préstamo')),
    CHECK(return_days IS NULL OR (return_days >= 1 AND return_days <= 365))
  )`).run();
  // Reserve prototype IDs: existing demonstration loans use IDs 1 and 5.
  await db().prepare("INSERT INTO sqlite_sequence(name,seq) SELECT 'listings',1000 WHERE NOT EXISTS(SELECT 1 FROM sqlite_sequence WHERE name='listings')").run();
  await db().prepare(`CREATE TABLE IF NOT EXISTS loan_requests (
    listing_id INTEGER NOT NULL, user_id INTEGER NOT NULL, created_at TEXT NOT NULL,
    PRIMARY KEY(listing_id,user_id)
  )`).run();
  await db().prepare(`CREATE TRIGGER IF NOT EXISTS listing_created AFTER INSERT ON listings BEGIN
    INSERT INTO activity_events(user_id,category,title,detail,occurred_at) VALUES(NEW.owner_id,NEW.mode,NEW.title,'Publicación creada',NEW.created_at);
  END`).run();
  await db().prepare(`CREATE TRIGGER IF NOT EXISTS loan_request_created AFTER INSERT ON loan_requests BEGIN
    INSERT INTO activity_events(user_id,category,title,detail,occurred_at)
      SELECT owner_id,'Solicitud de préstamo',title,'Nueva solicitud recibida',NEW.created_at FROM listings WHERE id=NEW.listing_id;
  END`).run();
  await db().prepare(`CREATE TRIGGER IF NOT EXISTS listing_status_updated AFTER UPDATE OF status ON listings WHEN NEW.status != OLD.status BEGIN
    INSERT INTO activity_events(user_id,category,title,detail,occurred_at) VALUES(NEW.owner_id,NEW.mode,NEW.title,'Publicación: ' || NEW.status,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
  END`).run();
}

export async function getListings(actor: UserAccount): Promise<Listing[]> {
  await prepareListings();
  const rows = await db().prepare(`SELECT l.*,u.name,
    EXISTS(SELECT 1 FROM loans WHERE listing_id=l.id AND owner_confirmed=0) AS lent
    FROM listings l JOIN users u ON u.id=l.owner_id
    WHERE (l.hidden=0 AND u.status='Activo') OR l.owner_id=? ORDER BY l.id DESC`).bind(actor.id).all();
  const requests = await db().prepare(`SELECT r.*,u.name FROM loan_requests r JOIN users u ON u.id=r.user_id
    JOIN listings l ON l.id=r.listing_id WHERE u.status='Activo' AND (l.owner_id=? OR r.user_id=?)`).bind(actor.id,actor.id).all();
  return rows.results.map(r => ({id:Number(r.id),ownerId:Number(r.owner_id),owner:String(r.name),mine:r.owner_id===actor.id,
    title:String(r.title),description:String(r.description),category:String(r.category),career:String(r.career),semester:Number(r.semester),
    condition:String(r.condition),mode:r.mode as Listing['mode'],status:r.lent?'Prestado':r.status as Listing['status'],
    price:r.price===null?undefined:Number(r.price),returnDays:r.return_days===null?undefined:Number(r.return_days),
    image:r.image?String(r.image):undefined,hidden:!!r.hidden,accent:'#e4f3ee',icon:'box',
    requested:requests.results.some(q=>q.listing_id===r.id && q.user_id===actor.id),
    applicants:r.owner_id===actor.id?requests.results.filter(q=>q.listing_id===r.id).map(q=>({id:Number(q.user_id),name:String(q.name)})):[] }));
}

export async function createListing(actor: UserAccount,input: Record<string,unknown>) {
  await prepareListings(); const article=validateArticle(input);
  const {mode,price,returnDays,semester,category,career}=input;
  if(mode!=='Venta' && mode!=='Préstamo') throw new AccessError('Modalidad inválida.',400);
  if(mode==='Venta' && (typeof price!=='number' || !Number.isFinite(price) || price<0 || price>10000000)) throw new AccessError('Indica un precio válido.',400);
  if(mode==='Préstamo' && (!Number.isInteger(returnDays) || Number(returnDays)<1 || Number(returnDays)>365)) throw new AccessError('El plazo debe ser un número entero entre 1 y 365 días.',400);
  if(!Number.isInteger(semester) || Number(semester)<1 || Number(semester)>9) throw new AccessError('Semestre inválido.',400);
  const catalog=await getCatalog();
  if(!catalog.some(e=>e.kind==='career' && e.enabled && e.name===career) || !catalog.some(e=>e.kind==='category' && e.enabled && e.name===category)) throw new AccessError('Selecciona una carrera y categoría disponibles.',400);
  const image=validateImage(input.image);
  await db().prepare(`INSERT INTO listings(owner_id,title,description,category,career,semester,condition,mode,price,return_days,image,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(actor.id,article.title,article.description,category,career,semester,article.condition,mode,mode==='Venta'?price:null,mode==='Préstamo'?returnDays:null,image,new Date().toISOString()).run();
}

export async function changeListing(actor: UserAccount,input: Record<string,unknown>) {
  await prepareListings(); await getLoans(actor);
  const {id,action,recipientId,status}=input;
  if(!Number.isSafeInteger(id)) throw new AccessError('Publicación inválida.',400);
  if(action==='request') {
    const result=await db().prepare(`INSERT INTO loan_requests(listing_id,user_id,created_at)
      SELECT l.id,?,? FROM listings l JOIN users u ON u.id=l.owner_id WHERE l.id=? AND l.owner_id!=?
      AND l.mode='Préstamo' AND l.status='Disponible' AND l.hidden=0 AND u.status='Activo'
      AND NOT EXISTS(SELECT 1 FROM loans WHERE listing_id=l.id AND owner_confirmed=0)
      ON CONFLICT(listing_id,user_id) DO NOTHING`).bind(actor.id,new Date().toISOString(),id,actor.id).run();
    if(!result.meta.changes) throw new AccessError('Ya solicitaste el artículo o dejó de estar disponible.',409);
    return;
  }
  if(action==='lend') {
    if(!Number.isSafeInteger(recipientId) || recipientId===actor.id) throw new AccessError('Selecciona un solicitante.',400);
    const result=await db().batch([
      db().prepare(`INSERT INTO loans(listing_id,item,owner_id,borrower_id,due)
        SELECT l.id,l.title,l.owner_id,?,date('now','+' || l.return_days || ' days') FROM listings l
        WHERE l.id=? AND l.owner_id=? AND l.status='Disponible' AND l.mode='Préstamo' AND l.hidden=0
        AND EXISTS(SELECT 1 FROM loan_requests r JOIN users u ON u.id=r.user_id WHERE r.listing_id=l.id AND r.user_id=? AND u.status='Activo')
        AND NOT EXISTS(SELECT 1 FROM loans WHERE listing_id=l.id AND owner_confirmed=0)` ).bind(recipientId,id,actor.id,recipientId),
      db().prepare(`DELETE FROM loan_requests WHERE listing_id=? AND EXISTS(SELECT 1 FROM loans WHERE listing_id=? AND owner_id=? AND borrower_id=? AND owner_confirmed=0)`).bind(id,id,actor.id,recipientId),
    ]);
    if(!result[0].meta.changes) throw new AccessError('El artículo ya está prestado o la solicitud no está disponible.',409);
    return;
  }
  if(action!=='status' || !['Disponible','En negociación','Cerrado'].includes(String(status))) throw new AccessError('Estado inválido.',400);
  const result=await db().prepare(`UPDATE listings SET status=? WHERE id=? AND owner_id=?
    AND NOT EXISTS(SELECT 1 FROM loans WHERE listing_id=listings.id AND owner_confirmed=0)`).bind(status,id,actor.id).run();
  if(!result.meta.changes) throw new AccessError('No puedes cambiar este estado mientras el recurso está prestado.',409);
}
