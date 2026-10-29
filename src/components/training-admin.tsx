"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { dayOffset, formatDay, formatMin } from "@/lib/data";
import { TRAINING_SESSIONS, trainingKind } from "@/lib/lab";
import { sessionEnrolledCount, useAforo, useHydrated } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { Avatar, Button, Pill, Tabs } from "@/components/ui";

/*
 * Vista del equipo del Hub para las capacitaciones: por sesión, marca quién asistió y
 * aprueba. Lee y escribe en Supabase (marcar_asistencia y aprobar_capacitacion solo
 * funcionan con una cuenta de administración). Aprobar habilita al instante las máquinas
 * de ese tipo en la app de la persona.
 */

type Row = { personaId: string; name: string; segment: string; hue: number; attended: boolean; approved: boolean; me: boolean };

export function TrainingAdmin() {
  const hydrated = useHydrated();
  const profile = useAforo((s) => s.profile);
  const sessionCounts = useAforo((s) => s.sessionCounts);
  const sync = useAforo((s) => s.sync);

  const sessions = TRAINING_SESSIONS.filter((s) => dayOffset(s.day) >= 0).sort((a, b) => a.day.localeCompare(b.day) || a.startMin - b.startMin);
  const [picked, setPicked] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const isAdmin = profile?.role === "admin";

  // Por defecto, la primera sesión que viene.
  const session = sessions.find((s) => s.id === picked) ?? sessions[0];

  const load = useCallback(async () => {
    if (!isAdmin) return;
    const { data } = await supabase
      .from("inscripciones_capacitacion")
      .select("persona_id, asistio, aprobada, creada_at, personas!inscripciones_capacitacion_persona_id_fkey(nombre, segmento, tono, user_id)")
      .eq("sesion_id", session.id)
      .order("creada_at", { ascending: false });
    setRows(
      (data ?? []).map((r) => {
        const p = r.personas as unknown as { nombre: string; segmento: string; tono: number; user_id: string | null };
        return { personaId: r.persona_id, name: p.nombre, segment: p.segmento, hue: p.tono, attended: r.asistio, approved: r.aprobada, me: r.persona_id === profile?.id };
      }),
    );
  }, [isAdmin, session.id, profile?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (personaId: string, fn: "marcar_asistencia" | "aprobar_capacitacion", attended?: boolean) => {
    // Se ve al instante; después se confirma con lo que guardó el servidor.
    setRows((rs) =>
      rs.map((r) =>
        r.personaId !== personaId ? r : fn === "marcar_asistencia" ? { ...r, attended: !!attended, approved: r.approved && !!attended } : { ...r, approved: true },
      ),
    );
    setBusy(personaId);
    await supabase.rpc(fn, fn === "marcar_asistencia" ? { p_sesion: session.id, p_persona: personaId, p_asistio: attended } : { p_sesion: session.id, p_persona: personaId });
    await Promise.all([load(), sync()]);
    setBusy(null);
  };

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
          {formatDay(session.day, "long")} · {formatMin(session.startMin)}–{formatMin(session.endMin)} · {session.place} ·{" "}
          {sessionEnrolledCount({ sessionCounts }, session.id)} de {session.capacity} inscritos
        </p>
      </div>

      {hydrated && !isAdmin ? (
        <p className="m-5 rounded-card bg-raised p-4 text-[14px]">
          Para marcar asistencia y aprobar, entra con una cuenta de administración.{" "}
          <Link href="/registro" className="link-more">
            Entrar
          </Link>
        </p>
      ) : (
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
              {rows.map((p) => (
                <tr key={p.personaId} className="border-b border-border last:border-b-0">
                  <td className="px-5 py-2.5">
                    <span className="flex items-center gap-2.5">
                      <Avatar name={p.name} hue={p.hue} size={28} />
                      <span className="min-w-0">
                        <span className="block truncate">
                          {p.name} {p.me && <span className="text-muted">(tú)</span>}
                        </span>
                        <span className="block text-[12px] text-muted">{p.segment}</span>
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      className="size-5 accent-black"
                      checked={p.attended}
                      disabled={busy === p.personaId}
                      aria-label={`Asistió ${p.name}`}
                      onChange={(e) => void act(p.personaId, "marcar_asistencia", e.target.checked)}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    {p.approved ? <Pill tone="positive">Aprobada</Pill> : p.attended ? <Pill tone="accent">Asistió</Pill> : <Pill>Inscrita</Pill>}
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    <Button
                      variant="primary"
                      disabled={!p.attended || p.approved || busy === p.personaId}
                      onClick={() => void act(p.personaId, "aprobar_capacitacion")}
                      aria-label={`Aprobar a ${p.name}`}
                    >
                      {p.approved ? "Aprobada" : "Aprobar"}
                    </Button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-4 text-muted">
                    Nadie inscrito todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
