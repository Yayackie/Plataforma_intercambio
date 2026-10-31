"use client";
import { useState } from "react";
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
export function useAdminConfirmation() {
  const [pending,setPending]=useState<{description:string;run:(password:string)=>Promise<unknown>;resolve:(value:unknown)=>void;reject:(reason:Error)=>void}|null>(null);
  const [password,setPassword]=useState(""); const [error,setError]=useState(""); const [busy,setBusy]=useState(false);
  function confirm<T>(description:string,run:(password:string)=>Promise<T>):Promise<T> { setPassword("");setError("");return new Promise<T>((resolve,reject)=>setPending({description,run,resolve:value=>resolve(value as T),reject})); }
  function cancel() { if(busy)return;pending?.reject(new Error("Cambio cancelado."));setPending(null);setPassword(""); }
  const dialog=<Dialog open={!!pending} onOpenChange={open=>{if(!open)cancel();}}><DialogContent><DialogHeader><DialogTitle>Confirmar cambio administrativo</DialogTitle><DialogDescription>{pending?.description} Ingresa tu contraseña actual para autorizar esta operación.</DialogDescription></DialogHeader><form onSubmit={async e=>{e.preventDefault();if(!pending)return;setBusy(true);setError("");try{const result=await pending.run(password);pending.resolve(result);setPending(null);setPassword("");}catch(err){setError(err instanceof Error?err.message:"No se pudo confirmar.");setPassword("");}finally{setBusy(false);}}}><label htmlFor="admin-confirm-password">Tu contraseña de administrador</label><Input id="admin-confirm-password" type="password" autoComplete="current-password" required disabled={busy} value={password} onChange={e=>setPassword(e.target.value)} />{error&&<p role="alert" className="user-form-error">{error}</p>}<DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={cancel}>Cancelar</Button><Button type="submit" disabled={busy}>{busy?"Confirmando…":"Confirmar cambio"}</Button></DialogFooter></form></DialogContent></Dialog>;
  return {confirm,dialog};
}
