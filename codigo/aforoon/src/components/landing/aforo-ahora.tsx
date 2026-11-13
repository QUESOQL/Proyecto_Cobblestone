"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { BLOCKS, dayKey, dayOffset, formatDay, isOpen, unitsOfZone, type ZoneId } from "@/lib/data";
import { MACHINES, type SpaceId } from "@/lib/lab";
import { supabase, toSantiago } from "@/lib/supabase";
import { CapacityTrack, cx } from "@/components/ui";

/*
 * "Ahora en el Hub", en la portada: si el Hub está abierto o cerrado, cuántos cupos están
 * reservados en el bloque en curso por zona y qué máquinas se están usando. Son los mismos
 * datos públicos que ve un socio en /reservar y /maquinas (reloj(), ocupacion(),
 * maquinas_tomadas() y el estado de cada máquina; nada de personas). Se actualiza cada minuto.
 * Cuando la app pase a la hora real, se puede sumar quién está dentro según la puerta.
 */

const ZONAS: { id: ZoneId; nombre: string; unidad: [string, string] }[] = [
  { id: "mesas", nombre: "Centro de mesas", unidad: ["puesto", "puestos"] },
  { id: "oficinas", nombre: "Oficinas y set", unidad: ["espacio", "espacios"] },
  { id: "salas", nombre: "Edificio Empleo", unidad: ["lugar", "lugares"] },
];
const TALLERES: { id: SpaceId; nombre: string }[] = [
  { id: "lab881", nombre: "Lab881" },
  { id: "textil", nombre: "Cowork textil" },
];

interface Estado {
  dia: string;
  minuto: number;
  ocupados: Record<string, number>; // unidad_id → ocupados en el bloque en curso
  enUso: Set<string>; // máquinas con una reserva en este momento
  fuera: Set<string>; // máquinas fuera de servicio
}

const capacidad = (z: ZoneId) => unitsOfZone(z).reduce((a, u) => a + u.capacity, 0);
const enUsoZona = (z: ZoneId, ocupados: Record<string, number>) => unitsOfZone(z).reduce((a, u) => a + (ocupados[u.id] ?? 0), 0);

function bloqueEnCurso(dia: string, minuto: number) {
  const b = BLOCKS.find((x) => minuto >= x.startMin && minuto < x.endMin);
  return b && isOpen(dia, b.id) ? b : null;
}

/** El próximo bloque abierto, desde ahora: "hoy a las 14:00", "mañana a las 08:00", "el lunes a las 08:00". */
function proximaApertura(dia: string, minuto: number): string {
  const base = dayOffset(dia);
  for (let d = 0; d < 8; d++) {
    const dk = dayKey(base + d);
    const b = BLOCKS.find((x) => isOpen(dk, x.id) && (d > 0 || x.startMin > minuto));
    if (!b) continue;
    const cuando = d === 0 ? "hoy" : d === 1 ? "mañana" : `el ${formatDay(dk, "long").split(" ")[0].toLowerCase()}`;
    return `Abre ${cuando} a las ${b.start}`;
  }
  return "";
}

/** Minuto absoluto (días desde hoy × 1440 + minuto del día), para comparar instantes. */
const absoluto = (dia: string, minuto: number) => dayOffset(dia) * 1440 + minuto;

export function AforoAhora() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let vivo = true;
    const cargar = async () => {
      const r = await supabase.rpc("reloj");
      if (r.error || !r.data) return vivo && setError(true);
      const { dia, minuto } = r.data as { dia: string; minuto: number };
      const b = bloqueEnCurso(dia, minuto);
      const ayer = dayKey(dayOffset(dia) - 1);
      const [o, t, m] = await Promise.all([
        b ? supabase.rpc("ocupacion", { p_dia: dia }) : Promise.resolve({ data: [], error: null }),
        supabase.rpc("maquinas_tomadas", { p_desde: ayer, p_hasta: dia }),
        supabase.from("maquinas").select("id, estado"),
      ]);
      if (o.error || t.error || m.error) return vivo && setError(true);
      const ocupados: Record<string, number> = {};
      for (const fila of (o.data ?? []) as { unidad_id: string; bloque_id: string; ocupados: number }[]) {
        if (b && fila.bloque_id === b.id) ocupados[fila.unidad_id] = fila.ocupados;
      }
      // Una máquina está en uso si una reserva cubre este momento (los trabajos largos cruzan la noche).
      const ahora = absoluto(dia, minuto);
      const enUso = new Set<string>();
      for (const x of (t.data ?? []) as { maquina_id: string; inicio: string; fin: string }[]) {
        const ini = toSantiago(x.inicio);
        const fin = toSantiago(x.fin);
        if (absoluto(ini.day, ini.min) <= ahora && ahora < absoluto(fin.day, fin.min)) enUso.add(x.maquina_id);
      }
      const fuera = new Set(((m.data ?? []) as { id: string; estado: string }[]).filter((x) => x.estado !== "disponible").map((x) => x.id));
      if (vivo) {
        setError(false);
        setEstado({ dia, minuto, ocupados, enUso, fuera });
      }
    };
    void cargar();
    const id = setInterval(() => void cargar(), 60_000);
    return () => {
      vivo = false;
      clearInterval(id);
    };
  }, []);

  const bloque = estado ? bloqueEnCurso(estado.dia, estado.minuto) : null;
  const abierto = !!bloque;

  // La frase que resume: la zona más llena.
  let resumen = "";
  if (estado && bloque) {
    const masLlena = ZONAS.map((z) => ({ z, usados: enUsoZona(z.id, estado.ocupados), cap: capacidad(z.id) })).sort(
      (a, b) => b.usados / b.cap - a.usados / a.cap,
    )[0];
    const quedan = masLlena.cap - masLlena.usados;
    if (quedan <= 0) resumen = `${masLlena.z.nombre} está lleno en este bloque.`;
    else if (masLlena.usados / masLlena.cap >= 0.8)
      resumen = `${masLlena.z.nombre} se está llenando: ${quedan === 1 ? "queda 1" : `quedan ${quedan}`} ${masLlena.z.unidad[quedan === 1 ? 0 : 1]}.`;
    else resumen = "Hay espacio en todas las zonas.";
  }

  return (
    <section aria-labelledby="ahora-titulo" className="lp-ahora">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 id="ahora-titulo" className="text-[18px] font-medium">
          Ahora en el Hub
        </h2>
        {estado && (
          <p className={cx("lp-estado", abierto ? "lp-estado--abierto" : "lp-estado--cerrado")} role="status">
            <span className="lp-estado-punto" aria-hidden="true" />
            {abierto ? `Abierto · bloque ${bloque.start}–${bloque.end}` : "Cerrado"}
          </p>
        )}
      </div>

      {!estado && !error && <p className="mt-4 text-[14px] text-slate">Cargando el aforo…</p>}
      {error && !estado && <p className="mt-4 text-[14px] text-slate">No pudimos cargar el aforo. Vuelve a intentarlo en un momento.</p>}

      {estado && abierto && (
        <>
          {/* Espacios y máquinas lado a lado solo cuando la tarjeta es ancha (consulta de contenedor). */}
          <div className="@container mt-4">
          <div className="grid gap-x-10 gap-y-5 @xl:grid-cols-2">
            <div className="min-w-0">
              <h3 className="lp-ahora-sub">Espacios · reservados</h3>
              <ul className="mt-2 flex flex-col gap-3" aria-label="Cupos reservados por zona">
                {ZONAS.map((z) => {
                  const usados = enUsoZona(z.id, estado.ocupados);
                  const cap = capacidad(z.id);
                  return (
                    <li key={z.id}>
                      <div className="flex items-baseline justify-between gap-3 text-[14px]">
                        <span className="min-w-0 truncate">{z.nombre}</span>
                        <span className={cx("num flex-none whitespace-nowrap", usados >= cap && "font-medium text-negative")}>
                          {usados}
                          <span className={usados >= cap ? undefined : "text-slate"}> / {cap}</span>
                        </span>
                      </div>
                      <CapacityTrack used={usados} capacity={cap} fullTone="negative" className="mt-1.5" label={`${z.nombre}: ${usados} de ${cap} reservados`} />
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="min-w-0">
              <h3 className="lp-ahora-sub">Máquinas · en uso</h3>
              <ul className="mt-2 flex flex-col gap-3" aria-label="Máquinas en uso">
                {TALLERES.map((s) => {
                  const todas = MACHINES.filter((m) => m.space === s.id);
                  const usadas = todas.filter((m) => estado.enUso.has(m.id));
                  const fuera = todas.filter((m) => estado.fuera.has(m.id)).length;
                  return (
                    <li key={s.id}>
                      <div className="flex items-baseline justify-between gap-3 text-[14px]">
                        <span className="min-w-0 truncate">{s.nombre}</span>
                        <span className={cx("num flex-none whitespace-nowrap", usadas.length >= todas.length && "font-medium text-negative")}>
                          {usadas.length}
                          <span className={usadas.length >= todas.length ? undefined : "text-slate"}> / {todas.length}</span>
                        </span>
                      </div>
                      <CapacityTrack used={usadas.length} capacity={todas.length} fullTone="negative" className="mt-1.5" label={`${s.nombre}: ${usadas.length} de ${todas.length} máquinas en uso`} />
                      <p className="mt-1 truncate text-[12px] text-slate">
                        {usadas.length ? usadas.map((m) => m.name).join(", ") : "Todas libres"}
                        {fuera ? ` · ${fuera} fuera de servicio` : ""}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
          </div>
          <p className="mt-4 text-[15px] font-medium">{resumen}</p>
        </>
      )}

      {estado && !abierto && (
        <p className="mt-3 text-[15px] leading-[1.5] text-slate">
          {proximaApertura(estado.dia, estado.minuto)}. Puedes reservar desde ya para el próximo bloque.
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
        <Link href="/reservar" className="btn max-md:w-full">
          Reservar un lugar <ArrowRight size={18} aria-hidden="true" />
        </Link>
        <p className="text-[12px] leading-[1.4] text-slate">
          Reservas del bloque en curso.
          <br />
          Se actualiza cada minuto.
        </p>
      </div>
    </section>
  );
}
