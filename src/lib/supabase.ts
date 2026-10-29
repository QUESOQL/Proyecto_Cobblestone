"use client";

import { createBrowserClient } from "@supabase/ssr";

/*
 * Cliente de Supabase para el navegador. Usa solo la clave pública: lo que puede leer
 * o escribir lo deciden los permisos por fila y las funciones de supabase/migrations.
 * La sesión se guarda en cookies (@supabase/ssr), lista para usarse también en el servidor.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local");
}

export const supabase = createBrowserClient(url, key);

/** "2026-10-29T13:00:00Z" → día y minutos en hora de Santiago. */
export function toSantiago(iso: string): { day: string; min: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Santiago",
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  );
  return { day: `${parts.year}-${parts.month}-${parts.day}`, min: Number(parts.hour) * 60 + Number(parts.minute) };
}

/** Minutos desde medianoche → "HH:MM" para las funciones SQL que reciben `time`. */
export const sqlTime = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
