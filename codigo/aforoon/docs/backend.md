# Backend de AforoON: plan

Hoy toda la app vive en el navegador (`localStorage`, `src/lib/store.ts`). Este plan la
lleva a una base de datos real en **Supabase** (PostgreSQL + inicio de sesión + permisos
por fila), sin cambiar las pantallas.

## Decisiones

| Tema | Decisión | Por qué |
|---|---|---|
| Base de datos | PostgreSQL en Supabase (región São Paulo) | El bloqueo de cupos del Master Plan (`SELECT … FOR UPDATE`) funciona tal cual; si la municipalidad pide su propio servidor, se migra sin reescribir. |
| Reglas críticas | Funciones SQL (`reservar`, `reservar_maquina`, `inscribir_capacitacion`, …) | Ocurren completas o no ocurren: dos personas nunca toman el último cupo. La app no puede saltárselas. |
| Choque de máquinas | Restricción de exclusión (`btree_gist`) sobre el rango de horas | Ni siquiera un error de la app puede reservar la misma máquina dos veces a la misma hora. |
| Permisos | RLS: cada persona ve lo suyo; recepción y administración, según su rol | Minimización de datos (Ley 21.719). |
| RUT | Cifrado con `pgcrypto` (clave en Supabase Vault) + huella para buscar + máscara para mostrar | Recepción nunca ve el RUT completo. |
| Hora | Siempre `America/Santiago` en el servidor | El navegador no decide qué bloque "ya pasó". |
| Inicio de sesión | Supabase Auth: correo (ya activo) y luego Google | Sin construir login propio. |
| Socios de la demo | Filas en `personas` sin cuenta (`user_id` nulo) | La demo sigue contando la misma historia que `data.ts`. |

## Tablas (`supabase/migrations/0001_esquema.sql`)

- **Personas y roles:** `personas` (perfil, rol `vecino` / `recepcion` / `admin`, RUT cifrado).
- **Espacios:** `zonas`, `unidades`, `bloques`.
- **Reservas de espacios:** `reservas` (una por persona y bloque, índice único parcial).
- **Charlas:** `capacitadores`, `charlas`, `inscripciones_charla`.
- **Lab881 y textil:** `espacios_lab`, `horarios_lab`, `tipos_capacitacion`, `maquinas`
  (con `estado`: disponible / mantencion / fuera_de_servicio), `sesiones_capacitacion`,
  `inscripciones_capacitacion` (asistió, aprobada, vence), `reservas_maquina`.
- **Puerta:** `accesos` (cada lectura, con resultado, método, latencia y si quedó en cola).

## Reglas (`0002_reglas.sql`)

Cada función revisa quién la llama (`auth.uid()`), aplica la regla y devuelve un código de
error que la app ya sabe mostrar (`cupo_agotado`, `sin_capacitacion`, `cupo_anual`, …):

- `registrar_persona` — valida el RUT (módulo 11) y lo cifra.
- `reservar`, `cancelar_reserva` — ventana de 7 días, horario, no superposición, máximo 3 activas, aforo con bloqueo de fila.
- `inscribir_charla`, `salir_charla`.
- `inscribir_capacitacion`, `salir_capacitacion`; `marcar_asistencia`, `aprobar_capacitacion` (solo administración).
- `reservar_maquina`, `cancelar_reserva_maquina` — capacitación aprobada y vigente, horario, 18 h máximo, cupo anual por tramo, máquina disponible.
- `registrar_acceso` (solo recepción) — valida en la puerta, cancela por atraso de 20 min.

## Permisos (`0003_seguridad.sql`)

- Catálogo (zonas, unidades, máquinas, sesiones, charlas): lectura pública.
- Reservas, inscripciones, accesos: cada persona lee las suyas; recepción y administración leen todo.
- Nadie escribe tablas directamente: toda escritura pasa por las funciones de reglas.
- Ocupación agregada (cupos por bloque) por funciones que no exponen quién reservó.

## Pasos

1. **Aplicar las migraciones** en Supabase (SQL Editor o conexión directa). ← siguiente
2. **Cargar la demo** (`scripts/seed-demo.mjs`, usa la clave secreta de `.env.local`).
3. **Conectar la app:** instalar `@supabase/supabase-js` y `@supabase/ssr`; reemplazar el
   estado local de `store.ts` por llamadas a las funciones, pantalla por pantalla
   (reservar → inicio → máquinas y capacitaciones → recepción → admin).
4. **Inicio de sesión:** `/registro` con correo (enlace mágico); después Google.
5. **Roles:** marcar cuentas de recepción y administración; proteger `/recepcion` y `/admin`.
6. **Pruebas:** las de Playwright contra una base de prueba, más pruebas de las funciones SQL.
7. **Publicar** en Vercel con las variables de entorno.

## Después del backend

- Lista de espera, recordatorios, ficha con atrasos y sanciones, vencimiento de capacitaciones.
- Pantallas del admin: Socios, Espacios y aforo, Charlas.
- QR firmado verificable sin conexión en el terminal.
- Descarga y borrado de datos personales (Ley 21.719).
- CI en GitHub Actions.
