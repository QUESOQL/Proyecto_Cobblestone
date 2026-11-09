/*
 * Formato AF2 del QR de la credencial (informe de hardware v4, sección 4.1):
 *
 *   AF2.<cid>.<t>.<firma>
 *
 *   cid   = código de la credencial, 10 caracteres base32 al azar (no se deriva del RUT).
 *   t     = periodo de 30 s según la hora del servidor: floor(ms / 30000).
 *   firma = ECDSA P-256 + SHA-256 sobre "AF2|<cid>|<t>", 64 bytes en base32 sin relleno.
 *
 * Todo en mayúsculas, dígitos y puntos: cabe en el modo alfanumérico del QR (más compacto,
 * se lee más rápido con la cámara). La firma la hace el teléfono del socio con una clave
 * que no sale de su navegador; el celular del guardia la verifica con la clave pública.
 * Este archivo no usa nada propio del navegador además de crypto.subtle, así que también
 * corre en Node (pruebas).
 */

export const PERIODO_MS = 30_000;

const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const FORMATO = /^AF2\.([A-Z2-7]{10})\.(\d{1,12})\.([A-Z2-7]{103})$/;
const ECDSA = { name: "ECDSA", namedCurve: "P-256" } as const;
const FIRMA = { name: "ECDSA", hash: "SHA-256" } as const;

export interface LecturaAF2 {
  cid: string;
  t: number;
  firma: Uint8Array<ArrayBuffer>;
}

/** Bytes a base32 (RFC 4648) sin relleno. */
export function base32(bytes: Uint8Array): string {
  let salida = "";
  let acumulado = 0;
  let bits = 0;
  for (const b of bytes) {
    acumulado = (acumulado << 8) | b;
    bits += 8;
    while (bits >= 5) {
      salida += ALFABETO[(acumulado >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) salida += ALFABETO[(acumulado << (5 - bits)) & 31];
  return salida;
}

/** Base32 sin relleno a bytes; nulo si trae caracteres que no son base32. */
export function desdeBase32(texto: string): Uint8Array<ArrayBuffer> | null {
  const bytes: number[] = [];
  let acumulado = 0;
  let bits = 0;
  for (const c of texto) {
    const v = ALFABETO.indexOf(c);
    if (v < 0) return null;
    acumulado = ((acumulado << 5) | v) & 0xfff;
    bits += 5;
    if (bits >= 8) {
      bytes.push((acumulado >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(bytes);
}

/** Periodo de 30 s de un instante. */
export const periodo = (ms: number) => Math.floor(ms / PERIODO_MS);

const mensaje = (cid: string, t: number) => new TextEncoder().encode(`AF2|${cid}|${t}`);

/** Separa un texto leído; nulo si no es un QR AF2 bien formado. */
export function leerAF2(texto: string): LecturaAF2 | null {
  const m = FORMATO.exec(texto.trim());
  if (!m) return null;
  const firma = desdeBase32(m[3]);
  if (!firma || firma.length !== 64) return null;
  return { cid: m[1], t: Number(m[2]), firma };
}

/** El texto del QR para el periodo t. */
export async function firmarAF2(privada: CryptoKey, cid: string, t: number): Promise<string> {
  const firma = new Uint8Array(await crypto.subtle.sign(FIRMA, privada, mensaje(cid, t)));
  return `AF2.${cid}.${t}.${base32(firma)}`;
}

/** ¿La firma corresponde a esta clave pública? (No revisa la hora ni el uso: eso es del servidor.) */
export async function verificarAF2(clavePublica: JsonWebKey, lectura: LecturaAF2): Promise<boolean> {
  try {
    const clave = await crypto.subtle.importKey("jwk", clavePublica, ECDSA, false, ["verify"]);
    return await crypto.subtle.verify(FIRMA, clave, lectura.firma, mensaje(lectura.cid, lectura.t));
  } catch {
    return false;
  }
}

/** Par de claves nuevo: la privada no se puede exportar; la pública sí, para enrolarla. */
export async function nuevoPar(): Promise<{ par: CryptoKeyPair; publica: JsonWebKey }> {
  const par = await crypto.subtle.generateKey(ECDSA, false, ["sign", "verify"]);
  const { kty, crv, x, y } = await crypto.subtle.exportKey("jwk", par.publicKey);
  return { par, publica: { kty, crv, x, y } };
}
