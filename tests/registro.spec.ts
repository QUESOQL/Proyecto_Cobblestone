import { expect, test } from "@playwright/test";
import { cleanup, createUser, enroll, expectNoHorizontalScroll, freshStart, signIn, testRut } from "./helpers";

test.describe("Pantalla 1 · Enrolamiento único y credencial", () => {
  test.afterEach(cleanup);

  test("entra con su cuenta, valida el RUT y no deja continuar sin consentimiento", async ({ page }) => {
    await freshStart(page, "/registro");
    await expect(page.getByRole("heading", { name: "Entra al Hub sin llenar el formulario" })).toBeVisible();
    await expectNoHorizontalScroll(page);

    // Contraseña equivocada: el mensaje es claro y no entra.
    const user = await createUser();
    await page.getByRole("tab", { name: "Ya tengo cuenta" }).click();
    await page.getByLabel("Correo").fill(user.email);
    await page.getByLabel("Contraseña").fill("no-es-esta");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(page.getByText("Correo o contraseña incorrectos.")).toBeVisible();

    await signIn(page, user);
    await expect(page.getByRole("heading", { name: "Tus datos, una sola vez" })).toBeVisible();

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

  test("crea la credencial con NFC y QR dinámico, y la sesión se mantiene", async ({ page }) => {
    await enroll(page);
    await expect(page.getByRole("heading", { name: "Valentina Muñoz Rojas" })).toBeVisible();
    await expect(page.getByText("Activa", { exact: true })).toBeVisible();
    await expect(page.locator("section[aria-labelledby=qr-title] svg")).toBeVisible();
    await expect(page.getByText(/Cambia en \d+ s/)).toBeVisible();
    // El RUT se muestra enmascarado: el completo nunca sale de la base.
    await expect(page.getByText(/\d{2}\.\d{3}\.\*\*\*-[\dK]/)).toBeVisible();

    // La sesión persiste al recargar.
    await page.reload();
    await expect(page.getByRole("heading", { name: "Credencial NFC activa" })).toBeVisible();
    await page.screenshot({ path: "tests/screenshots/1-credencial-telefono.png", fullPage: true });

    // Cerrar sesión vuelve a la pantalla de entrada.
    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(page.getByRole("heading", { name: "Entra al Hub sin llenar el formulario" })).toBeVisible();
  });
});
