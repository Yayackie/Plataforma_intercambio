import "server-only";
import { db, present } from "./users-db";

export const SESSION_COOKIE = "campus_session";
export const SESSION_SECONDS = 60 * 60 * 8;
export class AccessError extends Error {
  constructor(message: string, public status = 401) { super(message); }
}
async function prepareSessions() {
  await db().prepare("CREATE TABLE IF NOT EXISTS user_sessions (token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL, expires_at INTEGER NOT NULL)").run();
}
async function digest(token: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(hash), (value) => value.toString(16).padStart(2, "0")).join("");
}
function tokenFrom(request: Request) {
  return request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1) ?? "";
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") throw new AccessError("Solicitud no permitida.", 403);
}
export async function createSession(userId: number) {
  await prepareSessions();
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (value) => value.toString(16).padStart(2, "0")).join("");
  await db().prepare("DELETE FROM user_sessions WHERE expires_at <= ?").bind(Date.now()).run();
  await db().prepare("INSERT INTO user_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").bind(await digest(token), userId, Date.now() + SESSION_SECONDS * 1000).run();
  return token;
}
export async function deleteSession(request: Request) {
  await prepareSessions();
  await db().prepare("DELETE FROM user_sessions WHERE token_hash = ?").bind(await digest(tokenFrom(request))).run();
}
export async function requireSession(request: Request) {
  const token = tokenFrom(request);
  if (!/^[a-f0-9]{64}$/.test(token)) throw new AccessError("Inicia sesión para continuar.");
  await prepareSessions();
  const row = await db().prepare("SELECT u.* FROM user_sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ? AND u.status = 'Activo'").bind(await digest(token), Date.now()).first<Record<string, unknown>>();
  if (!row || !String(row.email).toLowerCase().endsWith("@itesa.edu.mx")) throw new AccessError("Tu sesión venció. Vuelve a iniciar sesión.");
  return present(row);
}

export async function revokeOtherSessions(userId:number,request:Request){
  await prepareSessions();
  await db().prepare('DELETE FROM user_sessions WHERE user_id=? AND token_hash!=?').bind(userId,await digest(tokenFrom(request))).run();
}
