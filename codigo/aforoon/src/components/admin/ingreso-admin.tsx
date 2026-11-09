"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { useAforo, useHydrated } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { authMessage } from "@/lib/auth-mensajes";
import { Button, GoogleG, TopBar, Wordmark } from "@/components/ui";

/*
 * Puerta del panel de administración. Solo entra una cuenta con rol admin (se asigna con
 * `node scripts/equipo.mjs rol <correo> admin`); la base igual rechaza a cualquier otra
 * (panel_admin() responde sin_permiso), esto solo evita mostrarle un panel vacío.
 * Con ?demo=1 se ve el panel con datos de ejemplo, sin cuenta (pruebas y presentaciones).
 */

export function IngresoAdmin({ children }: { children: (demo: boolean) => ReactNode }) {
  const [demo, setDemo] = useState<boolean | null>(null);
  const ready = useHydrated();
  const signedIn = useAforo((s) => s.signedIn);
  const role = useAforo((s) => s.profile?.role);

  useEffect(() => setDemo(new URLSearchParams(window.location.search).get("demo") === "1"), []);

  if (demo) return children(true);
  if (demo === null || !ready) return <Marco><p className="text-[14px] text-muted">Cargando…</p></Marco>;
  if (role === "admin") return children(false);
  return <Marco>{signedIn ? <SinAcceso /> : <Entrar />}</Marco>;
}

function Marco({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-ground">
      <TopBar title={<Wordmark sub="Administración" />} />
      <main className="mx-auto max-w-[440px] px-4 py-10">{children}</main>
    </div>
  );
}

function Encabezado({ texto }: { texto: string }) {
  return (
    <>
      <span className="inline-flex size-12 items-center justify-center rounded-full bg-raised" aria-hidden="true">
        <ShieldCheck size={22} />
      </span>
      <h1 className="mt-4 text-[28px] leading-[1.22]">Panel de administración</h1>
      <p className="mt-2 text-[15px] leading-[22px] text-muted">{texto}</p>
    </>
  );
}

function Entrar() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google devuelve a esta misma página; si algo falló, el motivo viene en la URL.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search + window.location.hash.replace(/^#/, "&"));
    const motivo = q.get("error_description");
    if (motivo) setError(authMessage(motivo));
  }, []);

  const google = async () => {
    setError(null);
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/admin` } });
    setBusy(false);
    if (error) setError(authMessage(error.message));
  };

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/.+@.+\..+/.test(email) || !password) {
      setError("Ingresa tu correo y tu contraseña.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    // Si entra, el store recarga el perfil y la puerta muestra el panel (o "sin acceso").
    if (error) setError(authMessage(error.message));
  };

  return (
    <div className="enter">
      <Encabezado texto="Solo para el equipo del Hub. Entra con la cuenta que tiene permiso de administración." />
      <form onSubmit={entrar} className="mt-6 flex flex-col gap-4" noValidate aria-label="Entrar al panel">
        <Button type="button" size="lg" onClick={() => void google()} disabled={busy}>
          <GoogleG /> Continuar con Google
        </Button>
        <p className="flex items-center gap-3 text-[13px] text-muted" aria-hidden="true">
          <span className="h-px flex-1 bg-[var(--hair)]" /> o con correo <span className="h-px flex-1 bg-[var(--hair)]" />
        </p>
        <label className="flex flex-col gap-1.5">
          <span className="text-[14px] font-medium">Correo</span>
          <input type="email" inputMode="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[14px] font-medium">Contraseña</span>
          <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </label>
        {error && (
          <p role="alert" className="text-[13px] text-negative">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" variant="primary" disabled={busy}>
          {busy ? "Un momento…" : "Entrar al panel"}
        </Button>
      </form>
      <Link href="/admin?demo=1" className="mt-6 block text-center text-[14px] underline underline-offset-4">
        Ver el panel con datos de ejemplo
      </Link>
    </div>
  );
}

function SinAcceso() {
  const signOut = useAforo((s) => s.signOut);
  const [correo, setCorreo] = useState("");
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setCorreo(data.user?.email ?? ""));
  }, []);

  return (
    <div className="enter">
      <Encabezado texto="Esta cuenta no tiene acceso al panel." />
      <div className="card mt-6 text-[14px]">
        <p>
          Entraste como <span className="font-medium">{correo || "…"}</span>. El panel es solo para cuentas con permiso de administración; pídeselo a quien
          administra AforoON en el Hub.
        </p>
      </div>
      <div className="mt-6 flex flex-col gap-3">
        <Button size="lg" variant="primary" onClick={() => void signOut()}>
          Entrar con otra cuenta
        </Button>
        <Link href="/inicio" className="text-center text-[14px] underline underline-offset-4">
          Ir a mi credencial
        </Link>
      </div>
    </div>
  );
}
