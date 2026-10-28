import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll } from "./helpers";

test.describe("Páginas del Hub", () => {
  test("cada enlace de la landing a un espacio abre su página de detalle", async ({ page }) => {
    await page.goto("/");
    const hrefs = await page.locator('main a[href^="/hub/"]').evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute("href")!))]);
    // Seis espacios en las tarjetas y tres en "También en el Hub".
    expect(hrefs.sort()).toEqual(
      ["/hub/charlas", "/hub/cowork", "/hub/cowork-textil", "/hub/emprendepro", "/hub/empleo", "/hub/govtech", "/hub/ingaming", "/hub/lab881", "/hub/oficinas"].sort(),
    );

    for (const href of hrefs) {
      await page.goto("/");
      await page.locator(`main a[href="${href}"]`).first().click();
      await expect(page).toHaveURL(new RegExp(`${href}$`));
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByRole("region", { name: "Datos clave" })).toBeVisible();
      await expectNoHorizontalScroll(page);
    }
  });

  test("la página del Lab881 lleva a la capacitación y muestra las reglas", async ({ page }) => {
    await page.goto("/hub/lab881");
    await expect(page.getByRole("heading", { level: 1, name: "Lab881" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Reglas de uso" })).toBeVisible();
    await expect(page.getByText("15 reservas al año por persona")).toBeVisible();
    await page.getByRole("main").getByRole("link", { name: /Inscribirme en una capacitación/ }).first().click();
    await expect(page).toHaveURL(/\/capacitaciones\?tipo=impresion3d$/);
  });

  test("lo que las fuentes no confirman se ve como Por confirmar", async ({ page }) => {
    await page.goto("/hub/ingaming");
    await expect(page.getByRole("region", { name: "Datos clave" }).getByText("Por confirmar").first()).toBeVisible();
  });
});
