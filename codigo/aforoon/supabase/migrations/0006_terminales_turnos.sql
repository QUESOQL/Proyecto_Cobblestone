-- AforoON · cuenta propia del celular del guardia (terminal) y PIN de turno.
-- Plan: docs/informe hardware v4, sección 9.3. El terminal tiene su propia cuenta de
-- Supabase Auth (no la de una persona): se desactiva con terminales.activo = false.
-- Cada recepcionista abre su turno en el terminal con un PIN; ese turno queda como
-- "registrado_por" en los accesos que se marquen mientras esté abierto.

create table terminales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users (id) on delete cascade,
  nombre text not null,
  activo boolean not null default true,
  -- Protección contra adivinar PIN: 5 intentos fallidos bloquean 5 minutos.
  intentos_fallidos int not null default 0,
  bloqueado_hasta timestamptz,
  ultimo_latido timestamptz,
  creado_at timestamptz not null default now()
);

-- PIN de cada recepcionista, guardado como hash bcrypt (nunca en claro).
create table pines_recepcion (
  persona_id uuid primary key references personas (id) on delete cascade,
  pin_hash text not null,
  actualizado_at timestamptz not null default now()
);

create table turnos (
  id uuid primary key default gen_random_uuid(),
  terminal_id uuid not null references terminales (id) on delete cascade,
  persona_id uuid references personas (id) on delete set null,
  inicio timestamptz not null default now(),
  fin timestamptz
);
-- Un solo turno abierto por terminal.
create unique index turnos_abierto on turnos (terminal_id) where fin is null;

alter table accesos add column terminal_id uuid references terminales (id) on delete set null;

-- ------------------------------------------------------------------ roles

/** El terminal activo de quien llama, o nulo. */
create or replace function mi_terminal() returns uuid
language sql stable security definer set search_path = public as $$
  select id from terminales where user_id = auth.uid() and activo
$$;

/** Un terminal activo actúa como recepción en todas las reglas y permisos por fila. */
create or replace function mi_rol() returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select rol from personas where user_id = auth.uid()),
    (select 'recepcion' from terminales where user_id = auth.uid() and activo),
    'anonimo'
  )
$$;

/** La llamada viene del servidor con la clave secreta (scripts de administración). */
create or replace function es_servicio() returns boolean
language sql stable as $$
  select coalesce(current_setting('request.jwt.claims', true)::json ->> 'role', '') = 'service_role'
$$;

/**
 * Quién queda como autor de un acceso: la persona de recepción que llama o, si llama un
 * terminal, la recepcionista con el turno abierto. Un terminal sin turno no registra.
 */
create or replace function quien_registra() returns uuid
language plpgsql stable security definer set search_path = public as $$
declare
  t uuid := mi_terminal();
  p uuid;
begin
  if t is null then return yo(); end if;
  select persona_id into p from turnos where terminal_id = t and fin is null;
  if not found then perform falla('sin_turno'); end if;
  return p;
end $$;

-- ------------------------------------------------------------------ PIN y turnos

/** Define el PIN (4 a 6 dígitos) de una persona de recepción o administración. */
create or replace function definir_pin(p_persona uuid, p_pin text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not (es_admin() or es_servicio()) then perform falla('sin_permiso'); end if;
  if p_pin !~ '^[0-9]{4,6}$' then perform falla('pin_invalido'); end if;
  if not exists (select 1 from personas where id = p_persona and rol in ('recepcion', 'admin')) then
    perform falla('no_es_recepcion');
  end if;
  -- Dos personas no pueden compartir PIN: el PIN es lo que identifica a quien atiende.
  if exists (select 1 from pines_recepcion where persona_id <> p_persona and pin_hash = crypt(p_pin, pin_hash)) then
    perform falla('pin_repetido');
  end if;
  insert into pines_recepcion (persona_id, pin_hash) values (p_persona, crypt(p_pin, gen_salt('bf')))
  on conflict (persona_id) do update set pin_hash = excluded.pin_hash, actualizado_at = now();
end $$;

/** El terminal abre un turno con el PIN de quien atiende. Devuelve su nombre. */
create or replace function iniciar_turno(p_pin text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare
  t terminales;
  p personas;
  tid uuid;
begin
  select * into t from terminales where user_id = auth.uid() and activo for update;
  if t.id is null then perform falla('no_es_terminal'); end if;
  if t.bloqueado_hasta is not null and t.bloqueado_hasta > now() then perform falla('pin_bloqueado'); end if;

  select pe.* into p from pines_recepcion pr join personas pe on pe.id = pr.persona_id
  where pr.pin_hash = crypt(p_pin, pr.pin_hash) and pe.rol in ('recepcion', 'admin');

  if p.id is null then
    update terminales set
      intentos_fallidos = intentos_fallidos + 1,
      bloqueado_hasta = case when intentos_fallidos + 1 >= 5 then now() + interval '5 minutes' end
    where id = t.id;
    -- Se devuelve en vez de lanzar error, para que el conteo de intentos quede guardado.
    return json_build_object('ok', false, 'error', case when t.intentos_fallidos + 1 >= 5 then 'pin_bloqueado' else 'pin_incorrecto' end);
  end if;

  update terminales set intentos_fallidos = 0, bloqueado_hasta = null, ultimo_latido = now() where id = t.id;
  update turnos set fin = now() where terminal_id = t.id and fin is null;
  insert into turnos (terminal_id, persona_id) values (t.id, p.id) returning id into tid;
  return json_build_object('ok', true, 'turno_id', tid, 'nombre', p.nombre, 'terminal', t.nombre);
end $$;

create or replace function cerrar_turno() returns void
language sql security definer set search_path = public as $$
  update turnos set fin = now() where terminal_id = mi_terminal() and fin is null
$$;

/** Estado del terminal para la pantalla: nombre y turno abierto, si lo hay. */
create or replace function mi_turno() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'terminal', t.nombre,
    'turno_id', tu.id,
    'nombre', pe.nombre,
    'inicio', tu.inicio
  )
  from terminales t
  left join turnos tu on tu.terminal_id = t.id and tu.fin is null
  left join personas pe on pe.id = tu.persona_id
  where t.user_id = auth.uid() and t.activo
$$;

-- ------------------------------------------------------------------ accesos con autor y terminal

create or replace function registrar_acceso(
  p_persona uuid,
  p_metodo text,
  p_sentido text default 'entrada',
  p_latencia numeric default null,
  p_en_cola boolean default false
) returns json
language plpgsql security definer set search_path = public as $$
declare
  per personas;
  res reservas;
  maq reservas_maquina;
  resultado text := 'aprobado';
  aid uuid;
  t timestamptz := ahora();
  autor uuid;
begin
  if not es_staff() then perform falla('sin_permiso'); end if;
  autor := quien_registra();
  select * into per from personas where id = p_persona;
  if per.id is null then perform falla('persona_inexistente'); end if;

  select r.* into res
  from reservas r join bloques b on b.id = r.bloque_id
  where r.persona_id = p_persona and r.dia = hoy() and r.estado <> 'cancelada'
    and hora_local() >= b.inicio and hora_local() < b.fin
  limit 1;

  if res.id is null and p_sentido = 'entrada' then
    select * into maq from reservas_maquina
    where persona_id = p_persona and estado = 'confirmada'
      and t >= inicio - interval '1 hour' and t < fin
    order by inicio limit 1;
  end if;

  if not per.verificada then
    resultado := 'no_enrolado';
  elsif maq.id is not null and maq.entrada_at is null and t > maq.inicio + make_interval(mins => minutos_atraso()) then
    resultado := 'atrasado';
    update reservas_maquina set estado = 'cancelada', motivo_cancelacion = 'atraso' where id = maq.id;
  elsif maq.id is not null and estado_capacitacion(p_persona, (select tipo_capacitacion from maquinas where id = maq.maquina_id)) <> 'aprobada' then
    resultado := 'sin_capacitacion';
  elsif res.id is null and maq.id is null and p_sentido = 'entrada' then
    resultado := 'sin_reserva';
  end if;

  if resultado = 'aprobado' then
    if res.id is not null then
      update reservas set
        entrada_at = case when p_sentido = 'entrada' then t else entrada_at end,
        salida_at = case when p_sentido = 'salida' then t else salida_at end,
        metodo = coalesce(metodo, p_metodo),
        estado = 'completada'
      where id = res.id;
    elsif maq.id is not null then
      update reservas_maquina set entrada_at = t where id = maq.id;
    end if;
  end if;

  insert into accesos (persona_id, reserva_id, reserva_maquina_id, sentido, resultado, metodo, latencia, en_cola, registrado_por, terminal_id, ocurrido_at)
  values (p_persona, res.id, maq.id, p_sentido, resultado, p_metodo, p_latencia, p_en_cola, autor, mi_terminal(), t)
  returning id into aid;

  return json_build_object('acceso_id', aid, 'resultado', resultado, 'reserva_id', res.id, 'reserva_maquina_id', maq.id);
end $$;

create or replace function permitir_excepcion(p_persona uuid, p_metodo text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  aid uuid;
begin
  if not es_staff() then perform falla('sin_permiso'); end if;
  insert into accesos (persona_id, sentido, resultado, metodo, registrado_por, terminal_id, ocurrido_at)
  values (p_persona, 'entrada', 'excepcion', p_metodo, quien_registra(), mi_terminal(), ahora()) returning id into aid;
  return aid;
end $$;

-- ------------------------------------------------------------------ permisos

alter table terminales enable row level security;
alter table pines_recepcion enable row level security;
alter table turnos enable row level security;
revoke insert, update, delete, truncate on terminales, pines_recepcion, turnos from anon, authenticated;
-- Los PIN no se leen nunca desde la app; los terminales y turnos, solo el equipo.
revoke select on pines_recepcion from anon, authenticated;
create policy "equipo" on terminales for select to authenticated using (es_staff());
create policy "equipo" on turnos for select to authenticated using (es_staff());

revoke all on function definir_pin(uuid, text) from public, anon;
grant execute on function definir_pin(uuid, text) to authenticated, service_role;
revoke all on function iniciar_turno(text) from public, anon;
grant execute on function iniciar_turno(text) to authenticated;
revoke all on function cerrar_turno() from public, anon;
grant execute on function cerrar_turno() to authenticated;
revoke all on function mi_turno() from public, anon;
grant execute on function mi_turno() to authenticated;
revoke all on function registrar_acceso(uuid, text, text, numeric, boolean) from public, anon;
grant execute on function registrar_acceso(uuid, text, text, numeric, boolean) to authenticated;
revoke all on function permitir_excepcion(uuid, text) from public, anon;
grant execute on function permitir_excepcion(uuid, text) to authenticated;
