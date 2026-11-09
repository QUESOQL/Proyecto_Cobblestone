/// <reference types="web-bluetooth" />
"use client";

import { supabase } from "@/lib/supabase";
import {
  AUTH,
  ESTADO,
  LECTURA,
  RESULTADO,
  SERVICIO,
  codificarResultado,
  decodificarEstado,
  decodificarTrama,
  responderDesafio,
  type Color,
  type LecturaBLE,
} from "./protocolo-ble";

/*
 * El lector ESP32 visto desde el celular del guardia (informe v4, secciones 7 y 8.4), con
 * Web Bluetooth de Chrome. Al conectar, el lector entrega un desafío y el celular responde
 * con HMAC usando la clave del lector, que pide a Supabase con la sesión del terminal.
 * Si el enlace se corta, reintenta solo cada 2 s mientras la página siga abierta; si se
 * recarga la página, Chrome exige que el guardia toque de nuevo "Conectar lector".
 */

export type EstadoEnlace = "sin_conectar" | "conectando" | "conectado" | "reconectando" | "desconectado";

const MENSAJES: Record<string, string> = {
  lector_desconocido: "Este lector no está dado de alta en AforoON. Créalo con scripts/equipo.mjs lector.",
  lector_inactivo: "Este lector está desactivado.",
  sin_permiso: "Esta cuenta no puede usar lectores.",
  no_autenticado: "El lector rechazó la clave. Vuelve a grabarle la clave por el puerto serie.",
  sin_servicio: "Ese equipo no es un lector de AforoON.",
};

export const mensajeLector = (codigo: string) => MENSAJES[codigo] ?? "No se pudo conectar con el lector. Acércate y vuelve a intentarlo.";

export const bluetoothDisponible = () => typeof navigator !== "undefined" && "bluetooth" in navigator;

export class LectorBLE {
  private disp?: BluetoothDevice;
  private cResultado?: BluetoothRemoteGATTCharacteristic;
  private clave?: string;
  private cerrado = false;
  nombre = "";
  nfcOk = true;

  constructor(
    private onLectura: (l: LecturaBLE) => void,
    private onEstado: (e: EstadoEnlace, error?: string) => void,
  ) {}

  /** Debe llamarse desde un toque del guardia (Chrome lo exige para abrir la lista de equipos). */
  async elegir() {
    let disp: BluetoothDevice;
    try {
      disp = await navigator.bluetooth.requestDevice({ filters: [{ services: [SERVICIO] }] });
    } catch {
      // El guardia cerró la lista sin elegir.
      this.onEstado(this.disp?.gatt?.connected ? "conectado" : "sin_conectar");
      return;
    }
    this.disp = disp;
    this.nombre = disp.name ?? "";
    this.clave = undefined;
    this.cerrado = false;
    disp.addEventListener("gattserverdisconnected", () => void this.reconectar());
    this.onEstado("conectando");
    try {
      await this.conectar();
    } catch (e) {
      this.cerrado = true;
      this.disp.gatt?.disconnect();
      this.onEstado("sin_conectar", mensajeLector((e as Error).message));
    }
  }

  private async conectar() {
    const gatt = await this.disp!.gatt!.connect();
    const svc = await gatt.getPrimaryService(SERVICIO).catch(() => {
      throw new Error("sin_servicio");
    });
    const cEstado = await svc.getCharacteristic(ESTADO);
    const antes = decodificarEstado(bytes(await cEstado.readValue()));
    if (!antes) throw new Error("sin_servicio");

    if (!this.clave) {
      const { data, error } = await supabase.rpc("clave_lector", { p_nombre: this.nombre });
      if (error) throw new Error(error.message);
      this.clave = data as string;
    }
    await (await svc.getCharacteristic(AUTH)).writeValueWithResponse(await responderDesafio(this.clave, antes.desafio));
    const despues = decodificarEstado(bytes(await cEstado.readValue()));
    if (!despues?.autenticado) throw new Error("no_autenticado");
    this.nfcOk = despues.nfcOk;

    this.cResultado = await svc.getCharacteristic(RESULTADO);
    const cLectura = await svc.getCharacteristic(LECTURA);
    cLectura.addEventListener("characteristicvaluechanged", (e) => {
      const v = (e.target as BluetoothRemoteGATTCharacteristic).value;
      const l = v && decodificarTrama(bytes(v));
      if (l) this.onLectura(l);
    });
    await cLectura.startNotifications();
    this.onEstado("conectado");
  }

  private async reconectar() {
    if (this.cerrado || !this.disp) return;
    this.onEstado("reconectando");
    for (let i = 0; i < 30 && !this.cerrado; i++) {
      try {
        await this.conectar();
        return;
      } catch {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
    if (!this.cerrado) this.onEstado("desconectado");
  }

  desconectar() {
    this.cerrado = true;
    this.disp?.gatt?.disconnect();
    this.onEstado("sin_conectar");
  }

  /** Color en el anillo del lector. seq 0: el resultado no vino de una tarjeta del lector. */
  async enviarResultado(seq: number, color: Color, decimas = 20) {
    if (!this.disp?.gatt?.connected || !this.cResultado) return;
    await this.cResultado.writeValueWithoutResponse(codificarResultado(seq, color, decimas)).catch(() => undefined);
  }
}

function bytes(v: DataView): Uint8Array<ArrayBuffer> {
  return new Uint8Array(v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength) as ArrayBuffer);
}
