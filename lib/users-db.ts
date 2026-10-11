import "server-only";
import { env } from "cloudflare:workers";
import type { UserAccount, UserAccountInput } from "@/lib/marketplace-types";

const demoUsers = [
  { name: "Alex Rivera", email: "alex.rivera@example.com", password: "DemoAlex2026!", career: "Ingeniería Mecatrónica", semester: 4, role: "Estudiante" as const },
  { name: "Lucía Torres", email: "lucia.torres@example.com", password: "DemoLucia2026!", career: "Ingeniería en Industrias Alimentarias", semester: 5, role: "Estudiante" as const },
  { name: "Mateo Vega", email: "mateo.vega@example.com", password: "DemoMateo2026!", career: "Ingeniería Automotriz", semester: 4, role: "Estudiante" as const },
  { name: "Sofía Luna", email: "sofia.luna@example.com", password: "DemoSofia2026!", career: null, semester: null, role: "Administrador" as const },
];

function db() {
  if (!env.DB) throw new Error("La base de datos de usuarios no está disponible.");
  return env.DB;
}

export async function passwordHash(email: string, password: string) {
  const value = new TextEncoder().encode(`campus-loop:${email.toLowerCase()}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", value);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function seedUsers() {
  const database = db();
  // Run each demo-data version once, including databases with older accounts.
  // Keep existing users, edited passwords and deliberately deleted demo accounts intact.
  await database.prepare("CREATE TABLE IF NOT EXISTS app_seed_versions (version TEXT PRIMARY KEY)").run();
  const version = "fictional-demo-accounts-v1";
  const applied = await database.prepare("SELECT version FROM app_seed_versions WHERE version = ?").bind(version).first();
  if (applied) return;
  const statements = await Promise.all(demoUsers.map(async (user) => database.prepare(
    "INSERT INTO users (name, email, password_hash, career, semester, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'Activo', ?) ON CONFLICT(email) DO NOTHING"
  ).bind(user.name, user.email, await passwordHash(user.email, user.password), user.career, user.semester, user.role, new Date().toISOString())));
  statements.push(database.prepare("INSERT INTO app_seed_versions (version) VALUES (?) ON CONFLICT(version) DO NOTHING").bind(version));
  await database.batch(statements);
}

function present(row: Record<string, unknown>): UserAccount {
  const name = String(row.name);
  return {
    id: Number(row.id), name, email: String(row.email),
    career: row.career ? String(row.career) : null,
    semester: row.semester === null || row.semester === undefined ? null : Number(row.semester),
    role: String(row.role) as UserAccount["role"], status: String(row.status) as UserAccount["status"],
    initials: name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase(),
  };
}

export async function listUsers() {
  await seedUsers();
  const result = await db().prepare("SELECT id, name, email, career, semester, role, status FROM users ORDER BY id").all();
  return result.results.map((row) => present(row as Record<string, unknown>));
}

export async function login(email: string, password: string) {
  await seedUsers();
  const normalized = email.trim().toLowerCase();
  const row = await db().prepare("SELECT id, name, email, career, semester, role, status, password_hash FROM users WHERE email = ?").bind(normalized).first<Record<string, unknown>>();
  if (!row || row.password_hash !== await passwordHash(normalized, password)) return null;
  if (row.status !== "Activo") throw new Error("Esta cuenta está suspendida. Contacta a un administrador.");
  return present(row);
}

async function requireAdmin(actorId: number) {
  await seedUsers();
  const actor = await db().prepare("SELECT role, status FROM users WHERE id = ?").bind(actorId).first<{ role: string; status: string }>();
  if (!actor || actor.role !== "Administrador" || actor.status !== "Activo") throw new Error("No tienes permisos para administrar usuarios.");
}

async function requireEditor(actorId: number, targetId: number) {
  if (actorId === targetId) return;
  await requireAdmin(actorId);
}

export async function createUser(actorId: number, input: UserAccountInput & { password: string }) {
  await requireAdmin(actorId);
  const email = input.email.trim().toLowerCase();
  const career = input.role === "Administrador" ? null : input.career;
  const semester = input.role === "Administrador" ? null : input.semester;
  const result = await db().prepare("INSERT INTO users (name, email, password_hash, career, semester, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'Activo', ?)")
    .bind(input.name.trim(), email, await passwordHash(email, input.password), career, semester, input.role, new Date().toISOString()).run();
  const row = await db().prepare("SELECT id, name, email, career, semester, role, status FROM users WHERE id = ?").bind(result.meta.last_row_id).first<Record<string, unknown>>();
  return present(row!);
}

export async function updateUser(actorId: number, id: number, input: Partial<UserAccountInput> & { status?: UserAccount["status"] }) {
  await requireEditor(actorId, id);
  const current = await db().prepare("SELECT * FROM users WHERE id = ?").bind(id).first<Record<string, unknown>>();
  if (!current) throw new Error("Usuario no encontrado.");
  const role = (input.role ?? current.role) as UserAccount["role"];
  const email = String(input.email ?? current.email).trim().toLowerCase();
  const career = role === "Administrador" ? null : (input.career ?? current.career);
  const semester = role === "Administrador" ? null : (input.semester ?? current.semester);
  const hash = input.password ? await passwordHash(email, input.password) : String(current.password_hash);
  await db().prepare("UPDATE users SET name = ?, email = ?, password_hash = ?, career = ?, semester = ?, role = ?, status = ? WHERE id = ?")
    .bind(String(input.name ?? current.name).trim(), email, hash, career, semester, role, input.status ?? current.status, id).run();
  const row = await db().prepare("SELECT id, name, email, career, semester, role, status FROM users WHERE id = ?").bind(id).first<Record<string, unknown>>();
  return present(row!);
}

export async function deleteUser(actorId: number, id: number) {
  await requireAdmin(actorId);
  if (actorId === id) throw new Error("No puedes eliminar la cuenta con la que estás trabajando.");
  const result = await db().prepare("DELETE FROM users WHERE id = ?").bind(id).run();
  if (!result.meta.changes) throw new Error("Usuario no encontrado.");
}
