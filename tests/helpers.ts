import { expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

/*
 * Las pruebas corren contra el proyecto de Supabase de .env.local. Cada prueba crea sus
 * propias cuentas desechables con la clave secreta, entra por la pantalla como lo haría
 * una persona y, al terminar, borra todo lo que creó (personas, reservas, inscripciones
 * y la cuenta). Así la demo cargada por scripts/seed-demo.mjs no se ensucia.
 */

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;

async function admin(path: string, init: RequestInit = {}) {
  const res = await fetch(`${URL}${path}`, {
    ...init,
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${path}: ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json().catch(() => null);
}

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

/** Un RUT distinto en cada prueba (la base no acepta dos credenciales con el mismo RUT). */
export const randomRut = () => testRut(30_000_000 + Math.floor(Math.random() * 9_000_000));

export interface TestUser {
  id: string;
  email: string;
  password: string;
}

const created: string[] = [];

/** Cuenta confirmada, lista para entrar. Se borra sola al terminar la prueba. */
export async function createUser(): Promise<TestUser> {
  const email = `prueba-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6)}@aforoon.test`;
  const password = "prueba-aforoon-123";
  const u = await admin("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true }) });
  created.push(u.id);
  return { id: u.id, email, password };
}

/** Cuenta de administración con su perfil ya creado (rol admin). */
export async function createAdmin(): Promise<TestUser> {
  const u = await createUser();
  await admin("/rest/v1/personas", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ user_id: u.id, nombre: "Equipo Hub (prueba)", rut_mascara: "11.111.***-1", segmento: "Empresa", rol: "admin" }),
  });
  return u;
}

/** Id de la persona de una cuenta. */
export async function personaOf(user: TestUser): Promise<string> {
  const rows = await admin(`/rest/v1/personas?user_id=eq.${user.id}&select=id`);
  return rows[0].id;
}

/** Aprueba una capacitación directo en la base (para pruebas que no tratan de la aprobación). */
export async function approveTraining(user: TestUser, sessionId: string) {
  const persona = await personaOf(user);
  await admin("/rest/v1/inscripciones_capacitacion", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ sesion_id: sessionId, persona_id: persona, asistio: true, aprobada: true, aprobada_at: new Date().toISOString() }),
  });
}

/**
 * Borra las cuentas que creó la prueba. Borrar a la persona arrastra sus reservas,
 * inscripciones y accesos. En orden de creación: primero quien se inscribió, después quien
 * la aprobó. Cada archivo de pruebas la registra con test.afterEach(cleanup).
 */
export async function cleanup() {
  while (created.length) {
    const id = created.shift()!;
    await admin(`/rest/v1/personas?user_id=eq.${id}`, { method: "DELETE" });
    await admin(`/auth/v1/admin/users/${id}`, { method: "DELETE" });
  }
}

/** Deja la demo en blanco: sin sesión ni estado local guardado. */
export async function freshStart(page: Page, path = "/") {
  await page.context().clearCookies();
  await page.goto(path);
  await page.evaluate(() => localStorage.clear());
  await page.goto(path);
}

/** Entra con una cuenta existente desde /registro. */
export async function signIn(page: Page, user: TestUser) {
  await freshStart(page, "/registro");
  await page.getByRole("tab", { name: "Ya tengo cuenta" }).click();
  await page.getByLabel("Correo").fill(user.email);
  await page.getByLabel("Contraseña").fill(user.password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
}

/** Crea una cuenta, entra y completa el enrolamiento con datos de prueba. */
export async function enroll(page: Page): Promise<TestUser> {
  const user = await createUser();
  await signIn(page, user);
  await expect(page.getByRole("heading", { name: "Tus datos, una sola vez" })).toBeVisible();
  await page.getByLabel("Nombre completo").fill("Valentina Muñoz Rojas");
  await page.getByLabel("RUT", { exact: true }).fill(randomRut());
  await page.getByLabel("Teléfono").fill("12345678");
  await page.getByRole("button", { name: "Emprendimiento" }).click();
  await page.getByLabel("Ocupación").fill("Diseñadora independiente");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Crear mi credencial" }).click();
  await expect(page.getByRole("heading", { name: "Credencial NFC activa" })).toBeVisible();
  return user;
}

/** Ninguna pantalla debe desplazarse de lado. */
export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, "la página se desplaza horizontalmente").toBeLessThanOrEqual(1);
}
