import { NextResponse } from "next/server";
import { AccessError,checkOrigin,requireSession } from "@/lib/session";
import { confirmAdmin } from "@/lib/admin-confirm";
import { getReports,reportListing,resolveReport } from "@/lib/reports-db";
function failure(e:unknown){return NextResponse.json({error:e instanceof Error?e.message:'No se pudo guardar el reporte.'},{status:e instanceof AccessError?e.status:500});}
export async function GET(request:Request){try{return NextResponse.json({reports:await getReports(await requireSession(request))},{headers:{'Cache-Control':'no-store'}});}catch(e){return failure(e);}}
export async function POST(request:Request){try{checkOrigin(request);const actor=await requireSession(request);const body=await request.json() as {id:unknown};return NextResponse.json({created:await reportListing(actor,body.id),reports:await getReports(actor)});}catch(e){return failure(e);}}
export async function PATCH(request:Request){try{checkOrigin(request);const actor=await requireSession(request);const body=await request.json() as {id:unknown;action:unknown;adminPassword:string};await confirmAdmin(actor,body.adminPassword);await resolveReport(actor,body.id,body.action);return NextResponse.json({reports:await getReports(actor)});}catch(e){return failure(e);}}
