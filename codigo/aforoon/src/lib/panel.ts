/*
 * Datos del panel de administración en una sola forma, vengan de la demo local
 * (?demo=1, generadores de data.ts) o de Supabase (panel_admin() de la migración 0008).
 * La pantalla solo dibuja un PanelDatos; no sabe de dónde salió.
 */

import type { Bar } from "@/components/charts";
import {
  BLOCKS,
  CURRENT_BLOCK,
  MEMBERS,
  NOW_MIN,
  SEGMENTS,
  TALKS,
  TODAY,
  blockById,
  blockLabel,
  dayKey,
  dayOffset,
  formatDay,
  formatMin,
  isOpen,
  memberById,
  trainerById,
  unitById,
  unitsOfZone,
  type ZoneId,
} from "@/lib/data";
import { allReservations, talkEnrolledCount, type useAforo } from "@/lib/store";

export type Tono = "positive" | "negative" | "warning" | "accent" | "neutral";

export interface Kpi {
  label: string;
  value: string;
  caption: string;
}

export interface Incidencia {
  id: string;
  nombre: string;
  tono: number;
  detalle: string;
  etiqueta: string;
  pill: Tono;
}

export interface CharlaFila {
  id: string;
  titulo: string;
  capacitador: string;
  dia: string;
  inicio: string;
  lugar: string;
  inscritos: number;
  capacidad: number;
  /** Porcentaje de asistencia, solo para charlas que ya pasaron. */
  asistencia: number | null;
  nota: number | null;
}

export interface PanelDatos {
  dia: string;
  minuto: number;
  /** "ayer" o "el sábado": el último día que el Hub abrió. */
  ultimoNombre: string;
  noShowsUltimo: number;
  kpis: Kpi[];
  zonas: Record<ZoneId, { cap: number; bars: Bar[] }>;
  segmentos: { label: string; value: number }[];
  incidencias: Incidencia[];
  semana: Bar[];
  entradasHoy: number;
  semanaPasada: { dia: string; n: number };
  horas: Bar[];
  diasPasados: number;
  charlas: CharlaFila[];
}

export const ZONAS_PANEL: ZoneId[] = ["mesas", "oficinas", "salas"];

const pct = (a: number, b: number) => (b === 0 ? 0 : Math.round((a / b) * 100));
const minDe = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** Días entre dos fechas "YYYY-MM-DD" (b − a). */
function diasEntre(a: string, b: string): number {
  const t = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
  return Math.round((t(b) - t(a)) / 86_400_000);
}

function nombreDelDia(dia: string, hoy: string): string {
  if (diasEntre(dia, hoy) === 1) return "ayer";
  return `el ${formatDay(dia, "long").split(" ")[0].toLowerCase()}`;
}

function kpis(p: {
  minuto: number;
  entradasHoy: number;
  ultimoNombre: string;
  entradasUltimo: number;
  reservadas: number;
  cupos: number;
  desde: string;
  hasta: string;
  noShows: number;
  asistidas: number;
  enrolados: number;
  total: number;
}): Kpi[] {
  return [
    { label: "Entradas hoy", value: p.entradasHoy.toLocaleString("es-CL"), caption: `hasta las ${formatMin(p.minuto)} · ${p.ultimoNombre} ${p.entradasUltimo} en el día` },
    { label: "Ocupación reservada", value: `${pct(p.reservadas, p.cupos)}%`, caption: `bloques ${p.desde}–${p.hasta} · ${p.reservadas} de ${p.cupos} cupos` },
    { label: "No-show", value: `${pct(p.noShows, p.noShows + p.asistidas)}%`, caption: `${p.noShows} de ${p.noShows + p.asistidas} reservas · últimos 7 días` },
    { label: "Socios enrolados", value: `${p.enrolados}`, caption: `de ${p.total} registrados · ${p.total - p.enrolados} sin credencial` },
  ];
}

function barrasHoras(porHora: Map<number, number>, dias: number): Bar[] {
  return Array.from({ length: 12 }, (_, i) => 8 + i).map((h) => {
    const avg = Math.round((porHora.get(h) ?? 0) / Math.max(1, dias));
    return { label: `${h}`, value: avg, title: `${h}:00–${h}:59: ${avg} entradas en promedio`, kind: "now" as const };
  });
}

/* ------------------------------------------------------------------ desde Supabase */

/** Lo que devuelve panel_admin() (supabase/migrations/0008_panel_admin.sql). */
export interface PanelServidor {
  dia: string;
  minuto: number;
  ultimo_abierto: string | null;
  entradas_por_dia: { dia: string; n: number }[];
  ocupacion: { reservadas: number; cupos_por_bloque: number; bloques: number; desde: string | null; hasta: string | null };
  no_show: { no_show: number; asistidas: number; ultimo_abierto: number };
  socios: { enrolados: number; total: number };
  bloques_hoy: { id: string; inicio: string; fin: string }[] | null;
  capacidad_zona: Record<string, number>;
  por_bloque: { zona_id: string; bloque_id: string; n: number }[];
  dias_pasados: number;
  por_hora: { hora: number; n: number }[];
  segmentos: { segmento: string; n: number }[];
  incidencias: { id: string; ocurrido_at: string; resultado: string; metodo: string; nombre: string; tono: number }[];
  no_llegaron_hoy: { id: string; nombre: string; tono: number; unidad: string; horario: string }[];
  charlas: {
    id: string;
    titulo: string;
    capacitador: string;
    lugar: string;
    dia: string;
    inicio: string;
    capacidad: number;
    inscritos: number;
    asistentes: number | null;
    nota: number | null;
  }[];
}

const ETIQUETA: Record<string, { etiqueta: string; pill: Tono }> = {
  excepcion: { etiqueta: "Excepción", pill: "accent" },
  no_enrolado: { etiqueta: "Sin credencial", pill: "warning" },
  sin_reserva: { etiqueta: "Sin reserva", pill: "negative" },
  sin_capacitacion: { etiqueta: "Sin capacitación", pill: "negative" },
  atrasado: { etiqueta: "Atrasado", pill: "negative" },
};

export function panelReal(s: PanelServidor, horaDe: (iso: string) => number): PanelDatos {
  const entradas = new Map(s.entradas_por_dia.map((e) => [e.dia, e.n]));
  const entradasHoy = entradas.get(s.dia) ?? 0;
  const ultimo = s.ultimo_abierto ?? s.dia;
  const ultimoNombre = nombreDelDia(ultimo, s.dia);
  const bloques = s.bloques_hoy ?? [];

  const zonas = Object.fromEntries(
    ZONAS_PANEL.map((z) => {
      const cap = s.capacidad_zona[z] ?? 0;
      const bars = bloques.map((b) => {
        const v = s.por_bloque.find((x) => x.zona_id === z && x.bloque_id === b.id)?.n ?? 0;
        const futuro = minDe(b.inicio) > s.minuto;
        return { label: b.inicio, value: v, kind: futuro ? ("future" as const) : ("now" as const), title: `${b.inicio}–${b.fin}: ${v} de ${cap} ${futuro ? "reservados" : "ocupados"}` };
      });
      return [z, { cap, bars }];
    }),
  ) as PanelDatos["zonas"];

  return {
    dia: s.dia,
    minuto: s.minuto,
    ultimoNombre,
    noShowsUltimo: s.no_show.ultimo_abierto,
    kpis: kpis({
      minuto: s.minuto,
      entradasHoy,
      ultimoNombre,
      entradasUltimo: entradas.get(ultimo) ?? 0,
      reservadas: s.ocupacion.reservadas,
      cupos: s.ocupacion.cupos_por_bloque * s.ocupacion.bloques,
      desde: s.ocupacion.desde ?? "—",
      hasta: s.ocupacion.hasta ?? "—",
      noShows: s.no_show.no_show,
      asistidas: s.no_show.asistidas,
      enrolados: s.socios.enrolados,
      total: s.socios.total,
    }),
    zonas,
    segmentos: SEGMENTS.map((sg) => ({ label: sg.id, value: s.segmentos.find((x) => x.segmento === sg.id)?.n ?? 0 })).sort((a, b) => b.value - a.value),
    incidencias: [
      ...s.incidencias.map((e) => ({
        id: e.id,
        nombre: e.nombre,
        tono: e.tono,
        detalle: `${formatMin(horaDe(e.ocurrido_at))} · puerta principal · ${e.metodo.toUpperCase()}`,
        ...(ETIQUETA[e.resultado] ?? { etiqueta: e.resultado, pill: "neutral" as const }),
      })),
      ...s.no_llegaron_hoy.slice(0, Math.max(0, 4 - s.incidencias.length)).map((r) => ({
        id: r.id,
        nombre: r.nombre,
        tono: r.tono,
        detalle: `${r.horario} · ${r.unidad}`,
        etiqueta: "No llegó",
        pill: "neutral" as const,
      })),
    ],
    semana: s.entradas_por_dia.map((e) => {
      const hoy = e.dia === s.dia;
      return {
        label: formatDay(e.dia, "short"),
        value: e.n,
        kind: hoy ? ("future" as const) : ("now" as const),
        title: `${formatDay(e.dia, "long")}: ${e.n} entradas${hoy ? ` (hasta las ${formatMin(s.minuto)})` : ""}`,
      };
    }),
    entradasHoy,
    semanaPasada: { dia: s.entradas_por_dia[0]?.dia ?? s.dia, n: s.entradas_por_dia[0]?.n ?? 0 },
    horas: barrasHoras(new Map(s.por_hora.map((h) => [h.hora, h.n])), s.dias_pasados),
    diasPasados: s.dias_pasados,
    charlas: s.charlas.map((c) => ({
      id: c.id,
      titulo: c.titulo,
      capacitador: c.capacitador,
      dia: c.dia,
      inicio: c.inicio,
      lugar: c.lugar,
      inscritos: c.inscritos,
      capacidad: c.capacidad,
      asistencia: c.asistentes != null ? pct(c.asistentes, c.inscritos) : null,
      nota: c.nota,
    })),
  };
}

/* ------------------------------------------------------------------ demo local (?demo=1) */

type Estado = ReturnType<typeof useAforo.getState>;

export function panelDemo(state: Pick<Estado, "myReservations" | "overrides" | "events" | "enrolledTalkIds" | "profile">): PanelDatos {
  const live = allReservations(state).filter((r) => r.status !== "cancelada");

  const exceptionsToday = state.events.filter((e) => e.result === "excepcion" && e.kind === "entrada").length;
  const entriesOn = (day: string) => live.filter((r) => r.day === day && r.checkInMin !== undefined).length;
  const entradasHoy = entriesOn(TODAY) + exceptionsToday;
  // Último día con el Hub abierto (el domingo cierra): la referencia honesta de "ayer".
  const lastOpen = [1, 2, 3, 4, 5, 6].map((o) => dayKey(-o)).find((d) => BLOCKS.some((b) => isOpen(d, b.id)))!;
  const ultimoNombre = nombreDelDia(lastOpen, TODAY);

  const startedBlocks = BLOCKS.filter((b) => b.startMin <= NOW_MIN && isOpen(TODAY, b.id));
  const capPerBlock = ZONAS_PANEL.flatMap((z) => unitsOfZone(z)).reduce((a, u) => a + u.capacity, 0);
  const reservedStarted = live.filter((r) => r.day === TODAY && startedBlocks.some((b) => b.id === r.block) && r.unitId !== "charlas").length;

  const pastWindow = live.filter((r) => dayOffset(r.day) < 0 || (r.day === TODAY && blockById(r.block).endMin <= NOW_MIN));

  const zonas = Object.fromEntries(
    ZONAS_PANEL.map((z) => {
      const units = unitsOfZone(z);
      const cap = units.reduce((a, u) => a + u.capacity, 0);
      const ids = new Set(units.map((u) => u.id));
      const bars = BLOCKS.filter((b) => isOpen(TODAY, b.id)).map((b) => {
        const v = live.filter((r) => r.day === TODAY && r.block === b.id && ids.has(r.unitId)).length;
        const future = b.startMin > NOW_MIN;
        return { label: b.start, value: v, kind: future ? ("future" as const) : ("now" as const), title: `${b.start}–${b.end}: ${v} de ${cap} ${future ? "reservados" : "ocupados"}` };
      });
      return [z, { cap, bars }];
    }),
  ) as PanelDatos["zonas"];

  const pastDays = Array.from({ length: 6 }, (_, i) => dayKey(i - 6)).filter((d) => BLOCKS.some((b) => isOpen(d, b.id)));
  const porHora = new Map<number, number>();
  for (const r of live) {
    if (pastDays.includes(r.day) && r.checkInMin !== undefined) {
      const h = Math.floor(r.checkInMin / 60);
      porHora.set(h, (porHora.get(h) ?? 0) + 1);
    }
  }

  const weekMembers = new Set(live.filter((r) => dayOffset(r.day) <= 0 && dayOffset(r.day) >= -6 && r.memberId !== "yo").map((r) => r.memberId));

  const incidents = state.events.filter((e) => e.result !== "aprobado").slice(0, 4);
  const noShowRowsToday = live.filter((r) => r.day === TODAY && r.status === "no_show").slice(0, Math.max(0, 4 - incidents.length));

  const enrolled = MEMBERS.filter((m) => m.verified).length + (state.profile ? 1 : 0);
  const totalMembers = MEMBERS.length + (state.profile ? 1 : 0);

  return {
    dia: TODAY,
    minuto: NOW_MIN,
    ultimoNombre,
    noShowsUltimo: live.filter((r) => r.day === lastOpen && r.status === "no_show").length,
    kpis: kpis({
      minuto: NOW_MIN,
      entradasHoy,
      ultimoNombre,
      entradasUltimo: entriesOn(lastOpen),
      reservadas: reservedStarted,
      cupos: capPerBlock * startedBlocks.length,
      desde: startedBlocks[0]?.start ?? "—",
      hasta: blockById(CURRENT_BLOCK).end,
      noShows: pastWindow.filter((r) => r.status === "no_show").length,
      asistidas: pastWindow.filter((r) => r.status === "completada").length,
      enrolados: enrolled,
      total: totalMembers,
    }),
    zonas,
    segmentos: SEGMENTS.map((sg) => ({ label: sg.id, value: [...weekMembers].filter((id) => memberById(id)?.segment === sg.id).length })).sort((a, b) => b.value - a.value),
    incidencias: [
      ...incidents.map((e) => {
        const m = memberById(e.memberId);
        return {
          id: e.id,
          nombre: m?.name ?? state.profile?.name ?? "—",
          tono: m?.hue ?? 210,
          detalle: `${formatMin(e.atMin)} · puerta principal · ${e.method.toUpperCase()}`,
          ...(ETIQUETA[e.result] ?? { etiqueta: e.result, pill: "neutral" as const }),
        };
      }),
      ...noShowRowsToday.map((r) => {
        const m = memberById(r.memberId)!;
        return { id: r.id, nombre: m.name, tono: m.hue, detalle: `${blockLabel(r.block)} · ${unitById(r.unitId).name}`, etiqueta: "No llegó", pill: "neutral" as const };
      }),
    ],
    semana: Array.from({ length: 7 }, (_, i) => dayKey(i - 6)).map((d) => {
      const v = d === TODAY ? entradasHoy : entriesOn(d);
      return {
        label: formatDay(d, "short"),
        value: v,
        kind: d === TODAY ? ("future" as const) : ("now" as const),
        title: `${formatDay(d, "long")}: ${v} entradas${d === TODAY ? ` (hasta las ${formatMin(NOW_MIN)})` : ""}`,
      };
    }),
    entradasHoy,
    semanaPasada: { dia: dayKey(-6), n: entriesOn(dayKey(-6)) },
    horas: barrasHoras(porHora, pastDays.length),
    diasPasados: pastDays.length,
    charlas: [...TALKS]
      .sort((a, b) => a.day.localeCompare(b.day) || blockById(a.block).startMin - blockById(b.block).startMin)
      .map((t) => {
        const n = talkEnrolledCount(t.id, state.enrolledTalkIds);
        return {
          id: t.id,
          titulo: t.title,
          capacitador: trainerById(t.trainerId).name,
          dia: t.day,
          inicio: blockById(t.block).start,
          lugar: unitById(t.unitId).name,
          inscritos: n,
          capacidad: t.capacity,
          asistencia: t.attended !== undefined ? pct(t.attended, n) : null,
          nota: t.rating ?? null,
        };
      }),
  };
}

/** Filas del CSV de la demo: reservas de hoy con su llegada y salida. */
export function exportarDemo(state: Pick<Estado, "myReservations" | "overrides" | "profile">): string[][] {
  return allReservations(state)
    .filter((r) => r.status !== "cancelada" && r.day === TODAY)
    .map((r) => {
      const m = memberById(r.memberId);
      return [
        r.day,
        blockLabel(r.block),
        unitById(r.unitId).name,
        m?.name ?? state.profile?.name ?? "",
        m?.segment ?? state.profile?.segment ?? "",
        r.status,
        r.checkInMin !== undefined ? formatMin(r.checkInMin) : "",
        r.checkOutMin !== undefined ? formatMin(r.checkOutMin) : "",
        r.method ?? "",
      ];
    });
}
