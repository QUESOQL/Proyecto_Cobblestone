import { expect, test, type Page } from "@playwright/test";
import { cleanup, approveTraining, createAdmin, enroll, expectNoHorizontalScroll, signIn } from "./helpers";

/** Elige la primera hora de inicio libre y confirma la reserva. */
async function bookFirstFreeSlot(page: Page) {
  const slots = page.getByRole("list", { name: "Horas de inicio" });
  // Si el día elegido no tiene horas libres, prueba los siguientes días abiertos.
  const days = page.getByRole("radiogroup", { name: "Día" }).getByRole("radio");
  const n = await days.count();
  for (let i = 0; i < n; i++) {
    const free = slots.getByRole("button").and(page.locator(":enabled"));
    if ((await free.count()) > 0) {
      await free.first().click();
      break;
    }
    const next = days.nth(i);
    if (await next.isEnabled()) await next.click();
  }
  await page.getByRole("button", { name: /^Reservar \d{2}:\d{2}/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByRole("heading", { name: "Listo, la máquina es tuya" })).toBeVisible();
}

test.describe("Máquinas con capacitación obligatoria", () => {
  test.afterEach(cleanup);

  test("sin capacitación no se reserva la cortadora; se inscribe, la aprueban y ahora sí", async ({ page, browser }) => {
    await enroll(page);
    await page.goto("/maquinas");

    // Bloqueada, con el motivo y el botón para inscribirse. No hay forma de elegirla.
    const laser = page.getByRole("region", { name: "Corte láser" });
    await expect(laser).toContainText("Sin capacitación");
    await expect(laser.getByLabel("Bloqueada")).toBeVisible();
    await expect(page.getByRole("radio", { name: /Cortadora láser/ })).toHaveCount(0);
    await laser.getByRole("link", { name: "Inscribirme en la capacitación" }).click();

    // Inscripción con un toque.
    await expect(page).toHaveURL(/\/capacitaciones\?tipo=laser$/);
    await page.getByRole("button", { name: /^Inscribirme en Corte láser/ }).first().click();
    await expect(page.getByRole("button", { name: /^Inscrita en Corte láser/ })).toBeVisible();

    // Mientras no la aprueben, sigue bloqueada pero dice para cuándo está inscrita.
    await page.goto("/maquinas");
    await expect(page.getByRole("region", { name: "Corte láser" })).toContainText("Inscrita para el");

    // El equipo del Hub, en su propio navegador y con su cuenta, marca la asistencia y aprueba.
    const staff = await browser.newPage();
    await signIn(staff, await createAdmin());
    await expect(staff.getByRole("heading", { name: "Credencial NFC activa" })).toBeVisible();
    await staff.goto("/admin#capacitaciones");
    const admin = staff.getByRole("region", { name: "Capacitaciones" });
    await admin.getByRole("tab", { name: /^Corte láser/ }).first().click();
    const row = admin.getByRole("row", { name: /Valentina Muñoz Rojas/ });
    await expect(row.getByRole("button", { name: "Aprobar a Valentina Muñoz Rojas" })).toBeDisabled();
    await row.getByRole("checkbox", { name: "Asistió Valentina Muñoz Rojas" }).check();
    await row.getByRole("button", { name: "Aprobar a Valentina Muñoz Rojas" }).click();
    await expect(row).toContainText("Aprobada");
    await staff.close();

    // Ahora sí: la cortadora se puede elegir y reservar.
    await page.goto("/maquinas");
    await expect(page.getByRole("region", { name: "Corte láser" })).toContainText("Aprobada");
    await page.getByRole("radio", { name: /Cortadora láser/ }).click();
    await bookFirstFreeSlot(page);

    // La credencial muestra la insignia y la reserva aparece en el inicio.
    await page.getByRole("button", { name: "Ver mis reservas" }).click();
    await expect(page.getByRole("list", { name: "Capacitaciones aprobadas" })).toContainText("Corte láser");
    await expect(page.getByRole("list", { name: "Tus reservas de máquinas" })).toContainText("Cortadora láser");
    await expectNoHorizontalScroll(page);
    await page.screenshot({ path: "tests/screenshots/6-maquinas-telefono.png", fullPage: true });
  });

  test("respeta el cupo anual por duración: dos trabajos de 10 a 18 h y no más", async ({ page }) => {
    const user = await enroll(page);
    // Impresión 3D ya aprobada (el flujo de aprobación se prueba arriba).
    await approveTraining(user, "cap-3d-1");
    await page.goto("/maquinas");

    const quota = page.getByRole("list", { name: "Cupo anual por duración" });
    await expect(quota.getByRole("listitem").filter({ hasText: "10 a 18 h" })).toContainText("2");

    for (const machine of ["Impresora 3D 1", "Impresora 3D 2"]) {
      await page.getByRole("radio", { name: new RegExp(machine) }).click();
      await page.getByLabel("Duración del trabajo").selectOption("10");
      await bookFirstFreeSlot(page);
      await page.getByRole("button", { name: "Reservar otra máquina" }).click();
    }

    // Sin cupos en el tramo largo: la duración aparece deshabilitada antes de elegir hora.
    await expect(quota.getByRole("listitem").filter({ hasText: "10 a 18 h" })).toContainText("0");
    await page.getByRole("radio", { name: /Impresora 3D rápida/ }).click();
    const select = page.getByLabel("Duración del trabajo");
    await expect(select.locator('option[value="10"]')).toHaveAttribute("disabled", "");
    await expect(select.locator('option[value="18"]')).toHaveAttribute("disabled", "");
    await expect(select.locator('option[value="9"]')).not.toHaveAttribute("disabled");
    await expect(select.locator('option[value="10"]')).toHaveText(/sin cupos este año/);
    await expectNoHorizontalScroll(page);
  });
});
