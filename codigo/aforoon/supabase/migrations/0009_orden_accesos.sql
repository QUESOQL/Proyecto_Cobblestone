-- AforoON · orden real del registro de accesos y no-show de reservas reales.
-- Con el reloj de la demo (ajustes.hora_demo) todos los accesos quedan a la misma hora, así
-- que "los últimos" salían en cualquier orden. Cada acceso guarda ahora también el instante
-- real en que se registró, y las listas desempatan con él. La hora que se muestra no cambia.
-- Además, el panel cuenta como "no llegó" las reservas reales vencidas sin entrada (estado_real).

alter table accesos add column if not exists registrado_at timestamptz not null default now();
create index if not exists accesos_recientes on accesos (ocurrido_at desc, registrado_at desc);

/**
 * Estado real de una reserva: una reserva confirmada sin llegada cuyo bloque ya terminó es un
 * "no llegó" (no_show). Se calcula al consultar, sin tareas programadas (plan gratuito); la
 * fila guardada no cambia. Antes, nada marcaba no_show en reservas reales: solo la demo los traía.
 */
create or replace function estado_real(estado text, entrada_at timestamptz, dia date, fin time) returns text
language sql stable as $fn$
  select case
    when estado = 'confirmada' and entrada_at is null and (dia < hoy() or (dia = hoy() and fin <= hora_local())) then 'no_show'
    else estado
  end
$fn$;

/** Igual que en la 0007, pero los últimos accesos desempatan por registrado_at. */
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
      select json_agg(x order by x.ocurrido_at desc, x.registrado_at desc) from (
        select a.id, a.ocurrido_at, a.registrado_at, a.sentido, a.resultado, a.metodo, a.en_cola, p.nombre
        from accesos a join personas p on p.id = a.persona_id
        where a.ocurrido_at >= en_santiago(hoy(), time '00:00')
        order by a.ocurrido_at desc, a.registrado_at desc limit 8
      ) x
    ), '[]'::json)
  )
  where es_staff()
$$;

/** Igual que en la 0008, pero las incidencias desempatan por registrado_at y usa el estado real (no-show). */
create or replace function panel_admin() returns json
language plpgsql stable security definer set search_path = public as $$
declare
  minuto int := extract(hour from hora_local())::int * 60 + extract(minute from hora_local())::int;
  ultimo date := (select max(dia) from dias_semana() where dia < hoy());
  salida json;
begin
  if not es_admin() then perform falla('sin_permiso'); end if;

  with
  vigentes as (
    select r.id, r.persona_id, r.unidad_id, r.dia, r.bloque_id, r.entrada_at, r.salida_at, r.metodo,
      estado_real(r.estado, r.entrada_at, r.dia, b.fin) as estado,
      u.zona_id, u.nombre as unidad, b.inicio, b.fin
    from reservas r join unidades u on u.id = r.unidad_id join bloques b on b.id = r.bloque_id
    where r.dia between hoy() - 6 and hoy() and r.estado <> 'cancelada'
  ),
  iniciados as (
    select * from bloques where inicio <= hora_local() and bloque_abierto(hoy(), id)
  ),
  -- Ventana ya pasada: días anteriores y los bloques de hoy que terminaron.
  pasadas as (
    select * from vigentes where dia < hoy() or fin <= hora_local()
  ),
  excepciones as (
    select (ocurrido_at at time zone 'America/Santiago')::date as dia, count(*)::int as n
    from accesos where resultado = 'excepcion' and sentido = 'entrada'
      and ocurrido_at >= en_santiago(hoy() - 6, time '00:00')
    group by 1
  )
  select json_build_object(
    'dia', hoy(),
    'minuto', minuto,
    'ultimo_abierto', ultimo,

    'entradas_por_dia', (
      select json_agg(json_build_object(
        'dia', d.dia,
        'n', (select count(*) from vigentes v where v.dia = d.dia and v.entrada_at is not null)::int
             + coalesce((select n from excepciones e where e.dia = d.dia), 0)
      ) order by d.dia)
      from (select d::date as dia from generate_series(hoy() - 6, hoy(), interval '1 day') d) d
    ),

    'ocupacion', json_build_object(
      'reservadas', (select count(*) from vigentes v where v.dia = hoy() and v.zona_id <> 'charlas' and v.bloque_id in (select id from iniciados))::int,
      'cupos_por_bloque', (select sum(capacidad) from unidades where zona_id <> 'charlas')::int,
      'bloques', (select count(*) from iniciados)::int,
      'desde', (select to_char(min(inicio), 'HH24:MI') from iniciados),
      'hasta', (select to_char(max(fin), 'HH24:MI') from iniciados)
    ),

    'no_show', json_build_object(
      'no_show', (select count(*) from pasadas where estado = 'no_show')::int,
      'asistidas', (select count(*) from pasadas where estado = 'completada')::int,
      'ultimo_abierto', (select count(*) from vigentes where dia = ultimo and estado = 'no_show')::int
    ),

    'socios', json_build_object(
      'enrolados', (select count(*) from personas where rol = 'vecino' and verificada)::int,
      'total', (select count(*) from personas where rol = 'vecino')::int
    ),

    'bloques_hoy', (
      select json_agg(json_build_object('id', id, 'inicio', to_char(inicio, 'HH24:MI'), 'fin', to_char(fin, 'HH24:MI')) order by inicio)
      from bloques where bloque_abierto(hoy(), id)
    ),
    'capacidad_zona', (
      select json_object_agg(zona_id, cap) from (select zona_id, sum(capacidad)::int as cap from unidades group by zona_id) z
    ),
    'por_bloque', coalesce((
      select json_agg(json_build_object('zona_id', zona_id, 'bloque_id', bloque_id, 'n', n))
      from (select zona_id, bloque_id, count(*)::int as n from vigentes where dia = hoy() group by 1, 2) x
    ), '[]'::json),

    -- Promedio por hora de los días abiertos anteriores a hoy.
    'dias_pasados', (select count(*) from dias_semana() where dia < hoy())::int,
    'por_hora', coalesce((
      select json_agg(json_build_object('hora', h, 'n', n) order by h)
      from (
        select extract(hour from entrada_at at time zone 'America/Santiago')::int as h, count(*)::int as n
        from vigentes where dia < hoy() and entrada_at is not null group by 1
      ) x
    ), '[]'::json),

    'segmentos', coalesce((
      select json_agg(json_build_object('segmento', segmento, 'n', n) order by n desc)
      from (
        select p.segmento, count(distinct p.id)::int as n
        from vigentes v join personas p on p.id = v.persona_id
        where p.rol = 'vecino' group by 1
      ) x
    ), '[]'::json),

    'incidencias', coalesce((
      select json_agg(x order by x.ocurrido_at desc, x.registrado_at desc) from (
        select a.id, a.ocurrido_at, a.registrado_at, a.resultado, a.metodo, p.nombre, p.tono
        from accesos a join personas p on p.id = a.persona_id
        where a.resultado <> 'aprobado' and a.ocurrido_at >= en_santiago(hoy(), time '00:00')
        order by a.ocurrido_at desc, a.registrado_at desc limit 4
      ) x
    ), '[]'::json),
    'no_llegaron_hoy', coalesce((
      select json_agg(x) from (
        select v.id, p.nombre, p.tono, v.unidad, to_char(v.inicio, 'HH24:MI') || '–' || to_char(v.fin, 'HH24:MI') as horario
        from vigentes v join personas p on p.id = v.persona_id
        where v.dia = hoy() and v.estado = 'no_show'
        order by v.inicio limit 4
      ) x
    ), '[]'::json),

    'charlas', coalesce((
      select json_agg(json_build_object(
        'id', c.id, 'titulo', c.titulo, 'capacitador', t.nombre, 'lugar', u.nombre,
        'dia', c.dia, 'inicio', to_char(b.inicio, 'HH24:MI'), 'capacidad', c.capacidad,
        'inscritos', (select count(*) from inscripciones_charla i where i.charla_id = c.id)::int,
        'asistentes', c.asistentes, 'nota', c.nota
      ) order by c.dia, b.inicio)
      from charlas c join capacitadores t on t.id = c.capacitador_id
        join unidades u on u.id = c.unidad_id join bloques b on b.id = c.bloque_id
    ), '[]'::json)
  ) into salida;

  return salida;
end $$;

/** Igual que en la 0008, pero con el estado real (no_show cuando el bloque terminó sin llegada). */
create or replace function exportar_dia() returns table (
  dia date, bloque text, espacio text, socio text, perfil text, estado text, entrada text, salida text, metodo text
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not es_admin() then perform falla('sin_permiso'); end if;
  return query
    select r.dia, to_char(b.inicio, 'HH24:MI') || '–' || to_char(b.fin, 'HH24:MI'), u.nombre, p.nombre, p.segmento, estado_real(r.estado, r.entrada_at, r.dia, b.fin),
      coalesce(to_char(r.entrada_at at time zone 'America/Santiago', 'HH24:MI'), ''),
      coalesce(to_char(r.salida_at at time zone 'America/Santiago', 'HH24:MI'), ''),
      coalesce(r.metodo, '')
    from reservas r join bloques b on b.id = r.bloque_id join unidades u on u.id = r.unidad_id join personas p on p.id = r.persona_id
    where r.dia = hoy() and r.estado <> 'cancelada'
    order by b.inicio, u.nombre, p.nombre;
end $$;
