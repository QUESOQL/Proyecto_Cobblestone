"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Check, ChevronLeft, Mail, Nfc, ShieldCheck } from "lucide-react";
import { HUB, SEGMENTS, rutDv, type Segment } from "@/lib/data";
import { useAforo, useHydrated, type Profile } from "@/lib/store";
import { Avatar, Button, MobileShell, Pill, Wordmark, cx } from "@/components/ui";

const REASONS = ["Trabajar en el cowork", "Capacitación", "Charlas", "Asesoría de empleo", "Reunión de trabajo"];
const QR_PERIOD = 30;

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

export default function RegistroPage() {
  const hydrated = useHydrated();
  const profile = useAforo((s) => s.profile);
  const [step, setStep] = useState<0 | 1>(0);
  const [provider, setProvider] = useState<Profile["provider"]>("google");

  if (!hydrated) return <MobileShell title={<Wordmark />}>{null}</MobileShell>;
  if (profile) return <Credential profile={profile} />;

  return (
    <MobileShell
      hideNav
      title={
        step === 0 ? (
          <Wordmark sub={HUB.name} />
        ) : (
          <button onClick={() => setStep(0)} className="press -ml-2 flex h-11 items-center gap-1 rounded-control px-2 text-[14px]">
            <ChevronLeft size={18} aria-hidden="true" /> Volver
          </button>
        )
      }
      action={<span className="num text-[12px] text-muted">Paso {step + 1} de 3</span>}
    >
      <Steps current={step} />
      {step === 0 ? (
        <Welcome
          onPick={(p) => {
            setProvider(p);
            setStep(1);
          }}
        />
      ) : (
        <DataForm provider={provider} />
      )}
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

function Welcome({ onPick }: { onPick: (p: Profile["provider"]) => void }) {
  return (
    <div className="enter flex flex-col">
      <div className="relative -mx-4 -mt-5 mb-5 h-[260px] overflow-hidden">
        <Image src="/hub/fachada.jpg" alt="Entrada del Edificio Cowork del Hub Providencia" fill priority sizes="440px" className="object-cover object-[50%_40%]" />
      </div>
      <h1 className="text-[28px] font-bold leading-[32px] tracking-[-0.02em]">Entra al Hub sin llenar el formulario</h1>
      <p className="mt-3 text-[15px] leading-[22px] text-muted">
        Te registras una sola vez. Desde ahí, tu teléfono es tu credencial en la puerta de {HUB.address}.
      </p>
      <div className="mt-6 flex flex-col gap-2.5">
        <Button size="lg" variant="primary" onClick={() => onPick("google")}>
          <GoogleG /> Continuar con Google
        </Button>
        <Button size="lg" onClick={() => onPick("apple")}>
          <AppleLogo /> Continuar con Apple
        </Button>
        <Button size="lg" variant="ghost" onClick={() => onPick("correo")}>
          <Mail size={18} aria-hidden="true" /> Usar mi correo
        </Button>
      </div>
      <p className="mt-5 text-[12px] leading-[18px] text-muted">
        Hoy el ingreso se registra con un formulario que se llena en cada visita. Con AforoON lo llenas una vez y entras en
        menos de 7 segundos.
      </p>
    </div>
  );
}

function DataForm({ provider }: { provider: Profile["provider"] }) {
  const enroll = useAforo((s) => s.enroll);
  // El proveedor social entrega nombre y correo; el resto lo completa la persona.
  const [name, setName] = useState(provider === "correo" ? "" : "Valentina Muñoz Rojas");
  const [email, setEmail] = useState(provider === "correo" ? "" : "valentina.munoz@gmail.com");
  const [rut, setRut] = useState("");
  const [phone, setPhone] = useState("");
  const [segment, setSegment] = useState<Segment | null>(null);
  const [occupation, setOccupation] = useState("");
  const [reason, setReason] = useState(REASONS[0]);
  const [consent, setConsent] = useState(false);
  const [touched, setTouched] = useState(false);

  const rutState = validateRut(rut);
  const phoneOk = phone.replace(/\D/g, "").length === 8;
  const emailOk = /.+@.+\..+/.test(email);
  const ready = name.trim().length > 3 && emailOk && rutState === "valido" && phoneOk && segment && occupation.trim() && consent;

  const submit = () => {
    setTouched(true);
    if (!ready || !segment) return;
    enroll({
      name: name.trim(),
      email,
      provider,
      rut: formatRutInput(rut),
      phone: `+56 9 ${phone}`,
      segment,
      occupation: occupation.trim(),
      reason,
      consentAt: new Date().toISOString(),
    });
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
        <h1 className="text-[24px] font-semibold leading-[30px] tracking-[-0.01em]">Tus datos, una sola vez</h1>
        <p className="mt-1 text-[14px] text-muted">
          {provider === "correo" ? "Completa tus datos." : `Trajimos tu nombre y correo desde ${provider === "google" ? "Google" : "Apple"}.`}
        </p>
      </div>

      <Field label="Nombre completo" htmlFor="name">
        <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
      </Field>
      <Field label="Correo" htmlFor="email" error={touched && !emailOk ? "Revisa el correo." : undefined}>
        <input id="email" type="email" inputMode="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
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
            Puedes borrar tu cuenta cuando quieras (Ley 21.719).
          </span>
        </span>
      </label>
      {touched && !consent && <p className="-mt-2 text-[12px] text-negative">Necesitamos tu consentimiento para crear la credencial.</p>}

      <Button type="submit" size="lg" variant="accent" className="mt-1">
        Crear mi credencial
      </Button>
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
  const reset = useAforo((s) => s.reset);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const left = QR_PERIOD - (tick % QR_PERIOD);
  const window = Math.floor(tick / QR_PERIOD);
  // El QR dinámico cambia cada 30 s: una captura de pantalla no sirve para entrar.
  const token = useMemo(() => `AFORO:1:${profile.rut.replace(/\D/g, "").slice(-6)}:${Date.now().toString(36).slice(0, -4)}${window}`, [profile.rut, window]);
  const hue = 210;

  return (
    <MobileShell title={<Wordmark sub="Mi credencial" />}>
      <div className="enter flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Avatar name={profile.name} hue={hue} size={48} />
          <div className="min-w-0">
            <h1 className="truncate text-[20px] font-semibold leading-[26px]">{profile.name}</h1>
            <p className="text-[13px] text-muted">
              {profile.segment} · {profile.occupation}
            </p>
          </div>
        </div>

        <section aria-labelledby="nfc-title" className="flex items-center gap-3 rounded-card border border-border p-4">
          <span className="flex size-11 flex-none items-center justify-center rounded-full bg-accent-soft text-accent">
            <Nfc size={22} strokeWidth={1.6} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="nfc-title" className="text-[15px] font-medium">
              Credencial NFC activa
            </h2>
            <p className="text-[13px] leading-[18px] text-muted">Acerca tu teléfono al lector de la puerta. No necesitas abrir la app.</p>
          </div>
          <Pill tone="positive">Activa</Pill>
        </section>

        <section aria-labelledby="qr-title" className="rounded-card border border-border p-4">
          <div className="flex items-baseline justify-between">
            <h2 id="qr-title" className="text-[15px] font-medium">
              QR dinámico
            </h2>
            <span className="num text-[12px] text-muted" aria-live="off">
              Cambia en {left} s
            </span>
          </div>
          <p className="mt-0.5 text-[13px] text-muted">Si tu teléfono no tiene NFC, muestra este código en el lector.</p>
          <div className="mt-4 flex justify-center">
            <div className="relative rounded-card bg-surface p-3" style={{ boxShadow: "inset 0 0 0 1px var(--border)" }}>
              <QRCodeSVG value={token} size={196} level="M" fgColor="#111827" bgColor="#ffffff" key={window} className="enter" />
            </div>
          </div>
          <div className="mt-4 h-1 overflow-hidden rounded-full bg-accent-track" aria-hidden="true">
            <div
              className="h-full bg-accent"
              style={{ width: `${(left / QR_PERIOD) * 100}%`, transition: left === QR_PERIOD ? "none" : "width 1000ms linear" }}
            />
          </div>
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
        <button onClick={reset} className="press h-11 rounded-control text-[14px] text-negative">
          Borrar mi cuenta (reinicia la demo)
        </button>
      </div>
    </MobileShell>
  );
}

/* ------------------------------------------------------------------ logos */

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function AppleLogo() {
  return (
    <svg width="16" height="18" viewBox="0 0 384 470" aria-hidden="true" fill="currentColor">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}
