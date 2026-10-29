import { expect, test } from "@playwright/test";
import { cleanup, enroll, expectNoHorizontalScroll } from "./helpers";

test.describe("Pantalla 3 · Inicio del socio", () => {
  test.afterEach(cleanup);

  test("muestra la próxima reserva, el Hub en vivo y permite inscribirse a una charla", async ({ page }) => {
    await enroll(page);
    await page.goto("/reservar");
    await page.getByRole("list", { name: "Bloques horarios" }).getByRole("button", { name: /16:00–18:00/ }).click();
    await page.getByRole("button", { name: "Reservar 16:00–18:00" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Confirmar" }).click();
    await page.getByRole("button", { name: "Ver mis reservas" }).click();

    await expect(page.getByRole("heading", { name: "Hola, Valentina" })).toBeVisible();
    await expect(page.getByText("Tu próxima reserva es hoy a las 16:00 en Mesas compartidas.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ahora en el Hub" })).toBeVisible();
    await expect(page.getByRole("meter", { name: /Centro de mesas: 40 de 40 ocupados/ })).toBeVisible();

    // Inscripción a una charla con cupos: el contador baja y el botón cambia.
    const talk = page.getByRole("listitem").filter({ hasText: "Primeros pasos con IA en tu emprendimiento" });
    await expect(talk).toContainText("Quedan 29 de 60");
    await talk.getByRole("button", { name: "Inscribirme" }).click();
    await expect(talk.getByRole("button", { name: "Inscrita" })).toBeVisible();
    await expect(talk).toContainText("Quedan 28 de 60");

    // La charla llena no acepta inscripciones.
    const full = page.getByRole("listitem").filter({ hasText: "Boletas de honorarios sin enredos" });
    await expect(full.getByRole("button", { name: "Llena" })).toBeDisabled();

    // Cancelar libera el cupo.
    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(page.getByText(/No tienes reservas/)).toBeVisible();
    await expectNoHorizontalScroll(page);
    await page.screenshot({ path: "tests/screenshots/3-inicio-telefono.png", fullPage: true });
  });
});
