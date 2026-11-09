import { writeFileSync } from "node:fs";
import { chromium, expect, test } from "@playwright/test";
import QRCode from "qrcode";
import { abrirTurno, cleanup, createRecepcionista, createTerminal, createVecino, credencialesDe, expectNoHorizontalScroll, reservarBloqueActual, signIn } from "./helpers";

/*
 * Fase 3: el QR firmado (AF2) de la credencial, leído por la cámara del celular del guardia.
 * La cámara es la de Chrome con un video falso: un archivo .y4m con el QR que muestra el
 * teléfono del socio. Así se prueba el camino completo: clave en el teléfono, firma,
 * lectura con la cámara, verificación en el terminal y registro en la base.
 */

/** Un cuadro de video YUV 4:2:0 (formato y4m) con el QR al centro, como lo vería la cámara. */
function videoConQR(texto: string, ruta: string) {
  const W = 640;
  const H = 480;
  const { modules } = QRCode.create(texto, { errorCorrectionLevel: "M" });
  const n = modules.size;
  const escala = Math.floor(400 / (n + 8));
  const x0 = Math.floor((W - n * escala) / 2);
  const y0 = Math.floor((H - n * escala) / 2);
  const luz = Buffer.alloc(W * H, 235);
  for (let f = 0; f < n; f++)
    for (let c = 0; c < n; c++)
      if (modules.get(f, c))
        for (let dy = 0; dy < escala; dy++) luz.fill(16, (y0 + f * escala + dy) * W + x0 + c * escala, (y0 + f * escala + dy) * W + x0 + (c + 1) * escala);
  const color = Buffer.alloc(W * H / 2, 128);
  writeFileSync(ruta, Buffer.concat([Buffer.from(`YUV4MPEG2 W${W} H${H} F30:1 Ip A1:1 C420jpeg\nFRAME\n`), luz, color]));
}

test.describe("Fase 3 · QR firmado y cámara del guardia", () => {
  test.afterEach(cleanup);

  test("el teléfono del socio firma el QR y el guardia lo lee con la cámara", async ({ page }) => {
    test.setTimeout(90_000);
    const terminal = await createTerminal();
    await createRecepcionista("4821");
    const socio = await createVecino("Ignacia Prueba QR");
    await reservarBloqueActual(socio.persona);

    // 1. Al abrir su credencial, el teléfono crea su clave y la enrola (una sola vez).
    await signIn(page, socio);
    await expect(page.getByRole("heading", { name: "Tu QR de acceso" })).toBeVisible();
    const qr = page.locator("[data-af2]");
    await expect(qr).toBeVisible();
    await expect.poll(async () => (await credencialesDe(socio.persona)).length).toBe(1);
    await page.reload();
    await expect(qr).toBeVisible();
    expect(await credencialesDe(socio.persona), "al volver a abrirla usa la misma clave").toHaveLength(1);

    // 2. La credencial a pantalla completa: el código no trae el RUT ni el id de la persona.
    await page.getByRole("link", { name: "Pantalla completa" }).click();
    await expect(page).toHaveURL(/\/credencial$/);
    await expect(page.getByRole("heading", { level: 1, name: "Ignacia Prueba QR" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Código QR de tu credencial" })).toBeVisible();
    expect(await credencialesDe(socio.persona), "la pantalla completa usa la misma clave").toHaveLength(1);
    await expect(page.getByText(/Cambia en \d+ s/)).toBeVisible();
    const token = (await qr.getAttribute("data-af2"))!;
    expect(token).toMatch(/^AF2\.[A-Z2-7]{10}\.\d+\.[A-Z2-7]{103}$/);
    expect(token).not.toContain(socio.persona);
    await expectNoHorizontalScroll(page);
    await page.screenshot({ path: "tests/screenshots/6-credencial-qr-telefono.png" });

    // 3. El celular del guardia, con la cámara apuntando a ese QR.
    const camara = test.info().outputPath("camara.y4m");
    videoConQR(token, camara);
    const navegador = await chromium.launch({
      channel: "chrome",
      args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-video-capture=${camara}`],
    });
    try {
      const ctx = await navegador.newContext({
        viewport: { width: 1024, height: 768 },
        locale: "es-CL",
        timezoneId: "America/Santiago",
        baseURL: "http://localhost:3000",
        permissions: ["camera"],
      });
      const guardia = await ctx.newPage();
      await abrirTurno(guardia, terminal, "4821");

      await guardia.getByRole("button", { name: "Escanear QR" }).click();
      await expect(guardia.getByText("Verde · pasa")).toBeVisible({ timeout: 15_000 });
      await expect(guardia.getByText("Ignacia Prueba QR").first()).toBeVisible();
      await expect(guardia.getByText(/^Va a Mesas/)).toBeVisible();
      const detalle = await guardia.getByText(/Entrada · QR · [\d,]+ s/).innerText();
      expect(parseFloat(detalle.replace(/.*QR · /, "").replace(",", ".")), "meta: menos de 7 s").toBeLessThan(7);
      await expect(guardia.getByRole("heading", { name: "Registro de accesos" }).locator("..")).toContainText("Entrada · QR");
      expect((await credencialesDe(socio.persona))[0].ultimo_t).toBe(Number(token.split(".")[2]));
      await guardia.screenshot({ path: "tests/screenshots/6-terminal-qr-tablet.png" });

      // 4. El mismo código otra vez (una captura de pantalla): rojo.
      await guardia.getByRole("button", { name: "Escanear otro" }).click();
      await expect(guardia.getByText("Rojo · no pasa")).toBeVisible({ timeout: 15_000 });
      await expect(guardia.getByText(/Ese código ya se usó|El código venció/)).toBeVisible();

      // 5. Un código con la firma alterada: rojo, aunque el cid exista.
      const partes = token.split(".");
      const i = 40;
      partes[3] = partes[3].slice(0, i) + (partes[3][i] === "A" ? "B" : "A") + partes[3].slice(i + 1);
      videoConQR(partes.join("."), camara);
      await guardia.getByRole("button", { name: "Escanear de nuevo" }).click();
      await expect(guardia.getByText("El código no es válido. Pídele que abra de nuevo su credencial.")).toBeVisible({ timeout: 15_000 });

      // 6. Un QR que no es de AforoON.
      videoConQR("https://example.com/otra-cosa", camara);
      await guardia.getByRole("button", { name: "Escanear de nuevo" }).click();
      await expect(guardia.getByText("No es un QR de AforoON.", { exact: false })).toBeVisible({ timeout: 15_000 });
      await expectNoHorizontalScroll(guardia);
    } finally {
      await navegador.close();
    }
  });
});
