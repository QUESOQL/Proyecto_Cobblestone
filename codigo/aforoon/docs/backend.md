# Backend de AforoON

La app usa una base de datos real en **Supabase** (PostgreSQL + inicio de sesión + permisos
por fila). Las reglas viven en funciones SQL; la app solo las llama.

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

## Migraciones posteriores

Cada una se aplica pegándola completa en Supabase → **SQL Editor** → **New query** → **Run**, en orden.

| Migración | Qué agrega |
|---|---|
| `0004_reloj_demo.sql` | Reloj de la demo (`ajustes.hora_demo` = 10:24): app y servidor ven la misma hora. |
| `0005_borrar_personas.sql` | Borrar una persona no rompe lo que aprobó o registró (quedan sin autor). |
| `0006_terminales_turnos.sql` | Cuenta del celular del guardia (`terminales`), PIN de turno por recepcionista, `iniciar_turno` / `cerrar_turno`; cada acceso queda con autor y terminal. |
| `0007_recepcion_real.sql` | `buscar_por_rut` (por huella, sin exponer el RUT), `puerta_ahora` (bloque, por llegar, dentro, últimos), `vista_acceso`, `cargar_ruts_demo`; las reservas aceptan el método `rut`. |
| `0008_panel_admin.sql` | `panel_admin()`: todas las cifras del panel en una llamada; `exportar_dia()` para el CSV. Solo rol admin. |
| `0009_orden_accesos.sql` | `accesos.registrado_at` para ordenar los accesos aunque el reloj de la demo esté fijo; `estado_real()`: una reserva confirmada sin llegada con el bloque terminado cuenta como "no llegó". |

## Cuentas del equipo

Con `scripts/equipo.mjs` (usa la clave secreta de `.env.local`; corre en el computador, nunca en Vercel):

- `node scripts/equipo.mjs lista` — cuentas con rol de recepción o administración, y terminales.
- `node scripts/equipo.mjs rol <correo> admin` — da acceso al panel `/admin` (la persona debe haber entrado una vez a la app).
- `node scripts/equipo.mjs rol <correo> recepcion` y `pin <correo> <PIN>` — recepcionista con PIN de turno.
- `node scripts/equipo.mjs terminal "<nombre>"` — cuenta para el celular del guardia (la contraseña queda en `.env.terminal.local`).

**Entrar al panel:** `/admin` pide entrar con Google o correo y solo muestra el panel a cuentas con rol admin
(la base igual rechaza a cualquier otra). `/admin?demo=1` y `/recepcion?demo=1` muestran las versiones con datos de ejemplo.

## Estado

- Hecho: migraciones 0001–0009, demo cargada, app del socio conectada, inicio con Google, terminal con PIN de
  turno, recepción real por RUT, panel de administración con datos reales.
- Siguiente: fase 3, QR firmado en la credencial y lectura con la cámara del celular del guardia.

## Después del backend


- Lista de espera, recordatorios, ficha con atrasos y sanciones, vencimiento de capacitaciones.
- Pantallas del admin: Socios, Espacios y aforo, Charlas.
- Descarga y borrado de datos personales (Ley 21.719).
- CI en GitHub Actions.
