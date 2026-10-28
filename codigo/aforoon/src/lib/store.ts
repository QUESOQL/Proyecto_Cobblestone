"use client";

/*
 * Estado de la demo. Vive en el navegador (localStorage) para que las cinco pantallas
 * compartan la misma sesión: lo que reservas en el teléfono aparece en el terminal de la
 * puerta y en el panel de administración.
 *
 * Las reglas de negocio replican la Sección 8 del Master Plan (control de aforo), pero
 * en el cliente. En producción la garantía contra la sobreventa la da PostgreSQL
 * (SELECT … FOR UPDATE sobre reservation_capacity_lock), no este archivo.
 */

import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  BASE_RESERVATIONS,
  BLOCKS,
  CURRENT_BLOCK,
  NOW_MIN,
  TALKS,
  TODAY,
  blockById,
  dayOffset,
  isOpen,
  unitById,
  type AccessMethod,
  type BlockId,
  type Reservation,
  type Segment,
} from "./data";
import {
  BASE_MACHINE_BOOKINGS,
  LATE_CANCEL_MIN,
  MAX_JOB_HOURS,
  QUOTA_BUCKETS,
  SPACES,
  bucketLabel,
  bucketOf,
  hoursOf,
  machineById,
  maxHoursFrom,
  overlaps,
  sessionById,
  startTimes,
  usedQuota,
  type MachineBooking,
  type TrainingType,
} from "./lab";

export const ME_ID = "yo";
export const MAX_ACTIVE = 3;
export const BOOKING_WINDOW_DAYS = 7;

export interface Profile {
  name: string;
  email: string;
  provider: "google" | "apple" | "correo";
  rut: string;
  phone: string;
  segment: Segment;
  occupation: string;
  reason: string;
  consentAt: string;
  enrolledAt: string;
}

export interface AccessEvent {
  id: string;
  /** Socio de la base, o "yo". */
  memberId: string;
  reservationId?: string;
  kind: "entrada" | "salida";
  result: "aprobado" | "sin_reserva" | "no_enrolado" | "excepcion" | "sin_capacitacion" | "atrasado";
  method: AccessMethod;
  /** Segundos que tardó la validación (meta del equipo: menos de 7 s). */
  latency: number;
  atMin: number;
  /** Se registró sin conexión y espera sincronizarse. */
  queued: boolean;
}

type ReserveError =
  | "cupo_agotado"
  | "bloque_pasado"
  | "fuera_de_ventana"
  | "cerrado"
  | "superpuesta"
  | "limite"
  | "sin_enrolar";

export const RESERVE_ERRORS: Record<ReserveError, string> = {
  cupo_agotado: "Alguien tomó el último cupo antes que tú. Elige otro bloque.",
  bloque_pasado: "Ese bloque ya terminó.",
  fuera_de_ventana: `Puedes reservar hasta ${BOOKING_WINDOW_DAYS - 1} días antes.`,
  cerrado: "El hub está cerrado en ese horario.",
  superpuesta: "Ya tienes otra reserva en ese mismo bloque.",
  limite: `Puedes tener hasta ${MAX_ACTIVE} reservas activas a la vez.`,
  sin_enrolar: "Termina tu registro para poder reservar.",
};

/** Estado de una capacitación para una persona. "no_inscrito" es la ausencia de registro. */
export type TrainingStatus = "no_inscrito" | "inscrito" | "aprobada" | "vencida";
export interface MyTraining {
  status: Exclude<TrainingStatus, "no_inscrito">;
  sessionId?: string;
  approvedAt?: string;
}

type MachineError = "sin_enrolar" | "sin_capacitacion" | "cerrado" | "pasado" | "fuera_de_ventana" | "ocupada" | "duracion" | "cupo_anual";

export const MACHINE_ERRORS: Record<MachineError, string> = {
  sin_enrolar: "Termina tu registro para poder reservar.",
  sin_capacitacion: "Necesitas la capacitación aprobada para usar esta máquina.",
  cerrado: "El espacio está cerrado a esa hora.",
  pasado: "Esa hora ya pasó.",
  fuera_de_ventana: `Puedes reservar hasta ${BOOKING_WINDOW_DAYS - 1} días antes.`,
  ocupada: "La máquina ya está reservada en ese horario.",
  duracion: `Cada trabajo dura entre 1 y ${MAX_JOB_HOURS} horas, dentro del horario del espacio.`,
  cupo_anual: "Ya usaste tus reservas de ese tramo este año.",
};

interface State {
  profile: Profile | null;
  myReservations: Reservation[];
  cancelledIds: string[];
  enrolledTalkIds: string[];
  events: AccessEvent[];
  /** Entradas y salidas marcadas en el terminal sobre reservas de la base. */
  overrides: Record<string, { checkInMin?: number; checkOutMin?: number; method?: AccessMethod }>;
  offline: boolean;
  /** Capacitaciones de la persona de la demo ("yo"). */
  myTrainings: Partial<Record<TrainingType, MyTraining>>;
  /** Asistencia y aprobación marcadas por el equipo del Hub, por sesión y socio. */
  sessionMarks: Record<string, Record<string, { attended?: boolean; approved?: boolean }>>;
  myMachineBookings: MachineBooking[];

  enroll: (p: Omit<Profile, "enrolledAt">) => void;
  reserve: (unitId: string, day: string, block: BlockId) => { ok: true; id: string } | { ok: false; error: ReserveError };
  cancel: (id: string) => void;
  toggleTalk: (talkId: string) => { ok: boolean; error?: string };
  recordEvent: (e: Omit<AccessEvent, "id" | "queued">) => AccessEvent;
  setOffline: (v: boolean) => void;
  enrollTraining: (sessionId: string) => { ok: boolean; error?: string };
  leaveTraining: (kind: TrainingType) => void;
  markAttendance: (sessionId: string, memberId: string, attended: boolean) => void;
  approveTraining: (sessionId: string, memberId: string) => void;
  reserveMachine: (machineId: string, day: string, startMin: number, hours: number) => { ok: true; id: string } | { ok: false; error: MachineError };
  cancelMachine: (id: string, reason?: MachineBooking["cancelReason"]) => void;
  reset: () => void;
}

const initial = {
  profile: null,
  myReservations: [] as Reservation[],
  cancelledIds: [] as string[],
  enrolledTalkIds: [] as string[],
  events: [] as AccessEvent[],
  overrides: {} as State["overrides"],
  offline: false,
  myTrainings: {} as State["myTrainings"],
  sessionMarks: {} as State["sessionMarks"],
  myMachineBookings: [] as MachineBooking[],
};

export const useAforo = create<State>()(
  persist(
    (set, get) => ({
      ...initial,

      enroll: (p) => set({ profile: { ...p, enrolledAt: new Date().toISOString() } }),

      reserve: (unitId, day, block) => {
        const s = get();
        if (!s.profile) return { ok: false, error: "sin_enrolar" };
        const off = dayOffset(day);
        if (off < 0 || off >= BOOKING_WINDOW_DAYS) return { ok: false, error: "fuera_de_ventana" };
        if (!isOpen(day, block)) return { ok: false, error: "cerrado" };
        if (off === 0 && blockById(block).endMin <= NOW_MIN) return { ok: false, error: "bloque_pasado" };
        const mine = activeMine(s);
        if (mine.some((r) => r.day === day && r.block === block)) return { ok: false, error: "superpuesta" };
        if (mine.length >= MAX_ACTIVE) return { ok: false, error: "limite" };
        // La comprobación de aforo se hace contra el estado actual, igual que el
        // SELECT … FOR UPDATE: si otro tomó el último cupo, se aborta.
        if (countFor(s, unitId, day, block) >= unitById(unitId).capacity) return { ok: false, error: "cupo_agotado" };
        const id = `m${Date.now().toString(36)}`;
        set({
          myReservations: [...s.myReservations, { id, memberId: ME_ID, unitId, day, block, status: "confirmada" }],
        });
        return { ok: true, id };
      },

      cancel: (id) =>
        set((s) => ({
          myReservations: s.myReservations.map((r) => (r.id === id ? { ...r, status: "cancelada" } : r)),
        })),

      toggleTalk: (talkId) => {
        const s = get();
        if (!s.profile) return { ok: false, error: RESERVE_ERRORS.sin_enrolar };
        if (s.enrolledTalkIds.includes(talkId)) {
          set({ enrolledTalkIds: s.enrolledTalkIds.filter((t) => t !== talkId) });
          return { ok: true };
        }
        const talk = TALKS.find((t) => t.id === talkId)!;
        if (talk.enrolledIds.length + 1 > talk.capacity) return { ok: false, error: "La charla no tiene cupos." };
        set({ enrolledTalkIds: [...s.enrolledTalkIds, talkId] });
        return { ok: true };
      },

      recordEvent: (e) => {
        const event: AccessEvent = { ...e, id: `e${Date.now().toString(36)}${Math.floor(Math.random() * 99)}`, queued: get().offline };
        set((s) => {
          const overrides = { ...s.overrides };
          const myReservations = [...s.myReservations];
          if (e.reservationId && (e.result === "aprobado" || e.result === "excepcion")) {
            const patch = e.kind === "entrada" ? { checkInMin: e.atMin, method: e.method } : { checkOutMin: e.atMin };
            const mi = myReservations.findIndex((r) => r.id === e.reservationId);
            if (mi >= 0) myReservations[mi] = { ...myReservations[mi], ...patch, status: "completada" };
            else overrides[e.reservationId] = { ...overrides[e.reservationId], ...patch };
          }
          return { events: [event, ...s.events], overrides, myReservations };
        });
        return event;
      },

      setOffline: (v) =>
        set((s) => ({
          offline: v,
          // Al volver la conexión, la cola local se sincroniza.
          events: v ? s.events : s.events.map((e) => ({ ...e, queued: false })),
        })),

      enrollTraining: (sessionId) => {
        const s = get();
        if (!s.profile) return { ok: false, error: RESERVE_ERRORS.sin_enrolar };
        const session = sessionById(sessionId);
        if (s.myTrainings[session.kind]?.status === "aprobada") return { ok: false, error: "Ya tienes esta capacitación aprobada." };
        if (sessionEnrolledCount(s, sessionId) >= session.capacity) return { ok: false, error: "La capacitación no tiene cupos." };
        // Inscribirse en otra sesión del mismo tipo reemplaza la anterior.
        set({ myTrainings: { ...s.myTrainings, [session.kind]: { status: "inscrito", sessionId } } });
        return { ok: true };
      },

      leaveTraining: (kind) =>
        set((s) => {
          const next = { ...s.myTrainings };
          if (next[kind]?.status === "inscrito") delete next[kind];
          return { myTrainings: next };
        }),

      markAttendance: (sessionId, memberId, attended) =>
        set((s) => {
          const marks = { ...(s.sessionMarks[sessionId] ?? {}) };
          // Sin asistencia no hay aprobación.
          marks[memberId] = { ...marks[memberId], attended, approved: attended ? marks[memberId]?.approved : false };
          return { sessionMarks: { ...s.sessionMarks, [sessionId]: marks } };
        }),

      approveTraining: (sessionId, memberId) =>
        set((s) => {
          const marks = { ...(s.sessionMarks[sessionId] ?? {}) };
          if (!marks[memberId]?.attended) return {};
          marks[memberId] = { ...marks[memberId], approved: true };
          const kind = sessionById(sessionId).kind;
          const myTrainings =
            memberId === ME_ID ? { ...s.myTrainings, [kind]: { status: "aprobada" as const, sessionId, approvedAt: new Date().toISOString() } } : s.myTrainings;
          return { sessionMarks: { ...s.sessionMarks, [sessionId]: marks }, myTrainings };
        }),

      reserveMachine: (machineId, day, startMin, hours) => {
        const s = get();
        if (!s.profile) return { ok: false, error: "sin_enrolar" };
        const check = machineSlot(s, machineId, day, startMin, hours);
        if (!check.ok) return check;
        const id = `mq${Date.now().toString(36)}`;
        set({ myMachineBookings: [...s.myMachineBookings, { id, machineId, memberId: ME_ID, day, startMin, hours, status: "confirmada" }] });
        return { ok: true, id };
      },

      cancelMachine: (id, reason = "usuario") =>
        set((s) => ({
          myMachineBookings: s.myMachineBookings.map((b) => (b.id === id ? { ...b, status: "cancelada", cancelReason: reason } : b)),
        })),

      reset: () => set({ ...initial }),
    }),
    { name: "aforoon-demo-v1" },
  ),
);

/* ------------------------------------------------------------------ selectores */

export function activeMine(s: Pick<State, "myReservations">): Reservation[] {
  return s.myReservations.filter((r) => {
    if (r.status === "cancelada") return false;
    const off = dayOffset(r.day);
    if (off < 0) return false;
    if (off === 0 && blockById(r.block).endMin <= NOW_MIN) return false;
    return true;
  });
}

/** Todas las reservas (base + las mías), con las entradas y salidas del terminal aplicadas. */
export function allReservations(s: Pick<State, "myReservations" | "overrides">): Reservation[] {
  const base = BASE_RESERVATIONS.map((r) => {
    const o = s.overrides[r.id];
    if (!o) return r;
    return { ...r, ...o, status: o.checkInMin !== undefined ? ("completada" as const) : r.status };
  });
  return [...base, ...s.myReservations];
}

/** Personas con reserva vigente en esa unidad y bloque (no cuenta las canceladas). */
export function countFor(s: Pick<State, "myReservations">, unitId: string, day: string, block: BlockId): number {
  let n = 0;
  for (const r of BASE_RESERVATIONS) if (r.unitId === unitId && r.day === day && r.block === block && r.status !== "cancelada") n++;
  for (const r of s.myReservations) if (r.unitId === unitId && r.day === day && r.block === block && r.status !== "cancelada") n++;
  return n;
}

/** Quién está dentro del hub ahora: entró en el bloque en curso y no ha salido. */
export function insideNow(s: Pick<State, "myReservations" | "overrides">): Reservation[] {
  return allReservations(s).filter(
    (r) => r.day === TODAY && r.block === CURRENT_BLOCK && r.checkInMin !== undefined && r.checkOutMin === undefined,
  );
}

export function talkEnrolledCount(talkId: string, enrolledTalkIds: string[]): number {
  const talk = TALKS.find((t) => t.id === talkId)!;
  return talk.enrolledIds.length + (enrolledTalkIds.includes(talkId) ? 1 : 0);
}

export function nextBlocks(day: string) {
  const off = dayOffset(day);
  return BLOCKS.map((b) => ({ ...b, past: off === 0 && b.endMin <= NOW_MIN, open: isOpen(day, b.id) }));
}

/** Evita el desajuste de hidratación: el estado guardado solo existe en el navegador. */
export function useHydrated(): boolean {
  const [h, setH] = useState(false);
  useEffect(() => {
    const done = () => setH(true);
    if (useAforo.persist.hasHydrated()) done();
    const unsub = useAforo.persist.onFinishHydration(done);
    return unsub;
  }, []);
  return h;
}

/* ------------------------------------------------------------------ capacitaciones y máquinas */

export function trainingStatus(s: Pick<State, "myTrainings">, kind: TrainingType): TrainingStatus {
  return s.myTrainings[kind]?.status ?? "no_inscrito";
}

export function sessionEnrolledCount(s: Pick<State, "myTrainings">, sessionId: string): number {
  const session = sessionById(sessionId);
  const mine = s.myTrainings[session.kind];
  return session.enrolledIds.length + (mine?.sessionId === sessionId && mine.status === "inscrito" ? 1 : 0);
}

/** Todas las reservas de máquinas (base + las mías), sin las canceladas. */
export function machineBookings(s: Pick<State, "myMachineBookings">): MachineBooking[] {
  return [...BASE_MACHINE_BOOKINGS, ...s.myMachineBookings].filter((b) => b.status !== "cancelada");
}

/** Cupos del Lab881 que le quedan a la persona este año, por tramo de duración. */
export function quotaLeft(s: Pick<State, "myMachineBookings">) {
  const used = usedQuota(s.myMachineBookings, ME_ID);
  return QUOTA_BUCKETS.map((b) => ({ ...b, label: bucketLabel(b), used: used[b.id], left: b.quota - used[b.id] }));
}

/**
 * Valida un horario de máquina. La pantalla de reserva usa esta misma función para
 * deshabilitar lo que no se puede, así nunca aparece un error después de elegir la hora.
 */
export function machineSlot(
  s: Pick<State, "myTrainings" | "myMachineBookings">,
  machineId: string,
  day: string,
  startMin: number,
  hours: number,
): { ok: true } | { ok: false; error: MachineError } {
  const machine = machineById(machineId);
  if (trainingStatus(s, machine.training) !== "aprobada") return { ok: false, error: "sin_capacitacion" };
  const off = dayOffset(day);
  if (off < 0 || off >= BOOKING_WINDOW_DAYS) return { ok: false, error: "fuera_de_ventana" };
  if (!hoursOf(machine.space, day) || !startTimes(machine.space, day).includes(startMin)) return { ok: false, error: "cerrado" };
  if (off === 0 && startMin <= NOW_MIN) return { ok: false, error: "pasado" };
  if (hours < 1 || hours > maxHoursFrom(machine, day, startMin)) return { ok: false, error: "duracion" };
  if (SPACES[machine.space].yearlyQuota && quotaLeft(s).find((b) => b.id === bucketOf(hours).id)!.left <= 0) return { ok: false, error: "cupo_anual" };
  const slot = { day, startMin, hours };
  if (machineBookings(s).some((b) => b.machineId === machineId && overlaps(b, slot))) return { ok: false, error: "ocupada" };
  return { ok: true };
}

/** Mis reservas de máquinas que aún no terminan. */
export function activeMachineBookings(s: Pick<State, "myMachineBookings">): MachineBooking[] {
  return s.myMachineBookings
    .filter((b) => b.status === "confirmada" && dayOffset(b.day) * 1440 + b.startMin + b.hours * 60 > NOW_MIN)
    .sort((a, b) => a.day.localeCompare(b.day) || a.startMin - b.startMin);
}

/** Atraso: pasados 20 minutos del inicio sin entrar, la reserva se cancela. */
export function isLate(b: MachineBooking, nowMin = NOW_MIN): boolean {
  return dayOffset(b.day) === 0 && b.checkInMin === undefined && nowMin > b.startMin + LATE_CANCEL_MIN;
}
