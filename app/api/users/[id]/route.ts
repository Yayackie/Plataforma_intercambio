import { NextResponse } from "next/server";
import { deleteUser, updateUser } from "@/lib/users-db";
import { AccessError, checkOrigin, requireSession } from "@/lib/session";
import type { UserAccount, UserAccountInput } from "@/lib/marketplace-types";
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    checkOrigin(request); const actor = await requireSession(request);
    const { id } = await context.params;
    const body = await request.json() as Partial<UserAccountInput> & { status?: UserAccount["status"] };
    if (actor.role !== "Administrador" && actor.id !== Number(id)) throw new AccessError("No tienes permisos para editar esta cuenta.", 403);
    if (actor.role !== "Administrador" && (body.role !== undefined || body.status !== undefined || body.email !== undefined)) throw new AccessError("No puedes cambiar el rol, correo o estado de tu cuenta.", 403);
    if (body.email !== undefined && (typeof body.email !== "string" || !body.email.trim().toLowerCase().endsWith("@itesa.edu.mx"))) throw new AccessError("El correo debe terminar en @itesa.edu.mx.", 400);
    if (body.role !== undefined && !["Estudiante", "Administrador"].includes(body.role)) throw new AccessError("Rol inválido.", 400);
    if (body.status !== undefined && !["Activo", "Suspendido"].includes(body.status)) throw new AccessError("Estado inválido.", 400);
    if (body.password !== undefined && body.password.length < 6) throw new AccessError("La contraseña debe tener al menos 6 caracteres.", 400);
    return NextResponse.json({ user: await updateUser(actor.id, Number(id), body) });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "No fue posible actualizar el usuario." }, { status: error instanceof AccessError ? error.status : 400 }); }
}
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    checkOrigin(request); const actor = await requireSession(request);
    if (actor.role !== "Administrador") throw new AccessError("No tienes permisos para eliminar usuarios.", 403);
    const { id } = await context.params; await deleteUser(actor.id, Number(id));
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "No fue posible eliminar el usuario." }, { status: error instanceof AccessError ? error.status : 400 }); }
}
