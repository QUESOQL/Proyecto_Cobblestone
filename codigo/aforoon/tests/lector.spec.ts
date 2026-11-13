import { createHmac } from "node:crypto";
import { expect, test } from "@playwright/test";
import { codificarResultado, decodificarEstado, decodificarTrama, responderDesafio } from "../src/lib/lector/protocolo-ble";
import { abrirTurno, cleanup, crearLector, createRecepcionista, createSocio, createTerminal, desactivarLector, expectNoHorizontalScroll } from "./helpers";
import { instalarLectorSimulado } from "./lector-simulado";

/*
 * Fase 4: el lector ESP32 + PN532 enlazado por Bluetooth con el celular del guardia.
 * Sin hardware: un lector simulado en el navegador sigue el mismo protocolo que el firmware.
 */

const NOMBRE = "AforoON-Lector-Prueba";

test.describe("Fase 4 · Lector de tarjetas por Bluetooth", () => {
  test.afterEach(cleanup);

  test("el protocolo de tramas coincide con el del firmware", async () => {
    // Tarjeta NTAG 424 DNA con SUN: uid, contador (como en la URL) y CMAC.
    const sun = decodificarTrama(new Uint8Array([0x11, 7, 0x04, 0xa1, 0xb2, 0xc3, 0xd4, 0xe5, 0xf6, 0x00, 0x00, 0x2a, 0x94, 0xee, 0xd9, 0xee, 0x65, 0x33, 0x70, 0x86]));
    expect(sun).toEqual({ tipo: "sun", seq: 7, uid: "04A1B2C3D4E5F6", contador: 42, url: "https://aforoon.cl/c?u=04A1B2C3D4E5F6&n=00002A&m=94EED9EE65337086" });
    // Tarjeta común de 4 bytes: el relleno con ceros no se muestra.
    expect(decodificarTrama(new Uint8Array([0x12, 1, 0xde, 0xad, 0xbe, 0xef, 0, 0, 0]))).toEqual({ tipo: "uid", seq: 1, uid: "DEADBEEF" });
    expect(decodificarTrama(new Uint8Array([0x1f, 2, 3]))).toEqual({ tipo: "error", seq: 2, codigo: 3 });
    expect(decodificarTrama(new Uint8Array([0x11, 1, 2]))).toBeNull();
    expect(Array.from(codificarResultado(9, "verde"))).toEqual([9, 1, 20]);
    expect(Array.from(codificarResultado(0, "salida", 15))).toEqual([0, 4, 15]);
    const e = decodificarEstado(new Uint8Array([1, 0b11, 1, 2, 3, 4, 5, 6, 7, 8, 0x2c, 0x01]))!;
    expect(e).toMatchObject({ version: 1, nfcOk: true, autenticado: true, lecturas: 300 });
    // La respuesta al desafío es la misma que calcula mbedtls en el ESP32.
    const clave = "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff";
    const desafio = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const esperado = createHmac("sha256", Buffer.from(clave, "hex")).update(desafio).digest().subarray(0, 16);
    expect(Buffer.from(await responderDesafio(clave, desafio)).equals(esperado)).toBe(true);
  });

  test("el guardia conecta el lector, recibe tarjetas y le manda los colores", async ({ page }) => {
    const claveHex = await crearLector(NOMBRE);
    try {
      const terminal = await createTerminal();
      await createRecepcionista("4821");
      const socio = await createSocio("Martina Prueba Lector", { conReserva: true });
      await page.addInitScript(instalarLectorSimulado, { claveHex, nombre: NOMBRE });
      await abrirTurno(page, terminal, "4821");

      const panel = page.getByRole("region", { name: "Lector de tarjetas" });
      await expect(panel).toContainText("Sin conectar");
      await panel.getByRole("button", { name: "Conectar lector" }).click();
      await expect(panel).toContainText("Conectado");
      await expect(panel).toContainText(NOMBRE);
      // Chrome solo ofrece equipos que anuncian el servicio de AforoON.
      expect(await page.evaluate(() => (window as unknown as { __lector: { sim: { filtros: unknown } } }).__lector.sim.filtros)).toEqual({
        filters: [{ services: ["6f1d0001-2b5a-4c8e-9a41-7a0f0c1e5a01"] }],
      });
      const resultados = () => page.evaluate(() => (window as unknown as { __lector: { resultados: number[][] } }).__lector.resultados.slice());
      const acercar = (trama: number[]) => page.evaluate((t) => (window as unknown as { __lector: { acercar: (t: number[]) => boolean } }).__lector.acercar(t), trama);

      // 1. Una tarjeta común (fase 4: aún no identifica a nadie): ámbar en pantalla y en el lector.
      expect(await acercar([0x12, 1, 0x04, 0xa1, 0xb2, 0xc3, 0, 0, 0])).toBe(true);
      await expect(page.getByText("Ámbar · revisar")).toBeVisible();
      await expect(page.getByText(/UID 04A1B2C3\./)).toBeVisible();
      await expect.poll(resultados).toContainEqual([1, 3, 20]);

      // 2. Un error de lectura: rojo, con el motivo.
      await acercar([0x1f, 2, 2]);
      await expect(page.getByText("No se pudo leer la tarjeta · lector ESP32")).toBeVisible();
      await expect(page.getByText("La tarjeta no es de AforoON.")).toBeVisible();
      await expect.poll(resultados).toContainEqual([2, 2, 20]);

      // 3. Un ingreso por RUT también enciende el lector (secuencia 0): verde.
      await page.getByLabel("RUT", { exact: true }).fill(socio.rut);
      await page.getByRole("button", { name: "Buscar RUT" }).click();
      await page.getByRole("button", { name: "Registrar entrada", exact: true }).click();
      await expect(page.getByText("Habilitado · pasa")).toBeVisible();
      await expect.poll(resultados).toContainEqual([0, 1, 20]);
      await page.screenshot({ path: "tests/screenshots/7-terminal-lector-tablet.png", fullPage: true });

      // 4. Se corta el enlace: reconecta solo, sin que el guardia toque nada.
      await page.evaluate(() => (window as unknown as { __lector: { cortar: () => void } }).__lector.cortar());
      await expect(panel).toContainText("Conectado");
      expect(await acercar([0x12, 3, 0xde, 0xad, 0xbe, 0xef, 0, 0, 0])).toBe(true);
      await expect(page.getByText(/UID DEADBEEF\./)).toBeVisible();

      // 5. Un lector con otra clave (uno que imita el nombre): no se enlaza.
      await panel.getByRole("button", { name: "Desconectar" }).click();
      await expect(panel).toContainText("Sin conectar");
      await page.evaluate(() => (window as unknown as { __lector: { cambiarClave: (h: string) => void } }).__lector.cambiarClave("ff".repeat(32)));
      await panel.getByRole("button", { name: "Conectar lector" }).click();
      await expect(panel.getByRole("alert")).toHaveText("El lector rechazó la clave. Vuelve a grabarle la clave por el puerto serie.");
      await expect(panel).toContainText("Sin conectar");
      expect(await acercar([0x12, 4, 1, 2, 3, 4, 0, 0, 0]), "un lector sin autenticar no entrega lecturas").toBe(false);
      await expectNoHorizontalScroll(page);
    } finally {
      await desactivarLector(NOMBRE);
    }
  });

  test("un lector que no está dado de alta no se enlaza", async ({ page }) => {
    const terminal = await createTerminal();
    await createRecepcionista("4821");
    await page.addInitScript(instalarLectorSimulado, { claveHex: "ab".repeat(32), nombre: "AforoON-Lector-Nadie" });
    await abrirTurno(page, terminal, "4821");
    const panel = page.getByRole("region", { name: "Lector de tarjetas" });
    await panel.getByRole("button", { name: "Conectar lector" }).click();
    await expect(panel.getByRole("alert")).toContainText("no está dado de alta");
  });
});
