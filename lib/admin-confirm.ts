import "server-only";
import { db, login } from "./users-db";
import { AccessError } from "./session";
import type { UserAccount } from "./marketplace-types";
export async function confirmAdmin(actor: UserAccount, password: unknown) {
  if (actor.role !== "Administrador") throw new AccessError("Solo un administrador puede hacer este cambio.", 403);
  await db().prepare("CREATE TABLE IF NOT EXISTS admin_attempts (user_id INTEGER PRIMARY KEY, failures INTEGER NOT NULL, until_ms INTEGER NOT NULL)").run();
  const row = await db().prepare("SELECT * FROM admin_attempts WHERE user_id = ?").bind(actor.id).first<{failures:number;until_ms:number}>();
  if (row && row.until_ms > Date.now() && row.failures >= 5) throw new AccessError("Demasiados intentos. Espera cinco minutos antes de volver a confirmar.", 429);
  if (typeof password !== "string" || !password || !(await login(actor.email, password))) {
    const failures = row && row.until_ms > Date.now() ? row.failures + 1 : 1;
    await db().prepare("INSERT INTO admin_attempts (user_id, failures, until_ms) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET failures=excluded.failures, until_ms=excluded.until_ms").bind(actor.id, failures, Date.now()+300000).run();
    throw new AccessError("La contraseña de confirmación es incorrecta.", 403);
  }
  await db().prepare("DELETE FROM admin_attempts WHERE user_id = ?").bind(actor.id).run();
}
