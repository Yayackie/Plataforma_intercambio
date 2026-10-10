"use client";
import { FormEvent, useState } from "react";
import { ArrowRight, KeyRound, Loader2, LockKeyhole, ShieldCheck, UserRoundCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const demoAccounts = [
  { id: "alex", label: "Alex · Estudiante", email: "alex.rivera@example.com", password: "DemoAlex2026!" },
  { id: "lucia", label: "Lucía · Estudiante", email: "lucia.torres@example.com", password: "DemoLucia2026!" },
  { id: "mateo", label: "Mateo · Estudiante", email: "mateo.vega@example.com", password: "DemoMateo2026!" },
  { id: "sofia", label: "Sofía · Administrador", email: "sofia.luna@example.com", password: "DemoSofia2026!" },
];

export function AuthView({ onLogin }: { onLogin: (email: string, password: string) => Promise<void> }) {
  const [email, setEmail] = useState(demoAccounts[0].email);
  const [password, setPassword] = useState(demoAccounts[0].password);
  const [account, setAccount] = useState(demoAccounts[0].id);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function chooseAccount(id: string) {
    setAccount(id); const selected = demoAccounts.find((item) => item.id === id);
    if (selected) { setEmail(selected.email); setPassword(selected.password); setError(""); }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!email.trim().toLowerCase().endsWith("@itesa.edu.mx") && !demoAccounts.some((item) => item.email === email.trim().toLowerCase())) return setError("Usa tu correo institucional @itesa.edu.mx o selecciona una cuenta de prueba.");
    if (password.length < 6) return setError("La contraseña debe tener al menos 6 caracteres.");
    setBusy(true); setError("");
    try { await onLogin(email, password); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible iniciar sesión."); setBusy(false); }
  }

  return <main className="auth-page">
    <section className="auth-story">
      <div className="brand-lockup"><span className="brand-logo"><img src="/itesa-logo.png" alt="Instituto Tecnológico Superior del Oriente del Estado de Hidalgo" /></span><div><b>Campus Loop</b><small>Comunidad ITESA</small></div></div>
      <div className="auth-copy"><p className="eyebrow">COMUNIDAD ACADÉMICA ITESA</p><h1>Comparte.<br /><span>Aprende. Avanza.</span></h1><p>Materiales, equipo y conocimiento que siguen en movimiento dentro del campus.</p></div>
      <div className="auth-points"><span><ShieldCheck /> Comunidad verificada</span><span><LockKeyhole /> Contacto privado</span></div>
    </section>
    <section className="auth-panel"><form onSubmit={submit}>
      <p className="eyebrow">ACCESO INSTITUCIONAL</p><h2>Bienvenido.</h2><p>Ingresa con las credenciales asignadas a tu cuenta.</p>
      <label className="demo-account"><span><UserRoundCheck /> Cuenta de prueba</span><Select value={account} onValueChange={chooseAccount}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{demoAccounts.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}</SelectContent></Select></label>
      <label>Correo institucional<Input type="email" value={email} onChange={(event) => { setEmail(event.target.value); setAccount(""); }} /></label>
      <label>Contraseña<Input type="password" value={password} onChange={(event) => { setPassword(event.target.value); setAccount(""); }} /></label>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <Button type="submit" disabled={busy}>{busy ? <><Loader2 className="animate-spin" /> Verificando</> : <>Entrar <ArrowRight /></>}</Button>
      <small><KeyRound /> El rol y los permisos se cargan automáticamente desde la cuenta.</small>
    </form></section>
  </main>;
}
