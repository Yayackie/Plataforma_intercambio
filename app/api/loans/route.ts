import { NextResponse } from "next/server";
import { AccessError, checkOrigin, requireSession } from "@/lib/session";
import { confirmReturn, getLoans } from "@/lib/loans-db";
function failure(error: unknown) {
  return NextResponse.json({ error: error instanceof Error ? error.message : "No fue posible consultar el préstamo." }, { status: error instanceof AccessError ? error.status : 500 });
}
export async function GET(request: Request) {
  try { return NextResponse.json(await getLoans(await requireSession(request)), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return failure(error); }
}
export async function PATCH(request: Request) {
  try {
    checkOrigin(request);
    const user = await requireSession(request);
    const body = await request.json() as { id?: number };
    if (!Number.isSafeInteger(body.id) || Number(body.id) <= 0) throw new AccessError("Préstamo inválido.", 400);
    return NextResponse.json(await confirmReturn(user, Number(body.id)));
  } catch (error) { return failure(error); }
}
