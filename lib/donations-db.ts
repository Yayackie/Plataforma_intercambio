import "server-only";
import { prepareDonationHistory } from "./activity-db";
import { db } from "./users-db";
import { AccessError } from "./session";
import type { UserAccount } from "./marketplace-types";
import type { Donation, DonationAction, DonationStatus } from "./donation-types";

export async function prepareDonations() {
  await db().prepare(`CREATE TABLE IF NOT EXISTS donations (
    id INTEGER PRIMARY KEY AUTOINCREMENT, donor_id INTEGER NOT NULL, recipient_id INTEGER NOT NULL,
    title TEXT NOT NULL, description TEXT NOT NULL, condition TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pendiente', created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    CHECK(donor_id != recipient_id),
    CHECK(status IN ('Pendiente','Aceptada','Rechazada','Cancelada','Entrega informada','Entregada'))
  )`).run();
  await prepareDonationHistory();
}
export async function getDonations(actor: UserAccount): Promise<Donation[]> {
  await prepareDonations();
  const rows = await db().prepare(`SELECT d.*, COALESCE(a.name,'Cuenta eliminada') AS donor_name,
    COALESCE(b.name,'Cuenta eliminada') AS recipient_name FROM donations d
    LEFT JOIN users a ON a.id=d.donor_id LEFT JOIN users b ON b.id=d.recipient_id
    WHERE d.donor_id=? OR d.recipient_id=? ORDER BY d.id DESC`).bind(actor.id, actor.id).all<Record<string, unknown>>();
  return rows.results.map(r => ({ id: Number(r.id), title: String(r.title), description: String(r.description),
    condition: String(r.condition), donorId: Number(r.donor_id), recipientId: Number(r.recipient_id),
    donorName: String(r.donor_name), recipientName: String(r.recipient_name), status: r.status as DonationStatus,
    createdAt: String(r.created_at), updatedAt: String(r.updated_at) }));
}
export async function createDonation(actor: UserAccount, input: Record<string, unknown>) {
  await prepareDonations();
  const { recipientId } = input;
  const { title, description, condition } = validateArticle(input);
  if (!Number.isSafeInteger(recipientId) || recipientId === actor.id) throw new AccessError("Selecciona a otra persona.", 400);
  const recipient = await db().prepare("SELECT id FROM users WHERE id=? AND status='Activo' AND email LIKE '%@itesa.edu.mx'").bind(recipientId).first();
  if (!recipient) throw new AccessError("El destinatario no está disponible.", 404);
  const now = new Date().toISOString();
  await db().prepare("INSERT INTO donations (donor_id,recipient_id,title,description,condition,created_at,updated_at) VALUES (?,?,?,?,?,?,?)")
    .bind(actor.id, recipientId, title.trim(), description.trim(), condition, now, now).run();
}
export async function updateDonation(actor: UserAccount, id: unknown, action: unknown) {
  await prepareDonations();
  if (!Number.isSafeInteger(id)) throw new AccessError("Donación inválida.", 400);
  const row = await db().prepare("SELECT * FROM donations WHERE id=? AND (donor_id=? OR recipient_id=?)").bind(id, actor.id, actor.id).first<Record<string, unknown>>();
  if (!row) throw new AccessError("No tienes acceso a esta donación.", 403);
  const rules: Record<DonationAction, {role: string; from: DonationStatus[]; to: DonationStatus}> = {
    accept: {role: "recipient_id", from: ["Pendiente"], to: "Aceptada"},
    reject: {role: "recipient_id", from: ["Pendiente"], to: "Rechazada"},
    cancel: {role: "donor_id", from: ["Pendiente", "Aceptada"], to: "Cancelada"},
    deliver: {role: "donor_id", from: ["Aceptada"], to: "Entrega informada"},
    receive: {role: "recipient_id", from: ["Entrega informada"], to: "Entregada"},
  };
  if (typeof action !== "string" || !Object.hasOwn(rules, action)) throw new AccessError("Acción inválida.", 400);
  const rule = rules[action as DonationAction];
  if (Number(row[rule.role]) !== actor.id) throw new AccessError("Esta acción corresponde a la otra persona.", 403);
  if (!rule.from.includes(row.status as DonationStatus)) throw new AccessError("El estado cambió o no permite esta acción. Actualiza la lista.", 409);
  const result = await db().prepare("UPDATE donations SET status=?,updated_at=? WHERE id=? AND status=?")
    .bind(rule.to, new Date().toISOString(), id, row.status).run();
  if (!result.meta.changes) throw new AccessError("La donación cambió. Actualiza la lista.", 409);
}

export function validateArticle(input: Record<string,unknown>) {
  const { title,description,condition }=input;
  if (typeof title !== "string" || !title.trim() || title.trim().length > 120 ||
      typeof description !== "string" || !description.trim() || description.trim().length > 2000 ||
      typeof condition !== "string" || !["Excelente", "Muy bueno", "Bueno", "Con detalles"].includes(condition))
    throw new AccessError("Completa el nombre, la descripción y el estado físico del artículo.", 400);
  return { title: title.trim(), description: description.trim(), condition };
}
