"use client";

import { useState } from "react";
import { dayOffset, formatDay, formatMin, memberById } from "@/lib/data";
import { TRAINING_SESSIONS, trainingKind } from "@/lib/lab";
import { ME_ID, sessionEnrolledCount, useAforo, useHydrated } from "@/lib/store";
import { Avatar, Button, Pill, Tabs } from "@/components/ui";

/*
 * Vista del equipo del Hub para las capacitaciones: por sesión, marca quién asistió y
 * aprueba. Aprobar habilita al instante las máquinas de ese tipo en la app de la persona.
 */
export function TrainingAdmin() {
  const hydrated = useHydrated();
  const profile = useAforo((s) => s.profile);
  const myTrainings = useAforo((s) => s.myTrainings);
  const sessionMarks = useAforo((s) => s.sessionMarks);
  const markAttendance = useAforo((s) => s.markAttendance);
  const approveTraining = useAforo((s) => s.approveTraining);

  const state = { myTrainings: hydrated ? myTrainings : {} };
  const sessions = TRAINING_SESSIONS.filter((s) => dayOffset(s.day) >= 0).sort((a, b) => a.day.localeCompare(b.day) || a.startMin - b.startMin);
  // Por defecto, la sesión donde está inscrita la persona de la demo.
  const mine = sessions.find((s) => Object.values(state.myTrainings).some((t) => t?.sessionId === s.id));
  const [picked, setPicked] = useState<string | null>(null);
  const session = sessions.find((s) => s.id === picked) ?? mine ?? sessions[0];
  const marks = (hydrated ? sessionMarks[session.id] : undefined) ?? {};

  const meIn = profile && state.myTrainings[session.kind]?.sessionId === session.id;
  const people = [
    ...(meIn ? [{ id: ME_ID, name: profile.name, hue: 210, segment: profile.segment }] : []),
    ...session.enrolledIds.map((id) => {
      const m = memberById(id)!;
      return { id, name: m.name, hue: m.hue, segment: m.segment };
    }),
  ];

  return (
    <section id="capacitaciones" aria-labelledby="train-title" className="mt-6 scroll-mt-20 overflow-hidden rounded-card border border-border bg-surface">
      <div className="px-5 pt-4">
        <h2 id="train-title" className="text-[18px]">
          Capacitaciones
        </h2>
        <p className="text-[13px] text-muted">Marca la asistencia y aprueba: la persona puede reservar las máquinas de ese tipo al instante.</p>
        <Tabs
          items={sessions.map((s) => ({ id: s.id, label: `${trainingKind(s.kind).name} · ${formatDay(s.day, "short")}` }))}
          value={session.id}
          onChange={setPicked}
          label="Sesión"
          className="-mx-1 mt-3"
        />
        <p className="num mt-2 text-[13px] text-muted">
          {formatDay(session.day, "long")} · {formatMin(session.startMin)}–{formatMin(session.endMin)} · {session.place} · {sessionEnrolledCount(state, session.id)} de{" "}
          {session.capacity} inscritos
        </p>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table aria-label="Inscritos en la sesión" className="w-full min-w-[560px] text-[14px]">
          <thead>
            <tr className="border-y border-border text-left text-[12px] text-muted">
              <th className="px-5 py-2 font-normal">Persona</th>
              <th className="px-3 py-2 font-normal">Asistió</th>
              <th className="px-3 py-2 font-normal">Estado</th>
              <th className="px-5 py-2 text-right font-normal">Aprobación</th>
            </tr>
          </thead>
          <tbody>
            {people.map((p) => {
              const mark = marks[p.id] ?? {};
              return (
                <tr key={p.id} className="border-b border-border last:border-b-0">
                  <td className="px-5 py-2.5">
                    <span className="flex items-center gap-2.5">
                      <Avatar name={p.name} hue={p.hue} size={28} />
                      <span className="min-w-0">
                        <span className="block truncate">
                          {p.name} {p.id === ME_ID && <span className="text-muted">(demo)</span>}
                        </span>
                        <span className="block text-[12px] text-muted">{p.segment}</span>
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      className="size-5 accent-black"
                      checked={!!mark.attended}
                      aria-label={`Asistió ${p.name}`}
                      onChange={(e) => markAttendance(session.id, p.id, e.target.checked)}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    {mark.approved ? <Pill tone="positive">Aprobada</Pill> : mark.attended ? <Pill tone="accent">Asistió</Pill> : <Pill>Inscrita</Pill>}
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    <Button
                      variant="primary"
                      disabled={!mark.attended || mark.approved}
                      onClick={() => approveTraining(session.id, p.id)}
                      aria-label={`Aprobar a ${p.name}`}
                    >
                      {mark.approved ? "Aprobada" : "Aprobar"}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
