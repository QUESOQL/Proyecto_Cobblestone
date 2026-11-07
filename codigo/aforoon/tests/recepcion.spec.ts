import { expect, test } from "@playwright/test";
import { cleanup, createRecepcionista, createTerminal, expectNoHorizontalScroll, freshStart } from "./helpers";

test.describe("Pantalla 4 · Terminal de acceso", () => {
  test.afterEach(cleanup);

  test("valida, rechaza, permite excepciones y funciona sin conexión", async ({ page }) => {
    // Lecturas simuladas: el modo demo salta la cuenta del terminal y el PIN.
    await freshStart(page, "/recepcion?demo=1");
    await expect(page.getByRole("heading", { name: "Acerca el teléfono o muestra el QR" })).toBeVisible();
    const insideText = await page.getByRole("heading", { name: "Dentro del Hub ahora" }).locator("..").innerText();
    const insideBefore = Number(insideText.match(/(\d+)\s*personas/)![1]);

    const queue = page.getByRole("list").filter({ has: page.getByRole("button", { name: /Acercar NFC/ }) });

    // 1. Socio con reserva: verde.
    await queue.getByRole("button", { name: /Acercar NFC/ }).first().click();
    await expect(page.getByText("Acceso validado")).toBeVisible();
    await expect(page.getByText("Verde · pasa")).toBeVisible();
    const latency = await page.getByText(/\d+(,\d)? s · NFC/).innerText();
    expect(parseFloat(latency.replace(",", "."))).toBeLessThan(7);
    await expect(page.getByRole("heading", { name: "Dentro del Hub ahora" }).locator("..")).toContainText(`${insideBefore + 1}`);

    // 2. Alguien sin reserva en este bloque: rojo, y recepción permite la excepción.
    const rows = queue.getByRole("listitem");
    const n = await rows.count();
    let sawDenied = false;
    for (let i = 0; i < n && !sawDenied; i++) {
      await queue.getByRole("button", { name: /Leer QR/ }).nth(Math.min(i, (await queue.getByRole("button", { name: /Leer QR/ }).count()) - 1)).click();
      await expect(page.getByText(/Verde · pasa|Rojo · no pasa/)).toBeVisible();
      if (await page.getByText("Sin reserva para este bloque").isVisible()) {
        sawDenied = true;
        await expect(page.getByText("Rojo · no pasa")).toBeVisible();
        await page.getByRole("button", { name: "Permitir como excepción" }).click();
        await expect(page.getByText("Ingreso por excepción", { exact: true })).toBeVisible();
      }
    }
    expect(sawDenied, "la fila de la puerta incluye a alguien sin reserva").toBe(true);
    await expect(page.getByRole("heading", { name: "Registro de accesos" }).locator("../..")).toContainText("Excepción");

    // 3. Sin conexión: la lectura queda en cola y se sincroniza al volver.
    await page.getByRole("button", { name: "En línea" }).click();
    await queue.getByRole("button", { name: /Acercar NFC/ }).first().click();
    await expect(page.getByText(/Verde · pasa|Rojo · no pasa/)).toBeVisible();
    await expect(page.getByRole("button", { name: /Sin conexión · 1 en cola/ })).toBeVisible();
    await expect(page.getByText("En cola para sincronizar")).toBeVisible();
    await page.getByRole("button", { name: /Sin conexión/ }).click();
    await expect(page.getByRole("button", { name: "En línea" })).toBeVisible();

    // 4. Salida.
    await page.getByRole("tab", { name: "salida" }).click();
    await expect(page.getByRole("heading", { name: "Saliendo" })).toBeVisible();
    await queue.getByRole("button", { name: /Acercar NFC/ }).first().click();
    await expect(page.getByText("Acceso validado")).toBeVisible();

    await expectNoHorizontalScroll(page);
    await page.screenshot({ path: "tests/screenshots/4-terminal-tablet.png", fullPage: true });
  });

  test("el celular del guardia entra con su cuenta y abre el turno con PIN", async ({ page }) => {
    const terminal = await createTerminal();
    await createRecepcionista("4821");
    await freshStart(page, "/recepcion");

    // Una sola vez por celular: la cuenta del terminal.
    await expect(page.getByRole("heading", { name: "Registrar este celular como terminal" })).toBeVisible();
    await page.getByLabel("Correo del terminal").fill(terminal.email);
    await page.getByLabel("Contraseña del terminal").fill(terminal.password);
    await page.getByRole("button", { name: "Registrar terminal" }).click();

    // En cada turno: el PIN. Uno equivocado no entra.
    await expect(page.getByRole("heading", { name: "Iniciar turno" })).toBeVisible();
    await page.getByLabel("PIN").fill("1111");
    await page.getByRole("button", { name: "Iniciar turno" }).click();
    await expect(page.getByText("PIN incorrecto.")).toBeVisible();
    await page.getByLabel("PIN").fill("4821");
    await page.getByRole("button", { name: "Iniciar turno" }).click();
    await expect(page.getByText("Rocío Recepción (prueba)")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Acerca el teléfono o muestra el QR" })).toBeVisible();

    // La sesión del terminal y el turno siguen al recargar.
    await page.reload();
    await expect(page.getByText("Rocío Recepción (prueba)")).toBeVisible();

    // Cerrar el turno vuelve a pedir PIN, pero no la cuenta del terminal.
    await page.getByRole("button", { name: "Cerrar turno" }).click();
    await expect(page.getByRole("heading", { name: "Iniciar turno" })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
});
