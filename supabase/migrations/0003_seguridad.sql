-- AforoON · permisos por fila (RLS).
-- Lectura: el catálogo es público; lo personal, solo de cada persona, y recepción y
-- administración ven todo. Escritura: nadie escribe tablas directo, solo las funciones
-- de 0002_reglas.sql (security definer).

do $$
declare
  t text;
begin
  foreach t in array array[
    'personas', 'zonas', 'unidades', 'bloques', 'reservas',
    'capacitadores', 'disponibilidad_capacitador', 'charlas', 'inscripciones_charla',
    'espacios_lab', 'horarios_lab', 'tipos_capacitacion', 'maquinas',
    'sesiones_capacitacion', 'inscripciones_capacitacion', 'reservas_maquina', 'accesos'
  ] loop
    execute format('alter table %I enable row level security', t);
    -- Sin escritura directa desde la app.
    execute format('revoke insert, update, delete, truncate on %I from anon, authenticated', t);
  end loop;

  -- Catálogo: lectura para todos, con o sin sesión.
  foreach t in array array[
    'zonas', 'unidades', 'bloques', 'capacitadores', 'disponibilidad_capacitador', 'charlas',
    'espacios_lab', 'horarios_lab', 'tipos_capacitacion', 'maquinas', 'sesiones_capacitacion'
  ] loop
    execute format('create policy "catalogo publico" on %I for select to anon, authenticated using (true)', t);
  end loop;

  -- Lo personal: cada persona lo suyo; recepción y administración, todo.
  foreach t in array array['reservas', 'inscripciones_charla', 'inscripciones_capacitacion', 'reservas_maquina', 'accesos'] loop
    execute format('create policy "propio o equipo" on %I for select to authenticated using (persona_id = yo() or es_staff())', t);
  end loop;
end $$;

create policy "perfil propio o equipo" on personas for select to authenticated using (user_id = auth.uid() or es_staff());

-- El RUT cifrado y su huella no salen nunca por la API: solo la máscara.
revoke select on personas from anon, authenticated;
grant select (id, user_id, nombre, rut_mascara, telefono, segmento, ocupacion, motivo, rol, verificada, tono, consentimiento_at, creada_at)
  on personas to authenticated;
