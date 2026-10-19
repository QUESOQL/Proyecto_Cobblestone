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
  result: "aprobado" | "sin_reserva" | "no_enrolado" | "excepcion";
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

interface State {
  profile: Profile | null;
  myReservations: Reservation[];
  cancelledIds: string[];
  enrolledTalkIds: string[];
  events: AccessEvent[];
  /** Entradas y salidas marcadas en el terminal sobre reservas de la base. */
  overrides: Record<string, { checkInMin?: number; checkOutMin?: number; method?: AccessMethod }>;
  offline: boolean;

  enroll: (p: Omit<Profile, "enrolledAt">) => void;
  reserve: (unitId: string, day: string, block: BlockId) => { ok: true; id: string } | { ok: false; error: ReserveError };
  cancel: (id: string) => void;
  toggleTalk: (talkId: string) => { ok: boolean; error?: string };
  recordEvent: (e: Omit<AccessEvent, "id" | "queued">) => AccessEvent;
  setOffline: (v: boolean) => void;
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
