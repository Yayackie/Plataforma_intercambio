import { NextResponse } from "next/server";
import { requireSession,checkOrigin,AccessError } from "@/lib/session";
import { confirmAdmin } from "@/lib/admin-confirm";
export async function POST(request:Request) { try { checkOrigin(request); const actor=await requireSession(request); const body=await request.json() as {adminPassword?:string}; await confirmAdmin(actor,body.adminPassword); return NextResponse.json({ok:true}); } catch(e) { return NextResponse.json({error:e instanceof Error?e.message:"No fue posible confirmar."},{status:e instanceof AccessError?e.status:400}); } }
