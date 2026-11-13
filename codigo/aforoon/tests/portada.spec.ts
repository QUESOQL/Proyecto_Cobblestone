import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll } from "./helpers";

test.describe("Landing", () => {
  test("presenta el Hub, recorre el Lab881, compara las dos puertas y lleva al registro", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Entra al Hub Providencia con tu teléfono" })).toBeVisible();

    // "Ahora en el Hub": abierto (reloj de la demo, 10:24) y los cupos del bloque por zona.
    const ahora = page.getByRole("region", { name: "Ahora en el Hub" });
    if (new Date().getDay() === 0) {
      // El domingo el Hub está cerrado: dice cuándo abre.
      await expect(ahora.getByRole("status")).toHaveText("Cerrado");
      await expect(ahora.getByText(/^Abre mañana a las 08:00\./)).toBeVisible();
    } else {
      await expect(ahora.getByRole("status")).toHaveText("Abierto · bloque 10:00–12:00");
      const zonas = ahora.getByRole("list", { name: "Cupos reservados por zona" });
      for (const z of ["Centro de mesas", "Oficinas y set", "Edificio Empleo"]) {
        await expect(zonas.getByRole("meter", { name: new RegExp(`^${z}: \\d+ de \\d+ reservados$`) })).toBeVisible();
      }
      await expect(ahora.getByText(/está lleno en este bloque|se está llenando|Hay espacio en todas las zonas/)).toBeVisible();
    }
    await ahora.getByRole("link", { name: "Reservar un lugar" }).click();
    await expect(page).toHaveURL(/\/reservar$/);
    await page.goBack();

    // Lab881: la imagen fija cambia a medida que pasan las máquinas.
    const laser = page.getByRole("heading", { name: "Cortadora láser" });
    await laser.scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 200);
    await expect(page.locator('[data-slot="lab-laser"]')).toHaveCSS("opacity", "1", { timeout: 3000 });

    // Las pestañas de AforoON según quién lo usa.
    await page.getByRole("tab", { name: "Administración" }).click();
    await expect(page.getByRole("heading", { name: "El aforo, medido en la puerta" })).toBeVisible();

    // La carrera: la puerta de AforoON se abre mucho antes que el formulario.
    const race = page.getByRole("heading", { name: "Prueba las dos puertas" });
    await race.scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: "Acercar el teléfono" }).click();
    await expect(page.getByText(/Verde\. Adentro en 1,2 s\./)).toBeVisible({ timeout: 4000 });
    await expect(page.getByText(/El formulario tardó [\d,]+ s, \d+ veces más/)).toBeVisible({ timeout: 40000 });

    for (const h of ["Qué hay en el Hub", "Aprende el oficio textil, con máquinas del Hub", "AforoON para cada uno", "También en el Hub", "Preguntas"]) {
      await expect(page.getByRole("heading", { name: h })).toBeAttached();
    }
    await expectNoHorizontalScroll(page);

    // La barra fija inferior lleva al registro desde cualquier punto.
    await page.getByRole("link", { name: "Crear mi credencial" }).last().click();
    await expect(page).toHaveURL(/\/registro$/);
  });
});
