import { NextResponse } from "next/server";
import { requireSession, checkOrigin, AccessError } from "@/lib/session";
import { getPublicDonations,publishDonation,actOnPublicDonation } from "@/lib/public-donations-db";
export async function GET(request:Request) {
  try { return NextResponse.json({offers:await getPublicDonations(await requireSession(request))},{headers:{'Cache-Control':'no-store'}}); } catch(e){return failure(e);}
}
async function mutate(request:Request,create:boolean) {
  try { checkOrigin(request);const actor=await requireSession(request);const body=await request.json();
    if(!body || typeof body!=='object' || Array.isArray(body)) throw new AccessError('Datos inválidos.',400);
    if(create)await publishDonation(actor,body as Record<string,unknown>);else await actOnPublicDonation(actor,body as Record<string,unknown>);
    return NextResponse.json({ok:true},{status:create?201:200});
  }catch(e){return failure(e);}
}
export const POST=(r:Request)=>mutate(r,true);
export const PATCH=(r:Request)=>mutate(r,false);
function failure(e:unknown){return NextResponse.json({error:e instanceof AccessError?e.message:'No se pudo completar la operación.'},{status:e instanceof AccessError?e.status:e instanceof SyntaxError?400:500});}
