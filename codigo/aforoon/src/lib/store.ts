"use client";

/*
 * Estado de la app, sincronizado con Supabase.
 *
 * Las pantallas del socio (registro, reservar, inicio, máquinas, capacitaciones) leen y
 * escriben en la base: las reglas viven en las funciones SQL de supabase/migrations y aquí
 * solo se llaman y se muestra su resultado. Este archivo guarda una copia de lo que la
 * pantalla necesita (mis reservas, cupos por bloque, mis capacitaciones…) y la refresca
 * después de cada cambio.
 *
 * Recepción y el panel de ocupación todavía usan los datos de ejemplo locales
 * (BASE_RESERVATIONS, eventos en el navegador): se conectan en el paso siguiente.
 */

import { useEffect } from "react";
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
  dayKey,
  dayOffset,
  isOpen,
  type AccessMethod,
  type BlockId,
  type Reservation,
  type Segment,
} from "./data";
import {
  LATE_CANCEL_MIN,
  MAX_JOB_HOURS,
  QUOTA_BUCKETS,
  SPACES,
  TRAINING_KINDS,
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
import { sqlTime, supabase, toSantiago } from "./supabase";

/** Marca de "soy yo" en las reservas que vienen del servidor (el resto de la app ya la usa). */
export const ME_ID = "yo";
export const MAX_ACTIVE = 3;
export const BOOKING_WINDOW_DAYS = 7;

export interface Profile {
  /** id de la persona en la base. */
  id: string;
  name: string;
  email: string;
  provider: "google" | "apple" | "correo";
  /** Solo la máscara: el RUT completo nunca sale de la base. */
  rut: string;
  phone: string;
  segment: Segment;
  occupation: string;
  reason: string;
  role: "vecino" | "recepcion" | "admin";
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

type ReserveError = "cupo_agotado" | "bloque_pasado" | "fuera_de_ventana" | "cerrado" | "superpuesta" | "limite" | "sin_enrolar" | "error";

export const RESERVE_ERRORS: Record<ReserveError, string> = {
  cupo_agotado: "Alguien tomó el último cupo antes que tú. Elige otro bloque.",
  bloque_pasado: "Ese bloque ya terminó.",
  fuera_de_ventana: `Puedes reservar hasta ${BOOKING_WINDOW_DAYS - 1} días antes.`,
  cerrado: "El hub está cerrado en ese horario.",
  superpuesta: "Ya tienes otra reserva en ese mismo bloque.",
  limite: `Puedes tener hasta ${MAX_ACTIVE} reservas activas a la vez.`,
  sin_enrolar: "Termina tu registro para poder reservar.",
  error: "No se pudo completar. Revisa tu conexión e inténtalo de nuevo.",
};

/** Estado de una capacitación para una persona. "no_inscrito" es la ausencia de registro. */
export type TrainingStatus = "no_inscrito" | "inscrito" | "aprobada" | "vencida";
export interface MyTraining {
  status: Exclude<TrainingStatus, "no_inscrito">;
  sessionId?: string;
  expiresAt?: string;
}

type MachineError =
  | "sin_enrolar"
  | "sin_capacitacion"
  | "cerrado"
  | "pasado"
  | "fuera_de_ventana"
  | "ocupada"
  | "duracion"
  | "cupo_anual"
  | "maquina_no_disponible"
  | "error";

export const MACHINE_ERRORS: Record<MachineError, string> = {
  sin_enrolar: "Termina tu registro para poder reservar.",
  sin_capacitacion: "Necesitas la capacitación aprobada para usar esta máquina.",
  cerrado: "El espacio está cerrado a esa hora.",
  pasado: "Esa hora ya pasó.",
  fuera_de_ventana: `Puedes reservar hasta ${BOOKING_WINDOW_DAYS - 1} días antes.`,
  ocupada: "Alguien reservó la máquina en ese horario antes que tú. Elige otra hora.",
  duracion: `Cada trabajo dura entre 1 y ${MAX_JOB_HOURS} horas, dentro del horario del espacio.`,
  cupo_anual: "Ya usaste tus reservas de ese tramo este año.",
  maquina_no_disponible: "La máquina está en mantención.",
  error: "No se pudo completar. Revisa tu conexión e inténtalo de nuevo.",
};

const TRAINING_ERRORS: Record<string, string> = {
  sin_enrolar: "Termina tu registro para inscribirte.",
  ya_aprobada: "Ya tienes esta capacitación aprobada.",
  capacitacion_llena: "La capacitación no tiene cupos.",
  charla_llena: "La charla no tiene cupos.",
};

/** Un horario tomado de una máquina, de cualquier persona (sin decir quién). */
export interface MachineSlot {
  machineId: string;
  day: string;
  startMin: number;
  hours: number;
}

type Result<E extends string> = { ok: true; id: string } | { ok: false; error: E };

interface State {
  /** Ya se hizo la primera carga desde el servidor. */
  ready: boolean;
  profile: Profile | null;
  /** Hay sesión iniciada, aunque la persona aún no complete su perfil. */
  signedIn: boolean;
  myReservations: Reservation[];
  enrolledTalkIds: string[];
  myTrainings: Partial<Record<TrainingType, MyTraining>>;
  myMachineBookings: MachineBooking[];
  /** Cupos ocupados por día y "unidad|bloque". */
  occupancy: Record<string, Record<string, number>>;
  talkCounts: Record<string, number>;
  sessionCounts: Record<string, number>;
  machineTaken: MachineSlot[];

  /* Recepción y panel: aún locales (ver comentario de arriba). */
  events: AccessEvent[];
  overrides: Record<string, { checkInMin?: number; checkOutMin?: number; method?: AccessMethod }>;
  offline: boolean;

  sync: () => Promise<void>;
  enroll: (p: { name: string; rut: string; phone: string; segment: Segment; occupation: string; reason: string }) => Promise<{ ok: boolean; error?: string }>;
  reserve: (unitId: string, day: string, block: BlockId) => Promise<Result<ReserveError>>;
  cancel: (id: string) => Promise<void>;
  toggleTalk: (talkId: string) => Promise<{ ok: boolean; error?: string }>;
  enrollTraining: (sessionId: string) => Promise<{ ok: boolean; error?: string }>;
  leaveTraining: (kind: TrainingType) => Promise<void>;
  reserveMachine: (machineId: string, day: string, startMin: number, hours: number) => Promise<Result<MachineError>>;
  cancelMachine: (id: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  recordEvent: (e: Omit<AccessEvent, "id" | "queued">) => AccessEvent;
  setOffline: (v: boolean) => void;
  reset: () => void;
}

const personal = {
  profile: null as Profile | null,
  signedIn: false,
  myReservations: [] as Reservation[],
  enrolledTalkIds: [] as string[],
  myTrainings: {} as State["myTrainings"],
  myMachineBookings: [] as MachineBooking[],
};

const local = {
  events: [] as AccessEvent[],
  overrides: {} as State["overrides"],
  offline: false,
};

/** El mensaje de error de una función SQL es su código (ver falla() en 0002_reglas.sql). */
function code<E extends string>(error: { message: string } | null, known: Record<E, string>, fallback: E): E {
  const m = error?.message ?? "";
  return (m in known ? m : fallback) as E;
}

/* ------------------------------------------------------------------ carga desde el servidor */

async function loadPublic() {
  const days = Array.from({ length: BOOKING_WINDOW_DAYS }, (_, i) => dayKey(i));
  const [occ, talks, sessions, taken] = await Promise.all([
    Promise.all(days.map((d) => supabase.rpc("ocupacion", { p_dia: d }))),
    supabase.rpc("inscritos_charlas"),
    supabase.rpc("inscritos_sesiones"),
    supabase.rpc("maquinas_tomadas", { p_desde: days[0], p_hasta: days[days.length - 1] }),
  ]);
  const occupancy: State["occupancy"] = {};
  days.forEach((d, i) => {
    occupancy[d] = {};
    for (const row of (occ[i].data ?? []) as { unidad_id: string; bloque_id: string; ocupados: number }[]) {
      occupancy[d][`${row.unidad_id}|${row.bloque_id}`] = row.ocupados;
    }
  });
  const talkCounts = Object.fromEntries(((talks.data ?? []) as { charla_id: string; inscritos: number }[]).map((r) => [r.charla_id, r.inscritos]));
  const sessionCounts = Object.fromEntries(((sessions.data ?? []) as { sesion_id: string; inscritos: number }[]).map((r) => [r.sesion_id, r.inscritos]));
  const machineTaken: MachineSlot[] = ((taken.data ?? []) as { maquina_id: string; inicio: string; fin: string }[]).map((r) => {
    const s = toSantiago(r.inicio);
    return { machineId: r.maquina_id, day: s.day, startMin: s.min, hours: Math.round((Date.parse(r.fin) - Date.parse(r.inicio)) / 3_600_000) };
  });
  return { occupancy, talkCounts, sessionCounts, machineTaken };
}

async function loadPersonal(): Promise<typeof personal> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { ...personal };

  const { data: p } = await supabase
    .from("personas")
    .select("id, nombre, rut_mascara, telefono, segmento, ocupacion, motivo, rol, consentimiento_at, creada_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!p) return { ...personal, signedIn: true };

  const [res, talks, trainings, machines] = await Promise.all([
    supabase.from("reservas").select("id, unidad_id, dia, bloque_id, estado, entrada_at, salida_at, metodo").eq("persona_id", p.id),
    supabase.from("inscripciones_charla").select("charla_id").eq("persona_id", p.id),
    supabase.rpc("mis_capacitaciones"),
    supabase.from("reservas_maquina").select("id, maquina_id, inicio, horas, estado, motivo_cancelacion, entrada_at").eq("persona_id", p.id),
  ]);

  const myTrainings: State["myTrainings"] = {};
  for (const t of (trainings.data ?? []) as { tipo_id: TrainingType; estado: TrainingStatus; sesion_id: string | null; vence_at: string | null }[]) {
    if (t.estado !== "no_inscrito") myTrainings[t.tipo_id] = { status: t.estado, sessionId: t.sesion_id ?? undefined, expiresAt: t.vence_at ?? undefined };
  }

  return {
    signedIn: true,
    profile: {
      id: p.id,
      name: p.nombre,
      email: user.email ?? "",
      provider: "correo",
      rut: p.rut_mascara,
      phone: p.telefono ?? "",
      segment: p.segmento,
      occupation: p.ocupacion,
      reason: p.motivo,
      role: p.rol,
      consentAt: p.consentimiento_at ?? p.creada_at,
      enrolledAt: p.creada_at,
    },
    myReservations: (res.data ?? []).map((r) => ({
      id: r.id,
      memberId: ME_ID,
      unitId: r.unidad_id,
      day: r.dia,
      block: r.bloque_id as BlockId,
      status: r.estado,
      checkInMin: r.entrada_at ? toSantiago(r.entrada_at).min : undefined,
      checkOutMin: r.salida_at ? toSantiago(r.salida_at).min : undefined,
      method: r.metodo ?? undefined,
    })),
    enrolledTalkIds: (talks.data ?? []).map((t) => t.charla_id),
    myTrainings,
    myMachineBookings: (machines.data ?? []).map((b) => {
      const s = toSantiago(b.inicio);
      return {
        id: b.id,
        machineId: b.maquina_id,
        memberId: ME_ID,
        day: s.day,
        startMin: s.min,
        hours: b.horas,
        status: b.estado === "cancelada" ? "cancelada" : "confirmada",
        cancelReason: b.motivo_cancelacion ?? undefined,
        checkInMin: b.entrada_at ? toSantiago(b.entrada_at).min : undefined,
      };
    }),
  };
}

/* ------------------------------------------------------------------ store */

export const useAforo = create<State>()(
  persist(
    (set, get) => ({
      ready: false,
      ...personal,
      occupancy: {},
      talkCounts: {},
      sessionCounts: {},
      machineTaken: [],
      ...local,

      sync: async () => {
        const [pub, mine] = await Promise.all([loadPublic(), loadPersonal()]);
        set({ ...pub, ...mine, ready: true });
      },

      enroll: async (p) => {
        const { error } = await supabase.rpc("registrar_persona", {
          p_nombre: p.name,
          p_rut: p.rut,
          p_telefono: p.phone,
          p_segmento: p.segment,
          p_ocupacion: p.occupation,
          p_motivo: p.reason,
        });
        if (error) return { ok: false, error: error.message };
        await get().sync();
        return { ok: true };
      },

      reserve: async (unitId, day, block) => {
        const { data, error } = await supabase.rpc("reservar", { p_unidad: unitId, p_dia: day, p_bloque: block });
        await get().sync();
        return error ? { ok: false, error: code(error, RESERVE_ERRORS, "error") } : { ok: true, id: data as string };
      },

      cancel: async (id) => {
        await supabase.rpc("cancelar_reserva", { p_reserva: id });
        await get().sync();
      },

      toggleTalk: async (talkId) => {
        const isIn = get().enrolledTalkIds.includes(talkId);
        const { error } = await supabase.rpc(isIn ? "salir_charla" : "inscribir_charla", { p_charla: talkId });
        await get().sync();
        return error ? { ok: false, error: TRAINING_ERRORS[error.message] ?? RESERVE_ERRORS.error } : { ok: true };
      },

      enrollTraining: async (sessionId) => {
        const { error } = await supabase.rpc("inscribir_capacitacion", { p_sesion: sessionId });
        await get().sync();
        return error ? { ok: false, error: TRAINING_ERRORS[error.message] ?? RESERVE_ERRORS.error } : { ok: true };
      },

      leaveTraining: async (kind) => {
        await supabase.rpc("salir_capacitacion", { p_tipo: kind });
        await get().sync();
      },

      reserveMachine: async (machineId, day, startMin, hours) => {
        const { data, error } = await supabase.rpc("reservar_maquina", { p_maquina: machineId, p_dia: day, p_inicio: sqlTime(startMin), p_horas: hours });
        await get().sync();
        return error ? { ok: false, error: code(error, MACHINE_ERRORS, "error") } : { ok: true, id: data as string };
      },

      cancelMachine: async (id) => {
        await supabase.rpc("cancelar_reserva_maquina", { p_reserva: id });
        await get().sync();
      },

      signOut: async () => {
        await supabase.auth.signOut();
        set({ ...personal });
      },

      deleteAccount: async () => {
        await supabase.rpc("borrar_mi_cuenta");
        await supabase.auth.signOut();
        set({ ...personal });
        await get().sync();
      },

      recordEvent: (e) => {
        const event: AccessEvent = { ...e, id: `e${Date.now().toString(36)}${Math.floor(Math.random() * 99)}`, queued: get().offline };
        set((s) => {
          const overrides = { ...s.overrides };
          if (e.reservationId && (e.result === "aprobado" || e.result === "excepcion")) {
            const patch = e.kind === "entrada" ? { checkInMin: e.atMin, method: e.method } : { checkOutMin: e.atMin };
            overrides[e.reservationId] = { ...overrides[e.reservationId], ...patch };
          }
          return { events: [event, ...s.events], overrides };
        });
        return event;
      },

      setOffline: (v) =>
        set((s) => ({
          offline: v,
          // Al volver la conexión, la cola local se sincroniza.
          events: v ? s.events : s.events.map((e) => ({ ...e, queued: false })),
        })),

      reset: () => set({ ...local }),
    }),
    {
      // Solo lo local de recepción se guarda en el navegador; lo demás viene del servidor.
      name: "aforoon-demo-v2",
      partialize: (s) => ({ events: s.events, overrides: s.overrides, offline: s.offline }),
    },
  ),
);

/* ------------------------------------------------------------------ sincronización */

let listening = false;

/**
 * Carga los datos del servidor la primera vez y vuelve a cargarlos cuando cambia la sesión.
 * Devuelve true cuando la primera carga terminó.
 */
export function useHydrated(): boolean {
  const ready = useAforo((s) => s.ready);
  useEffect(() => {
    if (listening) return;
    listening = true;
    // INITIAL_SESSION llega de inmediato: hace la primera carga.
    supabase.auth.onAuthStateChange((event) => {
      if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        // Fuera del callback: Supabase no permite llamar a la API dentro de él.
        setTimeout(() => void useAforo.getState().sync(), 0);
      }
    });
  }, []);
  return ready;
}

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

/** Personas con reserva vigente en esa unidad y bloque, según el servidor. */
export function countFor(s: Pick<State, "occupancy">, unitId: string, day: string, block: BlockId): number {
  return s.occupancy[day]?.[`${unitId}|${block}`] ?? 0;
}

export function talkCount(s: Pick<State, "talkCounts">, talkId: string): number {
  return s.talkCounts[talkId] ?? TALKS.find((t) => t.id === talkId)!.enrolledIds.length;
}

export function nextBlocks(day: string) {
  const off = dayOffset(day);
  return BLOCKS.map((b) => ({ ...b, past: off === 0 && b.endMin <= NOW_MIN, open: isOpen(day, b.id) }));
}

/* Recepción y panel (datos locales, ver arriba). */

/** Todas las reservas (base + las mías), con las entradas y salidas del terminal aplicadas. */
export function allReservations(s: Pick<State, "myReservations" | "overrides">): Reservation[] {
  const base = BASE_RESERVATIONS.map((r) => {
    const o = s.overrides[r.id];
    if (!o) return r;
    return { ...r, ...o, status: o.checkInMin !== undefined ? ("completada" as const) : r.status };
  });
  return [...base, ...s.myReservations];
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

/* ------------------------------------------------------------------ capacitaciones y máquinas */

export function trainingStatus(s: Pick<State, "myTrainings">, kind: TrainingType): TrainingStatus {
  return s.myTrainings[kind]?.status ?? "no_inscrito";
}

export function sessionEnrolledCount(s: Pick<State, "sessionCounts">, sessionId: string): number {
  return s.sessionCounts[sessionId] ?? sessionById(sessionId).enrolledIds.length;
}

/** Cupos del Lab881 que le quedan a la persona este año, por tramo de duración. */
export function quotaLeft(s: Pick<State, "myMachineBookings">) {
  const used = usedQuota(s.myMachineBookings, ME_ID);
  return QUOTA_BUCKETS.map((b) => ({ ...b, label: bucketLabel(b), used: used[b.id], left: b.quota - used[b.id] }));
}

/**
 * Valida un horario de máquina con lo que se sabe del servidor. La pantalla usa esta misma
 * función para deshabilitar lo que no se puede; el servidor vuelve a validar al reservar.
 */
export function machineSlot(
  s: Pick<State, "myTrainings" | "myMachineBookings" | "machineTaken">,
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
  if (s.machineTaken.some((b) => b.machineId === machineId && overlaps(b, slot))) return { ok: false, error: "ocupada" };
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

/** Capacitaciones aprobadas (para las insignias de la credencial). */
export function approvedKinds(s: Pick<State, "myTrainings">) {
  return TRAINING_KINDS.filter((k) => s.myTrainings[k.id]?.status === "aprobada");
}
