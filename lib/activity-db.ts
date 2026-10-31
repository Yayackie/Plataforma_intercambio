import "server-only";
import { db } from "./users-db";
import type { ActivityEvent } from "./activity-types";
export async function prepareActivity() {
  await db().prepare(`CREATE TABLE IF NOT EXISTS activity_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, category TEXT NOT NULL,
    title TEXT NOT NULL, detail TEXT NOT NULL, occurred_at TEXT NOT NULL
  )`).run();
  await db().prepare("CREATE INDEX IF NOT EXISTS activity_user ON activity_events(user_id,id)").run();
}
export async function getActivity(userId: number): Promise<ActivityEvent[]> {
  await prepareActivity();
  const rows = await db().prepare("SELECT * FROM activity_events WHERE user_id=? ORDER BY occurred_at DESC,id DESC").bind(userId).all<Record<string, unknown>>();
  return rows.results.map(r => ({ id: `server-${r.id}`, category: String(r.category), title: String(r.title), detail: String(r.detail), occurredAt: String(r.occurred_at), source: "server" }));
}
export async function prepareDonationHistory() {
  await prepareActivity();
  await db().prepare(`CREATE TRIGGER IF NOT EXISTS donation_activity_created AFTER INSERT ON donations BEGIN
    INSERT INTO activity_events(user_id,category,title,detail,occurred_at) VALUES(NEW.donor_id,'Donación',NEW.title,'Propuesta enviada',NEW.created_at);
    INSERT INTO activity_events(user_id,category,title,detail,occurred_at) VALUES(NEW.recipient_id,'Donación',NEW.title,'Propuesta recibida',NEW.created_at);
  END`).run();
  await db().prepare(`CREATE TRIGGER IF NOT EXISTS donation_activity_updated AFTER UPDATE OF status ON donations WHEN OLD.status != NEW.status BEGIN
    INSERT INTO activity_events(user_id,category,title,detail,occurred_at) VALUES(NEW.donor_id,'Donación',NEW.title,'Donación enviada: ' || NEW.status,NEW.updated_at);
    INSERT INTO activity_events(user_id,category,title,detail,occurred_at) VALUES(NEW.recipient_id,'Donación',NEW.title,'Donación recibida: ' || NEW.status,NEW.updated_at);
  END`).run();
}
export async function prepareLoanHistory() {
  await prepareActivity();
  await db().prepare(`CREATE TRIGGER IF NOT EXISTS loan_activity_return AFTER UPDATE OF borrower_confirmed,owner_confirmed ON loans
    WHEN OLD.borrower_confirmed != NEW.borrower_confirmed OR OLD.owner_confirmed != NEW.owner_confirmed BEGIN
    INSERT INTO activity_events(user_id,category,title,detail,occurred_at) VALUES(NEW.owner_id,'Préstamo',NEW.item,
      CASE WHEN NEW.owner_confirmed=1 THEN 'Devolución recibida y confirmada' ELSE 'El prestatario informó la devolución' END,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
    INSERT INTO activity_events(user_id,category,title,detail,occurred_at) VALUES(NEW.borrower_id,'Préstamo',NEW.item,
      CASE WHEN NEW.owner_confirmed=1 THEN 'Devolución confirmada por el propietario' ELSE 'Devolución informada' END,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
  END`).run();
}
