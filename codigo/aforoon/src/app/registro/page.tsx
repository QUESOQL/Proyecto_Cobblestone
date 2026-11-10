"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { QrCredencial } from "@/components/qr-credencial";
import { Check, Mail, Nfc, ShieldCheck } from "lucide-react";
import { HUB, SEGMENTS, rutDv, type Segment } from "@/lib/data";
import { useAforo, useHydrated, type Profile } from "@/lib/store";
import { TRAINING_KINDS } from "@/lib/lab";
import { supabase } from "@/lib/supabase";
import { Avatar, Button, GoogleG, MobileShell, Pill, Wordmark, cx } from "@/components/ui";
import { authMessage } from "@/lib/auth-mensajes";

const REASONS = ["Trabajar en el cowork", "Capacitación", "Charlas", "Asesoría de empleo", "Reunión de trabajo"];

/* ------------------------------------------------------------------ RUT */

function cleanRut(v: string) {
  return v.replace(/[^0-9kK]/g, "").toUpperCase().slice(0, 9);
}

function formatRutInput(v: string) {
  const c = cleanRut(v);
  if (c.length < 2) return c;
  const body = c.slice(0, -1);
  const dv = c.slice(-1);
  return `${Number(body).toLocaleString("es-CL")}-${dv}`;
}

function validateRut(v: string): "vacio" | "incompleto" | "invalido" | "valido" {
  const c = cleanRut(v);
  if (!c) return "vacio";
  if (c.length < 8) return "incompleto";
  const body = Number(c.slice(0, -1));
  return rutDv(body) === c.slice(-1) ? "valido" : "invalido";
}

/* ------------------------------------------------------------------ pantalla */

/**
 * Paso 1: cuenta (correo y contraseña en Supabase Auth).
 * Paso 2: datos de la persona, una sola vez (registrar_persona cifra el RUT en la base).
 * Paso 3: la credencial.
 */
export default function RegistroPage() {
  const hydrated = useHydrated();
  const profile = useAforo((s) => s.profile);
  const signedIn = useAforo((s) => s.signedIn);

  if (!hydrated) return <MobileShell title={<Wordmark />}>{null}</MobileShell>;
  if (profile) return <Credential profile={profile} />;

  const step = signedIn ? 1 : 0;
  return (
    <MobileShell hideNav title={<Wordmark sub={HUB.name} />} action={<span className="num text-[12px] opacity-70">Paso {step + 1} de 3</span>}>
      <Steps current={step} />
      {signedIn ? <DataForm /> : <Welcome />}
    </MobileShell>
  );
}

function Steps({ current }: { current: number }) {
  return (
    <div className="mb-5 grid grid-cols-3 gap-1.5" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span key={i} className={cx("h-1 rounded-full", i <= current ? "bg-accent" : "bg-accent-track")} />
      ))}
    </div>
  );
}

function Welcome() {
  const [mode, setMode] = useState<"crear" | "entrar">("crear");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkMail, setCheckMail] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/.+@.+\..+/.test(email) || password.length < 6) {
      setError("Ingresa un correo válido y una contraseña de al menos 6 caracteres.");
      return;
    }
    setBusy(true);
    const res =
      mode === "crear" ? await supabase.auth.signUp({ email: email.trim(), password }) : await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (res.error) setError(authMessage(res.error.message));
    // Si el proyecto pide confirmar el correo, la sesión llega después del enlace.
    else if (mode === "crear" && !res.data.session) setCheckMail(true);
  };

  // Google devuelve a esta misma página; si algo falló, el motivo viene en la URL.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search + window.location.hash.replace(/^#/, "&"));
    const motivo = q.get("error_description");
    if (motivo) setError(authMessage(motivo));
  }, []);

  const google = async () => {
    setError(null);
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/registro` },
    });
    // Si todo va bien, el navegador ya se fue a Google; solo se vuelve aquí si hubo un error.
    setBusy(false);
    if (error) setError(authMessage(error.message));
  };

  return (
    <div className="enter flex flex-col">
      <div className="relative -mx-4 mb-5 h-[220px] overflow-hidden">
        <Image src="/photos/Fachada.webp" alt="Ilustración del Edificio Cowork del Hub Providencia" fill priority sizes="440px" className="object-cover object-[50%_22%]" />
      </div>
      <h1 className="text-[28px] leading-[1.22]">Entra al Hub sin llenar el formulario</h1>
      <p className="mt-2 text-[15px] leading-[22px] text-muted">
        Te registras una sola vez. Desde ahí, tu teléfono es tu credencial en la puerta de {HUB.address}.
      </p>

      {checkMail ? (
        <div className="card mt-6" role="status">
          <p className="flex items-center gap-2 text-[16px] font-medium">
            <Mail size={18} aria-hidden="true" /> Revisa tu correo
          </p>
          <p className="mt-1 text-[14px] text-muted">Te enviamos un enlace a {email}. Ábrelo para confirmar tu cuenta y sigue con tus datos.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 flex flex-col gap-4" noValidate aria-label={mode === "crear" ? "Crear cuenta" : "Entrar"}>
          <Button type="button" size="lg" onClick={() => void google()} disabled={busy}>
            <GoogleG /> Continuar con Google
          </Button>
          <p className="flex items-center gap-3 text-[13px] text-muted" aria-hidden="true">
            <span className="h-px flex-1 bg-[var(--hair)]" /> o con tu correo <span className="h-px flex-1 bg-[var(--hair)]" />
          </p>
          <div className="toggle self-start" role="tablist" aria-label="Cuenta">
            {(["crear", "entrar"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => {
                  setMode(m);
                  setError(null);
                }}
                className="toggle-option press"
              >
                {m === "crear" ? "Crear cuenta" : "Ya tengo cuenta"}
              </button>
            ))}
          </div>
          <Field label="Correo" htmlFor="email">
            <input id="email" type="email" inputMode="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </Field>
          <Field label="Contraseña" htmlFor="password" hint={mode === "crear" ? "Al menos 6 caracteres." : undefined}>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "crear" ? "new-password" : "current-password"}
            />
          </Field>
          {error && (
            <p role="alert" className="text-[13px] text-negative">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" variant="primary" disabled={busy}>
            {busy ? "Un momento…" : mode === "crear" ? "Crear cuenta" : "Entrar"}
          </Button>
        </form>
      )}
    </div>
  );
}

const ENROLL_ERRORS: Record<string, string> = {
  rut_invalido: "El RUT no es válido.",
  rut_registrado: "Ese RUT ya tiene una credencial. Entra con la cuenta con que lo registraste.",
  nombre_vacio: "Escribe tu nombre.",
};

function DataForm() {
  const enroll = useAforo((s) => s.enroll);
  const signOut = useAforo((s) => s.signOut);
  // Si entró con Google, el nombre ya viene de su cuenta.
  const authName = useAforo((s) => s.authName);
  const [name, setName] = useState(authName);
  const [rut, setRut] = useState("");
  const [phone, setPhone] = useState("");
  const [segment, setSegment] = useState<Segment | null>(null);
  const [occupation, setOccupation] = useState("");
  const [reason, setReason] = useState(REASONS[0]);
  const [consent, setConsent] = useState(false);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const rutState = validateRut(rut);
  const phoneOk = phone.replace(/\D/g, "").length === 8;
  const ready = name.trim().length > 3 && rutState === "valido" && phoneOk && segment && occupation.trim() && consent;

  const submit = async () => {
    setTouched(true);
    setServerError(null);
    if (!ready || !segment) return;
    setBusy(true);
    const r = await enroll({
      name: name.trim(),
      rut: formatRutInput(rut),
      phone: `+56 9 ${phone}`,
      segment,
      occupation: occupation.trim(),
      reason,
    });
    setBusy(false);
    if (!r.ok) setServerError(ENROLL_ERRORS[r.error ?? ""] ?? "No pudimos guardar tus datos. Inténtalo de nuevo.");
  };

  return (
    <form
      className="enter flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      noValidate
    >
      <div>
        <h1 className="text-[28px] font-normal leading-[1.22]">Tus datos, una sola vez</h1>
        <p className="mt-1 text-[14px] text-muted">
          Completa tus datos. Se guardan una vez y sirven para entrar siempre.
        </p>
      </div>

      <Field label="Nombre completo" htmlFor="name">
        <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
      </Field>
      <Field
        label="RUT"
        htmlFor="rut"
        hint={rutState === "valido" ? "RUT válido" : undefined}
        error={rutState === "invalido" ? "El dígito verificador no coincide." : touched && rutState !== "valido" ? "Ingresa tu RUT con dígito verificador." : undefined}
      >
        <div className="relative">
          <input
            id="rut"
            className="input num pr-10"
            inputMode="text"
            placeholder="12.345.678-5"
            value={rut}
            onChange={(e) => setRut(formatRutInput(e.target.value))}
            aria-invalid={rutState === "invalido"}
          />
          {rutState === "valido" && <Check size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-positive" aria-hidden="true" />}
        </div>
      </Field>
      <Field label="Teléfono" htmlFor="phone" error={touched && !phoneOk ? "Son 8 dígitos después del 9." : undefined}>
        <div className="flex">
          <span className="num flex h-11 flex-none items-center whitespace-nowrap rounded-l-control border border-r-0 border-control bg-raised px-3 text-[15px] text-muted">+56 9</span>
          <input
            id="phone"
            className="input num rounded-l-none"
            inputMode="numeric"
            placeholder="1234 5678"
            value={phone}
            onChange={(e) => {
              const d = e.target.value.replace(/\D/g, "").slice(0, 8);
              setPhone(d.length > 4 ? `${d.slice(0, 4)} ${d.slice(4)}` : d);
            }}
            autoComplete="tel-national"
          />
        </div>
      </Field>

      <fieldset>
        <legend className="mb-2 text-[14px] font-medium">¿Cómo usas el Hub?</legend>
        <div className="flex flex-wrap gap-2">
          {SEGMENTS.map((s) => (
            <button
              type="button"
              key={s.id}
              aria-pressed={segment === s.id}
              onClick={() => setSegment(s.id)}
              className={cx(
                "press h-9 rounded-full border px-3.5 text-[14px]",
                segment === s.id ? "border-accent bg-accent-soft font-medium text-accent-ink" : "border-control bg-surface",
              )}
            >
              {s.id}
            </button>
          ))}
        </div>
        {touched && !segment && <p className="mt-1.5 text-[12px] text-negative">Elige un perfil.</p>}
      </fieldset>

      <Field label="Ocupación" htmlFor="occ" error={touched && !occupation.trim() ? "Cuéntanos a qué te dedicas." : undefined}>
        <input id="occ" className="input" placeholder="Ej.: diseñadora independiente" value={occupation} onChange={(e) => setOccupation(e.target.value)} />
      </Field>
      <Field label="Motivo principal de tus visitas" htmlFor="reason">
        <select id="reason" className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
          {REASONS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </Field>

      <label className="flex gap-3 rounded-card bg-raised p-3.5">
        <input type="checkbox" className="mt-0.5 size-5 flex-none accent-[var(--accent)]" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span className="text-[13px] leading-[19px]">
          <span className="font-medium">Acepto el tratamiento de mis datos.</span>{" "}
          <span className="text-muted">
            Tu RUT se guarda cifrado y solo se usa para validar tu ingreso. Recepción ve tu nombre y foto, nunca el RUT completo.
            Puedes borrar tu cuenta cuando quieras (Ley 21.719). Más detalle en la{" "}
            <Link href="/privacidad" target="_blank" className="underline">
              política de privacidad
            </Link>{" "}
            y las{" "}
            <Link href="/terminos" target="_blank" className="underline">
              condiciones del servicio
            </Link>
            .
          </span>
        </span>
      </label>
      {touched && !consent && <p className="-mt-2 text-[12px] text-negative">Necesitamos tu consentimiento para crear la credencial.</p>}

      {serverError && (
        <p role="alert" className="text-[13px] text-negative">
          {serverError}
        </p>
      )}
      <Button type="submit" size="lg" variant="accent" className="mt-1" disabled={busy}>
        {busy ? "Guardando…" : "Crear mi credencial"}
      </Button>
      <button type="button" onClick={() => void signOut()} className="press h-11 rounded-control text-[14px] text-muted">
        Usar otra cuenta
      </button>
    </form>
  );
}

function Field({ label, htmlFor, hint, error, children }: { label: string; htmlFor: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-[14px] font-medium">
        {label}
      </label>
      {children}
      {error ? <p className="-mt-1 text-[12px] text-negative">{error}</p> : hint ? <p className="-mt-1 text-[12px] text-positive">{hint}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ credencial */

function Credential({ profile }: { profile: Profile }) {
  const deleteAccount = useAforo((s) => s.deleteAccount);
  const signOut = useAforo((s) => s.signOut);
  const myTrainings = useAforo((s) => s.myTrainings);
  const approved = TRAINING_KINDS.filter((k) => myTrainings[k.id]?.status === "aprobada");
  const hue = 210;

  return (
    <MobileShell title={<Wordmark sub="Mi credencial" />}>
      <div className="enter flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Avatar name={profile.name} hue={hue} size={48} />
          <div className="min-w-0">
            <h1 className="truncate text-[24px] font-normal leading-[1.3]">{profile.name}</h1>
            <p className="text-[13px] text-muted">
              {[profile.segment, profile.occupation].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>

        <section aria-labelledby="qr-title" className="rounded-card border border-border p-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="qr-title" className="text-[15px] font-medium">
              Tu QR de acceso
            </h2>
            <Link href="/credencial" className="text-[13px] underline underline-offset-4">
              Pantalla completa
            </Link>
          </div>
          <p className="mt-0.5 text-[13px] text-muted">Muéstralo en recepción. Cambia cada 30 segundos y sirve una sola vez.</p>
          <div className="mt-4">
            <QrCredencial persona={profile.id} size={196} />
          </div>
        </section>

        <section aria-labelledby="badges-title" className="rounded-card bg-raised p-4">
          <h2 id="badges-title" className="text-[15px] font-medium">
            Capacitaciones
          </h2>
          {approved.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Capacitaciones aprobadas">
              {approved.map((k) => (
                <li key={k.id}>
                  <Pill tone="positive">✓ {k.name}</Pill>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-0.5 text-[13px] text-muted">
              Aún no tienes. Con una capacitación aprobada puedes reservar las máquinas del Lab881 y del cowork textil.{" "}
              <Link href="/capacitaciones" className="link-more">
                Ver capacitaciones
              </Link>
            </p>
          )}
        </section>

        <section aria-labelledby="nfc-title" className="flex items-center gap-3 rounded-card border border-border p-4">
          <span className="flex size-11 flex-none items-center justify-center rounded-full bg-raised text-muted">
            <Nfc size={22} strokeWidth={1.6} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="nfc-title" className="text-[15px] font-medium">
              Tarjeta y tag de la puerta
            </h2>
            <p className="text-[13px] leading-[18px] text-muted">Pronto podrás entrar también con una tarjeta en el lector o tocando el tag de la puerta con tu teléfono.</p>
          </div>
          <Pill>Pronto</Pill>
        </section>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-card bg-raised p-4 text-[13px]">
          <div>
            <dt className="text-muted">RUT</dt>
            <dd className="num font-medium">{profile.rut}</dd>
          </div>
          <div>
            <dt className="text-muted">Teléfono</dt>
            <dd className="num font-medium">{profile.phone}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-muted">Motivo principal</dt>
            <dd className="font-medium">{profile.reason}</dd>
          </div>
        </dl>

        <div className="flex items-start gap-2 text-[12px] leading-[18px] text-muted">
          <ShieldCheck size={16} className="mt-px flex-none" aria-hidden="true" />
          Enrolado el {new Date(profile.enrolledAt).toLocaleDateString("es-CL", { day: "numeric", month: "long" })}. Puedes borrar tu
          cuenta y tus datos cuando quieras.
        </div>

        <Link href="/reservar" className="press flex h-12 items-center justify-center rounded-control bg-accent text-[15px] font-medium text-white">
          Reservar un espacio
        </Link>
        {profile.role === "admin" && (
          <Link href="/admin" className="press flex h-12 items-center justify-center rounded-control border border-control bg-surface text-[15px] font-medium">
            Abrir el panel de administración
          </Link>
        )}
        <button onClick={() => void signOut()} className="press h-11 rounded-control text-[14px]">
          Cerrar sesión
        </button>
        <button
          onClick={() => {
            if (globalThis.confirm("Se borran tu credencial, tus reservas e inscripciones. ¿Continuar?")) void deleteAccount();
          }}
          className="press h-11 rounded-control text-[14px] text-negative"
        >
          Borrar mis datos
        </button>
      </div>
    </MobileShell>
  );
}
