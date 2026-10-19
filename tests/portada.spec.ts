import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll } from "./helpers";

test.describe("Landing", () => {
  test("presenta AforoON, compara las dos puertas y lleva al registro", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "AforoON" })).toBeVisible();
    await expect(page.getByText("La credencial para entrar al Hub Providencia")).toBeVisible();

    // La carrera: la puerta de AforoON se abre mucho antes que el formulario.
    const race = page.getByRole("heading", { name: "Prueba las dos puertas" });
    await race.scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: "Acercar el teléfono" }).click();
    await expect(page.getByText(/Verde\. Adentro en 1,2 s\./)).toBeVisible({ timeout: 4000 });
    await expect(page.getByText(/El formulario tardó [\d,]+ s, \d+ veces más/)).toBeVisible({ timeout: 40000 });

    for (const h of ["Una vez, y listo.", "Cuarenta mesas, una sola puerta.", "Todo el Hub, con su aforo", "Preguntas", "Tu teléfono ya es la llave."]) {
      await expect(page.getByRole("heading", { name: h })).toBeAttached();
    }
    await expectNoHorizontalScroll(page);

    await page.getByRole("link", { name: "Crear mi credencial" }).first().click();
    await expect(page).toHaveURL(/\/registro$/);
  });
});
