import { expect, type Page } from "@playwright/test";

/** RUT de prueba válido (módulo 11), calculado igual que en la app. */
export function testRut(body = 17482395): string {
  let sum = 0;
  let mul = 2;
  let n = body;
  while (n > 0) {
    sum += (n % 10) * mul;
    n = Math.floor(n / 10);
    mul = mul === 7 ? 2 : mul + 1;
  }
  const r = 11 - (sum % 11);
  const dv = r === 11 ? "0" : r === 10 ? "K" : String(r);
  return `${body}${dv}`;
}

/** Deja la demo en blanco: cada prueba parte sin sesión guardada. */
export async function freshStart(page: Page, path = "/") {
  await page.goto(path);
  await page.evaluate(() => localStorage.clear());
  await page.goto(path);
}

/** Completa el enrolamiento con datos de prueba. */
export async function enroll(page: Page) {
  await freshStart(page, "/registro");
  await page.getByRole("button", { name: "Continuar con Google" }).click();
  await page.getByLabel("RUT", { exact: true }).fill(testRut());
  await page.getByLabel("Teléfono").fill("12345678");
  await page.getByRole("button", { name: "Emprendimiento" }).click();
  await page.getByLabel("Ocupación").fill("Diseñadora independiente");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Crear mi credencial" }).click();
  await expect(page.getByRole("heading", { name: "Credencial NFC activa" })).toBeVisible();
}

/** Ninguna pantalla debe desplazarse de lado. */
export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, "la página se desplaza horizontalmente").toBeLessThanOrEqual(1);
}
