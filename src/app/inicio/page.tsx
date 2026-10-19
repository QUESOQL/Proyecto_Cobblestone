"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Nfc, Star } from "lucide-react";
import {
  BLOCKS,
  CURRENT_BLOCK,
  NOW_MIN,
  TALKS,
  TODAY,
  TRAINERS,
  blockById,
  blockLabel,
  dayKey,
  dayOffset,
  formatDay,
  trainerById,
  unitById,
  unitsOfZone,
  weekdayOf,
  zoneById,
  type ZoneId,
} from "@/lib/data";
import { activeMine, countFor, talkEnrolledCount, useAforo, useHydrated } from "@/lib/store";
import { Avatar, Button, CapacityTrack, MobileShell, Pill, Toast, Wordmark, cx } from "@/components/ui";

function startsIn(day: string, startMin: number): string {
  const off = dayOffset(day);
  const mins = off * 1440 + startMin - NOW_MIN;
  if (mins <= 0) return "En curso";
  if (mins < 60) return `Empieza en ${mins} min`;
  if (off === 0) return `Empieza en ${Math.floor(mins / 60)} h ${mins % 60} min`;
  return formatDay(day);
}

export default function InicioPage() {
  const hydrated = useHydrated();
  const profile = useAforo((s) => s.profile);
  const myReservations = useAforo((s) => s.myReservations);
  const enrolled = useAforo((s) => s.enrolledTalkIds);
  const toggleTalk = useAforo((s) => s.toggleTalk);
  const cancel = useAforo((s) => s.cancel);
  const [toast, setToast] = useState<string | null>(null);

  const state = { myReservations: hydrated ? myReservations : [] };
  const mine = hydrated
    ? activeMine(state).sort((a, b) => a.day.localeCompare(b.day) || blockById(a.block).startMin - blockById(b.block).startMin)
    : [];
  const next = mine[0];
  const firstName = profile?.name.split(" ")[0];

  // Ahora en el Hub: el bloque en curso, por zona.
  const live = (["mesas", "oficinas", "salas"] as ZoneId[]).map((z) => {
    const units = unitsOfZone(z);
    const cap = units.reduce((a, u) => a + u.capacity, 0);
    const used = units.reduce((a, u) => a + countFor(state, u.id, TODAY, CURRENT_BLOCK), 0);
    return { zone: zoneById(z), cap, used };
  });

  const upcoming = TALKS.filter((t) => dayOffset(t.day) >= 0 && !(dayOffset(t.day) === 0 && blockById(t.block).endMin <= NOW_MIN)).sort(
    (a, b) => a.day.localeCompare(b.day) || blockById(a.block).startMin - blockById(b.block).startMin,
  );

  const subline = !hydrated
    ? " "
    : next
      ? `Tu próxima reserva es ${formatDay(next.day).toLowerCase()} a las ${blockById(next.block).start} en ${unitById(next.unitId).name}.`
      : `No tienes reservas. Hoy quedan puestos en el centro de mesas desde las ${
          BLOCKS.find((b) => b.startMin > NOW_MIN && countFor(state, "mesas", TODAY, b.id) < 40)?.start ?? "—"
        }.`;

  return (
    <MobileShell
      title={<Wordmark sub="Hub Providencia" />}
      action={
        profile ? (
          <Link href="/registro" aria-label="Mi credencial" className="press flex size-11 items-center justify-center rounded-full">
            <Avatar name={profile.name} hue={210} size={32} />
          </Link>
        ) : null
      }
    >
      <h1 className="text-[24px] font-semibold leading-[30px] tracking-[-0.01em]">{firstName ? `Hola, ${firstName}` : "Inicio"}</h1>
      <p className="mt-1 min-h-5 text-[14px] text-muted">{subline}</p>

      {hydrated && !profile && (
        <div className="mt-4 rounded-card bg-accent-soft p-4">
          <p className="text-[15px] font-medium text-accent-ink">Regístrate una vez y entra con tu teléfono</p>
          <p className="mt-1 text-[13px] text-accent-ink">Sin formulario en cada visita. Toma un minuto.</p>
          <Link href="/registro" className="press mt-3 inline-flex h-10 items-center gap-1.5 rounded-control bg-accent px-4 text-[14px] font-medium text-white">
            Crear mi credencial <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      )}

      {/* Próxima reserva */}
      {next && (
        <section aria-labelledby="next-title" className="enter mt-4 overflow-hidden rounded-card border border-border">
          <div className="relative h-[120px]">
            <Image src={zoneById(unitById(next.unitId).zoneId).photo} alt="" fill sizes="440px" className="object-cover" />
          </div>
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 id="next-title" className="text-[17px] font-semibold">
                  {unitById(next.unitId).name}
                </h2>
                <p className="text-[13px] text-muted">{zoneById(unitById(next.unitId).zoneId).building}</p>
              </div>
              <Pill tone="accent">{startsIn(next.day, blockById(next.block).startMin)}</Pill>
            </div>
            <p className="num mt-3 text-[22px] font-medium leading-[28px]">{blockLabel(next.block)}</p>
            <p className="text-[13px] text-muted">{formatDay(next.day, "long")}</p>
            <div className="mt-4 flex gap-2">
              <Link href="/registro" className="press flex h-11 flex-1 items-center justify-center gap-2 rounded-control bg-primary text-[14px] font-medium text-white">
                <Nfc size={17} aria-hidden="true" /> Cómo entrar
              </Link>
              <Button
                onClick={() => {
                  cancel(next.id);
                  setToast("Reserva cancelada. El cupo quedó libre para otra persona.");
                  setTimeout(() => setToast(null), 3000);
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Ahora en el Hub */}
      <section aria-labelledby="live-title" className="mt-6">
        <div className="flex items-baseline justify-between">
          <h2 id="live-title" className="text-[16px] font-semibold">
            Ahora en el Hub
          </h2>
          <span className="num text-[12px] text-muted">{blockLabel(CURRENT_BLOCK)}</span>
        </div>
        <ul className="mt-2">
          {live.map(({ zone, cap, used }) => (
            <li key={zone.id} className="border-b border-rule py-3 last:border-b-0">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[14px]">{zone.name}</span>
                <span className="num text-[13px]">
                  {used >= cap ? <span className="text-muted">Lleno</span> : <>{cap - used} {cap - used === 1 ? "libre" : "libres"}</>}
                  <span className="text-muted"> / {cap}</span>
                </span>
              </div>
              <CapacityTrack used={used} capacity={cap} className="mt-2" label={`${zone.name}: ${used} de ${cap} ocupados`} />
            </li>
          ))}
        </ul>
        <Link href="/reservar" className="press mt-2 flex h-11 items-center justify-center gap-1.5 rounded-control border border-control text-[14px] font-medium">
          Reservar un espacio <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </section>

      {/* Charlas */}
      <section aria-labelledby="talks-title" className="mt-7">
        <h2 id="talks-title" className="text-[16px] font-semibold">
          Charlas de la semana
        </h2>
        <p className="text-[13px] text-muted">En la zona de charlas y el Edificio Empleo. Inscribirte te guarda el asiento.</p>
        <ul className="mt-2">
          {upcoming.map((t) => {
            const n = talkEnrolledCount(t.id, hydrated ? enrolled : []);
            const left = t.capacity - n;
            const isIn = hydrated && enrolled.includes(t.id);
            const trainer = trainerById(t.trainerId);
            return (
              <li key={t.id} className="flex gap-3 border-b border-rule py-3.5 last:border-b-0">
                <div className="num flex w-12 flex-none flex-col items-center rounded-card bg-raised py-1.5 text-center">
                  <span className="text-[11px] capitalize text-muted">{formatDay(t.day, "short").split(" ")[0]}</span>
                  <span className="text-[17px] font-semibold leading-[22px]">{t.day.slice(-2).replace(/^0/, "")}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium leading-[19px]">{t.title}</p>
                  <p className="mt-0.5 text-[12px] text-muted">
                    <span className="num">{blockLabel(t.block)}</span> · {trainer.name} · {unitById(t.unitId).name}
                  </p>
                  <p className={cx("num mt-1 text-[12px]", left <= 0 && !isIn ? "text-muted" : left <= 5 ? "font-medium text-accent-ink" : "text-muted")}>
                    {left <= 0 && !isIn ? "Sin cupos" : `Quedan ${left} de ${t.capacity}`}
                  </p>
                </div>
                <button
                  disabled={left <= 0 && !isIn}
                  aria-pressed={isIn}
                  onClick={() => {
                    const r = toggleTalk(t.id);
                    setToast(r.ok ? (isIn ? "Ya no estás inscrita en la charla." : "Inscripción lista. Te avisamos el mismo día.") : (r.error ?? null));
                    setTimeout(() => setToast(null), 3000);
                  }}
                  className={cx(
                    "press h-11 flex-none self-center rounded-full px-4 text-[13px] font-medium",
                    isIn ? "bg-accent-soft text-accent-ink" : "border border-control",
                    left <= 0 && !isIn && "border-transparent bg-raised text-muted",
                  )}
                >
                  {isIn ? "Inscrita" : left <= 0 ? "Llena" : "Inscribirme"}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Capacitadores */}
      <section aria-labelledby="trainers-title" className="mt-7">
        <h2 id="trainers-title" className="text-[16px] font-semibold">
          Capacitadores
        </h2>
        <p className="text-[13px] text-muted">Reunión privada de 2 horas en la sala de entrevistas del Edificio Empleo.</p>
        <div className="-mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {TRAINERS.map((tr) => {
            // Próximo bloque disponible del capacitador dentro de la semana.
            let slot: { day: string; block: (typeof BLOCKS)[number]["id"] } | null = null;
            for (let off = 0; off < 7 && !slot; off++) {
              const d = dayKey(off);
              const a = tr.availability.find((x) => x.weekday === weekdayOf(d) && !(off === 0 && blockById(x.block).endMin <= NOW_MIN));
              if (a && countFor(state, "entrevistas", d, a.block) < 1) slot = { day: d, block: a.block };
            }
            return (
              <article key={tr.id} className="w-[232px] flex-none snap-start rounded-card border border-border p-4">
                <div className="flex items-center gap-3">
                  <Avatar name={tr.name} hue={tr.hue} size={40} />
                  <div className="min-w-0">
                    <h3 className="truncate text-[14px] font-medium">{tr.name}</h3>
                    <p className="num flex items-center gap-1 text-[12px] text-muted">
                      <Star size={12} className="fill-current" aria-hidden="true" />
                      {tr.rating.toLocaleString("es-CL", { minimumFractionDigits: 1 })} · {tr.ratings} opiniones
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-[13px] font-medium">{tr.specialty}</p>
                <p className="mt-1 line-clamp-2 text-[12px] leading-[17px] text-muted">{tr.bio}</p>
                {slot ? (
                  <Link
                    href={`/reservar?zona=salas&unidad=entrevistas&dia=${slot.day}`}
                    className="press mt-3 flex h-11 items-center justify-between border-t border-rule pt-1 text-[13px]"
                  >
                    <span>
                      {formatDay(slot.day)} <span className="num">{blockById(slot.block).start}</span>
                    </span>
                    <span className="font-medium text-accent-ink">Agendar</span>
                  </Link>
                ) : (
                  <p className="mt-3 flex h-11 items-center border-t border-rule pt-1 text-[13px] text-muted">Sin horas esta semana</p>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/* Otras reservas */}
      {mine.length > 1 && (
        <section aria-labelledby="mine-title" className="mt-7">
          <h2 id="mine-title" className="text-[16px] font-semibold">
            Tus otras reservas
          </h2>
          <ul className="mt-1">
            {mine.slice(1).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 border-b border-rule py-3 last:border-b-0">
                <div className="min-w-0">
                  <p className="truncate text-[14px]">{unitById(r.unitId).name}</p>
                  <p className="text-[12px] text-muted">{formatDay(r.day, "long")}</p>
                </div>
                <span className="num text-[14px]">{blockLabel(r.block)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <Toast message={toast} />
    </MobileShell>
  );
}
