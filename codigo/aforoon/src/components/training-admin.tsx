"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, CheckCheck, UserCheck } from "lucide-react";
import { dayOffset, formatDay, formatMin } from "@/lib/data";
import { TRAINING_SESSIONS, trainingKind } from "@/lib/lab";
import { sessionEnrolledCount, useAforo, useHydrated } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { Avatar, Button, Pill, cx } from "@/components/ui";

/*
 * Vista del equipo del Hub para las capacitaciones: por sesión, marca quién asistió y
 * aprueba, de a una persona o a todas de una vez. Lee y escribe en Supabase
 * (marcar_asistencia y aprobar_capacitacion solo funcionan con una cuenta de
 * administración). Aprobar habilita al instante las máquinas de ese tipo en la app de la
 * persona; por eso aprobar a todas pide confirmar con un segundo toque.
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
  const [confirmar, setConfirmar] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const isAdmin = profile?.role === "admin";

  // Por defecto, la primera sesión que viene.
  const session = sessions.find((s) => s.id === picked) ?? sessions[0];

  // La sesión que se está mostrando: una respuesta que llega tarde de otra sesión se descarta.
  const vigente = useRef(session.id);
  vigente.current = session.id;

  const load = useCallback(async () => {
    if (!isAdmin) return;
    const pedida = session.id;
    const { data } = await supabase
      .from("inscripciones_capacitacion")
      .select("persona_id, asistio, aprobada, creada_at, personas!inscripciones_capacitacion_persona_id_fkey(nombre, segmento, tono, user_id)")
      .eq("sesion_id", session.id)
      .order("creada_at", { ascending: false });
    if (vigente.current !== pedida) return;
    setRows(
      (data ?? []).map((r) => {
        const p = r.personas as unknown as { nombre: string; segmento: string; tono: number; user_id: string | null };
        return { personaId: r.persona_id, name: p.nombre, segment: p.segmento, hue: p.tono, attended: r.asistio, approved: r.aprobada, me: r.persona_id === profile?.id };
      }),
    );
  }, [isAdmin, session.id, profile?.id]);

  useEffect(() => {
    setRows([]);
    void load();
    setConfirmar(false);
    setAviso(null);
  }, [load]);

  // La confirmación de "aprobar a todas" se cae sola si no se usa.
  useEffect(() => {
    if (!confirmar) return;
    const id = setTimeout(() => setConfirmar(false), 4000);
    return () => clearTimeout(id);
  }, [confirmar]);

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

  const sinAsistencia = rows.filter((r) => !r.attended);
  const porAprobar = rows.filter((r) => r.attended && !r.approved);

  /** Lo mismo que una por una, para varias personas a la vez. */
  const enLote = async (fn: "marcar_asistencia" | "aprobar_capacitacion", personas: Row[]) => {
    if (!personas.length) return;
    const ids = new Set(personas.map((p) => p.personaId));
    setRows((rs) => rs.map((r) => (!ids.has(r.personaId) ? r : fn === "marcar_asistencia" ? { ...r, attended: true } : { ...r, approved: true })));
    setBusy("lote");
    setConfirmar(false);
    const resultados = await Promise.all(
      personas.map((p) =>
        supabase.rpc(fn, fn === "marcar_asistencia" ? { p_sesion: session.id, p_persona: p.personaId, p_asistio: true } : { p_sesion: session.id, p_persona: p.personaId }),
      ),
    );
    const fallas = resultados.filter((r) => r.error).length;
    await Promise.all([load(), sync()]);
    setBusy(null);
    const n = personas.length - fallas;
    const hecho = fn === "marcar_asistencia" ? `Asistencia marcada a ${n} ${n === 1 ? "persona" : "personas"}.` : `${n} ${n === 1 ? "persona aprobada" : "personas aprobadas"}: ya pueden reservar las máquinas.`;
    setAviso(fallas ? `${hecho} ${fallas} no se pudieron guardar; inténtalo de nuevo.` : hecho);
  };

  const inscritos = sessionEnrolledCount({ sessionCounts }, session.id);
  const asistieron = rows.filter((r) => r.attended).length;
  const aprobadas = rows.filter((r) => r.approved).length;

  return (
    <section id="capacitaciones" aria-labelledby="train-title" className="mt-6 scroll-mt-20 overflow-hidden rounded-card border border-border bg-surface">
      <div className="px-5 pt-5">
        <h2 id="train-title" className="text-[18px]">
          Capacitaciones
        </h2>
        <p className="mt-0.5 text-[13px] text-muted">Marca quién asistió y aprueba: la persona puede reservar las máquinas de ese tipo al instante.</p>

        {/* Sesiones que vienen: chips compactos que se acomodan en filas. */}
        <div role="tablist" aria-label="Sesión" className="mt-4 flex flex-wrap gap-1.5">
          {sessions.map((s) => {
            const activa = s.id === session.id;
            return (
              <button
                key={s.id}
                data-sesion={s.id}
                role="tab"
                aria-selected={activa}
                onClick={() => setPicked(s.id)}
                className={cx(
                  "press h-9 rounded-full border px-3.5 text-[13px] whitespace-nowrap",
                  activa ? "border-black bg-black text-white" : "border-border bg-surface hover-raise",
                )}
              >
                {trainingKind(s.kind).name} · <span className="num">{formatDay(s.day, "short")}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* La sesión elegida: cuándo, dónde y cómo va. */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-border bg-raised px-5 py-3.5">
        <div className="min-w-0">
          <p className="text-[15px] font-medium">
            {trainingKind(session.kind).name} · {formatDay(session.day, "long")}
          </p>
          <p className="num text-[13px] text-muted">
            {formatMin(session.startMin)}–{formatMin(session.endMin)} · {session.place}
          </p>
        </div>
        <dl className="num flex gap-5 text-[13px]">
          <div>
            <dt className="text-muted">Inscritos</dt>
            <dd className="text-[15px] font-medium">
              {inscritos}
              <span className="font-normal text-muted"> / {session.capacity}</span>
            </dd>
          </div>
          {isAdmin && (
            <>
              <div>
                <dt className="text-muted">Asistieron</dt>
                <dd className="text-[15px] font-medium">{asistieron}</dd>
              </div>
              <div>
                <dt className="text-muted">Aprobadas</dt>
                <dd className="text-[15px] font-medium">{aprobadas}</dd>
              </div>
            </>
          )}
        </dl>
      </div>

      {hydrated && !isAdmin ? (
        <p className="m-5 rounded-card bg-raised p-4 text-[14px]">
          Para marcar asistencia y aprobar, entra con una cuenta de administración.{" "}
          <Link href="/registro" className="link-more">
            Entrar
          </Link>
        </p>
      ) : (
        <>
          {/* Acciones para toda la sesión. */}
          {rows.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-3">
              <Button onClick={() => void enLote("marcar_asistencia", sinAsistencia)} disabled={!sinAsistencia.length || !!busy}>
                <UserCheck size={16} aria-hidden="true" /> Marcar asistencia a todos
              </Button>
              <Button
                variant="primary"
                onClick={() => (confirmar ? void enLote("aprobar_capacitacion", porAprobar) : setConfirmar(true))}
                disabled={!porAprobar.length || !!busy}
              >
                <CheckCheck size={16} aria-hidden="true" />
                {confirmar
                  ? `Confirmar: aprobar a ${porAprobar.length}`
                  : porAprobar.length
                    ? `Aprobar a quienes asistieron (${porAprobar.length})`
                    : "Aprobar a quienes asistieron"}
              </Button>
              {aviso && (
                <p role="status" className="text-[13px] text-muted">
                  {aviso}
                </p>
              )}
            </div>
          )}

          <div className="overflow-x-auto">
            <table aria-label="Inscritos en la sesión" className="w-full min-w-[520px] text-[14px]">
              <thead>
                <tr className="border-y border-border text-left text-[12px] text-muted">
                  <th className="px-5 py-2 font-normal">Persona</th>
                  <th className="w-[110px] px-3 py-2 text-center font-normal">Asistió</th>
                  <th className="w-[170px] px-5 py-2 text-right font-normal">Aprobación</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.personaId} className="border-b border-border last:border-b-0">
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-3">
                        <Avatar name={p.name} hue={p.hue} size={32} />
                        <span className="min-w-0">
                          <span className="block truncate">
                            {p.name} {p.me && <span className="text-muted">(tú)</span>}
                          </span>
                          <span className="block text-[12px] text-muted">{p.segment}</span>
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        className="size-5 cursor-pointer align-middle accent-black"
                        checked={p.attended}
                        disabled={busy === p.personaId || busy === "lote"}
                        aria-label={`Asistió ${p.name}`}
                        onChange={(e) => void act(p.personaId, "marcar_asistencia", e.target.checked)}
                      />
                    </td>
                    <td className="px-5 py-3 text-right">
                      {p.approved ? (
                        <Pill tone="positive">
                          <Check size={12} aria-hidden="true" className="-ml-0.5 mr-1 inline" />
                          Aprobada
                        </Pill>
                      ) : p.attended ? (
                        <Button
                          variant="primary"
                          className="!h-9 !px-3.5 !text-[13px]"
                          disabled={busy === p.personaId || busy === "lote"}
                          onClick={() => void act(p.personaId, "aprobar_capacitacion")}
                          aria-label={`Aprobar a ${p.name}`}
                        >
                          Aprobar
                        </Button>
                      ) : (
                        <span className="text-[13px] text-muted">Falta la asistencia</span>
                      )}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-5 py-5 text-muted">
                      Nadie inscrito todavía.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
