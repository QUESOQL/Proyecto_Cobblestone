-- AforoON · esquema de la base de datos (Supabase / PostgreSQL 15+).
-- Replica el modelo de src/lib/data.ts y src/lib/lab.ts. Plan completo: docs/backend.md.
-- Todas las fechas y horas se interpretan en America/Santiago.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists btree_gist with schema extensions;

-- ------------------------------------------------------------------ personas

create table personas (
  id uuid primary key default gen_random_uuid(),
  -- Cuenta de Supabase Auth. Nulo en los socios de ejemplo de la demo.
  user_id uuid unique references auth.users (id) on delete set null,
  nombre text not null,
  -- El RUT completo solo cifrado; para buscar, una huella; para mostrar, una máscara.
  rut_cifrado bytea,
  rut_huella text unique,
  rut_mascara text not null,
  telefono text,
  segmento text not null check (segmento in ('Emprendimiento', 'Startup', 'Estudiante', 'Vecino/a', 'Empresa', 'Búsqueda de empleo')),
  ocupacion text not null default '',
  motivo text not null default '',
  rol text not null default 'vecino' check (rol in ('vecino', 'recepcion', 'admin')),
  verificada boolean not null default true,
  tono smallint not null default 210 check (tono between 0 and 360),
  consentimiento_at timestamptz,
  creada_at timestamptz not null default now()
);

-- ------------------------------------------------------------------ espacios y bloques

create table zonas (
  id text primary key,
  nombre text not null,
  edificio text not null,
  descripcion text not null,
  foto text not null
);

create table unidades (
  id text primary key,
  zona_id text not null references zonas (id),
  nombre text not null,
  capacidad int not null check (capacidad > 0),
  detalle text not null,
  -- Uso exclusivo: una reserva ocupa toda la unidad.
  exclusiva boolean not null
);

create table bloques (
  id text primary key,
  inicio time not null,
  fin time not null check (fin > inicio)
);

create table reservas (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references personas (id) on delete cascade,
  unidad_id text not null references unidades (id),
  dia date not null,
  bloque_id text not null references bloques (id),
  estado text not null default 'confirmada' check (estado in ('confirmada', 'completada', 'no_show', 'cancelada')),
  entrada_at timestamptz,
  salida_at timestamptz,
  metodo text check (metodo in ('nfc', 'qr')),
  creada_at timestamptz not null default now()
);
-- Una persona, una reserva vigente por bloque.
create unique index reservas_persona_bloque on reservas (persona_id, dia, bloque_id) where estado <> 'cancelada';
create index reservas_unidad_dia on reservas (unidad_id, dia, bloque_id) where estado <> 'cancelada';

-- ------------------------------------------------------------------ charlas

create table capacitadores (
  id text primary key,
  nombre text not null,
  especialidad text not null,
  bio text not null,
  tono smallint not null,
  nota numeric(2, 1) not null,
  opiniones int not null
);

create table disponibilidad_capacitador (
  capacitador_id text not null references capacitadores (id) on delete cascade,
  dia_semana smallint not null check (dia_semana between 0 and 6),
  bloque_id text not null references bloques (id),
  primary key (capacitador_id, dia_semana, bloque_id)
);

create table charlas (
  id text primary key,
  titulo text not null,
  capacitador_id text not null references capacitadores (id),
  unidad_id text not null references unidades (id),
  dia date not null,
  bloque_id text not null references bloques (id),
  capacidad int not null check (capacidad > 0),
  tema text not null,
  asistentes int,
  nota numeric(2, 1)
);

create table inscripciones_charla (
  charla_id text not null references charlas (id) on delete cascade,
  persona_id uuid not null references personas (id) on delete cascade,
  creada_at timestamptz not null default now(),
  primary key (charla_id, persona_id)
);

-- ------------------------------------------------------------------ Lab881 y cowork textil

create table espacios_lab (
  id text primary key check (id in ('lab881', 'textil')),
  nombre text not null,
  lugar text not null,
  -- Las horas para agendar cierran antes del cierre (Lab881: media hora).
  cierre_agenda_min int not null default 0,
  -- El Lab881 limita las reservas por persona al año.
  cupo_anual boolean not null
);

create table horarios_lab (
  espacio_id text not null references espacios_lab (id) on delete cascade,
  dia_semana smallint not null check (dia_semana between 0 and 6),
  abre time not null,
  cierra time not null check (cierra > abre),
  primary key (espacio_id, dia_semana)
);

create table tipos_capacitacion (
  id text primary key check (id in ('impresion3d', 'resina', 'laser', 'costura')),
  nombre text not null,
  espacio_id text not null references espacios_lab (id),
  habilita text not null,
  -- Meses de vigencia de la aprobación; nulo = no vence (por confirmar con el Hub).
  vigencia_meses int
);

create table maquinas (
  id text primary key,
  nombre text not null,
  modelo text not null,
  espacio_id text not null references espacios_lab (id),
  tipo_capacitacion text not null references tipos_capacitacion (id),
  detalle text not null,
  -- Las impresoras pueden seguir trabajando de noche; la láser y las de coser no.
  sigue_de_noche boolean not null,
  estado text not null default 'disponible' check (estado in ('disponible', 'mantencion', 'fuera_de_servicio'))
);

create table sesiones_capacitacion (
  id text primary key,
  tipo_id text not null references tipos_capacitacion (id),
  dia date not null,
  inicio time not null,
  fin time not null check (fin > inicio),
  lugar text not null,
  capacidad int not null check (capacidad > 0)
);

create table inscripciones_capacitacion (
  sesion_id text not null references sesiones_capacitacion (id) on delete cascade,
  persona_id uuid not null references personas (id) on delete cascade,
  asistio boolean not null default false,
  aprobada boolean not null default false,
  aprobada_at timestamptz,
  aprobada_por uuid references personas (id),
  vence_at timestamptz,
  creada_at timestamptz not null default now(),
  primary key (sesion_id, persona_id),
  check (not aprobada or asistio)
);

create table reservas_maquina (
  id uuid primary key default gen_random_uuid(),
  maquina_id text not null references maquinas (id),
  persona_id uuid not null references personas (id) on delete cascade,
  inicio timestamptz not null,
  horas int not null check (horas between 1 and 18),
  -- Guardado aparte para que la restricción de exclusión use una expresión inmutable.
  fin timestamptz not null,
  estado text not null default 'confirmada' check (estado in ('confirmada', 'completada', 'cancelada')),
  motivo_cancelacion text check (motivo_cancelacion in ('usuario', 'atraso', 'administracion')),
  entrada_at timestamptz,
  creada_at timestamptz not null default now(),
  check (fin = inicio + make_interval(hours => horas)),
  -- La misma máquina no puede tener dos reservas vigentes que se toquen.
  constraint reservas_maquina_sin_choque exclude using gist (maquina_id with =, tstzrange(inicio, fin) with &&) where (estado <> 'cancelada')
);
create index reservas_maquina_persona on reservas_maquina (persona_id, inicio);

-- ------------------------------------------------------------------ puerta

create table accesos (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references personas (id) on delete cascade,
  reserva_id uuid references reservas (id) on delete set null,
  reserva_maquina_id uuid references reservas_maquina (id) on delete set null,
  sentido text not null check (sentido in ('entrada', 'salida')),
  resultado text not null check (resultado in ('aprobado', 'sin_reserva', 'no_enrolado', 'excepcion', 'sin_capacitacion', 'atrasado')),
  metodo text not null check (metodo in ('nfc', 'qr', 'rut')),
  -- Segundos que tardó la validación (meta del equipo: menos de 7 s).
  latencia numeric(4, 1),
  en_cola boolean not null default false,
  registrado_por uuid references personas (id),
  ocurrido_at timestamptz not null default now()
);
create index accesos_fecha on accesos (ocurrido_at desc);
