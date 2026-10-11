"use client";
import { useState } from "react";
import { CalendarClock, Check, Clock3, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { Loan } from "@/lib/marketplace-types";
export function LoansView({ loans, onConfirm }: { loans: Loan[]; onConfirm: (id: number) => Promise<void> }) {
  const [selected, setSelected] = useState<Loan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function confirm() {
    if (!selected || busy) return;
    setBusy(true); setError("");
    try { await onConfirm(selected.id); setSelected(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible guardar la confirmación."); }
    finally { setBusy(false); }
  }
  return <section className="view-section"><div className="section-heading"><div><h1>Mis préstamos y devoluciones</h1><p>Quien recibió informa la devolución. El dueño confirma la recepción.</p></div></div>
    {!loans.length && <div className="empty-state"><p>No tienes préstamos registrados.</p></div>}
    <div className="loan-grid">{loans.map((loan) => {
      const complete = loan.ownerConfirmed && loan.borrowerConfirmed;
      const mine = loan.role === "owner" ? loan.ownerConfirmed : loan.borrowerConfirmed;
      const waiting = loan.role === "owner" && !loan.borrowerConfirmed;
      return <article key={loan.id} className={`loan-card ${complete ? "complete" : ""}`}><div className="loan-top"><span className="loan-icon">{complete ? <Check /> : <RotateCcw />}</span><div><p className="eyebrow">{complete ? "DEVOLUCIÓN COMPLETA" : loan.role === "owner" ? "TÚ PRESTASTE" : "TIENES PRESTADO"}</p><h3>{loan.item}</h3><p>Con {loan.counterpart}</p></div><span className="due"><CalendarClock /> {loan.due}</span></div>
      <div className="confirmation-flow"><div className={loan.borrowerConfirmed ? "done" : ""}><span>{loan.borrowerConfirmed ? <Check /> : <Clock3 />}</span><strong>Quien recibió</strong><small>{loan.borrowerConfirmed ? "Devolución informada" : "Debe devolver el artículo"}</small></div><i /><div className={loan.ownerConfirmed ? "done" : ""}><span>{loan.ownerConfirmed ? <Check /> : <Clock3 />}</span><strong>Dueño del artículo</strong><small>{loan.ownerConfirmed ? "Recepción confirmada" : "Recepción pendiente"}</small></div></div>
      <Progress value={complete ? 100 : loan.borrowerConfirmed ? 50 : 0} />
      {!complete && loan.borrowerConfirmed && <p className="return-pending" role="status">Pendiente de confirmación del dueño. El artículo sigue prestado.</p>}
      <Button disabled={busy || mine || complete || waiting} onClick={() => { setSelected(loan); setError(""); }}>{complete ? "Devolución completada" : mine ? "Esperando confirmación del dueño" : waiting ? "Esperando que informen la devolución" : loan.role === "owner" ? "Confirmar que recibí el artículo" : "Informar que lo devolví"}</Button></article>;
    })}</div>
    <AlertDialog open={selected !== null} onOpenChange={(open) => { if (!open && !busy) setSelected(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{selected?.role === "owner" ? "¿Ya recibiste el artículo?" : "¿Ya devolviste el artículo?"}</AlertDialogTitle><AlertDialogDescription>{selected?.role === "owner" ? "Confirma únicamente después de recibirlo físicamente. Se completará la devolución y el recurso volverá a estar disponible." : "Se informará al dueño en su sección de préstamos. El recurso seguirá prestado hasta que confirme que lo recibió."}</AlertDialogDescription></AlertDialogHeader>{error && <p role="alert" className="form-error">{error}</p>}<AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel><Button onClick={confirm} disabled={busy}>{busy ? "Guardando…" : selected?.role === "owner" ? "Sí, lo recibí" : "Sí, lo devolví"}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>;
}
