-- AforoON · reglas de negocio como funciones.
-- Toda escritura pasa por aquí: cada función revisa quién llama (auth.uid()), aplica la
-- regla con bloqueo de fila cuando hay cupos en juego y, si algo no se cumple, lanza un
-- error cuyo mensaje es un código que la app ya sabe mostrar (ver RESERVE_ERRORS y
-- MACHINE_ERRORS en src/lib/store.ts).

-- ------------------------------------------------------------------ constantes y ayudas

create or replace function falla(codigo text) returns void
language plpgsql as $$
begin
  raise exception using errcode = 'P0001', message = codigo;
end $$;

create or replace function hoy() returns date
language sql stable as $$ select (now() at time zone 'America/Santiago')::date $$;

create or replace function hora_local() returns time
language sql stable as $$ select (now() at time zone 'America/Santiago')::time $$;

/** Fecha y hora de Santiago → instante. */
create or replace function en_santiago(d date, t time) returns timestamptz
language sql stable as $$ select (d + t) at time zone 'America/Santiago' $$;

create or replace function ventana_dias() returns int language sql immutable as $$ select 7 $$;
create or replace function max_reservas_activas() returns int language sql immutable as $$ select 3 $$;
create or replace function minutos_atraso() returns int language sql immutable as $$ select 20 $$;

/** La persona que llama, o nulo si aún no completa su registro. */
create or replace function yo() returns uuid
language sql stable security definer set search_path = public as $$
  select id from personas where user_id = auth.uid()
$$;

create or replace function mi_rol() returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select rol from personas where user_id = auth.uid()), 'anonimo')
$$;

create or replace function es_staff() returns boolean language sql stable as $$ select mi_rol() in ('recepcion', 'admin') $$;
create or replace function es_admin() returns boolean language sql stable as $$ select mi_rol() = 'admin' $$;

-- ------------------------------------------------------------------ RUT

/** Dígito verificador (módulo 11), igual que rutDv en data.ts. */
create or replace function rut_dv(cuerpo bigint) returns text
language plpgsql immutable as $$
declare
  suma int := 0;
  mul int := 2;
  n bigint := cuerpo;
  r int;
begin
  while n > 0 loop
    suma := suma + (n % 10)::int * mul;
    n := n / 10;
    mul := case when mul = 7 then 2 else mul + 1 end;
  end loop;
  r := 11 - (suma % 11);
  return case r when 11 then '0' when 10 then 'K' else r::text end;
end $$;

/** "17.482.395-5" → "174823955" (sin puntos ni guion, K mayúscula). Nulo si no es válido. */
create or replace function rut_normalizado(rut text) returns text
language plpgsql immutable as $$
declare
  limpio text := upper(regexp_replace(coalesce(rut, ''), '[^0-9kK]', '', 'g'));
begin
  if limpio !~ '^[0-9]{7,8}[0-9K]$' then return null; end if;
  if rut_dv(left(limpio, -1)::bigint) <> right(limpio, 1) then return null; end if;
  return limpio;
end $$;

/** "174823955" → "17.482.***-5", lo único que ve recepción (Ley 21.719, minimización). */
create or replace function rut_mascara(normalizado text) returns text
language sql immutable as $$
  select regexp_replace(left(normalizado, -4), '(\d)(?=(\d{3})+$)', '\1.', 'g') || '.***-' || right(normalizado, 1)
$$;

-- La clave para cifrar y firmar RUT vive en Supabase Vault, nunca en una tabla.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'aforoon_rut') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'aforoon_rut', 'Clave de cifrado de RUT de AforoON');
  end if;
end $$;

create or replace function clave_rut() returns text
language sql stable security definer set search_path = public as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'aforoon_rut'
$$;
revoke all on function clave_rut() from public, anon, authenticated;

/** Registro único (o actualización) del perfil de quien llama. Devuelve su id. */
create or replace function registrar_persona(
  p_nombre text,
  p_rut text,
  p_telefono text,
  p_segmento text,
  p_ocupacion text,
  p_motivo text
) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  normal text := rut_normalizado(p_rut);
  huella text;
  pid uuid;
begin
  if auth.uid() is null then perform falla('sin_sesion'); end if;
  if normal is null then perform falla('rut_invalido'); end if;
  if coalesce(trim(p_nombre), '') = '' then perform falla('nombre_vacio'); end if;
  huella := encode(hmac(normal, clave_rut(), 'sha256'), 'hex');
  if exists (select 1 from personas where rut_huella = huella and user_id is distinct from auth.uid()) then
    perform falla('rut_registrado');
  end if;

  insert into personas (user_id, nombre, rut_cifrado, rut_huella, rut_mascara, telefono, segmento, ocupacion, motivo, consentimiento_at)
  values (auth.uid(), trim(p_nombre), pgp_sym_encrypt(normal, clave_rut()), huella, rut_mascara(normal), p_telefono, p_segmento, coalesce(p_ocupacion, ''), coalesce(p_motivo, ''), now())
  on conflict (user_id) do update set
    nombre = excluded.nombre,
    rut_cifrado = excluded.rut_cifrado,
    rut_huella = excluded.rut_huella,
    rut_mascara = excluded.rut_mascara,
    telefono = excluded.telefono,
    segmento = excluded.segmento,
    ocupacion = excluded.ocupacion,
    motivo = excluded.motivo
  returning id into pid;
  return pid;
end $$;

/** Borrar mi cuenta y mis datos (Ley 21.719). Las reservas e inscripciones se van en cascada. */
create or replace function borrar_mi_cuenta() returns void
language plpgsql security definer set search_path = public as $$
begin
  if yo() is null then perform falla('sin_enrolar'); end if;
  delete from personas where id = yo();
end $$;

-- ------------------------------------------------------------------ espacios

/** Domingo cerrado; sábado solo hasta las 14:00 (isOpen en data.ts). */
create or replace function bloque_abierto(d date, b text) returns boolean
language sql stable as $$
  select case extract(dow from d)::int
    when 0 then false
    when 6 then (select inicio < time '14:00' from bloques where id = b)
    else true
  end
$$;

/** Reservas vigentes de la persona: no canceladas y que aún no terminan. */
create or replace function reservas_activas(pid uuid) returns int
language sql stable as $$
  select count(*)::int
  from reservas r join bloques b on b.id = r.bloque_id
  where r.persona_id = pid and r.estado <> 'cancelada'
    and (r.dia > hoy() or (r.dia = hoy() and b.fin > hora_local()))
$$;

create or replace function reservar(p_unidad text, p_dia date, p_bloque text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  pid uuid := yo();
  cap int;
  usados int;
  rid uuid;
begin
  if pid is null then perform falla('sin_enrolar'); end if;
  if p_dia < hoy() or p_dia >= hoy() + ventana_dias() then perform falla('fuera_de_ventana'); end if;
  if not bloque_abierto(p_dia, p_bloque) then perform falla('cerrado'); end if;
  if p_dia = hoy() and (select fin from bloques where id = p_bloque) <= hora_local() then perform falla('bloque_pasado'); end if;

  -- Bloqueo de la unidad: quien llega segundo espera y vuelve a contar (SELECT … FOR UPDATE).
  select capacidad into cap from unidades where id = p_unidad for update;
  if cap is null then perform falla('unidad_inexistente'); end if;

  if exists (select 1 from reservas where persona_id = pid and dia = p_dia and bloque_id = p_bloque and estado <> 'cancelada') then
    perform falla('superpuesta');
  end if;
  if reservas_activas(pid) >= max_reservas_activas() then perform falla('limite'); end if;

  select count(*) into usados from reservas where unidad_id = p_unidad and dia = p_dia and bloque_id = p_bloque and estado <> 'cancelada';
  if usados >= cap then perform falla('cupo_agotado'); end if;

  insert into reservas (persona_id, unidad_id, dia, bloque_id) values (pid, p_unidad, p_dia, p_bloque) returning id into rid;
  return rid;
end $$;

create or replace function cancelar_reserva(p_reserva uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update reservas set estado = 'cancelada' where id = p_reserva and persona_id = yo() and estado = 'confirmada';
  if not found then perform falla('reserva_inexistente'); end if;
end $$;

-- ------------------------------------------------------------------ charlas

create or replace function inscribir_charla(p_charla text) returns void
language plpgsql security definer set search_path = public as $$
declare
  pid uuid := yo();
  cap int;
begin
  if pid is null then perform falla('sin_enrolar'); end if;
  select capacidad into cap from charlas where id = p_charla and dia >= hoy() for update;
  if cap is null then perform falla('charla_inexistente'); end if;
  if exists (select 1 from inscripciones_charla where charla_id = p_charla and persona_id = pid) then return; end if;
  if (select count(*) from inscripciones_charla where charla_id = p_charla) >= cap then perform falla('charla_llena'); end if;
  insert into inscripciones_charla (charla_id, persona_id) values (p_charla, pid);
end $$;

create or replace function salir_charla(p_charla text) returns void
language sql security definer set search_path = public as $$
  delete from inscripciones_charla where charla_id = p_charla and persona_id = yo()
$$;

-- ------------------------------------------------------------------ capacitaciones

/** no_inscrito · inscrito · aprobada · vencida (trainingStatus en store.ts). */
create or replace function estado_capacitacion(pid uuid, tipo text) returns text
language sql stable security definer set search_path = public as $$
  select case
    when bool_or(i.aprobada and (i.vence_at is null or i.vence_at > now())) then 'aprobada'
    when bool_or(i.aprobada) then 'vencida'
    when bool_or(not i.aprobada) then 'inscrito'
    else 'no_inscrito'
  end
  from inscripciones_capacitacion i join sesiones_capacitacion s on s.id = i.sesion_id
  where i.persona_id = pid and s.tipo_id = tipo
$$;

create or replace function inscribir_capacitacion(p_sesion text) returns void
language plpgsql security definer set search_path = public as $$
declare
  pid uuid := yo();
  ses sesiones_capacitacion;
begin
  if pid is null then perform falla('sin_enrolar'); end if;
  select * into ses from sesiones_capacitacion where id = p_sesion and dia >= hoy() for update;
  if ses.id is null then perform falla('sesion_inexistente'); end if;
  if estado_capacitacion(pid, ses.tipo_id) = 'aprobada' then perform falla('ya_aprobada'); end if;
  if exists (select 1 from inscripciones_capacitacion where sesion_id = p_sesion and persona_id = pid) then return; end if;
  if (select count(*) from inscripciones_capacitacion where sesion_id = p_sesion) >= ses.capacidad then perform falla('capacitacion_llena'); end if;

  -- Inscribirse en otra sesión del mismo tipo reemplaza la anterior (si no asistió).
  delete from inscripciones_capacitacion i using sesiones_capacitacion s
  where s.id = i.sesion_id and s.tipo_id = ses.tipo_id and i.persona_id = pid and not i.asistio;
  insert into inscripciones_capacitacion (sesion_id, persona_id) values (p_sesion, pid);
end $$;

create or replace function salir_capacitacion(p_tipo text) returns void
language sql security definer set search_path = public as $$
  delete from inscripciones_capacitacion i using sesiones_capacitacion s
  where s.id = i.sesion_id and s.tipo_id = p_tipo and i.persona_id = yo() and not i.asistio
$$;

create or replace function marcar_asistencia(p_sesion text, p_persona uuid, p_asistio boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not es_admin() then perform falla('sin_permiso'); end if;
  -- Sin asistencia no hay aprobación.
  update inscripciones_capacitacion
  set asistio = p_asistio,
      aprobada = aprobada and p_asistio,
      aprobada_at = case when p_asistio then aprobada_at end,
      vence_at = case when p_asistio then vence_at end
  where sesion_id = p_sesion and persona_id = p_persona;
  if not found then perform falla('inscripcion_inexistente'); end if;
end $$;

create or replace function aprobar_capacitacion(p_sesion text, p_persona uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  meses int;
begin
  if not es_admin() then perform falla('sin_permiso'); end if;
  select t.vigencia_meses into meses
  from sesiones_capacitacion s join tipos_capacitacion t on t.id = s.tipo_id where s.id = p_sesion;
  update inscripciones_capacitacion
  set aprobada = true, aprobada_at = now(), aprobada_por = yo(),
      vence_at = case when meses is null then null else now() + make_interval(months => meses) end
  where sesion_id = p_sesion and persona_id = p_persona and asistio;
  if not found then perform falla('sin_asistencia'); end if;
end $$;

-- ------------------------------------------------------------------ máquinas

/** 15 reservas al año: 6 de 1–2 h, 4 de 3–5 h, 3 de 6–9 h, 2 de 10–18 h (QUOTA_BUCKETS). */
create or replace function tramo(horas int) returns text
language sql immutable as $$
  select case when horas <= 2 then '1-2' when horas <= 5 then '3-5' when horas <= 9 then '6-9' else '10-18' end
$$;

create or replace function cupo_tramo(t text) returns int
language sql immutable as $$
  select case t when '1-2' then 6 when '3-5' then 4 when '6-9' then 3 else 2 end
$$;

/** Reservas del Lab881 del año que cuentan para el cupo (las canceladas por la persona no cuentan). */
create or replace function usados_tramo(pid uuid, t text, anio int) returns int
language sql stable as $$
  select count(*)::int
  from reservas_maquina r join maquinas m on m.id = r.maquina_id
  where r.persona_id = pid and m.espacio_id = 'lab881'
    and tramo(r.horas) = t
    and extract(year from r.inicio at time zone 'America/Santiago') = anio
    and not (r.estado = 'cancelada' and r.motivo_cancelacion = 'usuario')
$$;

create or replace function reservar_maquina(p_maquina text, p_dia date, p_inicio time, p_horas int) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  pid uuid := yo();
  maq maquinas;
  esp espacios_lab;
  hor horarios_lab;
  ini timestamptz;
  rid uuid;
begin
  if pid is null then perform falla('sin_enrolar'); end if;
  select * into maq from maquinas where id = p_maquina;
  if maq.id is null then perform falla('maquina_inexistente'); end if;
  if maq.estado <> 'disponible' then perform falla('maquina_no_disponible'); end if;
  if estado_capacitacion(pid, maq.tipo_capacitacion) <> 'aprobada' then perform falla('sin_capacitacion'); end if;
  if p_dia < hoy() or p_dia >= hoy() + ventana_dias() then perform falla('fuera_de_ventana'); end if;

  select * into esp from espacios_lab where id = maq.espacio_id;
  select * into hor from horarios_lab where espacio_id = maq.espacio_id and dia_semana = extract(dow from p_dia);
  -- Horas en punto desde la apertura; la última hora de inicio cierra antes (Lab881: 30 min).
  if hor.espacio_id is null
     or p_inicio < hor.abre
     or extract(epoch from (p_inicio - hor.abre))::int % 3600 <> 0
     or p_inicio + interval '1 hour' > hor.cierra - make_interval(mins => esp.cierre_agenda_min) then
    perform falla('cerrado');
  end if;

  ini := en_santiago(p_dia, p_inicio);
  if ini <= now() then perform falla('pasado'); end if;
  -- Sin trabajos nocturnos, el trabajo debe terminar antes del cierre (time + interval da la vuelta a medianoche: se compara en segundos).
  if p_horas < 1 or p_horas > 18
     or (not maq.sigue_de_noche and p_horas * 3600 > extract(epoch from (hor.cierra - p_inicio))) then
    perform falla('duracion');
  end if;

  if esp.cupo_anual then
    -- Bloquea a la persona para que dos reservas simultáneas no se salten el cupo.
    perform 1 from personas where id = pid for update;
    if usados_tramo(pid, tramo(p_horas), extract(year from p_dia)::int) >= cupo_tramo(tramo(p_horas)) then
      perform falla('cupo_anual');
    end if;
  end if;

  begin
    insert into reservas_maquina (maquina_id, persona_id, inicio, horas, fin)
    values (p_maquina, pid, ini, p_horas, ini + make_interval(hours => p_horas))
    returning id into rid;
  exception when exclusion_violation then
    perform falla('ocupada');
  end;
  return rid;
end $$;

create or replace function cancelar_reserva_maquina(p_reserva uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update reservas_maquina set estado = 'cancelada', motivo_cancelacion = 'usuario'
  where id = p_reserva and persona_id = yo() and estado = 'confirmada';
  if not found then perform falla('reserva_inexistente'); end if;
end $$;

/** Máquinas: el admin cambia su estado (mantención, fuera de servicio). */
create or replace function cambiar_estado_maquina(p_maquina text, p_estado text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not es_admin() then perform falla('sin_permiso'); end if;
  update maquinas set estado = p_estado where id = p_maquina;
end $$;

-- ------------------------------------------------------------------ puerta

/**
 * Lectura de una credencial en el terminal. Solo recepción o administración.
 * Cruza con la reserva del bloque en curso o con una reserva de máquina de esta hora;
 * pasados 20 minutos del inicio de una máquina, la reserva se cancela por atraso.
 */
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
begin
  if not es_staff() then perform falla('sin_permiso'); end if;
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
      and now() >= inicio - interval '1 hour' and now() < fin
    order by inicio limit 1;
  end if;

  if not per.verificada then
    resultado := 'no_enrolado';
  elsif maq.id is not null and maq.entrada_at is null and now() > maq.inicio + make_interval(mins => minutos_atraso()) then
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
        entrada_at = case when p_sentido = 'entrada' then now() else entrada_at end,
        salida_at = case when p_sentido = 'salida' then now() else salida_at end,
        metodo = coalesce(metodo, p_metodo),
        estado = 'completada'
      where id = res.id;
    elsif maq.id is not null then
      update reservas_maquina set entrada_at = now() where id = maq.id;
    end if;
  end if;

  insert into accesos (persona_id, reserva_id, reserva_maquina_id, sentido, resultado, metodo, latencia, en_cola, registrado_por)
  values (p_persona, res.id, maq.id, p_sentido, resultado, p_metodo, p_latencia, p_en_cola, yo())
  returning id into aid;

  return json_build_object('acceso_id', aid, 'resultado', resultado, 'reserva_id', res.id, 'reserva_maquina_id', maq.id);
end $$;

/** Recepción deja pasar a alguien sin reserva; queda registrado como excepción. */
create or replace function permitir_excepcion(p_persona uuid, p_metodo text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  aid uuid;
begin
  if not es_staff() then perform falla('sin_permiso'); end if;
  insert into accesos (persona_id, sentido, resultado, metodo, registrado_por)
  values (p_persona, 'entrada', 'excepcion', p_metodo, yo()) returning id into aid;
  return aid;
end $$;

-- ------------------------------------------------------------------ lecturas agregadas (sin datos personales)

/** Ocupación por unidad y bloque de un día: lo que la app muestra como cupos. */
create or replace function ocupacion(p_dia date) returns table (unidad_id text, bloque_id text, ocupados int)
language sql stable security definer set search_path = public as $$
  select unidad_id, bloque_id, count(*)::int from reservas
  where dia = p_dia and estado <> 'cancelada' group by unidad_id, bloque_id
$$;

/** Horarios tomados de las máquinas en un rango de días, sin decir quién. */
create or replace function maquinas_tomadas(p_desde date, p_hasta date) returns table (maquina_id text, inicio timestamptz, fin timestamptz)
language sql stable security definer set search_path = public as $$
  select maquina_id, inicio, fin from reservas_maquina
  where estado <> 'cancelada' and inicio < en_santiago(p_hasta + 1, time '00:00') and fin > en_santiago(p_desde, time '00:00')
$$;

create or replace function inscritos_charlas() returns table (charla_id text, inscritos int)
language sql stable security definer set search_path = public as $$
  select c.id, count(i.persona_id)::int from charlas c left join inscripciones_charla i on i.charla_id = c.id group by c.id
$$;

create or replace function inscritos_sesiones() returns table (sesion_id text, inscritos int)
language sql stable security definer set search_path = public as $$
  select s.id, count(i.persona_id)::int from sesiones_capacitacion s left join inscripciones_capacitacion i on i.sesion_id = s.id group by s.id
$$;

/** Mi cupo anual del Lab881 por tramo. */
create or replace function mis_cupos_lab() returns table (tramo text, usados int, cupo int)
language sql stable security definer set search_path = public as $$
  select t, usados_tramo(yo(), t, extract(year from hoy())::int), cupo_tramo(t)
  from unnest(array['1-2', '3-5', '6-9', '10-18']) as t
$$;

/** Mis capacitaciones con su estado. */
create or replace function mis_capacitaciones() returns table (tipo_id text, estado text, sesion_id text, vence_at timestamptz)
language sql stable security definer set search_path = public as $$
  select t.id, coalesce(estado_capacitacion(yo(), t.id), 'no_inscrito'),
         (select i.sesion_id from inscripciones_capacitacion i join sesiones_capacitacion s on s.id = i.sesion_id
          where i.persona_id = yo() and s.tipo_id = t.id order by i.aprobada desc, s.dia desc limit 1),
         (select max(i.vence_at) from inscripciones_capacitacion i join sesiones_capacitacion s on s.id = i.sesion_id
          where i.persona_id = yo() and s.tipo_id = t.id and i.aprobada)
  from tipos_capacitacion t
$$;

-- ------------------------------------------------------------------ quién puede llamar qué

do $$
declare
  f text;
begin
  -- Por defecto Postgres deja ejecutar funciones a cualquiera: se cierra y se abre lo justo.
  foreach f in array array[
    'registrar_persona(text,text,text,text,text,text)', 'borrar_mi_cuenta()',
    'reservar(text,date,text)', 'cancelar_reserva(uuid)',
    'inscribir_charla(text)', 'salir_charla(text)',
    'inscribir_capacitacion(text)', 'salir_capacitacion(text)',
    'marcar_asistencia(text,uuid,boolean)', 'aprobar_capacitacion(text,uuid)',
    'reservar_maquina(text,date,time,integer)', 'cancelar_reserva_maquina(uuid)', 'cambiar_estado_maquina(text,text)',
    'registrar_acceso(uuid,text,text,numeric,boolean)', 'permitir_excepcion(uuid,text)',
    'mis_cupos_lab()', 'mis_capacitaciones()'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
  -- Ayudas que reciben el id de otra persona: solo para uso interno de las funciones.
  foreach f in array array['estado_capacitacion(uuid,text)', 'usados_tramo(uuid,text,integer)', 'reservas_activas(uuid)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
  end loop;
  -- Lecturas agregadas: también sin sesión (la portada y los cupos son públicos).
  foreach f in array array['ocupacion(date)', 'maquinas_tomadas(date,date)', 'inscritos_charlas()', 'inscritos_sesiones()'] loop
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
end $$;
