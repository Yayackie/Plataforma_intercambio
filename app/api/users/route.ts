import { NextResponse } from "next/server";
import { createUser, listUsers } from "@/lib/users-db";
import { AccessError, checkOrigin, requireSession } from "@/lib/session";
import type { UserAccountInput } from "@/lib/marketplace-types";
export async function GET(request: Request) {
  try {
    const actor = await requireSession(request);
    return NextResponse.json({ users: actor.role === "Administrador" ? await listUsers() : [actor] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return NextResponse.json({ error: "Inicia sesión para consultar usuarios." }, { status: error instanceof AccessError ? error.status : 500 }); }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request); const actor = await requireSession(request);
    if (actor.role !== "Administrador") throw new AccessError("No tienes permisos para crear usuarios.", 403);
    const body = await request.json() as UserAccountInput & { password: string };
    if (typeof body.name !== "string" || !body.name.trim() || typeof body.email !== "string" || !body.email.trim().toLowerCase().endsWith("@itesa.edu.mx") || typeof body.password !== "string" || body.password.length < 6 || !["Estudiante", "Administrador"].includes(body.role)) return NextResponse.json({ error: "Completa nombre, correo ITESA, rol y una contraseña de al menos 6 caracteres." }, { status: 400 });
    return NextResponse.json({ user: await createUser(actor.id, body) }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "No fue posible crear el usuario." }, { status: error instanceof AccessError ? error.status : 400 }); }
}
