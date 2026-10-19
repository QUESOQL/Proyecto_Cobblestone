"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { CircleCheck, Info } from "lucide-react";
import {
  BLOCKS,
  dayKey,
  formatDay,
  isOpen,
  unitById,
  unitsOfZone,
  zoneById,
  type BlockId,
  type ZoneId,
} from "@/lib/data";
import { BOOKING_WINDOW_DAYS, RESERVE_ERRORS, countFor, nextBlocks, useAforo, useHydrated } from "@/lib/store";
import { Button, CapacityTrack, MobileShell, Sheet, Toast, Wordmark, cx } from "@/components/ui";

const BOOKABLE: { id: ZoneId; short: string }[] = [
  { id: "mesas", short: "Mesas" },
  { id: "oficinas", short: "Oficinas y set" },
  { id: "salas", short: "Edificio Empleo" },
];

export default function ReservarPage() {
  return (
    <Suspense fallback={<MobileShell title={<Wordmark />}>{null}</MobileShell>}>
      <Reservar />
    </Suspense>
  );
}

function Reservar() {
  const params = useSearchParams();
  const router = useRouter();
  const hydrated = useHydrated();
  const profile = useAforo((s) => s.profile);
  const myReservations = useAforo((s) => s.myReservations);
  const reserve = useAforo((s) => s.reserve);

  const initialZone = (BOOKABLE.find((z) => z.id === params.get("zona"))?.id ?? "mesas") as ZoneId;
  const [zone, setZone] = useState<ZoneId>(initialZone);
  const [unitId, setUnitId] = useState<string>(params.get("unidad") ?? unitsOfZone(initialZone)[0].id);
  const [day, setDay] = useState(params.get("dia") ?? dayKey(0));
  const [block, setBlock] = useState<BlockId | null>(null);
  const [sheet, setSheet] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const days = useMemo(() => Array.from({ length: BOOKING_WINDOW_DAYS }, (_, i) => dayKey(i)), []);
  const units = unitsOfZone(zone);
  const unit = unitById(unitId);
  const state = { myReservations: hydrated ? myReservations : [] };

  const rows = nextBlocks(day).map((b) => {
    const used = countFor(state, unit.id, day, b.id);
    const left = unit.capacity - used;
    const mine = state.myReservations.some((r) => r.day === day && r.block === b.id && r.status !== "cancelada");
    const disabled = !b.open || b.past || left <= 0;
    return { ...b, used, left, mine, disabled };
  });

  // El hallazgo del día, calculado: qué bloques del centro de mesas están llenos hoy.
  const today = dayKey(0);
  const fullToday = BLOCKS.filter((b) => countFor(state, "mesas", today, b.id) >= unitById("mesas").capacity && isOpen(today, b.id));
  const finding =
    fullToday.length > 0
      ? `Hoy el centro de mesas está lleno de ${fullToday[0].start} a ${fullToday[fullToday.length - 1].end}.`
      : "Hoy quedan puestos en todos los bloques del centro de mesas.";

  const pickZone = (z: ZoneId) => {
    setZone(z);
    setUnitId(unitsOfZone(z)[0].id);
    setBlock(null);
  };

  const confirm = () => {
    if (!block) return;
    const res = reserve(unit.id, day, block);
    setSheet(false);
    if (res.ok) {
      setDone(res.id);
      setBlock(null);
    } else {
      setToast(RESERVE_ERRORS[res.error]);
    }
  };

  const selected = block ? rows.find((r) => r.id === block) : null;

  if (done) {
    const r = myReservations.find((x) => x.id === done);
    return (
      <MobileShell title={<Wordmark sub="Reserva confirmada" />}>
        <div className="enter flex flex-col items-start gap-4 pt-6">
          <CircleCheck size={44} strokeWidth={1.5} className="text-positive" aria-hidden="true" />
          <h1 className="text-[24px] font-semibold leading-[30px]">Listo, tienes tu cupo</h1>
          {r && (
            <div className="w-full rounded-card border border-border p-4">
              <p className="text-[15px] font-medium">{unitById(r.unitId).name}</p>
              <p className="num mt-0.5 text-[14px] text-muted">
                {formatDay(r.day, "long")} · {BLOCKS.find((b) => b.id === r.block)!.start}–{BLOCKS.find((b) => b.id === r.block)!.end}
              </p>
              <p className="mt-0.5 text-[13px] text-muted">{zoneById(unitById(r.unitId).zoneId).building}</p>
            </div>
          )}
          <p className="text-[14px] leading-[20px] text-muted">
            Te avisamos 30 minutos antes. En la puerta, acerca tu teléfono al lector o muestra tu QR dinámico.
          </p>
          <div className="mt-2 flex w-full flex-col gap-2.5">
            <Button size="lg" variant="accent" onClick={() => router.push("/inicio")}>
              Ver mis reservas
            </Button>
            <Button size="lg" onClick={() => setDone(null)}>
              Reservar otro espacio
            </Button>
          </div>
        </div>
      </MobileShell>
    );
  }

  const z = zoneById(zone);

  return (
    <MobileShell title={<Wordmark sub="Reservar espacio" />}>
      <h1 className="text-[24px] font-semibold leading-[30px] tracking-[-0.01em]">¿Dónde trabajas hoy?</h1>
      <p className="mt-1 text-[14px] text-muted">{finding}</p>

      {hydrated && !profile && (
        <Link href="/registro" className="press mt-4 flex items-center gap-2 rounded-card bg-[var(--pill-warning-bg)] px-3.5 py-3 text-[13px] text-[var(--pill-warning-ink)]">
          <Info size={16} aria-hidden="true" /> Termina tu registro para poder reservar.
        </Link>
      )}

      {/* Días: una fila que se desplaza de lado dentro de sí misma, nunca la página. */}
      <div role="radiogroup" aria-label="Día" className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {days.map((d, i) => {
          const closed = BLOCKS.every((b) => !isOpen(d, b.id));
          const active = d === day;
          return (
            <button
              key={d}
              role="radio"
              aria-checked={active}
              disabled={closed}
              onClick={() => {
                setDay(d);
                setBlock(null);
              }}
              className={cx(
                "press flex h-14 min-w-[64px] flex-none flex-col items-center justify-center rounded-card border text-[13px]",
                active ? "border-accent bg-accent-soft text-accent-ink" : "border-border bg-surface",
                closed && "border-transparent bg-raised text-muted",
              )}
            >
              <span className={cx("capitalize", active ? "font-semibold" : "font-medium")}>
                {i === 0 ? "Hoy" : i === 1 ? "Mañana" : formatDay(d, "short").split(" ")[0]}
              </span>
              <span className="num text-[12px] text-muted">{closed ? "Cerrado" : formatDay(d, "short").split(" ")[1]}</span>
            </button>
          );
        })}
      </div>

      {/* Zona */}
      <div role="tablist" aria-label="Zona" className="mt-4 grid grid-cols-3 gap-1 rounded-card bg-raised p-1">
        {BOOKABLE.map((b) => (
          <button
            key={b.id}
            role="tab"
            aria-selected={zone === b.id}
            onClick={() => pickZone(b.id)}
            className={cx(
              "press h-10 rounded-control text-[13px]",
              zone === b.id ? "bg-surface font-medium text-text shadow-[0_1px_2px_rgba(0,0,0,0.06)]" : "text-muted",
            )}
          >
            {b.short}
          </button>
        ))}
      </div>

      <div key={zone} className="enter mt-4 flex gap-3">
        <div className="relative h-[76px] w-[76px] flex-none overflow-hidden rounded-card">
          <Image src={z.photo} alt={z.name} fill sizes="76px" className="object-cover" />
        </div>
        <div className="min-w-0">
          <h2 className="text-[16px] font-semibold">{z.name}</h2>
          <p className="text-[12px] text-muted">{z.building}</p>
          <p className="mt-1 text-[13px] leading-[18px] text-muted">{z.description}</p>
        </div>
      </div>

      {units.length > 1 && (
        <div role="radiogroup" aria-label="Espacio" className="mt-4 flex flex-col">
          {units.map((u) => {
            const free = nextBlocks(day).filter((b) => b.open && !b.past && countFor(state, u.id, day, b.id) < u.capacity).length;
            const open = nextBlocks(day).filter((b) => b.open && !b.past).length;
            const active = u.id === unitId;
            return (
              <button
                key={u.id}
                role="radio"
                aria-checked={active}
                onClick={() => {
                  setUnitId(u.id);
                  setBlock(null);
                }}
                className={cx("press flex min-h-[56px] items-center gap-3 border-b border-rule text-left last:border-b-0")}
              >
                <span className={cx("flex size-5 flex-none items-center justify-center rounded-full border", active ? "border-accent" : "border-control")}>
                  {active && <span className="size-2.5 rounded-full bg-accent" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cx("block text-[14px]", active && "font-medium")}>{u.name}</span>
                  <span className="block text-[12px] text-muted">{u.detail}</span>
                </span>
                <span className="num flex-none text-right text-[12px] text-muted">
                  {open === 0 ? "—" : `${free} de ${open} libres`}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <h2 className="mt-5 text-[14px] font-medium">
        Bloques · <span className="font-normal text-muted">{formatDay(day, "long")}</span>
      </h2>
      <ul className="mt-2 flex flex-col gap-2" aria-label="Bloques horarios">
        {rows.map((r) => {
          const active = r.id === block;
          const status = !r.open
            ? "Cerrado"
            : r.past
              ? "Terminó"
              : r.mine
                ? "Ya reservaste aquí"
                : r.left <= 0
                  ? "Sin cupos"
                  : unit.exclusive
                    ? "Libre"
                    : r.left === 1
                      ? "Último cupo"
                      : `${r.left} de ${unit.capacity} libres`;
          return (
            <li key={r.id}>
              <button
                disabled={r.disabled}
                aria-pressed={active}
                onClick={() => setBlock(active ? null : r.id)}
                className={cx(
                  "press w-full rounded-card border p-3.5 text-left",
                  active ? "border-accent bg-accent-soft" : "border-border bg-surface",
                  r.disabled && "border-transparent bg-raised",
                )}
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className={cx("num text-[15px] font-medium", r.disabled && "text-muted")}>
                    {r.start}–{r.end}
                  </span>
                  <span
                    className={cx(
                      "num text-[13px]",
                      r.disabled ? "text-muted" : r.left === 1 || r.mine ? "font-medium text-accent-ink" : "text-muted",
                    )}
                  >
                    {status}
                  </span>
                </span>
                {r.open && !r.past && !unit.exclusive && <CapacityTrack used={r.used} capacity={unit.capacity} className="mt-2.5" label={`${r.start}: ${r.used} de ${unit.capacity} ocupados`} />}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Barra de confirmación: aparece cuando hay un bloque elegido. */}
      <div
        className="sticky bottom-[64px] z-10 -mx-4 mt-4 border-t border-rule bg-surface px-4 py-3"
        style={{
          transform: selected ? "translateY(0)" : "translateY(12px)",
          opacity: selected ? 1 : 0,
          pointerEvents: selected ? "auto" : "none",
          transition: "transform 220ms var(--ease-out), opacity 180ms ease",
        }}
      >
        <Button size="lg" variant="accent" className="w-full" onClick={() => setSheet(true)} disabled={!profile}>
          {selected ? `Reservar ${selected.start}–${selected.end}` : "Reservar"}
        </Button>
      </div>

      <Sheet open={sheet} onClose={() => setSheet(false)} title="Confirmar reserva">
        {selected && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-[18px] font-semibold">Confirmar reserva</h2>
              <p className="mt-1 text-[14px] text-muted">Si no llegas, el cupo se libera al terminar el bloque.</p>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[14px]">
              <dt className="text-muted">Espacio</dt>
              <dd className="text-right font-medium">{unit.name}</dd>
              <dt className="text-muted">Lugar</dt>
              <dd className="text-right">{z.building}</dd>
              <dt className="text-muted">Día</dt>
              <dd className="text-right">{formatDay(day, "long")}</dd>
              <dt className="text-muted">Horario</dt>
              <dd className="num text-right">
                {selected.start}–{selected.end}
              </dd>
              <dt className="text-muted">Cupos</dt>
              <dd className="num text-right">{unit.exclusive ? "Uso exclusivo" : `Quedan ${selected.left} de ${unit.capacity}`}</dd>
            </dl>
            <Button size="lg" variant="accent" onClick={confirm}>
              Confirmar
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
