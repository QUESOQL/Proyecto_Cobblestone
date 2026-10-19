/*
 * Datos de ejemplo de AforoON.
 *
 * Todo se genera de forma determinista (misma semilla → mismos datos) para que las cinco
 * pantallas cuenten la misma historia: las cifras del panel de administración, los cupos
 * de la pantalla de reserva y la fila de la recepción salen de las mismas filas.
 * Los totales nunca se escriben a mano: se calculan desde las reservas.
 *
 * Reemplazar por la API real (Fase 4 del Master Plan) antes de producción.
 */

export type ZoneId = "mesas" | "oficinas" | "salas" | "charlas";
export type BlockId = "b08" | "b10" | "b12" | "b14" | "b16" | "b18";
export type ReservationStatus = "confirmada" | "completada" | "no_show" | "cancelada";

export interface Block {
  id: BlockId;
  start: string;
  end: string;
  startMin: number;
  endMin: number;
}

export interface Zone {
  id: ZoneId;
  name: string;
  building: string;
  description: string;
  /** Foto real del Hub (repositorio del equipo, carpeta Imagenes/). */
  photo: string;
}

export interface Unit {
  id: string;
  zoneId: ZoneId;
  name: string;
  /** Personas que caben a la vez. En oficinas es 1 reserva (uso exclusivo). */
  capacity: number;
  /** Detalle visible en la ficha: tamaño, equipamiento. */
  detail: string;
  /** Uso exclusivo: una reserva ocupa toda la unidad. */
  exclusive: boolean;
}

export interface Member {
  id: string;
  name: string;
  firstName: string;
  rut: string;
  verified: boolean;
  /** Tono del avatar (0-360). Identidad, no dato. */
  hue: number;
  segment: Segment;
  /** Ocupación declarada en el enrolamiento. */
  occupation: string;
}

/** Perfiles de uso levantados en terreno (README del equipo, "Usuarios y contexto"). */
export type Segment = "Emprendimiento" | "Startup" | "Estudiante" | "Vecino/a" | "Empresa" | "Búsqueda de empleo";

export type AccessMethod = "nfc" | "qr";

export interface Reservation {
  id: string;
  memberId: string;
  unitId: string;
  day: string;
  block: BlockId;
  status: ReservationStatus;
  /** Minutos desde medianoche de la entrada, si la hubo. */
  checkInMin?: number;
  /** Minutos desde medianoche de la salida, si ya salió. */
  checkOutMin?: number;
  /** Cómo se identificó en el terminal de la puerta. */
  method?: AccessMethod;
}

export interface Trainer {
  id: string;
  name: string;
  specialty: string;
  bio: string;
  hue: number;
  rating: number;
  ratings: number;
  /** Bloques en que atiende reuniones privadas (sala de entrevistas). */
  availability: { weekday: number; block: BlockId }[];
}

export interface Talk {
  id: string;
  title: string;
  trainerId: string;
  unitId: string;
  day: string;
  block: BlockId;
  capacity: number;
  enrolledIds: string[];
  attended?: number;
  rating?: number;
  topic: string;
}

/* ------------------------------------------------------------------ reloj de la demo */

const pad = (n: number) => String(n).padStart(2, "0");

/** La demo corre siempre a las 10:24 del día de hoy: bloque 10:00–12:00 en curso. */
export const NOW_MIN = 10 * 60 + 24;

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function dayKey(offset: number): string {
  const d = startOfToday();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const TODAY = dayKey(0);

export function dayOffset(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  const target = new Date(y, m - 1, d).getTime();
  return Math.round((target - startOfToday().getTime()) / 86_400_000);
}

export function weekdayOf(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const WEEKDAYS_SHORT = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];

export function formatDay(day: string, style: "long" | "short" | "relative" = "relative"): string {
  const off = dayOffset(day);
  const [, m, d] = day.split("-").map(Number);
  const wd = weekdayOf(day);
  if (style === "relative") {
    if (off === 0) return "Hoy";
    if (off === 1) return "Mañana";
    if (off === -1) return "Ayer";
  }
  if (style === "short") return `${WEEKDAYS_SHORT[wd]} ${d}`;
  return `${WEEKDAYS[wd][0].toUpperCase()}${WEEKDAYS[wd].slice(1)} ${d} de ${MONTHS[m - 1]}`;
}

export function formatMin(min: number): string {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

/* ------------------------------------------------------------------ catálogo del hub */

export const BLOCKS: Block[] = [
  { id: "b08", start: "08:00", end: "10:00", startMin: 480, endMin: 600 },
  { id: "b10", start: "10:00", end: "12:00", startMin: 600, endMin: 720 },
  { id: "b12", start: "12:00", end: "14:00", startMin: 720, endMin: 840 },
  { id: "b14", start: "14:00", end: "16:00", startMin: 840, endMin: 960 },
  { id: "b16", start: "16:00", end: "18:00", startMin: 960, endMin: 1080 },
  { id: "b18", start: "18:00", end: "20:00", startMin: 1080, endMin: 1200 },
];

export const blockById = (id: BlockId) => BLOCKS.find((b) => b.id === id)!;
export const blockLabel = (id: BlockId) => {
  const b = blockById(id);
  return `${b.start}–${b.end}`;
};

export const CURRENT_BLOCK: BlockId = BLOCKS.find((b) => NOW_MIN >= b.startMin && NOW_MIN < b.endMin)!.id;

/** Hub Providencia: Edificio Cowork (Los Jesuitas 881) y Edificio Empleo. */
export const HUB = {
  name: "Hub Providencia",
  address: "Los Jesuitas 881, Providencia",
  buildings: ["Edificio Cowork", "Edificio Empleo"] as const,
};

export const ZONES: Zone[] = [
  {
    id: "mesas",
    name: "Centro de mesas",
    building: "Edificio Cowork · piso 1",
    description: "Mesas compartidas con enchufe y wifi. El puesto no se asigna: llegas y te sientas.",
    photo: "/hub/cowork.jpg",
  },
  {
    id: "oficinas",
    name: "Oficinas y set",
    building: "Edificio Cowork · piso 1",
    description: "Cuatro oficinas cerradas y el set audiovisual, de uso exclusivo por bloque.",
    photo: "/hub/oficina.jpg",
  },
  {
    id: "salas",
    name: "Edificio Empleo",
    building: "Departamento de Empleo",
    description: "Salas de capacitación y sala de entrevistas con capacitadores.",
    photo: "/hub/empleo.jpg",
  },
  {
    id: "charlas",
    name: "Zona de charlas",
    building: "Edificio Cowork · piso 1",
    description: "El cupo se toma al inscribirse en una charla.",
    photo: "/hub/charlas.jpg",
  },
];

export const zoneById = (id: ZoneId) => ZONES.find((z) => z.id === id)!;

export const UNITS: Unit[] = [
  { id: "mesas", zoneId: "mesas", name: "Mesas compartidas", capacity: 40, detail: "40 puestos · wifi · enchufe", exclusive: false },
  { id: "of-1", zoneId: "oficinas", name: "Oficina 1", capacity: 1, detail: "Mesa redonda · hasta 4 personas", exclusive: true },
  { id: "of-2", zoneId: "oficinas", name: "Oficina 2", capacity: 1, detail: "Hasta 4 personas · pizarra", exclusive: true },
  { id: "of-3", zoneId: "oficinas", name: "Oficina 3", capacity: 1, detail: "Hasta 6 personas · escritorio largo", exclusive: true },
  { id: "of-4", zoneId: "oficinas", name: "Oficina 4", capacity: 1, detail: "Hasta 6 personas · pantalla", exclusive: true },
  { id: "set", zoneId: "oficinas", name: "Set audiovisual", capacity: 1, detail: "Podcast y video · luces y sillones", exclusive: true },
  { id: "sala-1", zoneId: "salas", name: "Sala de capacitación piso 1", capacity: 12, detail: "12 personas · proyector", exclusive: false },
  { id: "sala-2", zoneId: "salas", name: "Sala de capacitación piso 2", capacity: 12, detail: "12 personas · computadores", exclusive: false },
  { id: "entrevistas", zoneId: "salas", name: "Sala de entrevistas", capacity: 1, detail: "Reunión privada con un capacitador", exclusive: true },
  { id: "charlas", zoneId: "charlas", name: "Zona de charlas", capacity: 60, detail: "60 sillas · pantallas", exclusive: false },
];

export const unitById = (id: string) => UNITS.find((u) => u.id === id)!;
export const unitsOfZone = (zone: ZoneId) => UNITS.filter((u) => u.zoneId === zone);

/** Domingo cerrado; sábado solo hasta las 14:00. */
export function isOpen(day: string, block: BlockId): boolean {
  const wd = weekdayOf(day);
  if (wd === 0) return false;
  if (wd === 6) return blockById(block).startMin < 840;
  return true;
}

/* ------------------------------------------------------------------ utilidades */

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Barajado Fisher-Yates determinista: igual en el servidor y en cualquier navegador. */
function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Dígito verificador de un RUT chileno (módulo 11). */
export function rutDv(body: number): string {
  let sum = 0;
  let mul = 2;
  let n = body;
  while (n > 0) {
    sum += (n % 10) * mul;
    n = Math.floor(n / 10);
    mul = mul === 7 ? 2 : mul + 1;
  }
  const r = 11 - (sum % 11);
  return r === 11 ? "0" : r === 10 ? "K" : String(r);
}

export function formatRut(body: number): string {
  return `${body.toLocaleString("es-CL")}-${rutDv(body)}`;
}

/** En la recepción el RUT se muestra enmascarado: 17.482.***-6 (Ley 21.719, minimización). */
export function maskRut(rut: string): string {
  const [body, dv] = rut.split("-");
  const parts = body.split(".");
  if (parts.length < 2) return rut;
  parts[parts.length - 1] = "***";
  return `${parts.join(".")}-${dv}`;
}

/* ------------------------------------------------------------------ socios */

const FIRST = [
  "Valentina", "Martina", "Catalina", "Josefa", "Antonia", "Fernanda", "Camila", "Isidora", "Florencia", "Javiera",
  "Constanza", "Francisca", "Daniela", "Ignacia", "Trinidad", "Paula", "Macarena", "Carolina", "Bárbara", "Rocío",
  "Benjamín", "Matías", "Vicente", "Agustín", "Tomás", "Joaquín", "Maximiliano", "Cristóbal", "Felipe", "Sebastián",
  "Diego", "Nicolás", "Ignacio", "Gonzalo", "Rodrigo", "Andrés", "Martín", "Lucas", "Bastián", "Esteban",
];
const LAST = [
  "González", "Muñoz", "Rojas", "Díaz", "Pérez", "Soto", "Contreras", "Silva", "Martínez", "Sepúlveda",
  "Morales", "Rodríguez", "López", "Fuentes", "Hernández", "Torres", "Araya", "Flores", "Espinoza", "Valenzuela",
  "Castillo", "Tapia", "Reyes", "Gutiérrez", "Castro", "Pizarro", "Álvarez", "Vásquez", "Sánchez", "Fernández",
  "Ramírez", "Carrasco", "Gómez", "Cortés", "Herrera", "Núñez", "Jara", "Vergara", "Rivera", "Figueroa",
];
/** Peso de cada perfil en la población de socios. */
export const SEGMENTS: { id: Segment; weight: number; occupations: string[] }[] = [
  { id: "Emprendimiento", weight: 0.27, occupations: ["Emprendedora", "Emprendedor", "Diseñadora independiente", "Fotógrafo"] },
  { id: "Búsqueda de empleo", weight: 0.21, occupations: ["Administrativa", "Técnico en electricidad", "Vendedora", "Contador"] },
  { id: "Estudiante", weight: 0.17, occupations: ["Estudiante de ingeniería", "Estudiante de diseño", "Estudiante de psicología"] },
  { id: "Startup", weight: 0.13, occupations: ["Fundadora", "Desarrollador", "Product manager"] },
  { id: "Vecino/a", weight: 0.12, occupations: ["Jubilada", "Profesor", "Dueña de casa"] },
  { id: "Empresa", weight: 0.1, occupations: ["Ejecutiva de ventas", "Analista", "Consultor"] },
];

function pickSegment(r: number) {
  let acc = 0;
  for (const s of SEGMENTS) {
    acc += s.weight;
    if (r < acc) return s;
  }
  return SEGMENTS[SEGMENTS.length - 1];
}

function buildMembers(): Member[] {
  const rnd = mulberry32(19_628);
  const seen = new Set<string>();
  const out: Member[] = [];
  while (out.length < 286) {
    const first = FIRST[Math.floor(rnd() * FIRST.length)];
    const last1 = LAST[Math.floor(rnd() * LAST.length)];
    const last2 = LAST[Math.floor(rnd() * LAST.length)];
    const name = `${first} ${last1} ${last2}`;
    if (seen.has(name) || last1 === last2) continue;
    seen.add(name);
    const body = 12_000_000 + Math.floor(rnd() * 13_000_000);
    const seg = pickSegment(rnd());
    out.push({
      id: `s${String(out.length + 1).padStart(3, "0")}`,
      name,
      firstName: first,
      rut: formatRut(body),
      // Alrededor de 1 de cada 25 socios aún no termina su enrolamiento.
      verified: rnd() > 0.04,
      hue: Math.floor(rnd() * 360),
      segment: seg.id,
      occupation: seg.occupations[Math.floor(rnd() * seg.occupations.length)],
    });
  }
  return out;
}

export const MEMBERS: Member[] = buildMembers();
export const memberById = (id: string) => MEMBERS.find((m) => m.id === id);

/* ------------------------------------------------------------------ reservas */

/** Perfil de ocupación por bloque en un día hábil (fracción del aforo). */
const PROFILE: Record<ZoneId, number[]> = {
  mesas: [0.38, 1, 1, 0.8, 0.58, 0.25],
  oficinas: [0.5, 0.75, 0.75, 0.75, 0.5, 0.25],
  salas: [0.25, 0.67, 0.5, 0.58, 0.42, 0.17],
  charlas: [0, 0, 0, 0, 0, 0],
};

function targetCount(unit: Unit, day: string, block: BlockId, rnd: () => number): number {
  if (!isOpen(day, block) || unit.id === "charlas") return 0;
  const bi = BLOCKS.findIndex((b) => b.id === block);
  const wd = weekdayOf(day);
  const weekendFactor = wd === 6 ? 0.45 : wd === 5 ? 0.85 : 1;
  const off = dayOffset(day);
  // Más adelante en la semana hay menos reservas hechas todavía.
  const horizon = off > 0 ? Math.max(0.35, 1 - off * 0.11) : 1;
  const base = PROFILE[unit.zoneId][bi] * weekendFactor * horizon;
  if (unit.id === "entrevistas") return rnd() < 0.35 * horizon ? 1 : 0;
  if (unit.exclusive) return rnd() < base ? 1 : 0;
  const jitter = 0.9 + rnd() * 0.2;
  // Hoy, de 10:00 a 14:00, el centro de mesas está lleno: es el hallazgo del día.
  if (unit.id === "mesas" && off === 0 && (block === "b10" || block === "b12")) return unit.capacity;
  return Math.min(unit.capacity, Math.round(unit.capacity * base * jitter));
}

function buildReservations(): Reservation[] {
  const rnd = mulberry32(21_719);
  const out: Reservation[] = [];
  let seq = 0;
  for (let off = -6; off <= 6; off++) {
    const day = dayKey(off);
    for (const block of BLOCKS) {
      // Cada socio tiene a lo más una reserva por bloque: se barajan y se reparten.
      const pool = shuffle(MEMBERS, rnd);
      let p = 0;
      for (const unit of UNITS) {
        const n = targetCount(unit, day, block.id, rnd);
        for (let i = 0; i < n; i++) {
          const member = pool[p++];
          const past = off < 0 || (off === 0 && block.endMin <= NOW_MIN);
          const current = off === 0 && block.id === CURRENT_BLOCK;
          let status: ReservationStatus = "confirmada";
          let checkInMin: number | undefined;
          let checkOutMin: number | undefined;
          // Dos de cada tres usan la credencial NFC del teléfono; el resto, el QR dinámico.
          const method: AccessMethod = rnd() < 0.66 ? "nfc" : "qr";
          if (past) {
            if (rnd() < 0.11) status = "no_show";
            else {
              status = "completada";
              checkInMin = block.startMin + Math.floor(rnd() * 38);
              checkOutMin = Math.min(block.endMin + 10, block.endMin - 25 + Math.floor(rnd() * 35));
            }
          } else if (current) {
            // Van 24 minutos del bloque: tres de cada cuatro ya entraron.
            if (rnd() < 0.75 && member.verified) {
              status = "completada";
              checkInMin = block.startMin + Math.floor(rnd() * (NOW_MIN - block.startMin));
            }
          } else if (rnd() < 0.03) {
            status = "cancelada";
          }
          out.push({
            id: `r${++seq}`,
            memberId: member.id,
            unitId: unit.id,
            day,
            block: block.id,
            status,
            checkInMin,
            checkOutMin,
            method: checkInMin !== undefined ? method : undefined,
          });
        }
      }
    }
  }
  return out;
}

export const BASE_RESERVATIONS: Reservation[] = buildReservations();

/* ------------------------------------------------------------------ capacitadores y charlas */

export const TRAINERS: Trainer[] = [
  {
    id: "t1",
    name: "Paula Henríquez",
    specialty: "Empleabilidad y entrevistas",
    bio: "Psicóloga laboral. Prepara a personas que vuelven a buscar trabajo después de un tiempo fuera.",
    hue: 12,
    rating: 4.8,
    ratings: 64,
    availability: [
      { weekday: 2, block: "b14" },
      { weekday: 4, block: "b14" },
      { weekday: 4, block: "b16" },
    ],
  },
  {
    id: "t2",
    name: "Rodrigo Aravena",
    specialty: "Finanzas para independientes",
    bio: "Contador auditor. Boletas de honorarios, operación renta y orden de cuentas para freelancers.",
    hue: 205,
    rating: 4.6,
    ratings: 41,
    availability: [
      { weekday: 1, block: "b16" },
      { weekday: 3, block: "b10" },
    ],
  },
  {
    id: "t3",
    name: "Javiera Soto",
    specialty: "Herramientas digitales",
    bio: "Diseñadora de producto. Enseña a emprendedores a usar IA y automatizaciones sin programar.",
    hue: 150,
    rating: 4.9,
    ratings: 27,
    availability: [
      { weekday: 3, block: "b16" },
      { weekday: 5, block: "b10" },
    ],
  },
  {
    id: "t4",
    name: "Tomás Lagos",
    specialty: "Marca personal",
    bio: "Periodista. Ayuda a ordenar el relato profesional en LinkedIn y en un portafolio simple.",
    hue: 275,
    rating: 4.4,
    ratings: 19,
    availability: [{ weekday: 5, block: "b14" }],
  },
];

export const trainerById = (id: string) => TRAINERS.find((t) => t.id === id)!;

/** Próximo día (desde hoy, hasta 6 días) que cae en ese día de la semana. */
function nextWeekday(wd: number, from = 0): string {
  for (let off = from; off < from + 7; off++) {
    if (weekdayOf(dayKey(off)) === wd) return dayKey(off);
  }
  return dayKey(from);
}

function pickEnrolled(n: number, seed: number): string[] {
  const rnd = mulberry32(seed);
  return shuffle(MEMBERS, rnd).slice(0, n).map((m) => m.id);
}

export const TALKS: Talk[] = [
  {
    id: "c1",
    title: "Cómo armar tu CV para postular en línea",
    trainerId: "t1",
    unitId: "charlas",
    day: TODAY,
    block: "b16",
    capacity: 60,
    enrolledIds: pickEnrolled(48, 1),
    topic: "Empleo",
  },
  {
    id: "c2",
    title: "Boletas de honorarios sin enredos",
    trainerId: "t2",
    unitId: "charlas",
    day: dayKey(1),
    block: "b10",
    capacity: 60,
    enrolledIds: pickEnrolled(60, 2),
    topic: "Finanzas",
  },
  {
    id: "c3",
    title: "Primeros pasos con IA en tu emprendimiento",
    trainerId: "t3",
    unitId: "charlas",
    day: dayKey(2),
    block: "b18",
    capacity: 60,
    enrolledIds: pickEnrolled(31, 3),
    topic: "Digital",
  },
  {
    id: "c4",
    title: "Entrevistas laborales: práctica guiada",
    trainerId: "t1",
    unitId: "sala-1",
    day: nextWeekday(4, 1),
    block: "b10",
    capacity: 12,
    enrolledIds: pickEnrolled(9, 4),
    topic: "Empleo",
  },
  {
    id: "c5",
    title: "Tu perfil de LinkedIn en una tarde",
    trainerId: "t4",
    unitId: "charlas",
    day: nextWeekday(5, 1),
    block: "b16",
    capacity: 60,
    enrolledIds: pickEnrolled(22, 5),
    topic: "Marca personal",
  },
  // Charlas ya dictadas (para el panel de administración).
  {
    id: "p1",
    title: "Operación renta para independientes",
    trainerId: "t2",
    unitId: "charlas",
    day: dayKey(-3),
    block: "b18",
    capacity: 60,
    enrolledIds: pickEnrolled(57, 11),
    attended: 49,
    rating: 4.7,
    topic: "Finanzas",
  },
  {
    id: "p2",
    title: "Automatiza tus correos con IA",
    trainerId: "t3",
    unitId: "charlas",
    day: dayKey(-4),
    block: "b16",
    capacity: 60,
    enrolledIds: pickEnrolled(38, 12),
    attended: 27,
    rating: 4.9,
    topic: "Digital",
  },
  {
    id: "p3",
    title: "Volver a trabajar después de una pausa",
    trainerId: "t1",
    unitId: "sala-2",
    day: dayKey(-5),
    block: "b10",
    capacity: 12,
    enrolledIds: pickEnrolled(12, 13),
    attended: 11,
    rating: 4.8,
    topic: "Empleo",
  },
];

export const talkById = (id: string) => TALKS.find((t) => t.id === id)!;

/* ------------------------------------------------------------------ comprobaciones */

if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  // Ningún socio con dos reservas en el mismo bloque.
  const keys = new Set<string>();
  for (const r of BASE_RESERVATIONS) {
    const k = `${r.memberId}|${r.day}|${r.block}`;
    console.assert(!keys.has(k), `Reserva duplicada ${k}`);
    keys.add(k);
  }
  // Ninguna unidad sobre su aforo.
  const counts = new Map<string, number>();
  for (const r of BASE_RESERVATIONS) {
    if (r.status === "cancelada") continue;
    const k = `${r.unitId}|${r.day}|${r.block}`;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  for (const [k, n] of counts) console.assert(n <= unitById(k.split("|")[0]).capacity, `Sobreventa en ${k}`);
  for (const t of TALKS) console.assert(t.enrolledIds.length <= t.capacity, `Charla ${t.id} sobre su aforo`);
}
