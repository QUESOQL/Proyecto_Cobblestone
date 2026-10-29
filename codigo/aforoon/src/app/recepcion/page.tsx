"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { CloudOff, Nfc, QrCode, RotateCcw, UserPlus, Wifi } from "lucide-react";
import {
  CURRENT_BLOCK,
  MEMBERS,
  NOW_MIN,
  TODAY,
  blockLabel,
  formatMin,
  maskRut,
  memberById,
  unitById,
  unitsOfZone,
  zoneById,
  type AccessMethod,
  type Member,
  type Reservation,
  type ZoneId,
} from "@/lib/data";
import { ME_ID, allReservations, insideNow, isLate, trainingStatus, useAforo, useHydrated, type AccessEvent } from "@/lib/store";
import { BASE_MACHINE_BOOKINGS, machineById, trainingKind, type MachineBooking } from "@/lib/lab";
import { Avatar, Button, CapacityTrack, Pill, TopBar, Wordmark, cx } from "@/components/ui";

type Mode = "entrada" | "salida";
type Person = { id: string; name: string; rut: string; hue: number; segment: string; verified: boolean };

interface Result {
  person: Person;
  event: AccessEvent;
  reservation?: Reservation;
  /** Reserva de máquina con la que entró (Lab881 o cowork textil). */
  machine?: MachineBooking;
}

/** Reserva de máquina que corresponde a esta hora: empieza dentro de la próxima hora o está en curso. */
function machineNow(bookings: MachineBooking[], memberId: string) {
  return bookings.find(
    (b) => b.memberId === memberId && b.status === "confirmada" && b.day === TODAY && b.startMin - 60 <= NOW_MIN && NOW_MIN < b.startMin + b.hours * 60,
  );
}

const RESULT_COPY: Record<AccessEvent["result"], { led: "ok" | "no"; title: string; tone: "positive" | "negative" | "warning" | "accent" }> = {
  aprobado: { led: "ok", title: "Acceso validado", tone: "positive" },
  excepcion: { led: "ok", title: "Ingreso por excepción", tone: "accent" },
  sin_reserva: { led: "no", title: "Sin reserva para este bloque", tone: "negative" },
  no_enrolado: { led: "no", title: "Credencial no enrolada", tone: "warning" },
  sin_capacitacion: { led: "no", title: "Capacitación no vigente", tone: "negative" },
  atrasado: { led: "no", title: "Reserva cancelada por atraso", tone: "negative" },
};

export default function RecepcionPage() {
  const hydrated = useHydrated();
  const s = useAforo();
  const [mode, setMode] = useState<Mode>("entrada");
  const [reading, setReading] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const state = hydrated ? s : { ...s, myReservations: [], overrides: {}, events: [], offline: false };
  const all = useMemo(() => allReservations(state), [state.myReservations, state.overrides]); // eslint-disable-line react-hooks/exhaustive-deps
  const now = all.filter((r) => r.day === TODAY && r.block === CURRENT_BLOCK && r.status !== "cancelada");
  const inside = insideNow(state);

  const toPerson = (memberId: string): Person => {
    if (memberId === ME_ID && s.profile) return { id: ME_ID, name: s.profile.name, rut: s.profile.rut, hue: 210, segment: s.profile.segment, verified: true };
    const m = memberById(memberId) as Member;
    return { id: m.id, name: m.name, rut: m.rut, hue: m.hue, segment: m.segment, verified: m.verified };
  };

  // Fila de la puerta: quienes reservaron este bloque y aún no entran, más dos casos borde reales.
  const queue: Person[] = useMemo(() => {
    if (mode === "salida") return inside.slice(0, 6).map((r) => toPerson(r.memberId));
    const pending = now.filter((r) => r.checkInMin === undefined);
    // Quien viene a usar una máquina también pasa por la puerta.
    const mineMachine = hydrated && s.profile ? machineNow(s.myMachineBookings, ME_ID) : undefined;
    const mineFirst = pending.sort((a, b) => (a.memberId === ME_ID ? -1 : b.memberId === ME_ID ? 1 : 0));
    const people = mineFirst.slice(0, 5).map((r) => toPerson(r.memberId));
    const booked = new Set(now.map((r) => r.memberId));
    const walkIn = MEMBERS.find((m) => m.verified && !booked.has(m.id) && !s.events.some((e) => e.memberId === m.id));
    const unenrolled = MEMBERS.find((m) => !m.verified && !s.events.some((e) => e.memberId === m.id));
    if (walkIn) people.splice(2, 0, toPerson(walkIn.id));
    if (unenrolled) people.splice(4, 0, toPerson(unenrolled.id));
    if (mineMachine && !s.events.some((e) => e.memberId === ME_ID && e.kind === "entrada")) people.unshift(toPerson(ME_ID));
    return people.filter((p, i, a) => a.findIndex((x) => x.id === p.id) === i).slice(0, 7);
  }, [mode, now.length, inside.length, s.events.length, s.profile, s.myMachineBookings, hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  const scan = (p: Person, method: AccessMethod) => {
    if (reading) return;
    setReading(p.id);
    setResult(null);
    // Lectura + validación contra la API (o contra la copia local si no hay conexión).
    const latency = Math.round((0.5 + Math.random() * 1.1 + (s.offline ? 0.2 : 0)) * 10) / 10;
    timer.current = setTimeout(() => {
      const reservation = now.find((r) => r.memberId === p.id);
      const machine = !reservation && mode === "entrada" ? machineNow(p.id === ME_ID ? s.myMachineBookings : BASE_MACHINE_BOOKINGS, p.id) : undefined;
      const atMin = Math.min(NOW_MIN + s.events.length, 719);
      let res: AccessEvent["result"] = "aprobado";
      if (!p.verified) res = "no_enrolado";
      else if (machine && isLate(machine)) {
        // Pasados 20 minutos del inicio, la reserva de la máquina se cancela.
        res = "atrasado";
        // En la demo local, solo se informa: la cancelación real la hace registrar_acceso en el servidor.
      } else if (machine && p.id === ME_ID && trainingStatus(s, machineById(machine.machineId).training) !== "aprobada") res = "sin_capacitacion";
      else if (!reservation && !machine && mode === "entrada") res = "sin_reserva";
      const event = s.recordEvent({ memberId: p.id, reservationId: reservation?.id, kind: mode, result: res, method, latency, atMin });
      setResult({ person: p, event, reservation, machine });
      setReading(null);
    }, 700);
  };

  const allowException = () => {
    if (!result) return;
    const event = s.recordEvent({
      memberId: result.person.id,
      kind: "entrada",
      result: "excepcion",
      method: result.event.method,
      latency: result.event.latency,
      atMin: result.event.atMin,
    });
    setResult({ ...result, event });
  };

  const queued = state.events.filter((e) => e.queued).length;

  // Ocupación de cada zona en este bloque: quienes están dentro contra el aforo.
  const zones = (["mesas", "oficinas", "salas"] as ZoneId[]).map((z) => {
    const ids = new Set(unitsOfZone(z).map((u) => u.id));
    const cap = unitsOfZone(z).reduce((a, u) => a + u.capacity, 0);
    const used = inside.filter((r) => ids.has(r.unitId)).length;
    return { zone: zoneById(z), cap, used };
  });
  const exceptionsInside = state.events.filter((e) => e.result === "excepcion" && e.kind === "entrada").length;
  const totalInside = inside.length + exceptionsInside;

  return (
    <div className="min-h-dvh bg-ground">
      <TopBar
        title={<Wordmark sub="Terminal de acceso" />}
        action={
          <>
            <div className="hidden text-right md:block">
              <p className="text-[13px] font-medium">Edificio Cowork · Puerta principal</p>
              <p className="num text-[12px] opacity-70">
                Bloque {blockLabel(CURRENT_BLOCK)} · {formatMin(NOW_MIN)}
              </p>
            </div>
            <button
              onClick={() => s.setOffline(!state.offline)}
              aria-pressed={state.offline}
              className={cx(
                "press flex h-11 items-center gap-2 rounded-full px-4 text-[13px] font-medium",
                state.offline ? "bg-[var(--pill-warning-bg)] text-[var(--pill-warning-ink)]" : "bg-[var(--pill-positive-bg)] text-[var(--pill-positive-ink)]",
              )}
            >
              {state.offline ? <CloudOff size={16} aria-hidden="true" /> : <Wifi size={16} aria-hidden="true" />}
              {state.offline ? `Sin conexión · ${queued} en cola` : "En línea"}
            </button>
          </>
        }
      />
      <div className="mx-auto max-w-[1180px] px-4 py-4 md:px-6 md:py-6">

        <h1 className="sr-only">Terminal de acceso del Edificio Cowork</h1>

        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* Columna principal */}
          <div className="flex min-w-0 flex-col gap-6">
            <section aria-labelledby="result-title" className="overflow-hidden rounded-card border border-border bg-surface">
              <div className="flex items-center justify-between border-b border-rule px-5 py-3">
                <div role="tablist" aria-label="Sentido" className="toggle">
                  {(["entrada", "salida"] as Mode[]).map((m) => (
                    <button
                      key={m}
                      role="tab"
                      aria-selected={mode === m}
                      onClick={() => {
                        setMode(m);
                        setResult(null);
                      }}
                      className="toggle-option press h-11 px-5 capitalize"
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <p className="hidden text-[12px] text-muted sm:block">Meta del equipo: validar en menos de 7 s</p>
              </div>

              <ResultPanel reading={reading ? queue.find((p) => p.id === reading) ?? null : null} result={result} offline={state.offline} onException={allowException} />
            </section>

            <section aria-labelledby="queue-title">
              <div className="flex items-baseline justify-between">
                <h2 id="queue-title" className="text-[18px] font-normal">
                  {mode === "entrada" ? "En la puerta" : "Saliendo"}
                </h2>
                <span className="hidden text-[12px] text-muted sm:inline">Simula la lectura de cada credencial</span>
              </div>
              <ul className="mt-2 overflow-hidden rounded-card border border-border bg-surface">
                {queue.length === 0 && <li className="px-4 py-6 text-[14px] text-muted">No hay nadie esperando.</li>}
                {queue.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 border-b border-rule px-4 py-3 last:border-b-0">
                    <Avatar name={p.name} hue={p.hue} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium">
                        {p.name} {p.id === ME_ID && <span className="font-normal text-muted">(tú)</span>}
                      </p>
                      <p className="text-[12px] text-muted">{p.segment}</p>
                    </div>
                    <div className="flex flex-none gap-2">
                      <Button aria-label={`Acercar NFC de ${p.name}`} onClick={() => scan(p, "nfc")} disabled={!!reading} className="!h-11 !px-4">
                        <Nfc size={16} aria-hidden="true" /> <span className="hidden sm:inline">NFC</span>
                      </Button>
                      <Button aria-label={`Leer QR de ${p.name}`} onClick={() => scan(p, "qr")} disabled={!!reading} className="!h-11 !px-4">
                        <QrCode size={16} aria-hidden="true" /> <span className="hidden sm:inline">QR</span>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* Columna lateral: quién está dentro y el registro */}
          <aside className="flex min-w-0 flex-col gap-6">
            <section aria-labelledby="inside-title" className="rounded-card border border-border bg-surface p-5">
              <h2 id="inside-title" className="text-[14px] text-muted">
                Dentro del Hub ahora
              </h2>
              <p className="num mt-1 text-[36px] font-normal leading-[1.22]">
                {totalInside}
                <span className="ml-1.5 text-[14px] font-normal text-muted">personas</span>
              </p>
              <ul className="mt-3">
                {zones.map(({ zone, cap, used }) => (
                  <li key={zone.id} className="py-2.5">
                    <div className="flex items-baseline justify-between text-[13px]">
                      <span>{zone.name}</span>
                      <span className="num">
                        {used}
                        <span className="text-muted"> / {cap}</span>
                      </span>
                    </div>
                    <CapacityTrack used={used} capacity={cap} className="mt-1.5" label={`${zone.name}: ${used} de ${cap}`} />
                  </li>
                ))}
              </ul>
              {exceptionsInside > 0 && (
                <p className="num mt-1 text-[12px] text-muted">
                  Incluye {exceptionsInside} {exceptionsInside === 1 ? "ingreso" : "ingresos"} por excepción.
                </p>
              )}
            </section>

            <section aria-labelledby="log-title">
              <div className="flex items-baseline justify-between">
                <h2 id="log-title" className="text-[18px] font-normal">
                  Registro de accesos
                </h2>
                {state.events.length > 0 && (
                  <button onClick={s.reset} className="press flex h-11 items-center gap-1 rounded-control px-2 text-[12px] text-muted">
                    <RotateCcw size={13} aria-hidden="true" /> Reiniciar demo
                  </button>
                )}
              </div>
              <ul className="mt-2 overflow-hidden rounded-card border border-border bg-surface">
                {state.events.length === 0 && (
                  <li className="px-4 py-5 text-[13px] leading-[19px] text-muted">
                    Aún no hay lecturas en este turno. Cada acceso queda registrado con hora, método y resultado.
                  </li>
                )}
                {state.events.slice(0, 7).map((e) => {
                  const p = toPerson(e.memberId);
                  const c = RESULT_COPY[e.result];
                  return (
                    <li key={e.id} className="enter flex items-center gap-3 border-b border-rule px-4 py-2.5 last:border-b-0">
                      <span className="num w-11 flex-none text-[13px] text-muted">{formatMin(e.atMin)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium">{p.name}</p>
                        <p className="text-[12px] text-muted">
                          {e.kind === "entrada" ? "Entrada" : "Salida"} · {e.method.toUpperCase()}
                          {e.queued && " · en cola"}
                        </p>
                      </div>
                      <Pill tone={c.tone}>{e.result === "aprobado" ? "OK" : e.result === "excepcion" ? "Excepción" : "Denegado"}</Pill>
                    </li>
                  );
                })}
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function ResultPanel({ reading, result, offline, onException }: { reading: Person | null; result: Result | null; offline: boolean; onException: () => void }) {
  const copy = result ? RESULT_COPY[result.event.result] : null;
  const led = reading ? "reading" : copy ? copy.led : "idle";
  return (
    <div className="grid min-h-[300px] gap-6 p-5 md:grid-cols-[180px_1fr] md:p-6" aria-live="polite">
      {/* LED del terminal: verde validado, rojo denegado. Color plano, sin brillo. */}
      <div className="flex flex-row items-center gap-4 md:flex-col md:justify-center">
        <div
          className={cx(
            "flex size-[88px] items-center justify-center rounded-full md:size-[132px]",
            led === "ok" && "bg-[var(--pill-positive-bg)]",
            led === "no" && "bg-[var(--pill-negative-bg)]",
            (led === "idle" || led === "reading") && "bg-raised",
          )}
        >
          <span
            className={cx(
              "block size-10 rounded-full md:size-14",
              led === "ok" && "bg-positive",
              led === "no" && "bg-negative",
              led === "idle" && "bg-[var(--inactive-soft)]",
              led === "reading" && "animate-pulse bg-accent",
            )}
            style={{ transition: "background-color 150ms ease" }}
          />
        </div>
        <p className="text-[13px] font-medium md:text-center">
          {led === "ok" ? "Verde · pasa" : led === "no" ? "Rojo · no pasa" : led === "reading" ? "Leyendo…" : "Esperando credencial"}
        </p>
      </div>

      <div className="flex min-w-0 flex-col justify-center">
        {!reading && !result && (
          <div>
            <h2 id="result-title" className="text-[24px] font-normal leading-[1.3]">
              Acerca el teléfono o muestra el QR
            </h2>
            <p className="mt-2 max-w-[460px] text-[14px] leading-[20px] text-muted">
              El terminal lee la credencial NFC o el QR dinámico, la cruza con la reserva del bloque en curso y muestra a recepción
              el nombre, la foto registrada y el destino.
            </p>
          </div>
        )}
        {reading && (
          <div className="enter">
            <h2 id="result-title" className="text-[24px] font-normal leading-[1.3]">
              Validando a {reading.name.split(" ")[0]}…
            </h2>
            <p className="mt-2 text-[14px] text-muted">{offline ? "Sin conexión: se valida contra la copia local de reservas del día." : "Consultando la reserva del bloque en curso."}</p>
          </div>
        )}
        {result && copy && (
          <div key={result.event.id} className="enter flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <Avatar name={result.person.name} hue={result.person.hue} size={64} />
              <div className="min-w-0">
                <Pill tone={copy.tone}>{copy.title}</Pill>
                <h2 id="result-title" className="mt-1.5 truncate text-[24px] font-normal leading-[1.3]">
                  {result.person.name}
                </h2>
                <p className="num text-[13px] text-muted">
                  RUT {maskRut(result.person.rut)} · {result.person.segment}
                </p>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-card bg-raised p-4 text-[13px] sm:grid-cols-[1.5fr_1fr_1fr]">
              <div className="col-span-2 sm:col-span-1">
                <dt className="text-muted">Destino</dt>
                <dd className="font-medium">
                  {result.reservation ? unitById(result.reservation.unitId).name : result.machine ? machineById(result.machine.machineId).name : "—"}
                </dd>
                {result.reservation && <dd className="text-[12px] text-muted">{zoneById(unitById(result.reservation.unitId).zoneId).building}</dd>}
                {result.machine && (
                  <dd className="text-[12px] text-muted">Capacitación: {trainingKind(machineById(result.machine.machineId).training).name}</dd>
                )}
              </div>
              <div>
                <dt className="text-muted">Bloque</dt>
                <dd className="num font-medium">
                  {result.reservation
                    ? blockLabel(result.reservation.block)
                    : result.machine
                      ? `${formatMin(result.machine.startMin)} · ${result.machine.hours} h`
                      : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Validado en</dt>
                <dd className="num font-medium">
                  {result.event.latency.toLocaleString("es-CL")} s · {result.event.method.toUpperCase()}
                </dd>
                {result.event.queued && <dd className="text-[12px] text-[var(--warning)]">En cola para sincronizar</dd>}
              </div>
            </dl>

            {result.event.result === "sin_reserva" && (
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" onClick={onException}>
                  Permitir como excepción
                </Button>
                <p className="text-[12px] text-muted">Queda registrado con la hora y el turno de recepción.</p>
              </div>
            )}
            {result.event.result === "sin_capacitacion" && (
              <p className="text-[13px] text-muted">La capacitación de esta máquina ya no está aprobada. Puede inscribirse de nuevo desde la app.</p>
            )}
            {result.event.result === "atrasado" && (
              <p className="text-[13px] text-muted">Llegó más de 20 minutos tarde: la reserva se canceló y el atraso queda en su ficha.</p>
            )}
            {result.event.result === "no_enrolado" && (
              <div className="flex flex-wrap items-center gap-3">
                <Link href="/registro" className="press inline-flex h-9 items-center gap-2 rounded-control bg-primary px-3.5 text-[14px] font-medium text-white">
                  <UserPlus size={16} aria-hidden="true" /> Iniciar registro asistido
                </Link>
                <p className="text-[12px] text-muted">Toma un minuto en el mostrador.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
