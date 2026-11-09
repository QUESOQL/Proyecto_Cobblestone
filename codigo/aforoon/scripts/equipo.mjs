// Administración del equipo del Hub, con la clave secreta de .env.local.
//
//   node scripts/equipo.mjs terminal "Recepción principal"   Crea la cuenta del celular del guardia
//   node scripts/equipo.mjs rol <correo> <vecino|recepcion|admin>   Cambia el rol de una persona
//   node scripts/equipo.mjs pin <correo> <PIN de 4 a 6 dígitos>      Define el PIN de turno
//   node scripts/equipo.mjs lista                                    Muestra terminales, lectores y equipo
//   node scripts/equipo.mjs lector AforoON-Lector-01                  Da de alta un lector ESP32 (o le cambia la clave)
//
// La persona debe haber creado su cuenta y su credencial en /registro antes de recibir rol o PIN.
// La contraseña del terminal se guarda en .env.terminal.local y la clave de cada lector en
// .env.lector.local (ambos ignorados por git), nunca en pantalla.

import { randomBytes } from "node:crypto";
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");

async function api(method, path, body, extra = {}) {
  const res = await fetch(`${URL}${path}`, {
    method,
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", ...extra },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    // Los errores de las funciones SQL traen su código en "message".
    let msg = text;
    try {
      msg = JSON.parse(text).message ?? JSON.parse(text).msg ?? text;
    } catch {}
    throw new Error(msg);
  }
  return text ? JSON.parse(text) : null;
}

async function usuarioPorCorreo(correo) {
  const { users } = await api("GET", "/auth/v1/admin/users?per_page=1000");
  const u = users.find((x) => x.email?.toLowerCase() === correo.toLowerCase());
  if (!u) throw new Error(`No hay ninguna cuenta con el correo ${correo}. Debe crearla primero en /registro.`);
  return u;
}

async function personaPorCorreo(correo) {
  const u = await usuarioPorCorreo(correo);
  const [p] = await api("GET", `/rest/v1/personas?user_id=eq.${u.id}&select=id,nombre,rol`);
  if (!p) throw new Error(`${correo} tiene cuenta, pero aún no completa su credencial en /registro.`);
  return p;
}

const [cmd, ...args] = process.argv.slice(2);

if (cmd === "terminal") {
  const nombre = args.join(" ").trim();
  if (!nombre) throw new Error('Falta el nombre: node scripts/equipo.mjs terminal "Recepción principal"');
  // "Recepción principal" → "recepcion-principal" (sin tildes ni símbolos).
  const slug = nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  const email = `terminal-${slug}@aforoon.app`;
  const password = randomBytes(18).toString("base64url");
  const u = await api("POST", "/auth/v1/admin/users", { email, password, email_confirm: true, user_metadata: { terminal: nombre } });
  await api("POST", "/rest/v1/terminales", { user_id: u.id, nombre }, { Prefer: "return=minimal" });
  const archivo = ".env.terminal.local";
  appendFileSync(
    archivo,
    `${existsSync(archivo) ? "\n" : ""}# Terminal "${nombre}" — cuenta del celular del guardia. Entrar en /recepcion con estos datos.\nTERMINAL_CORREO=${email}\nTERMINAL_CONTRASENA=${password}\n`,
  );
  console.log(`Terminal "${nombre}" creado con el correo ${email}.`);
  console.log(`La contraseña quedó en ${archivo} (no se sube a git). Úsala una vez en el celular del guardia.`);
} else if (cmd === "lector") {
  const nombre = (args[0] ?? "").trim();
  if (!/^[A-Za-z0-9-]{3,29}$/.test(nombre)) throw new Error("El nombre lleva de 3 a 29 letras, números o guiones: node scripts/equipo.mjs lector AforoON-Lector-01");
  const clave = await api("POST", "/rest/v1/rpc/crear_lector", { p_nombre: nombre });
  // Una línea por lector: si ya existía, se reemplaza su clave anterior.
  const archivo = ".env.lector.local";
  const variable = `LECTOR_${nombre.toUpperCase().replace(/-/g, "_")}`;
  const lineas = existsSync(archivo) ? readFileSync(archivo, "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith(`${variable}=`) && !l.startsWith(`# Lector ${nombre} `)) : [];
  lineas.push(`# Lector ${nombre} — grábala en el ESP32 por el monitor serie: CLAVE <valor>`, `${variable}=${clave}`);
  writeFileSync(archivo, lineas.join("\n") + "\n");
  console.log(`Lector "${nombre}" listo. Su clave quedó en ${archivo} (no se sube a git).`);
  console.log("Para grabarla en el ESP32, con el lector conectado por USB:");
  console.log("  cd firmware/lector-esp32 && pio device monitor");
  console.log(`  NOMBRE ${nombre}`);
  console.log(`  CLAVE <copia el valor de ${variable} desde ${archivo}>`);
  console.log("  REINICIAR");
  console.log("Si el lector ya tenía una clave anterior, deja de funcionar hasta que le grabes esta.");
} else if (cmd === "rol") {
  const [correo, rol] = args;
  if (!["vecino", "recepcion", "admin"].includes(rol)) throw new Error("El rol debe ser vecino, recepcion o admin.");
  const p = await personaPorCorreo(correo);
  await api("PATCH", `/rest/v1/personas?id=eq.${p.id}`, { rol }, { Prefer: "return=minimal" });
  console.log(`${p.nombre} ahora tiene el rol ${rol}.`);
} else if (cmd === "pin") {
  const [correo, pin] = args;
  const p = await personaPorCorreo(correo);
  await api("POST", "/rest/v1/rpc/definir_pin", { p_persona: p.id, p_pin: pin });
  console.log(`PIN de turno definido para ${p.nombre}.`);
} else if (cmd === "lista") {
  const terminales = await api("GET", "/rest/v1/terminales?select=nombre,activo,ultimo_latido&order=creado_at");
  const equipo = await api("GET", "/rest/v1/personas?rol=in.(recepcion,admin)&select=nombre,rol,pines_recepcion(persona_id)");
  const lectores = await api("GET", "/rest/v1/lectores?select=nombre,activo&order=creado_at");
  console.log("Terminales:");
  for (const t of terminales) console.log(`  ${t.nombre}${t.activo ? "" : " (desactivado)"}`);
  console.log("Lectores:");
  if (!lectores.length) console.log("  (ninguno)");
  for (const l of lectores) console.log(`  ${l.nombre}${l.activo ? "" : " (desactivado)"}`);
  console.log("Equipo:");
  for (const p of equipo) console.log(`  ${p.nombre} · ${p.rol}${p.pines_recepcion ? " · con PIN" : " · sin PIN"}`);
} else {
  console.log(`Uso:
  node scripts/equipo.mjs terminal "Recepción principal"
  node scripts/equipo.mjs rol <correo> <vecino|recepcion|admin>
  node scripts/equipo.mjs pin <correo> <PIN de 4 a 6 dígitos>
  node scripts/equipo.mjs lector AforoON-Lector-01
  node scripts/equipo.mjs lista`);
}
