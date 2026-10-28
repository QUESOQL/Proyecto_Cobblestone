import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll, freshStart } from "./helpers";

test.describe("Pantalla 5 · Dashboard de ocupación", () => {
  test("muestra indicadores, cambia de zona y exporta los accesos", async ({ page }) => {
    await freshStart(page, "/admin");
    await expect(page.getByRole("heading", { level: 1, name: "Ocupación del Hub" })).toBeVisible();
    for (const k of ["Entradas hoy", "Ocupación reservada", "No-show", "Socios enrolados"]) {
      await expect(page.getByRole("region", { name: "Indicadores" })).toContainText(k);
    }
    // El centro de mesas está lleno en dos bloques hoy (el hallazgo del día).
    await expect(page.getByText("Lleno en 2 bloques: 10:00, 12:00.")).toBeVisible();
    await expect(page.getByRole("img", { name: /Ocupación por bloque hoy en Centro de mesas/ })).toBeVisible();

    await page.getByRole("tab", { name: "Edificio Empleo" }).click();
    await expect(page.getByRole("img", { name: /Edificio Empleo/ })).toBeVisible();

    // Caracterización: los seis perfiles del levantamiento en terreno.
    const seg = page.getByRole("heading", { name: "Quiénes vienen" }).locator("../..");
    for (const s of ["Emprendimiento", "Búsqueda de empleo", "Estudiante", "Startup", "Vecino/a", "Empresa"]) await expect(seg).toContainText(s);

    await expect(page.getByRole("table").filter({ hasText: "Boletas de honorarios sin enredos" })).toBeVisible();

    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exportar accesos de hoy" }).click();
    expect((await download).suggestedFilename()).toMatch(/^aforoon-accesos-\d{4}-\d{2}-\d{2}\.csv$/);

    await expectNoHorizontalScroll(page);
    await page.screenshot({ path: "tests/screenshots/5-dashboard-escritorio.png", fullPage: true });
  });
});
