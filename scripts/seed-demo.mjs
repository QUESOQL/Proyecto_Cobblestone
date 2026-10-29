// Carga los datos de ejemplo de AforoON en Supabase.
//
//   node scripts/seed-demo.mjs          (carga)
//   node scripts/seed-demo.mjs --dry    (solo arma las filas, sin escribir)
//
// Usa los mismos generadores que la app (src/lib/data.ts y src/lib/lab.ts), así la base
// cuenta la misma historia que el prototipo. Las fechas son relativas al día en que se
// corre: se puede volver a correr para "mover" la demo a hoy.
//
// Necesita en .env.local: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (la clave
// secreta salta los permisos por fila; nunca va al navegador).
//
// Solo reemplaza a los socios de ejemplo (personas sin cuenta) y su actividad; las
// personas con cuenta real y sus reservas no se tocan. El catálogo se actualiza en su lugar.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

/* ------------------------------------------------------------------ configuración */

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");

/* ------------------------------------------------------------------ generadores de la app */

// Compila data.ts y lab.ts a una carpeta temporal para usarlos desde Node.
const out = mkdtempSync(join(tmpdir(), "aforoon-seed-"));
execFileSync(
  process.execPath,
  ["node_modules/typescript/bin/tsc", "src/lib/data.ts", "src/lib/lab.ts", "--outDir", out, "--module", "commonjs", "--target", "es2022", "--skipLibCheck"],
  { stdio: "inherit" },
);
const require = createRequire(import.meta.url);
const data = require(join(out, "data.js"));
const lab = require(join(out, "lab.js"));
rmSync(out, { recursive: true, force: true });

/* ------------------------------------------------------------------ ayudas */

/** UUID estable a partir de un id de la demo, para que correr el script dos veces dé lo mismo. */
function uuidFrom(seed) {
  const h = createHash("sha256").update(`aforoon:${seed}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

const pad = (n) => String(n).padStart(2, "0");
const time = (min) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;

/** Día (YYYY-MM-DD) + minutos en hora de Santiago → instante ISO con su desfase. */
function santiagoISO(day, min) {
  const [y, m, d] = day.split("-").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, Math.floor(min / 60), min % 60));
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: "America/Santiago", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      .formatToParts(guess)
      .map((p) => [p.type, p.value]),
  );
  const asLocal = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
  return new Date(guess.getTime() - (asLocal - guess.getTime())).toISOString();
}

/** Con --dry solo arma las filas y cuenta, sin escribir en Supabase. */
const DRY = process.argv.includes("--dry");

async function api(method, path, body, prefer) {
  if (DRY) return;
  const res = await fetch(`${URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`);
}

/** Inserta en tandas; con `upsert` actualiza las filas que ya existen. */
async function insert(table, rows, { upsert = false } = {}) {
  for (let i = 0; i < rows.length; i += 500) {
    await api("POST", table, rows.slice(i, i + 500), upsert ? "resolution=merge-duplicates,return=minimal" : "return=minimal");
  }
  console.log(`  ${table}: ${rows.length}`);
}

/* ------------------------------------------------------------------ catálogo */

const memberUuid = (id) => uuidFrom(`socio:${id}`);

console.log("Catálogo");
await insert("zonas", data.ZONES.map((z) => ({ id: z.id, nombre: z.name, edificio: z.building, descripcion: z.description, foto: z.photo })), { upsert: true });
await insert("bloques", data.BLOCKS.map((b) => ({ id: b.id, inicio: b.start, fin: b.end })), { upsert: true });
await insert(
  "unidades",
  data.UNITS.map((u) => ({ id: u.id, zona_id: u.zoneId, nombre: u.name, capacidad: u.capacity, detalle: u.detail, exclusiva: u.exclusive })),
  { upsert: true },
);
await insert(
  "capacitadores",
  data.TRAINERS.map((t) => ({ id: t.id, nombre: t.name, especialidad: t.specialty, bio: t.bio, tono: t.hue, nota: t.rating, opiniones: t.ratings })),
  { upsert: true },
);
await insert(
  "disponibilidad_capacitador",
  data.TRAINERS.flatMap((t) => t.availability.map((a) => ({ capacitador_id: t.id, dia_semana: a.weekday, bloque_id: a.block }))),
  { upsert: true },
);
await insert(
  "espacios_lab",
  Object.values(lab.SPACES).map((s) => ({ id: s.id, nombre: s.name, lugar: s.place, cierre_agenda_min: s.lastStartBeforeClose, cupo_anual: s.yearlyQuota })),
  { upsert: true },
);
await insert(
  "horarios_lab",
  Object.values(lab.SPACES).flatMap((s) => Object.entries(s.hours).map(([wd, h]) => ({ espacio_id: s.id, dia_semana: Number(wd), abre: time(h.open), cierra: time(h.close) }))),
  { upsert: true },
);
await insert(
  "tipos_capacitacion",
  lab.TRAINING_KINDS.map((k) => ({ id: k.id, nombre: k.name, espacio_id: k.space, habilita: k.unlocks })),
  { upsert: true },
);
await insert(
  "maquinas",
  lab.MACHINES.map((m) => ({
    id: m.id,
    nombre: m.name,
    modelo: m.model,
    espacio_id: m.space,
    tipo_capacitacion: m.training,
    detalle: m.detail,
    sigue_de_noche: m.runsOvernight,
  })),
  { upsert: true },
);

/* ------------------------------------------------------------------ socios de ejemplo */

console.log("Socios de ejemplo (se reemplazan)");
// Borrar a los socios sin cuenta arrastra sus reservas, inscripciones y accesos (on delete cascade).
await api("DELETE", "personas?user_id=is.null", null, "return=minimal");
await insert(
  "personas",
  data.MEMBERS.map((m) => ({
    id: memberUuid(m.id),
    nombre: m.name,
    rut_mascara: data.maskRut(m.rut),
    segmento: m.segment,
    ocupacion: m.occupation,
    verificada: m.verified,
    tono: m.hue,
  })),
);

await insert(
  "reservas",
  data.BASE_RESERVATIONS.map((r) => ({
    id: uuidFrom(`reserva:${r.id}`),
    persona_id: memberUuid(r.memberId),
    unidad_id: r.unitId,
    dia: r.day,
    bloque_id: r.block,
    estado: r.status,
    entrada_at: r.checkInMin !== undefined ? santiagoISO(r.day, r.checkInMin) : null,
    salida_at: r.checkOutMin !== undefined ? santiagoISO(r.day, r.checkOutMin) : null,
    metodo: r.method ?? null,
  })),
);

// Charlas y sesiones: se actualizan en su lugar (sus fechas se mueven a la semana actual).
await insert(
  "charlas",
  data.TALKS.map((t) => ({
    id: t.id,
    titulo: t.title,
    capacitador_id: t.trainerId,
    unidad_id: t.unitId,
    dia: t.day,
    bloque_id: t.block,
    capacidad: t.capacity,
    tema: t.topic,
    asistentes: t.attended ?? null,
    nota: t.rating ?? null,
  })),
  { upsert: true },
);
await insert("inscripciones_charla", data.TALKS.flatMap((t) => t.enrolledIds.map((id) => ({ charla_id: t.id, persona_id: memberUuid(id) }))));

await insert(
  "sesiones_capacitacion",
  lab.TRAINING_SESSIONS.map((s) => ({ id: s.id, tipo_id: s.kind, dia: s.day, inicio: time(s.startMin), fin: time(s.endMin), lugar: s.place, capacidad: s.capacity })),
  { upsert: true },
);
await insert(
  "inscripciones_capacitacion",
  lab.TRAINING_SESSIONS.flatMap((s) => s.enrolledIds.map((id) => ({ sesion_id: s.id, persona_id: memberUuid(id) }))),
);

await insert(
  "reservas_maquina",
  lab.BASE_MACHINE_BOOKINGS.map((b) => {
    const inicio = santiagoISO(b.day, b.startMin);
    return {
      id: uuidFrom(`maquina:${b.id}`),
      maquina_id: b.machineId,
      persona_id: memberUuid(b.memberId),
      inicio,
      horas: b.hours,
      fin: new Date(new Date(inicio).getTime() + b.hours * 3_600_000).toISOString(),
    };
  }),
);

console.log("Listo.");
