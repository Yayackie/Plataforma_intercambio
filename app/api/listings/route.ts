import { NextResponse } from "next/server";
import { AccessError,checkOrigin,requireSession } from "@/lib/session";
import { getLoans } from "@/lib/loans-db";
import { getListings,createListing,changeListing } from "@/lib/listings-db";
function failure(e:unknown){return NextResponse.json({error:e instanceof Error?e.message:'No se pudo guardar la publicación.'},{status:e instanceof AccessError?e.status:500});}
export async function GET(request:Request){try{const actor=await requireSession(request);await getLoans(actor);return NextResponse.json({listings:await getListings(actor)},{headers:{'Cache-Control':'no-store'}});}catch(e){return failure(e);}}
export async function POST(request:Request){try{checkOrigin(request);const actor=await requireSession(request);await getLoans(actor);await createListing(actor,await request.json());return NextResponse.json({listings:await getListings(actor)});}catch(e){return failure(e);}}
export async function PATCH(request:Request){try{checkOrigin(request);const actor=await requireSession(request);await changeListing(actor,await request.json());return NextResponse.json({listings:await getListings(actor)});}catch(e){return failure(e);}}
