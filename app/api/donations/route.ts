import { NextResponse } from "next/server";
import { requireSession, checkOrigin, AccessError } from "@/lib/session";
import { getDonations, createDonation, updateDonation } from "@/lib/donations-db";
export async function GET(request: Request) {
  try { return NextResponse.json({ donations: await getDonations(await requireSession(request)) }, { headers: { "Cache-Control": "no-store" } }); }
  catch (e) { return failure(e); }
}
async function mutate(request: Request, create: boolean) {
  try {
    checkOrigin(request);
    const actor = await requireSession(request);
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new AccessError("Datos inválidos.", 400);
    const input = body as Record<string, unknown>;
    if (create) await createDonation(actor, input); else await updateDonation(actor, input.id, input.action);
    return NextResponse.json({ ok: true }, { status: create ? 201 : 200 });
  } catch (e) { return failure(e); }
}
export const POST = (request: Request) => mutate(request, true);
export const PATCH = (request: Request) => mutate(request, false);
function failure(e: unknown) {
  return NextResponse.json({ error: e instanceof AccessError ? e.message : "No se pudo completar la operación." },
    { status: e instanceof AccessError ? e.status : e instanceof SyntaxError ? 400 : 500 });
}
