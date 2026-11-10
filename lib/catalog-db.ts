import "server-only";
import { db } from "./users-db";
import { careers, categories } from "./demo-data";
import { AccessError } from "./session";
export interface CatalogEntry { id: number; kind: "career" | "category"; name: string; aliases: string[]; enabled: boolean }
export interface CatalogChange { id?:number; kind?:string; name?:string; enabled?:boolean; action?:string }
async function prepare() {
  await db().prepare("CREATE TABLE IF NOT EXISTS institutional_catalog (id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, name TEXT NOT NULL, aliases TEXT NOT NULL DEFAULT '[]', UNIQUE(kind,name))").run();
  await db().prepare("CREATE TABLE IF NOT EXISTS app_seed_versions (version TEXT PRIMARY KEY)").run();
  await db().prepare("CREATE TABLE IF NOT EXISTS catalog_disabled (entry_id INTEGER PRIMARY KEY)").run();
  if (!await db().prepare("SELECT version FROM app_seed_versions WHERE version='catalog-v1'").first())
    await db().batch([...careers.map(name => db().prepare("INSERT OR IGNORE INTO institutional_catalog (kind,name) VALUES ('career',?)").bind(name)), ...categories.map(name => db().prepare("INSERT OR IGNORE INTO institutional_catalog (kind,name) VALUES ('category',?)").bind(name)), db().prepare("INSERT OR IGNORE INTO app_seed_versions (version) VALUES ('catalog-v1')")]);
  if (!await db().prepare("SELECT version FROM app_seed_versions WHERE version='catalog-itesa-v2'").first()) {
    await db().batch([...careers.map(name=>db().prepare("INSERT OR IGNORE INTO institutional_catalog(kind,name) VALUES('career',?)").bind(name)),
      db().prepare("INSERT OR IGNORE INTO catalog_disabled(entry_id) SELECT id FROM institutional_catalog WHERE kind='career' AND name NOT IN ("+careers.map(()=>'?').join(',')+")").bind(...careers),
      db().prepare("UPDATE users SET career='Ingeniería en Sistemas Automotrices' WHERE career='Ingeniería Automotriz'"),
      db().prepare("INSERT OR IGNORE INTO app_seed_versions(version) VALUES('catalog-itesa-v2')")]);
  }
}
export async function getCatalog(): Promise<CatalogEntry[]> {
  await prepare(); const rows = await db().prepare("SELECT c.*,d.entry_id AS disabled FROM institutional_catalog c LEFT JOIN catalog_disabled d ON d.entry_id=c.id ORDER BY c.id").all();
  return rows.results.map(r => ({id:Number(r.id),kind:r.kind as CatalogEntry["kind"],name:String(r.name),aliases:JSON.parse(String(r.aliases)),enabled:!r.disabled}));
}
export async function saveCatalog(input: CatalogChange) {
  const entries = await getCatalog();
  const existing=entries.find(e=>e.id===input.id);
  if(input.action==='delete') {
    if(!existing || existing.kind!=='category') throw new AccessError('Solo puedes eliminar categorías.',400);
    await db().prepare('DELETE FROM institutional_catalog WHERE id=?').bind(existing.id).run();
    return getCatalog();
  }
  if(typeof input.enabled==='boolean') {
    if(!existing || existing.kind!=='career') throw new AccessError('Carrera inválida.',400);
    if(input.enabled) await db().prepare('DELETE FROM catalog_disabled WHERE entry_id=?').bind(existing.id).run();
    else await db().prepare('INSERT OR IGNORE INTO catalog_disabled(entry_id) VALUES(?)').bind(existing.id).run();
    return getCatalog();
  }
  if(existing?.kind==='career' || input.kind==='career') throw new AccessError('Las carreras solo se pueden habilitar o deshabilitar.',400);
  if (typeof input.name !== "string" || !input.name.trim() || input.name.trim().length > 100) throw new AccessError("Escribe un nombre de hasta 100 caracteres.",400);
  const name = input.name.trim(); const entry = entries.find(e => e.id === input.id); const kind = entry?.kind ?? input.kind;
  if (input.id !== undefined && !entry) throw new AccessError("El elemento ya no existe.",404);
  if (kind !== "career" && kind !== "category") throw new AccessError("Tipo de catálogo inválido.",400);
  if (entries.some(e => e.id !== entry?.id && e.kind === kind && [e.name,...e.aliases].some(n => n.toLocaleLowerCase() === name.toLocaleLowerCase()))) throw new AccessError("Este nombre ya pertenece a otro elemento del catálogo.",409);
  if (entry) {
    const statements = [db().prepare("UPDATE institutional_catalog SET name=?, aliases=? WHERE id=? AND name=?").bind(name,JSON.stringify([...new Set([...entry.aliases,entry.name])].filter(n => n !== name)),entry.id,entry.name)];
    if (kind === "career") statements.push(db().prepare("UPDATE users SET career=? WHERE career=?").bind(name,entry.name));
    await db().batch(statements);
  } else await db().prepare("INSERT INTO institutional_catalog (kind,name) VALUES (?,?)").bind(kind,name).run();
  return getCatalog();
}
