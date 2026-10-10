import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  career: text("career"),
  semester: integer("semester"),
  role: text("role", { enum: ["Estudiante", "Administrador"] }).notNull(),
  status: text("status", { enum: ["Activo", "Suspendido"] }).notNull().default("Activo"),
  createdAt: text("created_at").notNull().default("2026-09-21T00:00:00.000Z"),
});
