import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll, freshStart } from "./helpers";

/** Recorre cada pantalla a 390, 768 y 1440 px: sin scroll lateral, sin errores de consola. */
const ROUTES = ["/", "/avance", "/registro", "/reservar", "/inicio", "/recepcion", "/admin"];
const WIDTHS = [390, 768, 1440];

for (const route of ROUTES) {
  test(`${route} se ve bien en teléfono, tablet y escritorio`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await freshStart(page, route);
    for (const w of WIDTHS) {
      await page.setViewportSize({ width: w, height: w === 390 ? 844 : w === 768 ? 1024 : 900 });
      await page.waitForTimeout(250);
      await expect(page.locator("h1").first()).toBeVisible();
      await expectNoHorizontalScroll(page);
      const name = route === "/" ? "portada" : route.slice(1);
      await page.screenshot({ path: `tests/screenshots/ancho-${w}/${name}.png`, fullPage: true });
    }
    expect(errors, errors.join("\n")).toEqual([]);
  });
}
