import "server-only";
import { db } from "./users-db";
import { AccessError } from "./session";
import type { UserAccount, Conversation } from "./marketplace-types";
async function prepare() {
  await db().prepare("CREATE TABLE IF NOT EXISTS conversations (id INTEGER PRIMARY KEY AUTOINCREMENT, first_user INTEGER NOT NULL, second_user INTEGER NOT NULL, UNIQUE(first_user,second_user), CHECK(first_user < second_user))").run();
  await db().prepare("CREATE TABLE IF NOT EXISTS chat_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, conversation_id INTEGER NOT NULL, sender_id INTEGER NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL)").run();
  await db().prepare("CREATE INDEX IF NOT EXISTS chat_messages_conversation ON chat_messages(conversation_id,id)").run();
}
export async function searchPeople(actor: UserAccount, query: string) {
  if (query.trim().length < 2) return [];
  const q=query.trim().toLowerCase().slice(0,100);
  const result=await db().prepare("SELECT id,name,email FROM users WHERE id != ? AND status='Activo' AND email LIKE '%@itesa.edu.mx' AND (instr(lower(name),?) > 0 OR instr(lower(email),?) > 0) ORDER BY name LIMIT 20").bind(actor.id,q,q).all();
  return result.results;
}
export async function getConversations(actor: UserAccount): Promise<Conversation[]> {
  await prepare();
  const threads=await db().prepare("SELECT c.*, u.name, u.email FROM conversations c JOIN users u ON u.id=CASE WHEN c.first_user=? THEN c.second_user ELSE c.first_user END WHERE c.first_user=? OR c.second_user=? ORDER BY c.id DESC").bind(actor.id,actor.id,actor.id).all();
  const messages=await db().prepare("SELECT m.* FROM chat_messages m JOIN conversations c ON c.id=m.conversation_id WHERE c.first_user=? OR c.second_user=? ORDER BY m.id").bind(actor.id,actor.id).all();
  return threads.results.map(t => ({id:Number(t.id),person:String(t.name),email:String(t.email),avatar:String(t.name).split(" ").slice(0,2).map(s=>s[0]).join(""),messages:messages.results.filter(m => m.conversation_id === t.id).map(m=>({from:m.sender_id===actor.id?"me":"them",text:String(m.body),time:String(m.created_at)}))}));
}
export async function startConversation(actor: UserAccount, recipient: number) {
  await prepare();
  if (!Number.isSafeInteger(recipient) || recipient === actor.id) throw new AccessError("Selecciona otra persona.",400);
  const user=await db().prepare("SELECT id FROM users WHERE id=? AND status='Activo' AND email LIKE '%@itesa.edu.mx'").bind(recipient).first();
  if (!user) throw new AccessError("La cuenta no está disponible.",404);
  const first=Math.min(actor.id,recipient), second=Math.max(actor.id,recipient);
  await db().prepare("INSERT OR IGNORE INTO conversations (first_user,second_user) VALUES (?,?)").bind(first,second).run();
  const thread=await db().prepare("SELECT id FROM conversations WHERE first_user=? AND second_user=?").bind(first,second).first<{id:number}>();
  return thread!.id;
}
export async function sendChatMessage(actor: UserAccount, id: number, text: unknown) {
  await prepare();
  if (typeof text !== "string" || !text.trim() || text.trim().length > 2000) throw new AccessError("El mensaje debe tener entre 1 y 2000 caracteres.",400);
  const thread=await db().prepare("SELECT c.id FROM conversations c JOIN users a ON a.id=c.first_user JOIN users b ON b.id=c.second_user WHERE c.id=? AND (c.first_user=? OR c.second_user=?) AND a.status='Activo' AND b.status='Activo'").bind(id,actor.id,actor.id).first();
  if (!thread) throw new AccessError("No tienes acceso a esta conversación o la cuenta ya no está activa.",403);
  await db().prepare("INSERT INTO chat_messages (conversation_id,sender_id,body,created_at) VALUES (?,?,?,?)").bind(id,actor.id,text.trim(),new Date().toISOString()).run();
}
