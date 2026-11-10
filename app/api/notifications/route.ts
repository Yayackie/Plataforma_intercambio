import { NextResponse } from "next/server";
import { AccessError,checkOrigin,requireSession } from "@/lib/session";
import { getNotifications,markSectionRead } from "@/lib/notifications-db";
function failure(e:unknown){return NextResponse.json({error:e instanceof Error?e.message:'No se pudieron cargar los avisos.'},{status:e instanceof AccessError?e.status:500});}
export async function GET(request:Request){try{return NextResponse.json({notifications:await getNotifications(await requireSession(request))},{headers:{'Cache-Control':'no-store'}});}catch(e){return failure(e);}}
export async function PATCH(request:Request){try{checkOrigin(request);const actor=await requireSession(request);const body=await request.json() as {section:unknown;lastId:unknown};await markSectionRead(actor,body.section,body.lastId);return NextResponse.json({notifications:await getNotifications(actor)});}catch(e){return failure(e);}}
