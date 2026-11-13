"use client";

import { useEffect, useState } from "react";
import { dayKey, dayOffset, isOpen, unitsOfZone, BLOCKS, type ZoneId } from "@/lib/data";
import { MACHINES } from "@/lib/lab";
import { supabase, toSantiago } from "@/lib/supabase";

/*
 * Qué se usa más en el Hub, de los últimos 7 días: la ocupación de cada espacio (cupos
 * reservados sobre los cupos de los bloques abiertos) y las horas reservadas de cada máquina.
 * Sale de las mismas funciones públicas que usa la app del socio (ocupacion y
 * maquinas_tomadas), así que sirve igual en el panel en vivo y en la demo.
 */

const DIAS = 7;

export interface UsoRecursos {
  /** unidad_id → { reservados, cupos } en los bloques abiertos de los últimos 7 días. */
  espacios: Record<string, { reservados: number; cupos: number }>;
  /** maquina_id → { horas, reservas } en los últimos 7 días. */
  maquinas: Record<string, { horas: number; reservas: number }>;
}

export function useUsoRecursos(dia: string | undefined, minuto: number | undefined) {
  const [uso, setUso] = useState<UsoRecursos | null>(null);

  useEffect(() => {
    if (!dia || minuto == null) return;
    let vivo = true;
    const base = dayOffset(dia);
    const dias = Array.from({ length: DIAS }, (_, i) => dayKey(base - (DIAS - 1) + i));
    void (async () => {
      const [occ, tomadas] = await Promise.all([
        Promise.all(dias.map((d) => supabase.rpc("ocupacion", { p_dia: d }))),
        supabase.rpc("maquinas_tomadas", { p_desde: dias[0], p_hasta: dia }),
      ]);
      const espacios: UsoRecursos["espacios"] = {};
      dias.forEach((d, i) => {
        const filas = (occ[i].data ?? []) as { unidad_id: string; bloque_id: string; ocupados: number }[];
        // Solo bloques abiertos que ya empezaron (hoy, hasta el bloque en curso).
        for (const b of BLOCKS) {
          if (!isOpen(d, b.id) || (d === dia && b.startMin > minuto)) continue;
          for (const z of ["mesas", "oficinas", "salas"] as ZoneId[]) {
            for (const u of unitsOfZone(z)) {
              const e = (espacios[u.id] ??= { reservados: 0, cupos: 0 });
              e.cupos += u.capacity;
              e.reservados += filas.find((f) => f.unidad_id === u.id && f.bloque_id === b.id)?.ocupados ?? 0;
            }
          }
        }
      });
      const ahora = dayOffset(dia) * 1440 + minuto;
      const maquinas: UsoRecursos["maquinas"] = {};
      for (const m of MACHINES) maquinas[m.id] = { horas: 0, reservas: 0 };
      for (const r of (tomadas.data ?? []) as { maquina_id: string; inicio: string; fin: string }[]) {
        const ini = toSantiago(r.inicio);
        const fin = toSantiago(r.fin);
        const a = dayOffset(ini.day) * 1440 + ini.min;
        if (a > ahora || !maquinas[r.maquina_id]) continue; // solo lo que ya empezó
        const b = Math.min(ahora, dayOffset(fin.day) * 1440 + fin.min);
        maquinas[r.maquina_id].horas += Math.max(0, b - a) / 60;
        maquinas[r.maquina_id].reservas += 1;
      }
      if (vivo) setUso({ espacios, maquinas });
    })();
    return () => {
      vivo = false;
    };
  }, [dia, minuto]);

  return uso;
}

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

function Barra({ valor, max, primero }: { valor: number; max: number; primero: boolean }) {
  return (
    <div className="mt-1.5 h-[3px] w-full">
      <div className="h-full rounded-full" style={{ width: `${max ? (valor / max) * 100 : 0}%`, background: primero ? "var(--text)" : "var(--inactive-soft)" }} />
    </div>
  );
}

/** Todos los espacios ordenados por ocupación; los de la zona elegida, destacados. */
export function EspaciosMasUsados({ zona, nombreZona, uso }: { zona: ZoneId; nombreZona: string; uso: UsoRecursos | null }) {
  const filas = (["mesas", "oficinas", "salas"] as ZoneId[])
    .flatMap((z) => unitsOfZone(z))
    .map((u) => ({ u, ...(uso?.espacios[u.id] ?? { reservados: 0, cupos: 0 }) }))
    .map((f) => ({ ...f, p: pct(f.reservados, f.cupos) }))
    .sort((a, b) => b.p - a.p);
  return (
    <section aria-labelledby="esp-title" className="flex min-w-0 flex-col rounded-card border border-border bg-surface p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="esp-title" className="text-[18px] font-normal">
          Espacios más usados
        </h2>
        <span className="text-[12px] text-muted">7 días</span>
      </div>
      <p className="mt-0.5 text-[13px] text-muted">
        Cupos reservados sobre los cupos de los bloques abiertos. En negro, <span className="text-text">{nombreZona}</span>.
      </p>
      {!uso ? (
        <p className="mt-4 text-[13px] text-muted">Cargando…</p>
      ) : (
        <ul className="mt-1 flex flex-col" aria-label="Espacios más usados">
          {filas.map((f) => (
            <li key={f.u.id} className={f.u.zoneId === zona ? "py-1.5" : "py-1.5 text-muted"}>
              <div className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="truncate">{f.u.name}</span>
                <span className="num flex-none">
                  {f.p}%<span className="ml-1.5 text-[12px] text-muted">{f.reservados} de {f.cupos}</span>
                </span>
              </div>
              <Barra valor={f.p} max={100} primero={f.u.zoneId === zona} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Las máquinas por horas reservadas, con su modelo, y el modelo que más se pide. */
export function MaquinasMasUsadas({ uso }: { uso: UsoRecursos | null }) {
  const filas = MACHINES.map((m) => ({ m, ...(uso?.maquinas[m.id] ?? { horas: 0, reservas: 0 }) })).sort((a, b) => b.horas - a.horas || b.reservas - a.reservas);
  const max = Math.max(1, ...filas.map((f) => f.horas));
  const porModelo = new Map<string, { horas: number; unidades: number }>();
  for (const f of filas) {
    if (f.m.model.includes("por confirmar")) continue; // las máquinas de coser aún no tienen modelo
    const x = porModelo.get(f.m.model) ?? { horas: 0, unidades: 0 };
    porModelo.set(f.m.model, { horas: x.horas + f.horas, unidades: x.unidades + 1 });
  }
  const [modelo, datoModelo] = [...porModelo.entries()].sort((a, b) => b[1].horas - a[1].horas)[0] ?? ["", { horas: 0, unidades: 0 }];
  const totalHoras = filas.reduce((a, f) => a + f.horas, 0);
  const h = (x: number) => `${Math.round(x)} h`;

  return (
    <section aria-labelledby="maq-title" className="flex min-w-0 flex-col rounded-card border border-border bg-surface p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="maq-title" className="text-[18px] font-normal">
          Máquinas más usadas
        </h2>
        <span className="num text-[12px] text-muted">{h(totalHoras)} reservadas · 7 días</span>
      </div>
      <p className="mt-0.5 text-[13px] text-muted">
        {!uso
          ? "Cargando…"
          : totalHoras > 0
            ? `El modelo más pedido es ${modelo}: ${h(datoModelo.horas)}${datoModelo.unidades > 1 ? ` entre sus ${datoModelo.unidades} máquinas` : ""}.`
            : "Aún no hay reservas de máquinas en estos días."}
      </p>
      {uso && (
        <ul className="mt-2 grid gap-x-8 sm:grid-cols-2" aria-label="Horas reservadas por máquina">
          {filas.map((f, i) => (
            <li key={f.m.id} className="py-2">
              <div className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="min-w-0 truncate">
                  {f.m.name}
                  {!f.m.model.includes("por confirmar") && <span className="text-muted"> · {f.m.model}</span>}
                </span>
                <span className="num flex-none">
                  {h(f.horas)}
                  <span className="ml-1.5 text-[12px] text-muted">
                    {f.reservas} {f.reservas === 1 ? "reserva" : "reservas"}
                  </span>
                </span>
              </div>
              <Barra valor={f.horas} max={max} primero={i === 0 && f.horas > 0} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
