import { NextResponse } from "next/server";
import { login } from "@/lib/users-db";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: string; password?: string };
    const user = await login(body.email ?? "", body.password ?? "");
    if (!user) return NextResponse.json({ error: "Correo o contraseña incorrectos." }, { status: 401 });
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No fue posible iniciar sesión." }, { status: 403 });
  }
}
