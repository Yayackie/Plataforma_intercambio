import { NextResponse } from "next/server";
import { deleteUser, updateUser } from "@/lib/users-db";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json(); const { id } = await context.params;
    return NextResponse.json({ user: await updateUser(Number(body.actorId), Number(id), body) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible actualizar el usuario.";
    return NextResponse.json({ error: message.includes("UNIQUE") ? "Ese correo ya está registrado." : message }, { status: message.includes("permisos") ? 403 : 400 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json(); const { id } = await context.params;
    await deleteUser(Number(body.actorId), Number(id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible eliminar el usuario.";
    return NextResponse.json({ error: message }, { status: message.includes("permisos") ? 403 : 400 });
  }
}
