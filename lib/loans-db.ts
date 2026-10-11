import "server-only";
import { db, listUsers } from "./users-db";
import { AccessError } from "./session";
import type { Loan, UserAccount } from "./marketplace-types";

async function prepareLoans() {
  await listUsers();
  await db().prepare(`CREATE TABLE IF NOT EXISTS loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT, listing_id INTEGER NOT NULL, item TEXT NOT NULL,
    owner_id INTEGER NOT NULL, borrower_id INTEGER NOT NULL, due TEXT NOT NULL,
    borrower_confirmed INTEGER NOT NULL DEFAULT 0, owner_confirmed INTEGER NOT NULL DEFAULT 0,
    CHECK(owner_id != borrower_id), CHECK(owner_confirmed = 0 OR borrower_confirmed = 1)
  )`).run();
  const version = "institutional-loans-v1";
  if (await db().prepare("SELECT version FROM app_seed_versions WHERE version = ?").bind(version).first()) return;
  const due = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  // Only new demonstration loans; old browser flags are never confirmations.
  const examples = [
    [1, "Multímetro digital", "prueba123@itesa.edu.mx", "prueba456@itesa.edu.mx"],
    [5, "Vidriería básica", "prueba789@itesa.edu.mx", "prueba123@itesa.edu.mx"],
  ] as const;
  const statements = examples.map(([listingId, item, owner, borrower]) => db().prepare(`
    INSERT INTO loans (listing_id, item, owner_id, borrower_id, due)
    SELECT ?, ?, o.id, b.id, ? FROM users o, users b
    WHERE o.email = ? AND b.email = ?
      AND NOT EXISTS (SELECT 1 FROM app_seed_versions WHERE version = ?)
  `).bind(listingId, item, due, owner, borrower, version));
  statements.push(db().prepare("INSERT INTO app_seed_versions (version) VALUES (?) ON CONFLICT(version) DO NOTHING").bind(version));
  await db().batch(statements);
}
export async function getLoans(user: UserAccount) {
  await prepareLoans();
  const result = await db().prepare(`SELECT l.*, o.name AS owner_name, b.name AS borrower_name
    FROM loans l JOIN users o ON o.id=l.owner_id JOIN users b ON b.id=l.borrower_id
    WHERE l.owner_id=? OR l.borrower_id=? ORDER BY l.id DESC`).bind(user.id, user.id).all<Record<string, unknown>>();
  const loans: Loan[] = result.results.map((row) => ({
    id: Number(row.id), listingId: Number(row.listing_id), item: String(row.item),
    counterpart: String(Number(row.owner_id) === user.id ? row.borrower_name : row.owner_name),
    due: String(row.due), borrowerConfirmed: Boolean(row.borrower_confirmed), ownerConfirmed: Boolean(row.owner_confirmed),
    role: Number(row.owner_id) === user.id ? "owner" : "borrower",
  }));
  const states = await db().prepare(`SELECT l.listing_id, l.owner_id, u.name AS owner_name,
    MAX(CASE WHEN owner_confirmed=0 THEN 1 ELSE 0 END) AS active FROM loans l JOIN users u ON u.id=l.owner_id GROUP BY l.listing_id, l.owner_id, u.name`).all<Record<string, unknown>>();
  return { loans, listingStates: states.results.map((row) => ({ listingId: Number(row.listing_id), ownerId: Number(row.owner_id), ownerName: String(row.owner_name), status: row.active ? "Prestado" as const : "Disponible" as const })) };
}
export async function confirmReturn(user: UserAccount, id: number) {
  await prepareLoans();
  const loan = await db().prepare("SELECT * FROM loans WHERE id=?").bind(id).first<Record<string, unknown>>();
  if (!loan) throw new AccessError("Préstamo no encontrado.", 404);
  if (user.id !== Number(loan.owner_id) && user.id !== Number(loan.borrower_id)) throw new AccessError("Solo los participantes pueden confirmar este préstamo.", 403);
  if (user.id === Number(loan.borrower_id)) {
    await db().prepare("UPDATE loans SET borrower_confirmed=1 WHERE id=? AND borrower_id=?").bind(id, user.id).run();
  } else {
    if (!loan.borrower_confirmed) throw new AccessError("Primero debe indicar la devolución quien recibió el artículo.", 409);
    await db().prepare("UPDATE loans SET owner_confirmed=1 WHERE id=? AND owner_id=? AND borrower_confirmed=1").bind(id, user.id).run();
  }
  return getLoans(user);
}
