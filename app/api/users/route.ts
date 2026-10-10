import { NextResponse } from "next/server";
import { createUser, listUsers } from "@/lib/users-db";

export async function GET() {
  try { return NextResponse.json({ users: await listUsers() }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "No fue posible cargar los usuarios." }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.name?.trim() || !body.email?.toLowerCase().endsWith("@itesa.edu.mx") || String(body.password ?? "").length < 6) {
      return NextResponse.json({ error: "Completa nombre, correo ITESA y una contraseña de al menos 6 caracteres." }, { status: 400 });
    }
    return NextResponse.json({ user: await createUser(Number(body.actorId), body) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible crear el usuario.";
    return NextResponse.json({ error: message.includes("UNIQUE") ? "Ese correo ya está registrado." : message }, { status: message.includes("permisos") ? 403 : 400 });
  }
}
