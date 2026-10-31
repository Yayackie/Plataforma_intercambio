import { NextResponse } from "next/server";
import { requireSession, AccessError } from "@/lib/session";
import { getActivity } from "@/lib/activity-db";
export async function GET(request: Request) {
  try { const actor = await requireSession(request); return NextResponse.json({ events: await getActivity(actor.id) }, { headers: { "Cache-Control": "no-store" } }); }
  catch (e) { return NextResponse.json({error: e instanceof AccessError ? e.message : "No se pudo consultar el historial."}, {status: e instanceof AccessError ? e.status : 500}); }
}
