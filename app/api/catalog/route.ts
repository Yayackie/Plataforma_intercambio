import { NextResponse } from "next/server";
import { requireSession,checkOrigin,AccessError } from "@/lib/session";
import { confirmAdmin } from "@/lib/admin-confirm";
import { getCatalog,saveCatalog } from "@/lib/catalog-db";
export async function GET(request:Request) { try { await requireSession(request); return NextResponse.json({entries:await getCatalog()},{headers:{"Cache-Control":"no-store"}}); } catch(e) { return failure(e); } }
export async function POST(request:Request) { try { checkOrigin(request); const actor=await requireSession(request); const body=await request.json() as {adminPassword?:string;id?:number;kind?:string;name?:string}; await confirmAdmin(actor,body.adminPassword); return NextResponse.json({entries:await saveCatalog(body)}); } catch(e) { return failure(e); } }
function failure(e:unknown) { return NextResponse.json({error:e instanceof Error?e.message:"No se pudo actualizar el catálogo."},{status:e instanceof AccessError?e.status:400}); }
