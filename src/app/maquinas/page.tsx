"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { CircleCheck, Info, Lock } from "lucide-react";
import { dayKey, formatDay, formatMin } from "@/lib/data";
import {
  LATE_CANCEL_MIN,
  MAX_JOB_HOURS,
  SPACES,
  TRAINING_KINDS,
  bucketOf,
  hoursOf,
  lowerFirst,
  machineById,
  machinesOf,
  maxHoursFrom,
  sessionById,
  startTimes,
  type SpaceId,
  type TrainingType,
} from "@/lib/lab";
import {
  BOOKING_WINDOW_DAYS,
  MACHINE_ERRORS,
  machineSlot,
  quotaLeft,
  trainingStatus,
  useAforo,
  useHydrated,
  type TrainingStatus,
} from "@/lib/store";
import { Button, Card, Field, MobileShell, Pill, Sheet, Tabs, Toast, Wordmark, cx } from "@/components/ui";

/*
 * Reserva de máquinas del Lab881 y del Cowork textil.
 * Cada máquina pide su capacitación aprobada. Lo que no se puede elegir se muestra
 * deshabilitado y con el motivo: la reserva nunca falla después de elegir la hora.
 */

const SPACE_TABS: { id: SpaceId; label: string }[] = [
  { id: "lab881", label: "Lab881" },
  { id: "textil", label: "Cowork textil" },
];

const STATUS_PILL: Record<TrainingStatus, { tone: "positive" | "neutral" | "warning" | "accent"; label: string }> = {
  aprobada: { tone: "positive", label: "Aprobada" },
  inscrito: { tone: "accent", label: "Inscrita" },
  vencida: { tone: "warning", label: "Vencida" },
  no_inscrito: { tone: "neutral", label: "Sin capacitación" },
};

/** "13:00", o "mañana 02:00" si el trabajo sigue de noche. */
function endLabel(startMin: number, hours: number) {
  const end = startMin + hours * 60;
  return end >= 1440 ? `mañana ${formatMin(end - 1440)}` : formatMin(end);
}

export default function MaquinasPage() {
  return (
    <Suspense fallback={<MobileShell title={<Wordmark sub="Máquinas" />}>{null}</MobileShell>}>
      <Maquinas />
    </Suspense>
  );
}

function Maquinas() {
  const params = useSearchParams();
  const router = useRouter();
  const hydrated = useHydrated();
  const profile = useAforo((s) => s.profile);
  const myTrainings = useAforo((s) => s.myTrainings);
  const myMachineBookings = useAforo((s) => s.myMachineBookings);
  const reserveMachine = useAforo((s) => s.reserveMachine);
  const machineTaken = useAforo((s) => s.machineTaken);
  const [busy, setBusy] = useState(false);

  const [space, setSpace] = useState<SpaceId>(params.get("espacio") === "textil" ? "textil" : "lab881");
  const [machineId, setMachineId] = useState<string | null>(params.get("maquina"));
  const [day, setDay] = useState(dayKey(1));
  const [hours, setHours] = useState(1);
  const [start, setStart] = useState<number | null>(null);
  const [sheet, setSheet] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const state = { myTrainings: hydrated ? myTrainings : {}, myMachineBookings: hydrated ? myMachineBookings : [], machineTaken };
  const sp = SPACES[space];
  const machine = machineId ? machineById(machineId) : null;
  const canBook = machine && trainingStatus(state, machine.training) === "aprobada";
  const quota = quotaLeft(state);

  // Días abiertos de este espacio dentro de la ventana de reserva.
  const days = useMemo(() => Array.from({ length: BOOKING_WINDOW_DAYS }, (_, i) => dayKey(i)), []);
  const openDays = days.filter((d) => hoursOf(space, d));
  const dayValue = openDays.includes(day) ? day : openDays[0];

  // La duración más larga que permite la máquina a alguna hora de ese día.
  const maxHours = machine && dayValue ? Math.max(1, ...startTimes(space, dayValue).map((m) => maxHoursFrom(machine, dayValue, m))) : 1;
  const durations = Array.from({ length: Math.min(MAX_JOB_HOURS, maxHours) }, (_, i) => i + 1);

  // Si cambia el día y la duración elegida ya no cabe, se usa la mayor posible.
  const hrs = Math.min(hours, durations.length);

  const slots =
    machine && dayValue
      ? startTimes(space, dayValue).map((m) => {
          const check = machineSlot(state, machine.id, dayValue, m, hrs);
          return { startMin: m, ok: check.ok, reason: check.ok ? null : check.error };
        })
      : [];
  const selected = start !== null ? slots.find((s) => s.startMin === start && s.ok) : undefined;

  const pickSpace = (id: SpaceId) => {
    setSpace(id);
    setMachineId(null);
    setStart(null);
  };

  const confirm = async () => {
    if (!machine || !selected || !dayValue || busy) return;
    setBusy(true);
    const res = await reserveMachine(machine.id, dayValue, selected.startMin, hrs);
    setBusy(false);
    setSheet(false);
    if (res.ok) {
      setDone(res.id);
      setStart(null);
    } else setToast(MACHINE_ERRORS[res.error]);
  };

  if (done) {
    const b = myMachineBookings.find((x) => x.id === done);
    const m = b && machineById(b.machineId);
    return (
      <MobileShell title={<Wordmark sub="Reserva confirmada" />}>
        <div className="enter flex flex-col items-start gap-4 pt-6">
          <CircleCheck size={44} strokeWidth={1.5} className="text-positive" aria-hidden="true" />
          <h1 className="text-[28px] leading-[1.22]">Listo, la máquina es tuya</h1>
          {b && m && (
            <Card className="w-full">
              <p className="text-[16px] font-medium">{m.name}</p>
              <p className="text-[14px] text-muted">{m.model}</p>
              <p className="num mt-2 text-[14px]">
                {formatDay(b.day, "long")} · {formatMin(b.startMin)}–{endLabel(b.startMin, b.hours)} · {b.hours} h
              </p>
              <p className="mt-0.5 text-[13px] text-muted">{SPACES[m.space].place}</p>
            </Card>
          )}
          <ul className="flex w-full flex-col text-[14px]">
            <li className="rule-row">Trae el material de tu proyecto: el uso de la máquina es gratis.</li>
            <li className="rule-row">Si llegas {LATE_CANCEL_MIN} minutos tarde, la reserva se cancela y queda anotado.</li>
          </ul>
          <div className="mt-2 flex w-full flex-col gap-2.5">
            <Button size="lg" variant="primary" onClick={() => router.push("/inicio")}>
              Ver mis reservas
            </Button>
            <Button size="lg" onClick={() => setDone(null)}>
              Reservar otra máquina
            </Button>
          </div>
        </div>
      </MobileShell>
    );
  }

  const kinds = TRAINING_KINDS.filter((k) => k.space === space);

  return (
    <MobileShell title={<Wordmark sub="Reservar máquina" />}>
      <h1 className="text-[28px] leading-[1.22]">Máquinas</h1>
      <p className="mt-1 text-[14px] text-muted">{sp.hoursLabel}. Para reservar necesitas la capacitación aprobada.</p>

      {hydrated && !profile && (
        <Link href="/registro" className="press mt-4 flex items-center gap-2 rounded-card bg-[var(--pill-warning-bg)] px-3.5 py-3 text-[13px] text-[var(--pill-warning-ink)]">
          <Info size={16} aria-hidden="true" /> Termina tu registro para poder reservar.
        </Link>
      )}

      <Tabs items={SPACE_TABS} value={space} onChange={pickSpace} label="Espacio" className="mt-4" />

      {sp.yearlyQuota && (
        <section aria-labelledby="quota-title" className="mt-4">
          <h2 id="quota-title" className="text-[14px] font-medium">
            Tus reservas del año · <span className="font-normal text-muted">{quota.reduce((a, q) => a + q.left, 0)} de 15 disponibles</span>
          </h2>
          <ul className="mt-2 grid grid-cols-4 gap-1.5" aria-label="Cupo anual por duración">
            {quota.map((q) => (
              <li key={q.id} className={cx("rounded-card p-2.5 text-center", q.left > 0 ? "bg-raised" : "bg-[var(--hair)] text-muted")}>
                <span className="num block text-[18px] leading-[1.2]">{q.left}</span>
                <span className="block text-[11px] text-muted">{q.label}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Máquinas agrupadas por la capacitación que piden. */}
      <div className="mt-5 flex flex-col gap-5">
        {kinds.map((k) => (
          <KindGroup
            key={k.id}
            kind={k.id}
            status={trainingStatus(state, k.id)}
            sessionId={state.myTrainings[k.id]?.sessionId}
            machineId={machineId}
            onPick={(id) => {
              setMachineId(id);
              setStart(null);
            }}
          />
        ))}
      </div>

      {/* Horario de la máquina elegida. */}
      {machine && canBook && dayValue && (
        <section aria-labelledby="slot-title" className="enter mt-6">
          <h2 id="slot-title" className="text-[18px]">
            Horario · <span className="text-muted">{machine.name}</span>
          </h2>

          <div role="radiogroup" aria-label="Día" className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            {days.map((d, i) => {
              const closed = !hoursOf(space, d);
              const active = d === dayValue;
              return (
                <button
                  key={d}
                  role="radio"
                  aria-checked={active}
                  disabled={closed}
                  onClick={() => {
                    setDay(d);
                    setStart(null);
                  }}
                  className={cx(
                    "press flex h-14 min-w-[64px] flex-none flex-col items-center justify-center rounded-card border text-[13px]",
                    active ? "border-black bg-raised" : "border-border bg-surface",
                    closed && "border-transparent bg-raised text-muted",
                  )}
                >
                  <span className={cx("capitalize", active && "font-medium")}>{i === 0 ? "Hoy" : i === 1 ? "Mañana" : formatDay(d, "short").split(" ")[0]}</span>
                  <span className="num text-[12px] text-muted">{closed ? "Cerrado" : formatDay(d, "short").split(" ")[1]}</span>
                </button>
              );
            })}
          </div>

          <Field
            label="Duración del trabajo"
            hint={machine.runsOvernight ? "Las impresiones largas pueden seguir de noche." : "El trabajo debe terminar antes del cierre."}
            className="mt-4"
          >
            <select
              className="input"
              value={hrs}
              onChange={(e) => {
                setHours(Number(e.target.value));
                setStart(null);
              }}
            >
              {durations.map((h) => {
                const q = sp.yearlyQuota ? quota.find((x) => x.id === bucketOf(h).id)! : null;
                const out = q !== null && q.left <= 0;
                return (
                  <option key={h} value={h} disabled={out}>
                    {h} {h === 1 ? "hora" : "horas"}
                    {q ? (out ? " · sin cupos este año" : ` · tramo ${q.label}, quedan ${q.left}`) : ""}
                  </option>
                );
              })}
            </select>
          </Field>

          <h3 className="mt-4 text-[14px] font-medium">
            Hora de inicio · <span className="font-normal text-muted">{formatDay(dayValue, "long")}</span>
          </h3>
          <ul className="mt-2 grid grid-cols-2 gap-2" aria-label="Horas de inicio">
            {slots.map((s) => {
              const active = s.startMin === start;
              const why = s.reason === "ocupada" ? "Ocupada" : s.reason === "pasado" ? "Ya pasó" : s.reason === "duracion" ? "No alcanza" : s.reason === "cupo_anual" ? "Sin cupo" : null;
              return (
                <li key={s.startMin}>
                  <button
                    disabled={!s.ok}
                    aria-pressed={active}
                    onClick={() => setStart(active ? null : s.startMin)}
                    className={cx(
                      "press flex min-h-[52px] w-full flex-col items-start justify-center rounded-card border px-3 text-left",
                      active ? "border-black bg-raised" : "border-border bg-surface",
                      !s.ok && "border-transparent bg-raised text-muted",
                    )}
                  >
                    <span className="num text-[15px] font-medium">
                      {formatMin(s.startMin)}–{endLabel(s.startMin, hrs)}
                    </span>
                    <span className="text-[12px] text-muted">{why ?? "Libre"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Barra de confirmación: aparece cuando hay una hora elegida. */}
      <div
        className="sticky bottom-[64px] z-10 -mx-4 mt-4 border-t border-border bg-surface px-4 py-3"
        style={{
          transform: selected ? "translateY(0)" : "translateY(12px)",
          opacity: selected ? 1 : 0,
          pointerEvents: selected ? "auto" : "none",
          transition: "transform 220ms var(--ease-out), opacity 180ms ease",
        }}
      >
        <Button size="lg" variant="primary" className="w-full" onClick={() => setSheet(true)} disabled={!profile || !selected}>
          {selected ? `Reservar ${formatMin(selected.startMin)}–${endLabel(selected.startMin, hrs)}` : "Reservar"}
        </Button>
      </div>

      <Sheet open={sheet} onClose={() => setSheet(false)} title="Confirmar reserva de máquina">
        {machine && selected && dayValue && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-[20px]">Confirmar reserva</h2>
              <p className="mt-1 text-[14px] text-muted">
                Si llegas {LATE_CANCEL_MIN} minutos tarde, la reserva se cancela.
              </p>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[14px]">
              <dt className="text-muted">Máquina</dt>
              <dd className="text-right font-medium">{machine.name}</dd>
              <dt className="text-muted">Modelo</dt>
              <dd className="text-right">{machine.model}</dd>
              <dt className="text-muted">Día</dt>
              <dd className="text-right">{formatDay(dayValue, "long")}</dd>
              <dt className="text-muted">Horario</dt>
              <dd className="num text-right">
                {formatMin(selected.startMin)}–{endLabel(selected.startMin, hrs)} · {hrs} h
              </dd>
              {sp.yearlyQuota && (
                <>
                  <dt className="text-muted">Cupo anual</dt>
                  <dd className="num text-right">
                    Usa 1 del tramo {quota.find((q) => q.id === bucketOf(hrs).id)!.label}
                  </dd>
                </>
              )}
            </dl>
            <Button size="lg" variant="primary" onClick={confirm} disabled={busy}>
              {busy ? "Reservando…" : "Confirmar"}
            </Button>
            <Button size="lg" variant="ghost" onClick={() => setSheet(false)}>
              Cancelar
            </Button>
          </div>
        )}
      </Sheet>
      <Toast message={toast} tone="negative" />
    </MobileShell>
  );
}

/** Un grupo de máquinas con la misma capacitación: o se eligen, o explican qué falta. */
function KindGroup({
  kind,
  status,
  sessionId,
  machineId,
  onPick,
}: {
  kind: TrainingType;
  status: TrainingStatus;
  sessionId?: string;
  machineId: string | null;
  onPick: (id: string) => void;
}) {
  const k = TRAINING_KINDS.find((x) => x.id === kind)!;
  const machines = machinesOf(k.space).filter((m) => m.training === kind);
  const pill = STATUS_PILL[status];
  const locked = status !== "aprobada";
  const session = sessionId ? sessionById(sessionId) : null;

  return (
    <section aria-labelledby={`kind-${kind}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 id={`kind-${kind}`} className="text-[18px]">
          {k.name}
        </h2>
        <Pill tone={pill.tone}>{pill.label}</Pill>
      </div>

      <ul className="mt-2 flex flex-col" role={locked ? undefined : "radiogroup"} aria-label={locked ? undefined : `Máquinas de ${k.name}`}>
        {machines.map((m) => {
          const active = m.id === machineId;
          const body = (
            <>
              <span className="min-w-0 flex-1">
                <span className={cx("block text-[15px]", active && "font-medium")}>{m.name}</span>
                <span className="block text-[13px] text-muted">
                  {m.model} · {m.detail}
                </span>
              </span>
              {locked ? (
                <Lock size={16} className="flex-none text-muted" aria-label="Bloqueada" />
              ) : (
                <span className={cx("flex size-5 flex-none items-center justify-center rounded-full border", active ? "border-black" : "border-control")}>
                  {active && <span className="size-2.5 rounded-full bg-black" />}
                </span>
              )}
            </>
          );
          return (
            <li key={m.id} className="border-b border-border last:border-b-0">
              {locked ? (
                <div className="flex min-h-[60px] items-center gap-3 text-muted">{body}</div>
              ) : (
                <button role="radio" aria-checked={active} onClick={() => onPick(m.id)} className="press flex min-h-[60px] w-full items-center gap-3 text-left">
                  {body}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {locked && (
        <Card className="mt-2 !p-4">
          {status === "inscrito" && session ? (
            <>
              <p className="text-[14px]">
                Inscrita para el {formatDay(session.day, "long").toLowerCase()} a las {formatMin(session.startMin)}. Podrás reservar cuando el equipo del Hub
                apruebe tu capacitación.
              </p>
              <Link href={`/capacitaciones?tipo=${kind}`} className="link-more mt-2 inline-block">
                Ver mi capacitación
              </Link>
            </>
          ) : (
            <>
              <p className="text-[14px]">
                Para usar {machines.length > 1 ? "estas máquinas" : "esta máquina"} necesitas la capacitación de {lowerFirst(k.name)}. Es gratis y se hace
                una sola vez.
              </p>
              <Link href={`/capacitaciones?tipo=${kind}`} className="btn mt-3 w-full !min-h-11 text-[15px]">
                Inscribirme en la capacitación
              </Link>
            </>
          )}
        </Card>
      )}
    </section>
  );
}
