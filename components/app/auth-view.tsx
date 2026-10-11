"use client";
import { FormEvent, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AuthView({ onLogin }: { onLogin: (email: string, password: string) => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!email.trim().toLowerCase().endsWith("@itesa.edu.mx")) return setError("Usa tu correo institucional @itesa.edu.mx.");
    if (!password) return setError("Escribe tu contraseña.");
    setBusy(true); setError("");
    try { await onLogin(email.trim().toLowerCase(), password); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible iniciar sesión."); }
    finally { setBusy(false); }
  }
  return <main className="auth-page"><section className="auth-panel"><form onSubmit={submit}>
    <img className="auth-logo" src="/itesa-logo.png" alt="ITESA" /><h1>Campus Loop</h1><p>Ingresa para consultar y compartir recursos académicos.</p>
    <label>Correo institucional<Input type="email" autoComplete="username" placeholder="usuario@itesa.edu.mx" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
    <label>Contraseña<Input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
    {error && <p className="auth-error" role="alert">{error}</p>}
    <Button type="submit" disabled={busy}>{busy ? <><Loader2 className="animate-spin" /> Verificando</> : <>Entrar <ArrowRight /></>}</Button>
  </form></section></main>;
}
