import { NextResponse } from "next/server";
import { login } from "@/lib/users-db";
import { AccessError, checkOrigin, createSession, deleteSession, requireSession, SESSION_COOKIE, SESSION_SECONDS } from "@/lib/session";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const body = await request.json() as { email?: string; password?: string };
    if (typeof body.email !== "string" || typeof body.password !== "string") return NextResponse.json({ error: "Escribe correo y contraseña." }, { status: 400 });
    const user = await login(body.email, body.password);
    if (!user) return NextResponse.json({ error: "Correo o contraseña incorrectos." }, { status: 401 });
    await deleteSession(request);
    const token = await createSession(user.id);
    const response = NextResponse.json({ user });
    response.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "strict", secure: new URL(request.url).protocol === "https:", path: "/", maxAge: SESSION_SECONDS });
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No fue posible iniciar sesión." }, { status: error instanceof AccessError ? error.status : 403 });
  }
}
export async function GET(request: Request) {
  try { return NextResponse.json({ user: await requireSession(request) }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "Inicia sesión para continuar." }, { status: 401 }); }
}
export async function DELETE(request: Request) {
  try {
    checkOrigin(request); await deleteSession(request);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, "", { path: "/", httpOnly: true, sameSite: "strict", maxAge: 0 });
    return response;
  } catch (error) { return NextResponse.json({ error: "No se pudo cerrar la sesión." }, { status: error instanceof AccessError ? error.status : 500 }); }
}
