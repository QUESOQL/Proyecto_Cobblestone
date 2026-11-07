"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { LockKeyhole, Smartphone } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button, Field, TopBar, Wordmark } from "@/components/ui";

/*
 * Inicio de turno del terminal (celular del guardia). Dos pasos:
 *  1. Una sola vez por celular: entrar con la cuenta propia del terminal
 *     (se crea con `node scripts/equipo.mjs terminal "<nombre>"`). La sesión queda guardada.
 *  2. En cada turno: el PIN de quien atiende. Ese turno queda como autor de los accesos.
 * Con ?demo=1 se salta todo y se usa el terminal simulado (pruebas y presentaciones).
 */

export interface Turno {
  terminal: string;
  nombre: string;
  demo: boolean;
}

type Estado = { paso: "cargando" } | { paso: "cuenta"; persona?: string } | { paso: "pin"; terminal: string } | { paso: "listo"; turno: Turno };

const PIN_ERRORES: Record<string, string> = {
  pin_incorrecto: "PIN incorrecto.",
  pin_bloqueado: "Demasiados intentos. El terminal queda bloqueado 5 minutos.",
  no_es_terminal: "Esta cuenta no es un terminal activo.",
};

export function InicioTurno({ children }: { children: (turno: Turno, cerrarTurno: () => Promise<void>) => ReactNode }) {
  const [estado, setEstado] = useState<Estado>({ paso: "cargando" });

  const revisar = useCallback(async () => {
    if (new URLSearchParams(window.location.search).get("demo") === "1") {
      setEstado({ paso: "listo", turno: { terminal: "Modo demo", nombre: "Demo", demo: true } });
      return;
    }
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return setEstado({ paso: "cuenta" });
    const { data } = await supabase.rpc("mi_turno");
    const t = data as { terminal: string; turno_id: string | null; nombre: string | null } | null;
    // Hay sesión, pero no es un terminal: probablemente una persona entró desde este navegador.
    if (!t) return setEstado({ paso: "cuenta", persona: auth.user.email ?? "otra cuenta" });
    if (!t.turno_id) return setEstado({ paso: "pin", terminal: t.terminal });
    setEstado({ paso: "listo", turno: { terminal: t.terminal, nombre: t.nombre ?? "—", demo: false } });
  }, []);

  useEffect(() => {
    void revisar();
  }, [revisar]);

  const cerrarTurno = async () => {
    await supabase.rpc("cerrar_turno");
    await revisar();
  };

  if (estado.paso === "listo") return <>{children(estado.turno, cerrarTurno)}</>;

  return (
    <div className="min-h-dvh bg-ground">
      <TopBar title={<Wordmark sub="Terminal de acceso" />} />
      <main className="mx-auto flex w-full max-w-[420px] flex-col px-4 py-10">
        {estado.paso === "cargando" && <p className="text-[14px] text-muted">Revisando el terminal…</p>}
        {estado.paso === "cuenta" && <CuentaTerminal persona={estado.persona} onListo={revisar} />}
        {estado.paso === "pin" && <PinTurno terminal={estado.terminal} onListo={revisar} />}
      </main>
    </div>
  );
}

function CuentaTerminal({ persona, onListo }: { persona?: string; onListo: () => Promise<void> }) {
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    if (persona) await supabase.auth.signOut();
    const { error } = await supabase.auth.signInWithPassword({ email: correo.trim(), password: clave });
    setBusy(false);
    if (error) return setError("Correo o contraseña del terminal incorrectos.");
    await onListo();
  };

  return (
    <form onSubmit={entrar} className="flex flex-col gap-4" aria-label="Registrar este celular como terminal">
      <Smartphone size={36} strokeWidth={1.5} aria-hidden="true" />
      <h1 className="text-[28px] leading-[1.22]">Registrar este celular como terminal</h1>
      <p className="text-[14px] text-muted">
        Se hace una sola vez. Usa la cuenta del terminal que te entregó la administración del Hub; después basta el PIN de cada turno.
      </p>
      {persona && (
        <p className="card !p-4 text-[14px]">
          Este navegador tiene abierta la cuenta de {persona}, que no es un terminal. Al continuar se cierra esa sesión.
        </p>
      )}
      <Field label="Correo del terminal">
        <input className="input" type="email" autoComplete="username" value={correo} onChange={(e) => setCorreo(e.target.value)} />
      </Field>
      <Field label="Contraseña del terminal">
        <input className="input" type="password" autoComplete="current-password" value={clave} onChange={(e) => setClave(e.target.value)} />
      </Field>
      {error && (
        <p role="alert" className="text-[13px] text-negative">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" variant="primary" disabled={busy || !correo || !clave}>
        {busy ? "Un momento…" : "Registrar terminal"}
      </Button>
    </form>
  );
}

function PinTurno({ terminal, onListo }: { terminal: string; onListo: () => Promise<void> }) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abrir = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { data, error } = await supabase.rpc("iniciar_turno", { p_pin: pin });
    setBusy(false);
    const r = data as { ok: boolean; error?: string } | null;
    if (error) return setError(PIN_ERRORES[error.message] ?? "No se pudo abrir el turno. Revisa la conexión.");
    if (!r?.ok) {
      setPin("");
      return setError(PIN_ERRORES[r?.error ?? ""] ?? "PIN incorrecto.");
    }
    await onListo();
  };

  return (
    <form onSubmit={abrir} className="flex flex-col gap-4" aria-label="Iniciar turno">
      <LockKeyhole size={36} strokeWidth={1.5} aria-hidden="true" />
      <h1 className="text-[28px] leading-[1.22]">Iniciar turno</h1>
      <p className="text-[14px] text-muted">{terminal}. Ingresa tu PIN de recepción: los accesos de este turno quedarán a tu nombre.</p>
      <Field label="PIN">
        <input
          className="input num text-center text-[24px] tracking-[0.4em]"
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
        />
      </Field>
      {error && (
        <p role="alert" className="text-[13px] text-negative">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" variant="primary" disabled={busy || pin.length < 4}>
        {busy ? "Abriendo…" : "Iniciar turno"}
      </Button>
    </form>
  );
}
