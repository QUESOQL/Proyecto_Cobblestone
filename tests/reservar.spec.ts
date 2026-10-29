import { expect, test } from "@playwright/test";
import { cleanup, enroll, expectNoHorizontalScroll } from "./helpers";

test.describe("Pantalla 2 · Selección de espacio y bloque", () => {
  test.afterEach(cleanup);

  test.beforeEach(async ({ page }) => {
    await enroll(page);
    await page.goto("/reservar");
  });

  test("los bloques llenos y pasados no se pueden elegir", async ({ page }) => {
    await expect(page.getByText("Hoy el centro de mesas está lleno de 10:00 a 14:00.")).toBeVisible();
    const blocks = page.getByRole("list", { name: "Bloques horarios" });
    await expect(blocks.getByRole("button", { name: /08:00–10:00/ })).toBeDisabled();
    await expect(blocks.getByRole("button", { name: /10:00–12:00.*Sin cupos/ })).toBeDisabled();
    await expect(blocks.getByRole("button", { name: /12:00–14:00.*Sin cupos/ })).toBeDisabled();
    await expect(blocks.getByRole("button", { name: /14:00–16:00/ })).toBeEnabled();
    await expectNoHorizontalScroll(page);
  });

  test("reserva un bloque, descuenta el cupo y bloquea la superposición", async ({ page }) => {
    const blocks = page.getByRole("list", { name: "Bloques horarios" });
    const row = blocks.getByRole("button", { name: /14:00–16:00/ });
    const before = Number((await row.innerText()).match(/(\d+) de 40 libres/)![1]);

    await row.click();
    await page.getByRole("button", { name: "Reservar 14:00–16:00" }).click();
    await expect(page.getByRole("dialog", { name: "Confirmar reserva" })).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Confirmar" }).click();
    await expect(page.getByRole("heading", { name: "Listo, tienes tu cupo" })).toBeVisible();
    await page.screenshot({ path: "tests/screenshots/2-reserva-confirmada-telefono.png", fullPage: true });

    await page.getByRole("button", { name: "Reservar otro espacio" }).click();
    await expect(blocks.getByRole("button", { name: /14:00–16:00/ })).toContainText(/Ya reservaste aquí/);
    // El contador bajó en uno en la pista de aforo.
    await expect(page.getByRole("meter", { name: new RegExp(`14:00: ${40 - before + 1} de 40 ocupados`) })).toBeVisible();

    // Misma hora en una oficina: la regla de no superposición lo impide.
    await page.getByRole("tab", { name: "Oficinas y set" }).click();
    for (const name of ["Oficina 1", "Oficina 2", "Oficina 3", "Oficina 4", "Set audiovisual"]) {
      await page.getByRole("radio", { name: new RegExp(name) }).click();
      const slot = blocks.getByRole("button", { name: /14:00–16:00/ });
      if (await slot.isEnabled()) {
        await slot.click();
        await page.getByRole("button", { name: "Reservar 14:00–16:00" }).click();
        await page.getByRole("dialog").getByRole("button", { name: "Confirmar" }).click();
        await expect(page.getByText("Ya tienes otra reserva en ese mismo bloque.")).toBeVisible();
        break;
      }
    }
    await expectNoHorizontalScroll(page);
    await page.screenshot({ path: "tests/screenshots/2-reservar-telefono.png", fullPage: true });
  });
});
