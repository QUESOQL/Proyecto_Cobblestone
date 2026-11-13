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

/**
 * Las pruebas que reservan bloques de la tarde de hoy suponen un día hábil: en la demo el
 * sábado solo abre hasta las 14:00 y el domingo está cerrado.
 */
export const esFinDeSemana = [0, 6].includes(new Date().getDay());
export const MOTIVO_FIN_DE_SEMANA = "Necesita un día hábil: el fin de semana la demo cierra temprano o no abre";

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

/** Persona de recepción con su PIN de turno. */
export async function createRecepcionista(pin: string, nombre = "Rocío Recepción (prueba)"): Promise<TestUser> {
  const u = await createUser();
  await admin("/rest/v1/personas", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ user_id: u.id, nombre, rut_mascara: "22.222.***-2", segmento: "Empresa", rol: "recepcion" }),
  });
  await admin("/rest/v1/rpc/definir_pin", { method: "POST", body: JSON.stringify({ p_persona: await personaOf(u), p_pin: pin }) });
  return u;
}

/** Cuenta del celular del guardia (terminal activo). */
export async function createTerminal(nombre = "Recepción de prueba"): Promise<TestUser> {
  const u = await createUser();
  await admin("/rest/v1/terminales", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ user_id: u.id, nombre }) });
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

/** Socios sin cuenta creados por la prueba (como los de la demo); cleanup() los borra. */
const socios: string[] = [];

/**
 * Socio verificado con RUT buscable (cifrado y con huella, vía cargar_ruts_demo) y, si se
 * pide, una reserva en el bloque en curso según el reloj de la demo.
 */
export async function createSocio(nombre: string, { conReserva = false } = {}): Promise<{ id: string; rut: string }> {
  const rut = randomRut();
  const [p] = await admin("/rest/v1/personas?select=id", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ nombre, rut_mascara: "1.***", segmento: "Emprendimiento", verificada: true }),
  });
  socios.push(p.id);
  await admin("/rest/v1/rpc/cargar_ruts_demo", { method: "POST", body: JSON.stringify({ p_datos: [{ id: p.id, rut }] }) });
  if (conReserva) await reservarBloqueActual(p.id);
  return { id: p.id, rut };
}

/** Inscribe a una persona en la próxima sesión de capacitación y devuelve el id de la sesión. */
export async function inscribirEnProximaSesion(persona: string, sesion?: string): Promise<string> {
  if (!sesion) {
    const reloj = await admin("/rest/v1/rpc/reloj", { method: "POST", body: "{}" });
    const [s] = await admin(`/rest/v1/sesiones_capacitacion?select=id&dia=gte.${reloj.dia}&order=dia,inicio&limit=1`);
    sesion = s.id as string;
  }
  await admin("/rest/v1/inscripciones_capacitacion", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ sesion_id: sesion, persona_id: persona }),
  });
  return sesion!;
}

type Inscripcion = { sesion_id: string; persona_id: string; asistio: boolean; aprobada: boolean; aprobada_at: string | null; aprobada_por: string | null; vence_at: string | null };

/** Cómo están las inscripciones de una sesión (para dejarlas igual después de una prueba). */
export async function fotoInscripciones(sesion: string): Promise<Inscripcion[]> {
  return admin(`/rest/v1/inscripciones_capacitacion?sesion_id=eq.${sesion}&select=sesion_id,persona_id,asistio,aprobada,aprobada_at,aprobada_por,vence_at`);
}
export async function restaurarInscripciones(filas: Inscripcion[]) {
  for (const f of filas) {
    await admin(`/rest/v1/inscripciones_capacitacion?sesion_id=eq.${f.sesion_id}&persona_id=eq.${f.persona_id}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ asistio: f.asistio, aprobada: f.aprobada, aprobada_at: f.aprobada_at, aprobada_por: f.aprobada_por, vence_at: f.vence_at }),
    });
  }
}

/** Reserva en el centro de mesas en el bloque en curso según el reloj de la demo. */
export async function reservarBloqueActual(persona: string) {
  const reloj = await admin("/rest/v1/rpc/reloj", { method: "POST", body: "{}" });
  const bloques: { id: string; inicio: string; fin: string }[] = await admin("/rest/v1/bloques?select=id,inicio,fin");
  const min = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const bloque = bloques.find((b) => min(b.inicio) <= reloj.minuto && reloj.minuto < min(b.fin));
  if (!bloque) throw new Error("El reloj de la demo está fuera de los bloques");
  await admin("/rest/v1/reservas", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ persona_id: persona, unidad_id: "mesas", dia: reloj.dia, bloque_id: bloque.id }),
  });
}

/** Vecino con cuenta y perfil ya creados (sin pasar por el formulario de registro). */
export async function createVecino(nombre: string): Promise<TestUser & { persona: string }> {
  const u = await createUser();
  await admin("/rest/v1/personas", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ user_id: u.id, nombre, rut_mascara: "33.333.***-3", segmento: "Startup", verificada: true }),
  });
  return { ...u, persona: await personaOf(u) };
}

/** Credenciales QR de una persona (estado y si ya se usaron), leídas con la clave secreta. */
export async function credencialesDe(persona: string): Promise<{ codigo: string; estado: string; ultimo_t: number }[]> {
  return admin(`/rest/v1/credenciales?persona_id=eq.${persona}&select=codigo,estado,ultimo_t&order=alta_at`);
}

/**
 * Lector BLE de prueba: lo da de alta (o le cambia la clave) y devuelve la clave, como
 * scripts/equipo.mjs lector. desactivarLector() lo deja desactivado al terminar.
 */
export async function crearLector(nombre: string): Promise<string> {
  return admin("/rest/v1/rpc/crear_lector", { method: "POST", body: JSON.stringify({ p_nombre: nombre }) });
}
export async function desactivarLector(nombre: string) {
  await admin(`/rest/v1/lectores?nombre=eq.${nombre}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ activo: false }) });
}

/** Entra con la cuenta del terminal y abre el turno con el PIN. */
export async function abrirTurno(page: Page, terminal: TestUser, pin: string) {
  await freshStart(page, "/recepcion");
  await page.getByLabel("Correo del terminal").fill(terminal.email);
  await page.getByLabel("Contraseña del terminal").fill(terminal.password);
  await page.getByRole("button", { name: "Registrar terminal" }).click();
  await page.getByLabel("PIN").fill(pin);
  await page.getByRole("button", { name: "Iniciar turno" }).click();
  await expect(page.getByRole("heading", { name: "Buscar por RUT" })).toBeVisible();
}

/**
 * Borra las cuentas que creó la prueba. Borrar a la persona arrastra sus reservas,
 * inscripciones y accesos. En orden de creación: primero quien se inscribió, después quien
 * la aprobó. Cada archivo de pruebas la registra con test.afterEach(cleanup).
 */
export async function cleanup() {
  while (socios.length) await admin(`/rest/v1/personas?id=eq.${socios.shift()}`, { method: "DELETE" });
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
  await expect(page.getByRole("heading", { name: "Tu QR de acceso" })).toBeVisible();
  return user;
}

/** Ninguna pantalla debe desplazarse de lado. */
export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, "la página se desplaza horizontalmente").toBeLessThanOrEqual(1);
}
