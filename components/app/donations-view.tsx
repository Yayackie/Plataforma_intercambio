"use client";
import { useEffect, useRef, useState } from "react";
import { PublicDonations } from "./public-donations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { Donation, DonationAction } from "@/lib/donation-types";
type Person = { id: number; name: string; email: string };
async function api<T>(body?: object, publicOffer = false): Promise<T> {
  const response = await fetch(publicOffer ? "/api/donations/public" : "/api/donations", body ? { method: "action" in body ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : { cache: "no-store" });
  const data = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "No se pudo completar la operación.");
  return data;
}
export function DonationsView({ userId, onSearch, onContact }: { userId: number; onSearch: (q: string) => Promise<Person[]>; onContact: (id: number) => Promise<void> }) {
  const [items, setItems] = useState<Donation[]>([]), [tab, setTab] = useState<"explore" | "sent" | "received">("explore");
  const [loading, setLoading] = useState(true), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const [audience,setAudience]=useState<"public"|"direct">("public"),[revision,setRevision]=useState(0);
  const [open, setOpen] = useState(false), [person, setPerson] = useState<Person>(), [query, setQuery] = useState("");
  const [people, setPeople] = useState<Person[]>([]), [searching, setSearching] = useState(false), [formError, setFormError] = useState("");
  const [title, setTitle] = useState(""), [description, setDescription] = useState(""), [condition, setCondition] = useState("Bueno");
  const [confirmation, setConfirmation] = useState<{ item: Donation; action: DonationAction; label: string }>();
  const searchRef = useRef(onSearch); searchRef.current = onSearch;
  const lock = useRef(false), generation = useRef(0);
  useEffect(() => {
    let active = true;
    async function refresh() {
      if (lock.current) return;
      const version = generation.current;
      try { const result = await api<{ donations: Donation[] }>(); if (active && version === generation.current) { setItems(result.donations); setError(""); } }
      catch (e) { if (active) setError(e instanceof Error ? e.message : "No se pudieron cargar las donaciones."); }
      finally { if (active) setLoading(false); }
    }
    void refresh(); const timer = setInterval(refresh, 2000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  useEffect(() => {
    let active = true; setPeople([]);
    if (!open || audience === "public" || person || query.trim().length < 2) { setSearching(false); return; }
    setSearching(true); setFormError("");
    const timer = setTimeout(() => { void searchRef.current(query).then(p => { if (active) setPeople(p); }).catch(e => { if (active) setFormError(e.message); }).finally(() => { if (active) setSearching(false); }); }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [query, open, person, audience]);
  async function change(body: object, created = false) {
    if (lock.current) return;
    lock.current = true; generation.current++; setBusy(true); setError(""); setFormError("");
    try {
      await api(body, created && audience === "public"); setRevision(v=>v+1);
      if (created) { setOpen(false); setPerson(undefined); setQuery(""); setTitle(""); setDescription(""); setCondition("Bueno"); setTab("sent"); }
      setConfirmation(undefined);
      try { setItems((await api<{ donations: Donation[] }>()).donations); }
      catch { setError("Se guardó el cambio, pero no se pudo actualizar la lista. Se volverá a intentar."); }
    } catch (e) { const message = e instanceof Error ? e.message : "No se pudo guardar."; if (created) setFormError(message); else setError(message); }
    finally { lock.current = false; setBusy(false); }
  }
  const visible = items.filter(d => tab === "sent" ? d.donorId === userId : d.recipientId === userId);
  return <section className="view-section"><div className="section-heading"><div><h1>Donaciones</h1><p>Dona a la comunidad o a una persona. Explora artículos gratuitos y confirma tus entregas.</p></div><Button onClick={() => { setFormError(""); setOpen(true); }}>Donar un artículo</Button></div>
    <div className="loan-navigation" aria-label="Secciones de donaciones"><Button variant={tab === "explore" ? "default" : "outline"} onClick={() => setTab("explore")}>Explorar</Button><Button variant={tab === "sent" ? "default" : "outline"} onClick={() => setTab("sent")}>Mis donaciones</Button><Button variant={tab === "received" ? "default" : "outline"} onClick={() => setTab("received")}>Solicitudes y recibidas</Button></div>
    <PublicDonations userId={userId} mode={tab === "explore" ? "explore" : tab === "sent" ? "mine" : "requests"} revision={revision} />
    {tab !== "explore" && <><h2>Acuerdos de entrega</h2><p className="section-help">Aquí aparecen las donaciones dirigidas a una persona, ya sea que la hayas elegido entre los solicitantes o le hayas enviado una propuesta directamente. Solo los dos participantes pueden ver y confirmar la entrega.</p>
    {error && <p role="alert">{error}</p>}{loading ? <p role="status">Cargando donaciones…</p> : !error && !visible.length ? <div className="empty-state"><p>No tienes acuerdos de donación {tab === "sent" ? "enviadas" : "recibidas"}.</p></div> : null}
    <div className="loan-grid">{visible.map(d => {
      const donor = d.donorId === userId;
      const actions: {action: DonationAction; label: string}[] = donor
        ? [...(d.status === "Aceptada" ? [{action: "deliver" as const, label: "Informar entrega"}] : []), ...(["Pendiente", "Aceptada"].includes(d.status) ? [{action: "cancel" as const, label: "Cancelar donación"}] : [])]
        : d.status === "Pendiente" ? [{action: "accept", label: "Aceptar"}, {action: "reject", label: "Rechazar"}] : d.status === "Entrega informada" ? [{action: "receive", label: "Confirmar recepción"}] : [];
      return <article className="loan-card donation-card" key={d.id}><p className="eyebrow">{d.status}</p><h2>{d.title}</h2><p>{donor ? "Para" : "De"}: {donor ? d.recipientName : d.donorName}</p><p style={{whiteSpace: "pre-wrap", overflowWrap: "anywhere"}}>{d.description}</p><p>Estado físico: {d.condition}</p><small>Actualizada: {new Date(d.updatedAt).toLocaleString("es-MX")}</small>
        {d.status === "Entrega informada" && <p>El donante informó la entrega. Falta confirmar la recepción.</p>}
        <div className="dialog-actions" style={{flexWrap: "wrap"}}>{actions.map(a => <Button key={a.action} disabled={busy} onClick={() => { setError(""); setConfirmation({item: d, ...a}); }}>{a.label}</Button>)}<Button variant="outline" disabled={busy} onClick={async () => { setBusy(true); try { await onContact(donor ? d.recipientId : d.donorId); } catch (e) { setError(e instanceof Error ? e.message : "No se pudo abrir el chat."); } finally { setBusy(false); } }}>Enviar mensaje</Button></div></article>;
    })}</div>
    </>}
    <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}><DialogContent className="donation-dialog"><DialogHeader><DialogTitle>Donar un artículo</DialogTitle><DialogDescription>Elige quién podrá recibirlo y describe el artículo. La donación no tiene costo ni devolución.</DialogDescription></DialogHeader>
      <div className="loan-navigation"><Button disabled={busy} variant={audience === "public" ? "default" : "outline"} onClick={()=>{setAudience("public");setFormError("");}}>A la comunidad</Button><Button disabled={busy} variant={audience === "direct" ? "default" : "outline"} onClick={()=>{setAudience("direct");setFormError("");}}>A una persona</Button></div>
      {audience === "direct" && !person ? <><Input aria-label="Buscar destinatario" placeholder="Nombre o correo (mínimo 2 caracteres)" value={query} onChange={e => setQuery(e.target.value)} />{searching && <p role="status">Buscando…</p>}{!searching && query.trim().length >= 2 && !people.length && !formError && <p>No se encontraron usuarios activos.</p>}<div className="chat-people">{people.map(p => <Button key={p.id} variant="outline" onClick={() => { setPerson(p); setFormError(""); }}><strong>{p.name}</strong><small>{p.email}</small></Button>)}</div></> : <form onSubmit={e => { e.preventDefault(); void change({recipientId: person?.id, title, description, condition}, true); }}>{audience === "direct" && person ? <><p>Para: <strong>{person.name}</strong> ({person.email})</p><Button type="button" variant="ghost" disabled={busy} onClick={() => setPerson(undefined)}>Cambiar destinatario</Button></> : <p>Visible para la comunidad. Podrás elegir a un destinatario entre quienes lo soliciten.</p>}<div className="form-grid"><label className="full">Nombre del artículo<Input required maxLength={120} value={title} disabled={busy} onChange={e => setTitle(e.target.value)} /></label><label className="full">Descripción<Textarea required maxLength={2000} value={description} disabled={busy} onChange={e => setDescription(e.target.value)} /></label><label className="full">Estado físico<select value={condition} disabled={busy} onChange={e => setCondition(e.target.value)}>{["Excelente", "Muy bueno", "Bueno", "Con detalles"].map(c => <option key={c}>{c}</option>)}</select></label></div><div className="dialog-actions"><Button type="submit" disabled={busy || !title.trim() || !description.trim()}>{busy ? "Guardando…" : audience === "public" ? "Publicar donación" : "Enviar propuesta"}</Button></div></form>}{formError && <p role="alert">{formError}</p>}
    </DialogContent></Dialog>
    <Dialog open={!!confirmation} onOpenChange={value => { if (!value && !busy) setConfirmation(undefined); }}><DialogContent className="donation-dialog"><DialogHeader><DialogTitle>{confirmation?.label}</DialogTitle><DialogDescription>{confirmation?.action === "receive" ? "Confirma únicamente si ya recibiste el artículo. La donación quedará completada." : confirmation?.action === "deliver" ? "Confirma únicamente si ya entregaste el artículo. El destinatario deberá confirmar que lo recibió." : `Se actualizará la propuesta de donación de «${confirmation?.item.title ?? ""}».`}</DialogDescription></DialogHeader>{error && <p role="alert">{error}</p>}<div className="dialog-actions"><Button variant="outline" disabled={busy} onClick={() => setConfirmation(undefined)}>Volver</Button><Button disabled={busy} onClick={() => { if (confirmation) void change({id: confirmation.item.id, action: confirmation.action}); }}>Confirmar</Button></div></DialogContent></Dialog>
  </section>;
}
