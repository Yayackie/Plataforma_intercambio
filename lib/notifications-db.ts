import "server-only";
import { db } from "./users-db";
import { prepareActivity } from "./activity-db";
import { AccessError } from "./session";
import type { UserAccount } from "./marketplace-types";
export async function prepareReads() {
  await db().prepare(`CREATE TABLE IF NOT EXISTS notification_reads(user_id INTEGER NOT NULL, section TEXT NOT NULL, last_id INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(user_id,section))`).run();
}
export async function getNotifications(actor:UserAccount) {
  await prepareReads(); await prepareActivity();
  const rows=await db().prepare(`SELECT e.id,CASE WHEN e.category='Solicitud de préstamo' THEN 'publicaciones' WHEN e.category='Donación' THEN 'donaciones' ELSE 'prestamos' END AS section
    FROM activity_events e WHERE e.user_id=? AND (
      e.detail IN ('Nueva solicitud recibida','Propuesta recibida','Préstamo aprobado','El prestatario informó la devolución','Devolución confirmada por el propietario','Seleccionado para recibir el artículo','Artículo asignado a otra persona','El donante retiró la publicación')
      OR e.detail IN ('Donación enviada: Aceptada','Donación enviada: Rechazada','Donación enviada: Entregada','Donación recibida: Cancelada','Donación recibida: Entrega informada'))`).bind(actor.id).all();
  const reads=await db().prepare('SELECT * FROM notification_reads WHERE user_id=?').bind(actor.id).all();
  return ['publicaciones','donaciones','prestamos'].map(section=>{
    const seen=Number(reads.results.find(r=>r.section===section)?.last_id??0);
    const events=rows.results.filter(e=>e.section===section);
    return {section,count:events.filter(e=>Number(e.id)>seen).length,lastId:Math.max(0,...events.map(e=>Number(e.id)))};
  });
}
export async function markSectionRead(actor:UserAccount,section:unknown,lastId:unknown) {
  if(typeof section!=='string' || !['publicaciones','donaciones','prestamos'].includes(section) || !Number.isSafeInteger(lastId) || Number(lastId)<0) throw new AccessError('Aviso inválido.',400);
  const snapshot=await getNotifications(actor);
  const cap=Math.min(Number(lastId),snapshot.find(s=>s.section===section)!.lastId);
  await db().prepare(`INSERT INTO notification_reads(user_id,section,last_id) VALUES(?,?,?) ON CONFLICT(user_id,section) DO UPDATE SET last_id=MAX(last_id,excluded.last_id)`).bind(actor.id,section,cap).run();
}
