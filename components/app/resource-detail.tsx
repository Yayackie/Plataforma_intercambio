"use client";
import { useState } from "react";
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription } from "@/components/ui/dialog";
export function ResourceDetail({open,onOpenChange,title,description,image,details,children}:{open:boolean;onOpenChange:(open:boolean)=>void;title:string;description:string;image?:string;details:[string,string][];children?:React.ReactNode}) {
  const [zoomed,setZoomed]=useState(false);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="resource-dialog sm:max-w-[760px]"><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>Información completa de la publicación</DialogDescription></DialogHeader>{image&&<button type="button" className={`resource-full-image ${zoomed?"zoomed":""}`} aria-pressed={zoomed} onClick={()=>setZoomed(!zoomed)} aria-label={zoomed?"Ajustar fotografía":"Ampliar fotografía"}><img src={image} alt={title}/></button>}<p className="resource-description">{description}</p><dl className="resource-details">{details.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>{children&&<div className="resource-actions">{children}</div>}</DialogContent></Dialog>;
}
