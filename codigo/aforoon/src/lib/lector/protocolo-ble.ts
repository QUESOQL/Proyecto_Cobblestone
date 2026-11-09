/*
 * Protocolo BLE entre el lector ESP32 + PN532 y el celular del guardia (informe v4, sección 7).
 * Los mismos valores están en firmware/lector-esp32/include/config.h: si cambia uno, cambia
 * el otro. Todas las tramas caben en 20 bytes (el tamaño mínimo garantizado por BLE).
 *
 *   Lectura (notify, lector → celular)
 *     0x11 · seq · UID (7) · contador (3) · CMAC (8)    tarjeta NTAG 424 DNA con SUN (20 bytes)
 *     0x12 · seq · UID (7)                                 tarjeta sin SUN, solo UID (9 bytes)
 *     0x1F · seq · código                                  error de lectura (3 bytes)
 *   Resultado (write, celular → lector)
 *     seq · color · décimas                                seq 0 = lectura hecha sin el lector (QR, RUT)
 *   Estado (read/notify)
 *     versión · banderas · desafío (8) · lecturas (2)      bit0 = PN532 ok, bit1 = autenticado
 *   Auth (write)
 *     primeros 16 bytes de HMAC-SHA256(clave del lector, desafío)
 */

export const SERVICIO = "6f1d0001-2b5a-4c8e-9a41-7a0f0c1e5a01";
export const LECTURA = "6f1d0002-2b5a-4c8e-9a41-7a0f0c1e5a01";
export const RESULTADO = "6f1d0003-2b5a-4c8e-9a41-7a0f0c1e5a01";
export const ESTADO = "6f1d0004-2b5a-4c8e-9a41-7a0f0c1e5a01";
export const AUTH = "6f1d0005-2b5a-4c8e-9a41-7a0f0c1e5a01";

export const COLOR = { verde: 1, rojo: 2, ambar: 3, salida: 4 } as const;
export type Color = keyof typeof COLOR;

/** Errores de lectura que manda el lector (trama 0x1F). */
export const ERRORES_LECTURA: Record<number, string> = {
  1: "La tarjeta no tiene datos NDEF.",
  2: "La tarjeta no es de AforoON.",
  3: "Se retiró la tarjeta antes de terminar la lectura.",
};

export type LecturaBLE =
  | { tipo: "sun"; seq: number; uid: string; contador: number; url: string }
  | { tipo: "uid"; seq: number; uid: string }
  | { tipo: "error"; seq: number; codigo: number };

export interface EstadoLector {
  version: number;
  nfcOk: boolean;
  autenticado: boolean;
  desafio: Uint8Array<ArrayBuffer>;
  lecturas: number;
}

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("").toUpperCase();

/** UID para mostrar: los de 4 bytes (MIFARE) llegan rellenos con ceros hasta 7. */
function uidDe(b: Uint8Array): string {
  const corto = b[4] === 0 && b[5] === 0 && b[6] === 0;
  return hex(corto ? b.subarray(0, 4) : b);
}

export function decodificarTrama(t: Uint8Array): LecturaBLE | null {
  if (t[0] === 0x11 && t.length === 20) {
    const uid = hex(t.subarray(2, 9));
    const n = hex(t.subarray(9, 12));
    return {
      tipo: "sun",
      seq: t[1],
      uid,
      // El contador viaja en el orden en que aparece en la URL (n=00002A → 42).
      contador: (t[9] << 16) | (t[10] << 8) | t[11],
      url: `https://aforoon.cl/c?u=${uid}&n=${n}&m=${hex(t.subarray(12, 20))}`,
    };
  }
  if (t[0] === 0x12 && t.length === 9) return { tipo: "uid", seq: t[1], uid: uidDe(t.subarray(2, 9)) };
  if (t[0] === 0x1f && t.length === 3) return { tipo: "error", seq: t[1], codigo: t[2] };
  return null;
}

export function decodificarEstado(t: Uint8Array): EstadoLector | null {
  if (t.length !== 12) return null;
  return {
    version: t[0],
    nfcOk: (t[1] & 0b01) !== 0,
    autenticado: (t[1] & 0b10) !== 0,
    desafio: t.slice(2, 10),
    lecturas: t[10] | (t[11] << 8),
  };
}

export const codificarResultado = (seq: number, color: Color, decimas = 20) => new Uint8Array([seq & 0xff, COLOR[color], decimas & 0xff]);

/** Respuesta al desafío: los primeros 16 bytes de HMAC-SHA256(clave, desafío). */
export async function responderDesafio(claveHex: string, desafio: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  const bytes = new Uint8Array(claveHex.match(/../g)!.map((h) => parseInt(h, 16)));
  const clave = await crypto.subtle.importKey("raw", bytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", clave, desafio)).slice(0, 16);
}
