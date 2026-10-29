"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Info } from "lucide-react";
import { dayOffset, formatDay, formatMin } from "@/lib/data";
import { SPACES, TRAINING_KINDS, machinesOf, sessionsOf, type TrainingType } from "@/lib/lab";
import { sessionEnrolledCount, trainingStatus, useAforo, useHydrated, type TrainingStatus } from "@/lib/store";
import { MobileShell, Pill, Toast, Wordmark, cx } from "@/components/ui";

/*
 * Capacitaciones obligatorias: una por tipo de máquina. Inscribirse es un toque; el
 * equipo del Hub marca la asistencia y la aprueba en /admin, y desde ese momento la
 * persona puede reservar las máquinas de ese tipo.
 */

const STATUS_COPY: Record<TrainingStatus, { tone: "positive" | "neutral" | "warning" | "accent"; label: string }> = {
  aprobada: { tone: "positive", label: "Aprobada" },
  inscrito: { tone: "accent", label: "Inscrita" },
  vencida: { tone: "warning", label: "Vencida" },
  no_inscrito: { tone: "neutral", label: "Pendiente" },
};

export default function CapacitacionesPage() {
  return (
    <Suspense fallback={<MobileShell title={<Wordmark sub="Capacitaciones" />}>{null}</MobileShell>}>
      <Capacitaciones />
    </Suspense>
  );
}

function Capacitaciones() {
  const params = useSearchParams();
  const hydrated = useHydrated();
  const profile = useAforo((s) => s.profile);
  const myTrainings = useAforo((s) => s.myTrainings);
  const enrollTraining = useAforo((s) => s.enrollTraining);
  const leaveTraining = useAforo((s) => s.leaveTraining);
  const sessionCounts = useAforo((s) => s.sessionCounts);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const state = { myTrainings: hydrated ? myTrainings : {}, sessionCounts };
  const focus = TRAINING_KINDS.find((k) => k.id === params.get("tipo"))?.id;
  // La capacitación que se pidió desde una máquina bloqueada va primero.
  const kinds = focus ? [...TRAINING_KINDS].sort((a, b) => (a.id === focus ? -1 : b.id === focus ? 1 : 0)) : TRAINING_KINDS;

  useEffect(() => {
    if (focus) document.getElementById(`cap-${focus}`)?.scrollIntoView({ block: "start" });
  }, [focus]);

  return (
    <MobileShell title={<Wordmark sub="Capacitaciones" />}>
      <h1 className="text-[28px] leading-[1.22]">Capacitaciones</h1>
      <p className="mt-1 text-[14px] text-muted">Pasa una vez por la capacitación y reserva las máquinas gratis. Te avisamos cuando quede aprobada.</p>

      {hydrated && !profile && (
        <Link href="/registro" className="press mt-4 flex items-center gap-2 rounded-card bg-[var(--pill-warning-bg)] px-3.5 py-3 text-[13px] text-[var(--pill-warning-ink)]">
          <Info size={16} aria-hidden="true" /> Termina tu registro para inscribirte.
        </Link>
      )}

      <div className="mt-5 flex flex-col gap-7">
        {kinds.map((k) => {
          const status = trainingStatus(state, k.id);
          const mine = state.myTrainings[k.id];
          const copy = STATUS_COPY[status];
          const sessions = sessionsOf(k.id)
            .filter((s) => dayOffset(s.day) >= 0)
            .sort((a, b) => a.day.localeCompare(b.day) || a.startMin - b.startMin);
          return (
            <section key={k.id} id={`cap-${k.id}`} aria-labelledby={`cap-${k.id}-title`} className="scroll-mt-20">
              <div className="flex items-center justify-between gap-3">
                <h2 id={`cap-${k.id}-title`} className="text-[20px]">
                  {k.name}
                </h2>
                <Pill tone={copy.tone}>{copy.label}</Pill>
              </div>
              <p className="mt-0.5 text-[13px] text-muted">
                {SPACES[k.space].name} · Habilita: {machinesOf(k.space).filter((m) => m.training === k.id).map((m) => m.name).join(", ")}
              </p>

              {status === "aprobada" ? (
                <p className="card mt-3 !p-4 text-[14px]">
                  Ya puedes reservar.{" "}
                  <Link href={`/maquinas?espacio=${k.space}`} className="link-more">
                    Ir a máquinas
                  </Link>
                </p>
              ) : (
                <ul className="mt-2" aria-label={`Sesiones de ${k.name}`}>
                  {sessions.map((s) => {
                    const n = sessionEnrolledCount(state, s.id);
                    const left = s.capacity - n;
                    const isIn = mine?.status === "inscrito" && mine.sessionId === s.id;
                    const full = left <= 0 && !isIn;
                    return (
                      <li key={s.id} className="flex items-center gap-3 border-b border-border py-3.5 last:border-b-0">
                        <div className="num flex w-12 flex-none flex-col items-center rounded-card bg-raised py-1.5 text-center">
                          <span className="text-[11px] capitalize text-muted">{formatDay(s.day, "short").split(" ")[0]}</span>
                          <span className="text-[17px] leading-[22px]">{s.day.slice(-2).replace(/^0/, "")}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[14px] font-medium">{formatDay(s.day, "long")}</p>
                          <p className="num text-[12px] text-muted">
                            {formatMin(s.startMin)}–{formatMin(s.endMin)} · {s.place}
                          </p>
                          <p className={cx("num mt-0.5 text-[12px]", left <= 2 && !full ? "font-medium" : "text-muted")}>
                            {full ? "Sin cupos" : `Quedan ${left} de ${s.capacity}`}
                          </p>
                        </div>
                        <button
                          disabled={full || !profile}
                          aria-pressed={isIn}
                          aria-label={`${isIn ? "Inscrita en" : "Inscribirme en"} ${k.name}, ${formatDay(s.day, "long")}`}
                          onClick={async () => {
                            if (isIn) {
                              await leaveTraining(k.id as TrainingType);
                              setToast("Ya no estás inscrita en esta capacitación.");
                              return;
                            }
                            const r = await enrollTraining(s.id);
                            setToast(r.ok ? "Inscripción lista. El equipo del Hub aprueba tu capacitación al terminarla." : (r.error ?? null));
                          }}
                          className={cx(
                            "press h-11 flex-none rounded-control px-4 text-[14px] font-medium disabled:cursor-not-allowed",
                            isIn ? "bg-raised" : "bg-black text-white disabled:bg-[var(--hair)] disabled:text-muted",
                          )}
                        >
                          {isIn ? "Inscrita" : full ? "Llena" : "Inscribirme"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
      <p className="mt-8 text-[12px] text-muted">Fechas y cupos de las sesiones: datos de ejemplo, por confirmar con el Hub.</p>
      <Toast message={toast} />
    </MobileShell>
  );
}
