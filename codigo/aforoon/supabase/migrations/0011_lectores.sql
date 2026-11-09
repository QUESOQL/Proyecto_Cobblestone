-- AforoON · lectores ESP32 + PN532 por Bluetooth (fase 4).
-- Plan: informe de hardware v4, secciones 6, 7 y 9.3. El lector no habla con Supabase: se
-- enlaza por BLE con el celular del guardia y, al conectarse, le exige responder un desafío
-- con HMAC-SHA256 y una clave propia del lector. Así un celular ajeno no puede conectarse y
-- hacerle mostrar verde, y el celular sabe que habla con su lector y no con uno que imita el
-- nombre. La clave se guarda en Vault (cifrada); la misma clave se graba en el ESP32 por el
-- puerto serie al aprovisionarlo.

create table lectores (
  id uuid primary key default gen_random_uuid(),
  -- Nombre BLE con que se anuncia: "AforoON-Lector-01".
  nombre text unique not null check (nombre ~ '^[A-Za-z0-9-]{3,29}$'),
  terminal_id uuid references terminales (id) on delete set null,
  -- Secreto de Vault con la clave HMAC (32 bytes en hexadecimal).
  clave_id uuid not null,
  activo boolean not null default true,
  creado_at timestamptz not null default now()
);

alter table lectores enable row level security;
revoke insert, update, delete, truncate on lectores from anon, authenticated;
-- El equipo ve qué lectores hay (sin la clave, que vive en Vault).
create policy "equipo" on lectores for select to authenticated using (es_staff());

/**
 * Da de alta un lector o, si ya existe, le cambia la clave. Devuelve la clave nueva en
 * hexadecimal, una sola vez, para grabarla en el ESP32. Solo con la clave secreta del
 * servidor (scripts/equipo.mjs lector).
 */
create or replace function crear_lector(p_nombre text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare
  l lectores;
  clave text := encode(gen_random_bytes(32), 'hex');
begin
  if not es_servicio() then perform falla('sin_permiso'); end if;
  if p_nombre !~ '^[A-Za-z0-9-]{3,29}$' then perform falla('nombre_invalido'); end if;
  select * into l from lectores where nombre = p_nombre;
  if l.id is null then
    insert into lectores (nombre, clave_id)
    values (p_nombre, vault.create_secret(clave, 'aforoon_lector_' || p_nombre, 'Clave HMAC del lector BLE ' || p_nombre));
  else
    perform vault.update_secret(l.clave_id, clave);
    update lectores set activo = true where id = l.id;
  end if;
  return clave;
end $$;

/**
 * La clave de un lector activo, para que el celular del guardia responda su desafío.
 * Solo recepción o administración (la cuenta del terminal incluida).
 */
create or replace function clave_lector(p_nombre text) returns text
language plpgsql stable security definer set search_path = public as $$
declare
  l lectores;
begin
  if not es_staff() then perform falla('sin_permiso'); end if;
  select * into l from lectores where nombre = p_nombre;
  if l.id is null then perform falla('lector_desconocido'); end if;
  if not l.activo then perform falla('lector_inactivo'); end if;
  return (select decrypted_secret from vault.decrypted_secrets where id = l.clave_id);
end $$;

revoke all on function crear_lector(text) from public, anon, authenticated;
grant execute on function crear_lector(text) to service_role;
revoke all on function clave_lector(text) from public, anon;
grant execute on function clave_lector(text) to authenticated;
