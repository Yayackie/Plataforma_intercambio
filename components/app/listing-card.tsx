"use client";
import { BookOpen, Box, Calculator, FlaskConical, MoreHorizontal, ShieldCheck, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Listing } from "@/lib/marketplace-types";
const icons = { tool: Wrench, book: BookOpen, shield: ShieldCheck, flask: FlaskConical, calc: Calculator, box: Box };
export function ListingCard({ item, onMessage, onReport, compact = false }: { item: Listing; onMessage: () => void; onReport: () => void; compact?: boolean }) {
  const Icon = icons[item.icon];
  return <article className={`listing-card ${compact ? "listing-card--compact" : ""}`}>
    <div className="listing-art" style={{ "--item-accent": item.accent } as React.CSSProperties}><span className="mode-chip">{item.mode}</span><Icon aria-hidden="true" /></div>
    <div className="listing-body"><div className="listing-heading"><div><p className="eyebrow">{item.category}</p><h3>{item.title}</h3></div><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Opciones para ${item.title}`}><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={onReport}>Reportar publicación</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>
      {!compact && <p className="listing-description">{item.description}</p>}<div className="listing-meta"><span className={`status-dot status-${item.status.toLowerCase().replace(" ", "-")}`}>{item.status}</span><span>Sem. {item.semester}</span><span>{item.condition}</span></div>
      <div className="listing-footer"><div><span className="owner-avatar">{item.owner.slice(0, 1)}</span><span>{item.owner}</span></div><strong>{item.mode === "Venta" ? `$${item.price}` : item.mode === "Préstamo" ? `${item.returnDays} días` : "Sin costo"}</strong></div>
      <Button disabled={item.mine || item.status !== "Disponible"} className="card-action" onClick={onMessage}>{item.mode === "Venta" ? "Me interesa" : item.mode === "Préstamo" ? "Solicitar préstamo" : "Solicitar donación"}</Button>
    </div></article>;
}
