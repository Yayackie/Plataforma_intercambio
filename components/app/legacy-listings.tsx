"use client";
import { useEffect,useState } from "react";
import type { Listing } from "@/lib/marketplace-types";
import { PublishDialog } from "./publish-dialog";
export function LegacyListings({userId,onCreate}:{userId:number;onCreate:(item:Omit<Listing,'id'|'owner'|'mine'|'accent'|'icon'>)=>Promise<void>}) {
  const [items,setItems]=useState<Listing[]>([]);
  useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem('campus-loop-prototype-v2')??'{}');const recovered=JSON.parse(localStorage.getItem('campus-recovered-'+userId)??'[]');setItems(Array.isArray(saved.listings)?saved.listings.filter((i:Listing)=>i.ownerId===userId&&!recovered.includes(i.id)):[]);}catch{setItems([]);}},[userId]);
  if(!items.length)return null;
  return <section className="legacy-listings"><h2>Publicaciones guardadas en este navegador</h2><p>Estas publicaciones se crearon antes de la sincronización. Revisa sus datos y compártelas para que todos puedan verlas. Conservamos la copia original en este equipo.</p>{items.map(item=><article key={item.id}><span>{item.title} · {item.mode}</span><PublishDialog initialListing={item} onCreate={async draft=>{await onCreate(draft);setItems(previous=>previous.filter(i=>i.id!==item.id));try{const key='campus-recovered-'+userId;const recovered=JSON.parse(localStorage.getItem(key)??'[]');localStorage.setItem(key,JSON.stringify([...recovered,item.id]));}catch{/* The shared publication is already saved. */}}}/></article>)}</section>;
}
