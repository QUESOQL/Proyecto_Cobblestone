import { expect, test } from "@playwright/test";
import { enroll, expectNoHorizontalScroll, freshStart, testRut } from "./helpers";

test.describe("Pantalla 1 · Enrolamiento único y credencial", () => {
  test("valida el RUT y no deja continuar sin consentimiento", async ({ page }) => {
    await freshStart(page, "/registro");
    await expect(page.getByRole("heading", { name: "Entra al Hub sin llenar el formulario" })).toBeVisible();
    await expectNoHorizontalScroll(page);

    await page.getByRole("button", { name: "Continuar con Google" }).click();
    // Los datos del proveedor social llegan precargados.
    await expect(page.getByLabel("Nombre completo")).toHaveValue("Valentina Muñoz Rojas");

    // Dígito verificador incorrecto.
    const wrong = testRut().slice(0, -1) + (testRut().endsWith("1") ? "2" : "1");
    await page.getByLabel("RUT", { exact: true }).fill(wrong);
    await expect(page.getByText("El dígito verificador no coincide.")).toBeVisible();

    await page.getByLabel("RUT", { exact: true }).fill(testRut());
    await expect(page.getByText("RUT válido")).toBeVisible();
    await expect(page.getByLabel("RUT", { exact: true })).toHaveValue("17.482.395-" + testRut().slice(-1));

    // Sin consentimiento ni perfil, no se crea la credencial.
    await page.getByRole("button", { name: "Crear mi credencial" }).click();
    await expect(page.getByText("Necesitamos tu consentimiento para crear la credencial.")).toBeVisible();
    await expect(page.getByText("Elige un perfil.")).toBeVisible();
    await expectNoHorizontalScroll(page);
  });

  test("crea la credencial con NFC y QR dinámico", async ({ page }) => {
    await enroll(page);
    await expect(page.getByRole("heading", { name: "Valentina Muñoz Rojas" })).toBeVisible();
    await expect(page.getByText("Activa", { exact: true })).toBeVisible();
    await expect(page.locator("section[aria-labelledby=qr-title] svg")).toBeVisible();
    await expect(page.getByText(/Cambia en \d+ s/)).toBeVisible();

    // La sesión persiste al recargar.
    await page.reload();
    await expect(page.getByRole("heading", { name: "Credencial NFC activa" })).toBeVisible();
    await page.screenshot({ path: "tests/screenshots/1-credencial-telefono.png", fullPage: true });
  });
});
