-- AforoON · QR firmado AF2 (fase 3).
-- Plan: informe de hardware v4, sección 4.1. El teléfono del socio crea un par de claves
-- ECDSA P-256 cuya clave privada no sale nunca del navegador; aquí solo se guarda la
-- pública. El QR dice AF2.<cid>.<t>.<firma>, cambia cada 30 s y sirve una sola vez.
--
-- Quién verifica la firma: el celular del guardia, con la clave pública (Postgres no
-- verifica ECDSA). Es la misma confianza que ya tiene el terminal, que puede registrar a
-- cualquier persona por RUT; y es lo que necesitará la fase 6 para validar sin internet.
-- Lo que no puede hacer el terminal solo queda aquí, en una sola transacción: que la
-- credencial esté activa, que el código sea de este minuto y que no se haya usado antes.

create table credenciales (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references personas (id) on delete cascade,
  tipo text not null check (tipo in ('qr_clave', 'nfc_tarjeta')),
  -- cid del QR: 10 caracteres base32 al azar (no se deriva del RUT ni del id).
  codigo text unique,
  -- Clave pública JWK (solo kty, crv, x, y).
  clave_publica jsonb,
  -- Fase 5: huella HMAC del UID de la tarjeta.
  huella_uid text unique,
  -- Último periodo de 30 s usado: un QR no se acepta dos veces.
  ultimo_t bigint not null default 0,
  ultimo_uso_at timestamptz,
  dispositivo text,
  estado text not null default 'activa' check (estado in ('activa', 'revocada')),
  alta_at timestamptz not null default now(),
  baja_at timestamptz
);
create index credenciales_activas on credenciales (persona_id) where estado = 'activa';

-- Nadie lee ni escribe la tabla directo: solo las funciones de abajo.
alter table credenciales enable row level security;
revoke all on credenciales from anon, authenticated;

alter table accesos add column if not exists credencial_id uuid references credenciales (id) on delete set null;

-- ------------------------------------------------------------------ auxiliares

/** Periodo de 30 s del QR según el reloj real (el reloj de la demo no corre). */
create or replace function periodo_qr() returns bigint
language sql volatile as $$
  select floor(extract(epoch from clock_timestamp()) / 30)::bigint
$$;

/** Texto base32 (A-Z, 2-7) al azar. */
create or replace function base32_aleatorio(n int) returns text
language sql volatile set search_path = public, extensions as $$
  select string_agg(substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ234567', get_byte(b, i) % 32 + 1, 1), '' order by i)
  from gen_random_bytes(n) as b, generate_series(0, n - 1) as i
$$;

-- ------------------------------------------------------------------ teléfono del socio

/**
 * Registra la clave pública del teléfono y devuelve su cid. Cada persona puede tener dos
 * teléfonos activos: al tercero se revoca el más antiguo.
 */
create or replace function enrolar_credencial_qr(p_clave_publica jsonb, p_dispositivo text) returns json
language plpgsql security definer set search_path = public as $$
declare
  per uuid := yo();
  cid text;
begin
  if per is null then perform falla('sin_persona'); end if;
  if p_clave_publica ->> 'kty' is distinct from 'EC' or p_clave_publica ->> 'crv' is distinct from 'P-256'
    or coalesce(length(p_clave_publica ->> 'x'), 0) <> 43 or coalesce(length(p_clave_publica ->> 'y'), 0) <> 43
    or p_clave_publica ? 'd' then
    perform falla('clave_invalida');
  end if;

  update credenciales set estado = 'revocada', baja_at = now()
  where id in (
    select id from credenciales
    where persona_id = per and tipo = 'qr_clave' and estado = 'activa'
    order by alta_at desc offset 1
  );

  cid := base32_aleatorio(10);
  insert into credenciales (persona_id, tipo, codigo, clave_publica, dispositivo)
  values (
    per, 'qr_clave', cid,
    jsonb_build_object('kty', 'EC', 'crv', 'P-256', 'x', p_clave_publica ->> 'x', 'y', p_clave_publica ->> 'y'),
    left(p_dispositivo, 120)
  );
  return json_build_object('cid', cid);
end $$;

/**
 * Al abrir la credencial: la hora del servidor (para corregir el reloj del teléfono) y si
 * el cid guardado en el teléfono sigue activo y es de esta persona.
 */
create or replace function estado_credencial_qr(p_cid text) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'hora', floor(extract(epoch from clock_timestamp()) * 1000)::bigint,
    'activa', exists (
      select 1 from credenciales
      where codigo = p_cid and tipo = 'qr_clave' and estado = 'activa' and persona_id = yo()
    )
  )
$$;

-- ------------------------------------------------------------------ celular del guardia

/** Clave pública de un cid activo, para que el terminal verifique la firma. */
create or replace function clave_qr(p_cid text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  c credenciales;
begin
  if not es_staff() then perform falla('sin_permiso'); end if;
  select * into c from credenciales where codigo = p_cid and tipo = 'qr_clave';
  if c.id is null then perform falla('qr_desconocido'); end if;
  if c.estado <> 'activa' then perform falla('qr_revocado'); end if;
  return c.clave_publica;
end $$;

/**
 * Registra el acceso de un QR cuya firma ya verificó el terminal. En la misma transacción:
 * credencial activa, periodo dentro de ±30 s del reloj del servidor y un solo uso. Si el
 * registro falla (por ejemplo, sin turno), el periodo no queda gastado.
 * Devuelve lo mismo que vista_acceso().
 */
create or replace function acceso_qr(p_cid text, p_t bigint, p_sentido text default 'entrada', p_latencia numeric default null) returns json
language plpgsql security definer set search_path = public as $$
declare
  c credenciales;
  r json;
  aid uuid;
begin
  if not es_staff() then perform falla('sin_permiso'); end if;
  select * into c from credenciales where codigo = p_cid and tipo = 'qr_clave';
  if c.id is null then perform falla('qr_desconocido'); end if;
  if c.estado <> 'activa' then perform falla('qr_revocado'); end if;
  if abs(periodo_qr() - p_t) > 1 then perform falla('qr_vencido'); end if;

  update credenciales set ultimo_t = p_t, ultimo_uso_at = now() where id = c.id and ultimo_t < p_t;
  if not found then perform falla('qr_reutilizado'); end if;

  r := registrar_acceso(c.persona_id, 'qr', p_sentido, p_latencia);
  aid := (r ->> 'acceso_id')::uuid;
  update accesos set credencial_id = c.id where id = aid;
  return vista_acceso(aid);
end $$;

-- ------------------------------------------------------------------ permisos

revoke all on function periodo_qr() from public, anon, authenticated;
revoke all on function base32_aleatorio(int) from public, anon, authenticated;
revoke all on function enrolar_credencial_qr(jsonb, text) from public, anon;
grant execute on function enrolar_credencial_qr(jsonb, text) to authenticated;
revoke all on function estado_credencial_qr(text) from public, anon;
grant execute on function estado_credencial_qr(text) to authenticated;
revoke all on function clave_qr(text) from public, anon;
grant execute on function clave_qr(text) to authenticated;
revoke all on function acceso_qr(text, bigint, text, numeric) from public, anon;
grant execute on function acceso_qr(text, bigint, text, numeric) to authenticated;
