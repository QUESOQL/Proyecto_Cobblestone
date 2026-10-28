/*
 * Máquinas del Lab881 y del Cowork textil, sus capacitaciones y las reglas de reserva.
 *
 * Fuentes: documento del Hub Providencia y providencia.cl (Lab881). Lo que el documento
 * no dice (cuántas Ender 3 y cuántas máquinas de coser hay, cupos de cada capacitación,
 * fechas de las sesiones) es dato de ejemplo y está marcado "por confirmar".
 *
 * Igual que data.ts, todo es determinista: mismas reservas de otros socios en cualquier
 * navegador, para que la app, la recepción y el panel cuenten la misma historia.
 */

import { MEMBERS, dayKey, dayOffset, weekdayOf } from "./data";

/* ------------------------------------------------------------------ tipos */

export type SpaceId = "lab881" | "textil";
export type TrainingType = "impresion3d" | "resina" | "laser" | "costura";

export interface Space {
  id: SpaceId;
  name: string;
  place: string;
  /** Horario por día de la semana (0 = domingo), en minutos desde medianoche. */
  hours: Partial<Record<number, { open: number; close: number }>>;
  /** Las horas para agendar cierran antes del cierre (Lab881: media hora). */
  lastStartBeforeClose: number;
  hoursLabel: string;
  /** El Lab881 limita las reservas por persona al año; el textil no informa límite. */
  yearlyQuota: boolean;
}

export interface TrainingKind {
  id: TrainingType;
  name: string;
  space: SpaceId;
  /** Lo que habilita, en palabras. */
  unlocks: string;
}

export interface Machine {
  id: string;
  name: string;
  model: string;
  space: SpaceId;
  training: TrainingType;
  detail: string;
  /** Las impresoras pueden seguir trabajando de noche; la láser y las de coser no. */
  runsOvernight: boolean;
}

export interface TrainingSession {
  id: string;
  kind: TrainingType;
  day: string;
  startMin: number;
  endMin: number;
  place: string;
  capacity: number;
  /** Socios de la base ya inscritos. */
  enrolledIds: string[];
}

export interface MachineBooking {
  id: string;
  machineId: string;
  memberId: string;
  day: string;
  startMin: number;
  hours: number;
  status: "confirmada" | "cancelada";
  /** Motivo de una cancelación hecha por el sistema (por ejemplo, el atraso de 20 min). */
  cancelReason?: "atraso" | "usuario";
  checkInMin?: number;
}

/* ------------------------------------------------------------------ catálogo */

export const SPACES: Record<SpaceId, Space> = {
  lab881: {
    id: "lab881",
    name: "Lab881",
    place: "Hub Providencia Fábrica · Los Jesuitas 881",
    // Lunes a jueves de 9:00 a 17:30, viernes hasta las 16:30.
    hours: {
      1: { open: 540, close: 1050 },
      2: { open: 540, close: 1050 },
      3: { open: 540, close: 1050 },
      4: { open: 540, close: 1050 },
      5: { open: 540, close: 990 },
    },
    lastStartBeforeClose: 30,
    hoursLabel: "Lunes a jueves de 9:00 a 17:30, viernes hasta las 16:30",
    yearlyQuota: true,
  },
  textil: {
    id: "textil",
    name: "Cowork textil",
    place: "Sala vitrina · Hub Providencia Fábrica",
    // Lunes de 8:30 a 17:30 y viernes de 8:30 a 16:30.
    hours: {
      1: { open: 510, close: 1050 },
      5: { open: 510, close: 990 },
    },
    lastStartBeforeClose: 0,
    hoursLabel: "Lunes de 8:30 a 17:30 y viernes de 8:30 a 16:30",
    yearlyQuota: false,
  },
};

export const TRAINING_KINDS: TrainingKind[] = [
  { id: "impresion3d", name: "Impresión 3D", space: "lab881", unlocks: "Impresoras de filamento y multifilamento" },
  { id: "resina", name: "Impresión en resina", space: "lab881", unlocks: "Impresora de resina y curadora" },
  { id: "laser", name: "Corte láser", space: "lab881", unlocks: "Cortadora láser" },
  { id: "costura", name: "Costura", space: "textil", unlocks: "Máquinas de coser" },
];

export const trainingKind = (id: TrainingType) => TRAINING_KINDS.find((k) => k.id === id)!;

/** "Impresión 3D" → "impresión 3D": minúscula inicial sin romper las siglas. */
export const lowerFirst = (s: string) => s[0].toLowerCase() + s.slice(1);

export const MACHINES: Machine[] = [
  { id: "ender-1", name: "Impresora 3D 1", model: "Ender 3 V3 SE", space: "lab881", training: "impresion3d", detail: "Filamento · prototipos y repuestos", runsOvernight: true },
  { id: "ender-2", name: "Impresora 3D 2", model: "Ender 3 V3 SE", space: "lab881", training: "impresion3d", detail: "Filamento · prototipos y repuestos", runsOvernight: true },
  { id: "k1c", name: "Impresora 3D rápida", model: "Creality K1C", space: "lab881", training: "impresion3d", detail: "Filamento · alta velocidad", runsOvernight: true },
  { id: "sparkx", name: "Impresora multicolor", model: "Creality Sparkx i7", space: "lab881", training: "impresion3d", detail: "Multifilamento · varios colores", runsOvernight: true },
  { id: "halot", name: "Impresora de resina", model: "Halot Mage 8K", space: "lab881", training: "resina", detail: "Resina con curadora · detalle fino", runsOvernight: true },
  { id: "laser", name: "Cortadora láser", model: "100 W · 90 × 60 cm", space: "lab881", training: "laser", detail: "Corta y graba madera, cartón y acrílico", runsOvernight: false },
  { id: "coser-1", name: "Máquina de coser 1", model: "Modelo por confirmar", space: "textil", training: "costura", detail: "Costura recta", runsOvernight: false },
  { id: "coser-2", name: "Máquina de coser 2", model: "Modelo por confirmar", space: "textil", training: "costura", detail: "Costura recta", runsOvernight: false },
  { id: "coser-3", name: "Máquina de coser 3", model: "Modelo por confirmar", space: "textil", training: "costura", detail: "Costura recta", runsOvernight: false },
];

export const machineById = (id: string) => MACHINES.find((m) => m.id === id)!;
export const machinesOf = (space: SpaceId) => MACHINES.filter((m) => m.space === space);

/* ------------------------------------------------------------------ reglas del Lab881 */

/** Máximo de horas por trabajo. */
export const MAX_JOB_HOURS = 18;
/** Minutos de atraso que cancelan la reserva. */
export const LATE_CANCEL_MIN = 20;

/** 15 reservas al año por persona, repartidas por duración. */
export const QUOTA_BUCKETS = [
  { id: "1-2", min: 1, max: 2, quota: 6 },
  { id: "3-5", min: 3, max: 5, quota: 4 },
  { id: "6-9", min: 6, max: 9, quota: 3 },
  { id: "10-18", min: 10, max: 18, quota: 2 },
] as const;

export const bucketOf = (hours: number) => QUOTA_BUCKETS.find((b) => hours >= b.min && hours <= b.max)!;
export const bucketLabel = (b: (typeof QUOTA_BUCKETS)[number]) => `${b.min} a ${b.max} h`;

/** Reservas que cuentan para el cupo anual: las del Lab881 de este año, salvo las que canceló la persona. */
export function usedQuota(bookings: MachineBooking[], memberId: string, year = new Date().getFullYear()) {
  const used: Record<string, number> = Object.fromEntries(QUOTA_BUCKETS.map((b) => [b.id, 0]));
  for (const b of bookings) {
    if (b.memberId !== memberId || machineById(b.machineId).space !== "lab881") continue;
    if (b.status === "cancelada" && b.cancelReason === "usuario") continue;
    if (Number(b.day.slice(0, 4)) !== year) continue;
    used[bucketOf(b.hours).id]++;
  }
  return used;
}

/* ------------------------------------------------------------------ horarios */

export function hoursOf(space: SpaceId, day: string) {
  return SPACES[space].hours[weekdayOf(day)] ?? null;
}

/** Inicio absoluto en minutos (desde hoy a medianoche), para comparar reservas de varios días. */
const absStart = (day: string, startMin: number) => dayOffset(day) * 1440 + startMin;

/** Horas de inicio posibles ese día: cada hora desde la apertura hasta el último inicio. */
export function startTimes(space: SpaceId, day: string): number[] {
  const h = hoursOf(space, day);
  if (!h) return [];
  const last = h.close - SPACES[space].lastStartBeforeClose - 60;
  const out: number[] = [];
  for (let m = h.open; m <= last; m += 60) out.push(m);
  return out;
}

/** Duraciones posibles para una máquina que parte a esa hora (las impresoras pueden seguir de noche). */
export function maxHoursFrom(machine: Machine, day: string, startMin: number): number {
  const h = hoursOf(machine.space, day);
  if (!h) return 0;
  if (machine.runsOvernight) return MAX_JOB_HOURS;
  return Math.max(0, Math.min(MAX_JOB_HOURS, Math.floor((h.close - startMin) / 60)));
}

export function overlaps(a: { day: string; startMin: number; hours: number }, b: { day: string; startMin: number; hours: number }) {
  const a0 = absStart(a.day, a.startMin);
  const b0 = absStart(b.day, b.startMin);
  return a0 < b0 + b.hours * 60 && b0 < a0 + a.hours * 60;
}

/* ------------------------------------------------------------------ datos de ejemplo */

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Próximo día (desde `from`) que cae en ese día de la semana. */
function nextWeekday(wd: number, from = 0): string {
  for (let off = from; off < from + 7; off++) if (weekdayOf(dayKey(off)) === wd) return dayKey(off);
  return dayKey(from);
}

function pickMembers(n: number, seed: number): string[] {
  const rnd = mulberry32(seed);
  const pool = [...MEMBERS];
  const out: string[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0].id);
  return out;
}

/** Sesiones de capacitación de las próximas dos semanas. Fechas y cupos: por confirmar. */
export const TRAINING_SESSIONS: TrainingSession[] = [
  { id: "cap-3d-1", kind: "impresion3d", day: nextWeekday(2, 1), startMin: 600, endMin: 720, place: "Lab881", capacity: 8, enrolledIds: pickMembers(5, 31) },
  { id: "cap-3d-2", kind: "impresion3d", day: nextWeekday(4, 1), startMin: 900, endMin: 1020, place: "Lab881", capacity: 8, enrolledIds: pickMembers(8, 32) },
  { id: "cap-resina-1", kind: "resina", day: nextWeekday(3, 1), startMin: 600, endMin: 720, place: "Lab881", capacity: 6, enrolledIds: pickMembers(2, 33) },
  { id: "cap-laser-1", kind: "laser", day: nextWeekday(1, 1), startMin: 900, endMin: 1020, place: "Lab881", capacity: 6, enrolledIds: pickMembers(4, 34) },
  { id: "cap-laser-2", kind: "laser", day: nextWeekday(4, 8), startMin: 600, endMin: 720, place: "Lab881", capacity: 6, enrolledIds: pickMembers(1, 35) },
  { id: "cap-costura-1", kind: "costura", day: nextWeekday(1, 1), startMin: 600, endMin: 720, place: "Sala vitrina", capacity: 10, enrolledIds: pickMembers(7, 36) },
  { id: "cap-costura-2", kind: "costura", day: nextWeekday(5, 1), startMin: 600, endMin: 720, place: "Sala vitrina", capacity: 10, enrolledIds: pickMembers(3, 37) },
];

export const sessionById = (id: string) => TRAINING_SESSIONS.find((s) => s.id === id)!;
export const sessionsOf = (kind: TrainingType) => TRAINING_SESSIONS.filter((s) => s.kind === kind);

/** Reservas de otros socios en la próxima semana, para que las máquinas se vean usadas. */
function buildBookings(): MachineBooking[] {
  const rnd = mulberry32(881);
  const out: MachineBooking[] = [];
  let seq = 0;
  for (let off = 0; off < 7; off++) {
    const day = dayKey(off);
    for (const m of MACHINES) {
      const starts = startTimes(m.space, day);
      if (!starts.length) continue;
      // Una o dos reservas por máquina y día, sin solaparse.
      let cursor = 0;
      const n = rnd() < 0.55 ? 1 : 2;
      for (let i = 0; i < n && cursor < starts.length; i++) {
        const idx = cursor + Math.floor(rnd() * Math.max(1, Math.min(3, starts.length - cursor)));
        if (idx >= starts.length) break;
        const start = starts[idx];
        const hours = Math.max(1, Math.min(maxHoursFrom(m, day, start), m.runsOvernight && rnd() < 0.2 ? 6 : 1 + Math.floor(rnd() * 3)));
        const memberId = MEMBERS[Math.floor(rnd() * MEMBERS.length)].id;
        out.push({ id: `mb${++seq}`, machineId: m.id, memberId, day, startMin: start, hours, status: "confirmada" });
        cursor = idx + hours + 1;
      }
    }
  }
  return out;
}

export const BASE_MACHINE_BOOKINGS: MachineBooking[] = buildBookings();
