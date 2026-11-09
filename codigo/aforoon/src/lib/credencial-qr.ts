"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { firmarAF2, nuevoPar, periodo, PERIODO_MS } from "@/lib/af2";

/*
 * La credencial QR en el teléfono del socio. La primera vez el navegador crea un par de
 * claves ECDSA (la privada no se puede exportar) y registra la pública con
 * enrolar_credencial_qr(), que devuelve el cid. El par queda en IndexedDB, por persona.
 * Cada vez que se abre la credencial con internet se pide la hora del servidor (para
 * corregir el reloj del teléfono) y se revisa que el cid siga activo; si no, se re-enrola.
 * Sin internet se firma igual, con la clave y el desfase guardados.
 */

interface Guardada {
  cid: string;
  par: CryptoKeyPair;
  desfase: number;
}

const BASE = "aforoon";
const ALMACEN = "credencial";

function abrir(): Promise<IDBDatabase> {
  return new Promise((ok, mal) => {
    const req = indexedDB.open(BASE, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(ALMACEN);
    req.onsuccess = () => ok(req.result);
    req.onerror = () => mal(req.error);
  });
}

async function leer(persona: string): Promise<Guardada | undefined> {
  const db = await abrir();
  return new Promise((ok, mal) => {
    const req = db.transaction(ALMACEN).objectStore(ALMACEN).get(persona);
    req.onsuccess = () => ok(req.result as Guardada | undefined);
    req.onerror = () => mal(req.error);
  });
}

async function guardar(persona: string, valor: Guardada): Promise<void> {
  const db = await abrir();
  return new Promise((ok, mal) => {
    const tx = db.transaction(ALMACEN, "readwrite");
    tx.objectStore(ALMACEN).put(valor, persona);
    tx.oncomplete = () => ok();
    tx.onerror = () => mal(tx.error);
  });
}

// Una sola preparación a la vez por persona (React monta dos veces en desarrollo y no
// queremos enrolar dos teléfonos).
const enCurso = new Map<string, Promise<Guardada>>();
function preparar(persona: string): Promise<Guardada> {
  let p = enCurso.get(persona);
  if (!p) {
    p = prepararAhora(persona).finally(() => enCurso.delete(persona));
    enCurso.set(persona, p);
  }
  return p;
}

/** Deja la credencial lista: la guardada si sigue activa, o una nueva. */
async function prepararAhora(persona: string): Promise<Guardada> {
  const guardada = await leer(persona).catch(() => undefined);
  const antes = Date.now();
  const { data, error } = await supabase.rpc("estado_credencial_qr", { p_cid: guardada?.cid ?? "" });
  if (error) {
    // Sin internet: se usa lo guardado (si no hay nada, no se puede crear sin conexión).
    if (guardada) return guardada;
    throw new Error("sin_conexion");
  }
  const { hora, activa } = data as { hora: number; activa: boolean };
  // Hora del servidor menos la del teléfono, a mitad del viaje de ida y vuelta.
  const desfase = Math.round(hora - (antes + Date.now()) / 2);

  if (guardada && activa) {
    const al_dia = { ...guardada, desfase };
    await guardar(persona, al_dia).catch(() => undefined);
    return al_dia;
  }

  const { par, publica } = await nuevoPar();
  const dispositivo = typeof navigator === "undefined" ? "" : navigator.userAgent.slice(0, 120);
  const enrolada = await supabase.rpc("enrolar_credencial_qr", { p_clave_publica: publica, p_dispositivo: dispositivo });
  if (enrolada.error) throw new Error(enrolada.error.message);
  const nueva = { cid: (enrolada.data as { cid: string }).cid, par, desfase };
  await guardar(persona, nueva);
  return nueva;
}

export type EstadoQR =
  | { estado: "cargando" }
  | { estado: "error"; motivo: string }
  | { estado: "listo"; token: string; restante: number; t: number };

/** El texto del QR vigente y los segundos que le quedan; se renueva solo cada 30 s. */
export function useCredencialQR(persona: string | undefined): EstadoQR {
  const [cred, setCred] = useState<Guardada | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<{ t: number; texto: string } | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    if (!persona) return;
    let vivo = true;
    preparar(persona)
      .then((c) => vivo && setCred(c))
      .catch((e: Error) => vivo && setError(e.message));
    return () => {
      vivo = false;
    };
  }, [persona]);

  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const t = cred ? periodo(ahora + cred.desfase) : 0;
  useEffect(() => {
    if (!cred) return;
    let vivo = true;
    void firmarAF2(cred.par.privateKey, cred.cid, t).then((texto) => vivo && setToken({ t, texto }));
    return () => {
      vivo = false;
    };
  }, [cred, t]);

  if (error) return { estado: "error", motivo: error };
  // Mientras se firma el periodo nuevo se sigue mostrando el anterior (aún es válido).
  if (!cred || !token) return { estado: "cargando" };
  const restante = Math.max(1, Math.ceil(((t + 1) * PERIODO_MS - (ahora + cred.desfase)) / 1000));
  return { estado: "listo", token: token.texto, restante, t };
}
