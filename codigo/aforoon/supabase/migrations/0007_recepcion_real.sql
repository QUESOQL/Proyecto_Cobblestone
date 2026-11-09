-- AforoON · recepción real (fase 2).
-- Lo que necesita la pantalla del guardia para registrar accesos de verdad: buscar a una
-- persona por RUT sin exponerlo, ver quién viene en el bloque en curso, quién está dentro,
-- los últimos accesos, y el detalle de un acceso recién registrado.
-- Todo es solo para recepción o administración (es_staff), y nunca devuelve el RUT completo.

/**
 * Corrige es_servicio() de la 0006: si la llamada no trae datos de sesión (un texto vacío),
 * ahora responde "no" en vez de fallar al convertir ese texto a JSON.
 */
create or replace function es_servicio() returns boolean
language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role', '') = 'service_role'
$$;

/** Recepción también marca la llegada buscando por RUT: la reserva guarda ese método. */
alter table reservas drop constraint if exists reservas_metodo_check;
alter table reservas add constraint reservas_metodo_check check (metodo in ('nfc', 'qr', 'rut'));

/** Datos que recepción puede ver de una persona: nunca el RUT completo. */
create or replace function persona_vista(p personas) returns json
language sql stable as $$
  select json_build_object(
    'persona_id', p.id, 'nombre', p.nombre, 'rut_mascara', p.rut_mascara,
    'tono', p.tono, 'segmento', p.segmento, 'verificada', p.verificada
  )
$$;

/** Busca por RUT comparando su huella (HMAC): el RUT no se descifra ni se devuelve. */
create or replace function buscar_por_rut(p_rut text) returns json
language plpgsql stable security definer set search_path = public, extensions as $$
declare
  normal text := rut_normalizado(p_rut);
  per personas;
begin
  if not es_staff() then perform falla('sin_permiso'); end if;
  if normal is null then perform falla('rut_invalido'); end if;
  select * into per from personas where rut_huella = encode(hmac(normal, clave_rut(), 'sha256'), 'hex');
  if per.id is null then return null; end if;
  return persona_vista(per);
end $$;

/** Lo que el guardia ve tras registrar un acceso: quién, resultado y a dónde va. */
create or replace function vista_acceso(p_acceso uuid) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'acceso_id', a.id,
    'resultado', a.resultado,
    'sentido', a.sentido,
    'metodo', a.metodo,
    'latencia', a.latencia,
    'ocurrido_at', a.ocurrido_at,
    'persona', persona_vista(p),
    'destino', coalesce(u.nombre, m.nombre),
    'detalle_destino', case
      when r.id is not null then to_char(b.inicio, 'HH24:MI') || '–' || to_char(b.fin, 'HH24:MI')
      when rm.id is not null then to_char(rm.inicio at time zone 'America/Santiago', 'HH24:MI') || '–' || to_char(rm.fin at time zone 'America/Santiago', 'HH24:MI')
    end,
    -- Para "sin reserva": su próxima reserva de hoy, si tiene.
    'proxima', (
      select json_build_object('destino', u2.nombre, 'horario', to_char(b2.inicio, 'HH24:MI') || '–' || to_char(b2.fin, 'HH24:MI'))
      from reservas r2 join unidades u2 on u2.id = r2.unidad_id join bloques b2 on b2.id = r2.bloque_id
      where r2.persona_id = a.persona_id and r2.dia = hoy() and r2.estado <> 'cancelada' and b2.inicio > hora_local()
      order by b2.inicio limit 1
    )
  )
  from accesos a
  join personas p on p.id = a.persona_id
  left join reservas r on r.id = a.reserva_id
  left join unidades u on u.id = r.unidad_id
  left join bloques b on b.id = r.bloque_id
  left join reservas_maquina rm on rm.id = a.reserva_maquina_id
  left join maquinas m on m.id = rm.maquina_id
  where a.id = p_acceso and es_staff()
$$;

/**
 * Estado de la puerta ahora: bloque en curso, quién tiene reserva y aún no entra, cuántas
 * personas hay dentro por zona y los últimos accesos registrados hoy.
 */
create or replace function puerta_ahora() returns json
language sql stable security definer set search_path = public as $$
  with bloque as (
    select * from bloques where hora_local() >= inicio and hora_local() < fin limit 1
  ),
  del_bloque as (
    select r.*, u.nombre as unidad, u.zona_id
    from reservas r join unidades u on u.id = r.unidad_id
    where r.dia = hoy() and r.bloque_id = (select id from bloque) and r.estado <> 'cancelada'
  )
  select json_build_object(
    'bloque', (select json_build_object('id', id, 'inicio', to_char(inicio, 'HH24:MI'), 'fin', to_char(fin, 'HH24:MI')) from bloque),
    'pendientes', coalesce((
      select json_agg(json_build_object('reserva_id', d.id, 'destino', d.unidad, 'persona', persona_vista(p)) order by p.nombre)
      from del_bloque d join personas p on p.id = d.persona_id
      where d.entrada_at is null
    ), '[]'::json),
    'dentro', coalesce((
      select json_agg(json_build_object('zona_id', z.id, 'zona', z.nombre, 'dentro', z.dentro, 'aforo', z.aforo) order by z.nombre)
      from (
        select zo.id, zo.nombre,
          (select count(*) from del_bloque d where d.zona_id = zo.id and d.entrada_at is not null and d.salida_at is null)::int as dentro,
          (select sum(capacidad) from unidades where zona_id = zo.id)::int as aforo
        from zonas zo where zo.id <> 'charlas'
      ) z
    ), '[]'::json),
    'excepciones', (select count(*) from accesos where resultado = 'excepcion' and ocurrido_at >= en_santiago(hoy(), time '00:00'))::int,
    'ultimos', coalesce((
      select json_agg(x order by x.ocurrido_at desc) from (
        select a.id, a.ocurrido_at, a.sentido, a.resultado, a.metodo, a.en_cola, p.nombre
        from accesos a join personas p on p.id = a.persona_id
        where a.ocurrido_at >= en_santiago(hoy(), time '00:00')
        order by a.ocurrido_at desc limit 8
      ) x
    ), '[]'::json)
  )
  where es_staff()
$$;

/**
 * Carga RUT de ejemplo (scripts/seed-demo.mjs) con su cifrado, huella y máscara, para que
 * recepción pueda buscar a los socios de la demo. Solo con la clave secreta del servidor.
 */
create or replace function cargar_ruts_demo(p_datos jsonb) returns int
language plpgsql security definer set search_path = public, extensions as $$
declare
  fila jsonb;
  normal text;
  n int := 0;
begin
  if not es_servicio() then perform falla('sin_permiso'); end if;
  for fila in select * from jsonb_array_elements(p_datos) loop
    normal := rut_normalizado(fila ->> 'rut');
    if normal is null then continue; end if;
    begin
      update personas set
        rut_cifrado = pgp_sym_encrypt(normal, clave_rut()),
        rut_huella = encode(hmac(normal, clave_rut(), 'sha256'), 'hex'),
        rut_mascara = rut_mascara(normal)
      where id = (fila ->> 'id')::uuid and user_id is null;
      n := n + 1;
    exception when unique_violation then
      -- Un RUT de ejemplo repetido (o de una cuenta real): se omite esa fila.
      null;
    end;
  end loop;
  return n;
end $$;

revoke all on function buscar_por_rut(text) from public, anon;
grant execute on function buscar_por_rut(text) to authenticated;
revoke all on function vista_acceso(uuid) from public, anon;
grant execute on function vista_acceso(uuid) to authenticated;
revoke all on function puerta_ahora() from public, anon;
grant execute on function puerta_ahora() to authenticated;
revoke all on function cargar_ruts_demo(jsonb) from public, anon, authenticated;
grant execute on function cargar_ruts_demo(jsonb) to service_role;
