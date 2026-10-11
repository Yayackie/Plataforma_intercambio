"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { careers } from "@/lib/demo-data";
import type { UserAccount, UserAccountInput } from "@/lib/marketplace-types";

export function ProfileSettings({ user, onSave, onCancel }: { user: UserAccount; onSave: (changes: Partial<UserAccountInput>) => Promise<void>; onCancel: () => void }) {
  const [name, setName] = useState(user.name);
  const [career, setCareer] = useState(user.career ?? careers[0]);
  const [semester, setSemester] = useState(user.semester ?? 1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <section className="view-section"><div className="section-heading"><div><h1>Configuración de perfil</h1><p>Personaliza tu información y las recomendaciones que recibes.</p></div></div><form className="settings-card" onSubmit={async (event) => { event.preventDefault(); setError(""); if (!name.trim()) { setError("Escribe tu nombre."); return; } setBusy(true); try { await onSave({ name: name.trim(), career: user.role === "Estudiante" ? career : null, semester: user.role === "Estudiante" ? semester : null }); } catch (err) { setError(err instanceof Error ? err.message : "No se pudo guardar el perfil."); } finally { setBusy(false); } }}><dl className="profile-details"><div><dt>Correo institucional</dt><dd>{user.email}</dd></div><div><dt>Rol</dt><dd>{user.role}</dd></div></dl><fieldset disabled={busy}><label htmlFor="profile-name">Nombre completo</label><Input id="profile-name" required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} />{user.role === "Estudiante" && <><label htmlFor="profile-career">Carrera</label><select id="profile-career" value={career} onChange={(event) => setCareer(event.target.value)}>{careers.map((item) => <option key={item}>{item}</option>)}</select><label htmlFor="profile-semester">Semestre</label><select id="profile-semester" value={semester} onChange={(event) => setSemester(Number(event.target.value))}>{Array.from({length:9}, (_, i) => <option key={i} value={i+1}>{i+1}° semestre</option>)}</select></>}</fieldset>{error && <p role="alert">{error}</p>}<div className="settings-actions"><Button type="submit" disabled={busy}>{busy ? "Guardando…" : "Guardar cambios"}</Button><Button type="button" variant="outline" disabled={busy} onClick={onCancel}>Volver al inicio</Button></div></form></section>;
}
