-- AforoON · reloj de demo.
-- La app de demo corre siempre a las 10:24 del día de hoy (NOW_MIN en src/lib/data.ts).
-- Con el ajuste "hora_demo", el servidor usa esa misma hora para decidir qué bloque ya
-- pasó, qué reserva está en curso y quién llegó tarde; así la demo y las pruebas no
-- dependen de la hora en que se abren. Para producción: delete from ajustes where clave = 'hora_demo';

create table if not exists ajustes (
  clave text primary key,
  valor text not null
);
alter table ajustes enable row level security;
revoke insert, update, delete, truncate on ajustes from anon, authenticated;
create policy "ajustes publicos" on ajustes for select to anon, authenticated using (true);

insert into ajustes (clave, valor) values ('hora_demo', '10:24') on conflict (clave) do nothing;

/** Hora de Santiago, o la hora fija de la demo si está activa. */
create or replace function hora_local() returns time
language sql stable as $$
  select coalesce(
    (select valor::time from ajustes where clave = 'hora_demo'),
    (now() at time zone 'America/Santiago')::time
  )
$$;

/** "Ahora" para las reglas: hoy a la hora de la demo, o el instante real. */
create or replace function ahora() returns timestamptz
language sql stable as $$
  select case when exists (select 1 from ajustes where clave = 'hora_demo')
    then en_santiago(hoy(), hora_local())
    else now()
  end
$$;

/** Reloj que ve la app: día y minuto desde medianoche. */
create or replace function reloj() returns json
language sql stable as $$
  select json_build_object('dia', hoy(), 'minuto', extract(hour from hora_local()) * 60 + extract(minute from hora_local()), 'demo', exists (select 1 from ajustes where clave = 'hora_demo'))
$$;
grant execute on function reloj() to anon, authenticated;

-- Las dos reglas que comparaban contra now() pasan a usar ahora().

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
  if ini <= ahora() then perform falla('pasado'); end if;
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

  insert into accesos (persona_id, reserva_id, reserva_maquina_id, sentido, resultado, metodo, latencia, en_cola, registrado_por, ocurrido_at)
  values (p_persona, res.id, maq.id, p_sentido, resultado, p_metodo, p_latencia, p_en_cola, yo(), t)
  returning id into aid;

  return json_build_object('acceso_id', aid, 'resultado', resultado, 'reserva_id', res.id, 'reserva_maquina_id', maq.id);
end $$;
