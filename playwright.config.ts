import { defineConfig, devices } from "@playwright/test";

/**
 * Pruebas end-to-end de las cinco pantallas.
 * Usa el Chrome instalado en el equipo (channel: "chrome"), sin descargar navegadores.
 *   npm run test:e2e
 */
export default defineConfig({
  testDir: "./tests",
  timeout: 45_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "tests/report" }]],
  use: {
    baseURL: "http://localhost:3000",
    channel: "chrome",
    locale: "es-CL",
    timezoneId: "America/Santiago",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "telefono", use: { ...devices["Pixel 7"], channel: "chrome" }, testMatch: /(registro|reservar|inicio|maquinas)\.spec\.ts/ },
    { name: "tablet", use: { viewport: { width: 1024, height: 768 }, hasTouch: true }, testMatch: /recepcion\.spec\.ts/ },
    { name: "escritorio", use: { viewport: { width: 1440, height: 900 } }, testMatch: /(admin|portada|capturas|hub)\.spec\.ts/ },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
