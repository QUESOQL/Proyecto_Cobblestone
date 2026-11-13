import fs from "node:fs";
import { expect, test } from "@playwright/test";
import {
  cleanup,
  createAdmin,
  createSocio,
  createUser,
  expectNoHorizontalScroll,
  freshStart,
  fotoInscripciones,
  inscribirEnProximaSesion,
  restaurarInscripciones,
  signIn,
} from "./helpers";

test.describe("Pantalla 5 · Dashboard de ocupación", () => {
  test.afterEach(cleanup);

  test("muestra indicadores, cambia de zona y exporta los accesos", async ({
    page,
  }) => {
    await freshStart(page, "/admin?demo=1");
    await expect(
      page.getByRole("heading", { level: 1, name: "Ocupación del Hub" }),
    ).toBeVisible();
    for (const k of [
      "Entradas hoy",
      "Ocupación reservada",
      "No-show",
      "Socios enrolados",
    ]) {
      await expect(
        page.getByRole("region", { name: "Indicadores" }),
      ).toContainText(k);
    }
    // El centro de mesas está lleno en dos bloques hoy (el hallazgo del día).
    await expect(
      page.getByText("Lleno en 2 bloques: 10:00, 12:00."),
    ).toBeVisible();
    await expect(
      page.getByRole("img", {
        name: /Ocupación por bloque hoy en Centro de mesas/,
      }),
    ).toBeVisible();

    await page.getByRole("tab", { name: "Edificio Empleo" }).click();
    await expect(
      page.getByRole("img", { name: /Edificio Empleo/ }),
    ).toBeVisible();

    // Caracterización: los seis perfiles del levantamiento en terreno.
    const seg = page
      .getByRole("heading", { name: "Quiénes vienen" })
      .locator("../..");
    for (const s of [
      "Emprendimiento",
      "Búsqueda de empleo",
      "Estudiante",
      "Startup",
      "Vecino/a",
      "Empresa",
    ])
      await expect(seg).toContainText(s);

    await expect(
      page
        .getByRole("table")
        .filter({ hasText: "Boletas de honorarios sin enredos" }),
    ).toBeVisible();

    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exportar accesos de hoy" }).click();
    expect((await download).suggestedFilename()).toMatch(
      /^aforoon-accesos-\d{4}-\d{2}-\d{2}\.csv$/,
    );

    await expectNoHorizontalScroll(page);
    await page.screenshot({
      path: "tests/screenshots/5-dashboard-escritorio.png",
      fullPage: true,
    });
  });
  test("solo una cuenta de administración entra al panel con datos reales", async ({
    page,
  }) => {
    // Sin sesión: pide entrar.
    await freshStart(page, "/admin");
    await expect(
      page.getByRole("heading", { level: 1, name: "Panel de administración" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Continuar con Google" }),
    ).toBeVisible();

    // Una cuenta sin el rol no ve el panel.
    const vecino = await createUser();
    await page.getByLabel("Correo").fill(vecino.email);
    await page.getByLabel("Contraseña").fill("equivocada");
    await page.getByRole("button", { name: "Entrar al panel" }).click();
    await expect(
      page.getByText("Correo o contraseña incorrectos."),
    ).toBeVisible();
    await page.getByLabel("Contraseña").fill(vecino.password);
    await page.getByRole("button", { name: "Entrar al panel" }).click();
    await expect(
      page.getByText("Esta cuenta no tiene acceso al panel."),
    ).toBeVisible();
    await expect(page.getByText(vecino.email)).toBeVisible();
    await page.getByRole("button", { name: "Entrar con otra cuenta" }).click();

    // La cuenta de administración ve las cifras de la base.
    const equipo = await createAdmin();
    await page.getByLabel("Correo").fill(equipo.email);
    await page.getByLabel("Contraseña").fill(equipo.password);
    await page.getByRole("button", { name: "Entrar al panel" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Ocupación del Hub" }),
    ).toBeVisible();
    await expect(page.getByText("En vivo", { exact: true })).toBeVisible();
    const kpis = page.getByRole("region", { name: "Indicadores" });
    for (const k of [
      "Entradas hoy",
      "Ocupación reservada",
      "No-show",
      "Socios enrolados",
    ])
      await expect(kpis).toContainText(k);
    // La demo cargada tiene 286 socios de ejemplo; el panel cuenta desde la base.
    await expect(kpis).toContainText(/de \d{3} registrados/);
    await expect(
      page
        .getByRole("table")
        .filter({ hasText: "Boletas de honorarios sin enredos" }),
    ).toBeVisible();

    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exportar accesos de hoy" }).click();
    const archivo = await download;
    expect(archivo.suggestedFilename()).toMatch(
      /^aforoon-accesos-\d{4}-\d{2}-\d{2}\.csv$/,
    );
    const csv = fs.readFileSync(await archivo.path(), "utf8");
    expect(csv.split("\n").length).toBeGreaterThan(10);

    // La sesión sigue al recargar.
    await page.reload();
    await expect(
      page.getByRole("heading", { level: 1, name: "Ocupación del Hub" }),
    ).toBeVisible();
    await expectNoHorizontalScroll(page);
    await page.screenshot({
      path: "tests/screenshots/5-panel-real-escritorio.png",
      fullPage: true,
    });
  });

  test("capacitaciones: marca la asistencia y aprueba a todos de una vez", async ({
    page,
  }) => {
    const ana = await createSocio("Ana Prueba Lote");
    const beto = await createSocio("Beto Prueba Lote");
    const sesion = await inscribirEnProximaSesion(ana.id);
    // Las personas de la demo inscritas en la misma sesión quedan como estaban al terminar.
    const antes = await fotoInscripciones(sesion);
    await inscribirEnProximaSesion(beto.id, sesion);
    try {
      await signIn(page, await createAdmin());
      await expect(
        page.getByRole("heading", { name: "Tu QR de acceso" }),
      ).toBeVisible();
      await page.goto("/admin#capacitaciones");
      const caja = page.getByRole("region", { name: "Capacitaciones" });
      await caja.locator(`[data-sesion="${sesion}"]`).click();
      const fila = (n: string) =>
        caja.getByRole("row", { name: new RegExp(n) });
      await expect(fila("Ana Prueba Lote")).toContainText(
        "Falta la asistencia",
      );
      await expect(
        caja.getByRole("button", { name: /^Aprobar a quienes asistieron/ }),
      ).toBeDisabled();

      // 1. Asistencia a todos de una vez.
      await caja
        .getByRole("button", { name: "Marcar asistencia a todos" })
        .click();
      await expect(caja.getByRole("status")).toContainText(
        /Asistencia marcada a \d+ personas?\./,
      );
      for (const n of ["Ana Prueba Lote", "Beto Prueba Lote"])
        await expect(fila(n).getByRole("checkbox")).toBeChecked();
      await expect(
        caja.getByRole("button", { name: "Marcar asistencia a todos" }),
      ).toBeDisabled();

      // 2. Aprobar a todos: pide un segundo toque para confirmar.
      await caja
        .getByRole("button", { name: /^Aprobar a quienes asistieron \(\d+\)$/ })
        .click();
      await caja
        .getByRole("button", { name: /^Confirmar: aprobar a \d+$/ })
        .click();
      for (const n of ["Ana Prueba Lote", "Beto Prueba Lote"])
        await expect(fila(n)).toContainText("Aprobada");
      await expect(caja.getByRole("status")).toContainText(
        /aprobadas?: ya pueden reservar/,
      );
      await page.screenshot({
        path: "tests/screenshots/5-capacitaciones-escritorio.png",
        fullPage: false,
      });
    } finally {
      await restaurarInscripciones(
        antes.filter((f) => f.persona_id !== ana.id),
      );
    }
  });

  test("la credencial de una cuenta de administración lleva al panel", async ({
    page,
  }) => {
    await signIn(page, await createAdmin());
    await page
      .getByRole("link", { name: "Abrir el panel de administración" })
      .click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Ocupación del Hub" }),
    ).toBeVisible();
  });
});
