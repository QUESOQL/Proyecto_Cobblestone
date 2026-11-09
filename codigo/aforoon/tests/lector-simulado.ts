/*
 * Lector ESP32 simulado para las pruebas: reemplaza navigator.bluetooth en el navegador de
 * la prueba por un equipo que sigue el mismo protocolo que firmware/lector-esp32 (desafío,
 * HMAC, tramas de lectura y colores). Así se prueba la parte de la app sin hardware.
 *
 * Desde la prueba:  window.__lector.acercar([0x12, 1, ...])   una tarjeta en el lector
 *                   window.__lector.resultados                 colores recibidos [seq, color, décimas]
 *                   window.__lector.cortar()                   se pierde el enlace
 *                   window.__lector.cambiarClave(hex)          el lector queda con otra clave
 */
export function instalarLectorSimulado({ claveHex, nombre }: { claveHex: string; nombre: string }) {
  const SERVICIO = "6f1d0001-2b5a-4c8e-9a41-7a0f0c1e5a01";
  const LECTURA = "6f1d0002-2b5a-4c8e-9a41-7a0f0c1e5a01";
  const RESULTADO = "6f1d0003-2b5a-4c8e-9a41-7a0f0c1e5a01";
  const ESTADO = "6f1d0004-2b5a-4c8e-9a41-7a0f0c1e5a01";
  const AUTH = "6f1d0005-2b5a-4c8e-9a41-7a0f0c1e5a01";

  const sim = {
    clave: claveHex,
    autenticado: false,
    desafio: new Uint8Array(new ArrayBuffer(8)),
    lecturas: 0,
    resultados: [] as number[][],
    filtros: null as unknown,
    alLeer: null as null | ((e: { target: { value: DataView } }) => void),
    alDesconectar: null as null | (() => void),
  };
  const nuevoDesafio = () => crypto.getRandomValues(sim.desafio);
  const estado = () => new Uint8Array([1, 0b01 | (sim.autenticado ? 0b10 : 0), ...sim.desafio, sim.lecturas & 255, sim.lecturas >> 8]);

  async function hmac16(desafio: Uint8Array<ArrayBuffer>) {
    const bytes = new Uint8Array(sim.clave.match(/../g)!.map((h) => parseInt(h, 16)));
    const k = await crypto.subtle.importKey("raw", bytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    return new Uint8Array(await crypto.subtle.sign("HMAC", k, desafio)).slice(0, 16);
  }
  const vista = (v: BufferSource) => new Uint8Array(ArrayBuffer.isView(v) ? v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength) : v);

  const caracteristica = (uuid: string) => ({
    uuid,
    async readValue() {
      if (uuid !== ESTADO) throw new Error("NotSupportedError");
      return new DataView(estado().buffer);
    },
    async writeValueWithResponse(v: BufferSource) {
      if (uuid !== AUTH) throw new Error("NotSupportedError");
      const esperado = await hmac16(sim.desafio);
      const r = vista(v);
      sim.autenticado = r.length === 16 && r.every((b, i) => b === esperado[i]);
      if (!sim.autenticado) nuevoDesafio();
    },
    async writeValueWithoutResponse(v: BufferSource) {
      if (uuid === RESULTADO && sim.autenticado) sim.resultados.push(Array.from(vista(v)));
    },
    addEventListener(_tipo: string, fn: (e: { target: { value: DataView } }) => void) {
      if (uuid === LECTURA) sim.alLeer = fn;
    },
    async startNotifications() {
      return this;
    },
  });
  const caracteristicas: Record<string, ReturnType<typeof caracteristica>> = Object.fromEntries([LECTURA, RESULTADO, ESTADO, AUTH].map((u) => [u, caracteristica(u)]));

  const gatt = {
    connected: false,
    async connect() {
      gatt.connected = true;
      sim.autenticado = false;
      nuevoDesafio();
      return gatt;
    },
    disconnect() {
      if (!gatt.connected) return;
      gatt.connected = false;
      sim.autenticado = false;
      sim.alDesconectar?.();
    },
    async getPrimaryService(u: string) {
      if (u !== SERVICIO) throw new Error("NotFoundError");
      return { getCharacteristic: async (c: string) => caracteristicas[c] };
    },
  };
  const equipo = {
    name: nombre,
    gatt,
    addEventListener(tipo: string, fn: () => void) {
      if (tipo === "gattserverdisconnected") sim.alDesconectar = fn;
    },
  };
  Object.defineProperty(navigator, "bluetooth", {
    configurable: true,
    value: {
      requestDevice: async (opciones: unknown) => {
        sim.filtros = opciones;
        return equipo;
      },
    },
  });

  (window as unknown as { __lector: unknown }).__lector = {
    sim,
    resultados: sim.resultados,
    acercar(trama: number[]) {
      if (!sim.autenticado || !sim.alLeer) return false;
      sim.lecturas++;
      sim.alLeer({ target: { value: new DataView(new Uint8Array(trama).buffer) } });
      return true;
    },
    cortar() {
      gatt.disconnect();
    },
    cambiarClave(hex: string) {
      sim.clave = hex;
    },
  };
}
