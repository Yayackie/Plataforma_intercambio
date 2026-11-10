import "server-only";
import { db } from "./users-db";
import { AccessError } from "./session";
import { prepareDonations, validateArticle } from "./donations-db";
import type { UserAccount } from "./marketplace-types";
import type { PublicDonation } from "./public-donation-types";

import { validateImage } from "./image-validation";
async function prepare() {
  await prepareDonations();
  await db().prepare(`CREATE TABLE IF NOT EXISTS public_donations (
    id INTEGER PRIMARY KEY AUTOINCREMENT, donor_id INTEGER NOT NULL, title TEXT NOT NULL,
    description TEXT NOT NULL, condition TEXT NOT NULL, demo_key TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'Disponible', selected_id INTEGER, donation_id INTEGER,
    selection_token TEXT, created_at TEXT NOT NULL,
    CHECK(status IN ('Disponible','Asignada','Retirada'))
  )`).run();
  await db().prepare("CREATE TABLE IF NOT EXISTS donation_images (offer_id INTEGER PRIMARY KEY, image TEXT NOT NULL)").run();
  await db().prepare(`CREATE TABLE IF NOT EXISTS donation_requests (
    offer_id INTEGER NOT NULL, user_id INTEGER NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(offer_id,user_id)
  )`).run();
  await db().prepare(`CREATE TRIGGER IF NOT EXISTS public_donation_created AFTER INSERT ON public_donations BEGIN
    INSERT INTO activity_events(user_id,category,title,detail,occurred_at) VALUES(NEW.donor_id,'Donación',NEW.title,
      CASE WHEN NEW.demo_key IS NULL THEN 'Publicada para la comunidad' ELSE 'Artículo de demostración incorporado' END,NEW.created_at);
  END`).run();
  await db().prepare(`CREATE TRIGGER IF NOT EXISTS donation_request_created AFTER INSERT ON donation_requests BEGIN
    INSERT INTO activity_events(user_id,category,title,detail,occurred_at)
      SELECT NEW.user_id,'Donación',title,'Solicitud enviada',NEW.created_at FROM public_donations WHERE id=NEW.offer_id;
    INSERT INTO activity_events(user_id,category,title,detail,occurred_at)
      SELECT donor_id,'Donación',title,'Nueva solicitud recibida',NEW.created_at FROM public_donations WHERE id=NEW.offer_id;
  END`).run();
  await db().prepare(`CREATE TRIGGER IF NOT EXISTS public_donation_state AFTER UPDATE OF status ON public_donations WHEN OLD.status != NEW.status BEGIN
    INSERT INTO activity_events(user_id,category,title,detail,occurred_at) VALUES(NEW.donor_id,'Donación',NEW.title,
      'Publicación: ' || NEW.status,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
    INSERT INTO activity_events(user_id,category,title,detail,occurred_at)
      SELECT user_id,'Donación',NEW.title,
        CASE WHEN NEW.status='Retirada' THEN 'El donante retiró la publicación' WHEN user_id=NEW.selected_id THEN 'Seleccionado para recibir el artículo' ELSE 'Artículo asignado a otra persona' END,
        strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM donation_requests WHERE offer_id=NEW.id;
  END`).run();
  // Stable keys preserve user changes and prevent duplicate examples on refresh.
  const examples = [
    ['donation-demo-coat-v1','prueba456@itesa.edu.mx','Bata de laboratorio','Talla M, limpia y sin roturas. Artículo ficticio para probar el flujo.','Muy bueno'],
    ['donation-demo-book-v1','prueba789@itesa.edu.mx','Libro de cálculo','Ejercicios y anotaciones de apoyo. Artículo ficticio para probar el flujo.','Bueno'],
    ['donation-demo-rulers-v1','prueba123@itesa.edu.mx','Juego de escuadras','Dos piezas para dibujo técnico. Artículo ficticio para probar el flujo.','Excelente'],
  ];
  await db().batch(examples.map(([key,email,title,description,condition]) => db().prepare(`INSERT INTO public_donations(donor_id,title,description,condition,demo_key,created_at)
    SELECT id,?,?,?,?,? FROM users WHERE email=? AND status='Activo' AND NOT EXISTS(SELECT 1 FROM public_donations WHERE demo_key=?)
    ON CONFLICT(demo_key) DO NOTHING`).bind(title,description,condition,key,new Date().toISOString(),email,key)));
}
export async function getPublicDonations(actor: UserAccount): Promise<PublicDonation[]> {
  await prepare();
  const rows = await db().prepare(`SELECT p.*,u.name,im.image FROM public_donations p JOIN users u ON u.id=p.donor_id LEFT JOIN donation_images im ON im.offer_id=p.id
    WHERE (p.status='Disponible' AND u.status='Activo') OR p.donor_id=? OR EXISTS(SELECT 1 FROM donation_requests WHERE offer_id=p.id AND user_id=?)
    ORDER BY p.id DESC`).bind(actor.id,actor.id).all<Record<string,unknown>>();
  const requests = await db().prepare(`SELECT r.*,u.name,u.status FROM donation_requests r JOIN users u ON u.id=r.user_id
    JOIN public_donations p ON p.id=r.offer_id WHERE p.donor_id=? OR r.user_id=?`).bind(actor.id,actor.id).all<Record<string,unknown>>();
  return rows.results.map(r => ({id:Number(r.id),donorId:Number(r.donor_id),donorName:String(r.name),title:String(r.title),description:String(r.description),condition:String(r.condition),
    image:r.image?String(r.image):undefined,demo:!!r.demo_key,status:r.status as PublicDonation['status'],createdAt:String(r.created_at),
    requested:requests.results.some(q=>q.offer_id===r.id && q.user_id===actor.id), selected:Number(r.selected_id)===actor.id,
    applicants:Number(r.donor_id)===actor.id ? requests.results.filter(q=>q.offer_id===r.id && q.status==='Activo').map(q=>({id:Number(q.user_id),name:String(q.name)})) : []}));
}
export async function publishDonation(actor: UserAccount, input: Record<string,unknown>) {
  await prepare(); const article=validateArticle(input);
  const image=validateImage(input.image);
  await db().batch([
    db().prepare('INSERT INTO public_donations(donor_id,title,description,condition,created_at) VALUES(?,?,?,?,?)').bind(actor.id,article.title,article.description,article.condition,new Date().toISOString()),
    db().prepare('INSERT INTO donation_images(offer_id,image) SELECT last_insert_rowid(),? WHERE ? IS NOT NULL').bind(image,image)
  ]);
}
export async function actOnPublicDonation(actor: UserAccount, input: Record<string,unknown>) {
  await prepare(); const {id,action,recipientId}=input;
  if (!Number.isSafeInteger(id)) throw new AccessError('Artículo inválido.',400);
  if (action==='request') {
    const result=await db().prepare(`INSERT INTO donation_requests(offer_id,user_id,created_at)
      SELECT p.id,?,? FROM public_donations p JOIN users u ON u.id=p.donor_id
      WHERE p.id=? AND p.donor_id!=? AND p.status='Disponible' AND u.status='Activo'
      ON CONFLICT(offer_id,user_id) DO NOTHING`).bind(actor.id,new Date().toISOString(),id,actor.id).run();
    if(!result.meta.changes) throw new AccessError('Ya solicitaste el artículo o no está disponible para ti.',409);
    return;
  }
  if(action==='withdraw') {
    const result=await db().prepare("UPDATE public_donations SET status='Retirada' WHERE id=? AND donor_id=? AND status='Disponible'").bind(id,actor.id).run();
    if(!result.meta.changes) throw new AccessError('No puedes retirar esta publicación.',409);
    return;
  }
  if(action!=='select' || !Number.isSafeInteger(recipientId) || recipientId===actor.id) throw new AccessError('Acción inválida.',400);
  const token=crypto.randomUUID(), now=new Date().toISOString();
  // A D1 batch is transactional. The token ties all statements to the single winning selection.
  const result=await db().batch([
    db().prepare(`UPDATE public_donations SET status='Asignada',selected_id=?,selection_token=? WHERE id=? AND donor_id=? AND status='Disponible'
      AND EXISTS(SELECT 1 FROM donation_requests r JOIN users u ON u.id=r.user_id WHERE r.offer_id=public_donations.id AND r.user_id=? AND u.status='Activo')`).bind(recipientId,token,id,actor.id,recipientId),
    db().prepare(`INSERT INTO donations(donor_id,recipient_id,title,description,condition,status,created_at,updated_at)
      SELECT donor_id,selected_id,title,description,condition,'Pendiente',?,? FROM public_donations WHERE id=? AND selection_token=?`).bind(now,now,id,token),
    db().prepare('UPDATE public_donations SET donation_id=last_insert_rowid() WHERE id=? AND selection_token=?').bind(id,token),
  ]);
  if(!result[0].meta.changes) throw new AccessError('No se pudo seleccionar: revisa la solicitud o actualiza el estado del artículo.',409);
}
