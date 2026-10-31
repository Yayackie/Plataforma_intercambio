import { NextResponse } from "next/server";
import { requireSession,AccessError } from "@/lib/session";
import { searchPeople } from "@/lib/messages-db";
export async function GET(request:Request) { try { const actor=await requireSession(request); return NextResponse.json({people:await searchPeople(actor,new URL(request.url).searchParams.get("q")??"")},{headers:{"Cache-Control":"no-store"}}); } catch(e) { return NextResponse.json({error:e instanceof Error?e.message:"No fue posible buscar usuarios."},{status:e instanceof AccessError?e.status:400}); } }
