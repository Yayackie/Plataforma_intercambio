"use client";
import { useState } from "react";
import { Pencil,Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CatalogEntry } from "@/lib/catalog-db";
export function InstitutionalCatalog({entries,onSave}:{entries:CatalogEntry[];onSave:(input:{id?:number;kind:string;name:string})=>Promise<void>}) {
  return <div className="config-grid">{(["career","category"] as const).map(kind=><CatalogGroup key={kind} kind={kind} entries={entries.filter(e=>e.kind===kind)} onSave={onSave}/>)}</div>;
}
function CatalogGroup({kind,entries,onSave}:{kind:string;entries:CatalogEntry[];onSave:(input:{id?:number;kind:string;name:string})=>Promise<void>}) {
  const [editing,setEditing]=useState<number|null>(null),[name,setName]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  return <article className="config-card"><h3>{kind==="career"?"Carreras":"Categorías"}</h3><ul className="catalog-entries">{entries.map(entry=><li key={entry.id}><span>{entry.name}</span><Button variant="ghost" size="icon" disabled={busy} aria-label={`Editar ${entry.name}`} onClick={()=>{setEditing(entry.id);setName(entry.name);setError("");}}><Pencil/></Button></li>)}</ul><form onSubmit={async e=>{e.preventDefault();if(!name.trim())return;setBusy(true);setError("");try{await onSave({id:editing??undefined,kind,name:name.trim()});setEditing(null);setName("");}catch(err){setError(err instanceof Error?err.message:"No se pudo guardar.");}finally{setBusy(false);}}}><label>{editing?"Nuevo nombre":kind==="career"?"Nueva carrera":"Nueva categoría"}<Input required maxLength={100} value={name} disabled={busy} onChange={e=>setName(e.target.value)}/></label>{error&&<p role="alert" className="user-form-error">{error}</p>}<div className="settings-actions"><Button disabled={busy} type="submit">{editing?<Pencil/>:<Plus/>}{editing?"Guardar nombre":"Agregar"}</Button>{editing&&<Button type="button" variant="outline" disabled={busy} onClick={()=>{setEditing(null);setName("");}}>Cancelar edición</Button>}</div></form></article>;
}
