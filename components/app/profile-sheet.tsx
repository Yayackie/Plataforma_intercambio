"use client";
import { useState } from "react";
import { ChevronRight, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { UserAccount } from "@/lib/marketplace-types";

export function ProfileSheet({ user, onSettings, onSignOut }: { user: UserAccount; onSettings: () => void; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  return <Sheet open={open} onOpenChange={setOpen}><SheetTrigger asChild><button className="profile-mini" aria-label="Abrir mi perfil"><span>{user.initials}</span><p><strong>{user.name}</strong><small>{user.role}</small></p><ChevronRight /></button></SheetTrigger><SheetContent className="profile-sheet"><SheetHeader><div className="profile-hero"><span>{user.initials}</span><div><p className="eyebrow">MI CUENTA</p><SheetTitle>{user.name}</SheetTitle><SheetDescription>Tu información institucional.</SheetDescription></div></div></SheetHeader><dl className="profile-details"><div><dt>Correo</dt><dd>{user.email}</dd></div><div><dt>Rol</dt><dd>{user.role}</dd></div>{user.role === "Estudiante" && <><div><dt>Carrera</dt><dd>{user.career ?? "Sin especificar"}</dd></div><div><dt>Semestre</dt><dd>{user.semester ? `${user.semester}° semestre` : "Sin especificar"}</dd></div></>}</dl><div className="profile-actions"><Button onClick={() => { setOpen(false); onSettings(); }}><Settings /> Configurar mi perfil</Button><Button variant="ghost" onClick={onSignOut}><LogOut /> Cerrar sesión</Button></div></SheetContent></Sheet>;
}
