# AforoON: informe de la aplicación para integrar el hardware de la puerta

> Contexto para quien lea esto (persona o IA): AforoON es el prototipo de credencial digital, reservas y control de aforo del **Hub Providencia** (Los Jesuitas 881, Santiago, Chile), un espacio municipal gratuito. Lo desarrolla el Equipo Cobblestone (Capstone 2026, Universidad Mayor). Este documento describe qué existe hoy en el software para que se pueda diseñar cómo conectarlo con el **hardware de acceso**: lectores NFC, cámara o lector de QR, el terminal de recepción y, eventualmente, el actuador de la puerta (luz verde/roja o relé).
>
> **Pregunta central:** ¿cómo conectar lectores NFC y QR físicos a esta app para que la validación de acceso ocurra de verdad, en menos de 7 segundos, incluso sin internet?

Fecha del informe: noviembre de 2026. Repositorio del equipo: `QUESOQL/Proyecto_Cobblestone`, carpeta `codigo/aforoon`.

---

## 1. Qué hace la app (en una frase por actor)

- **Vecino o socio:** se registra una vez (correo y contraseña, RUT, teléfono, perfil), reserva mesas, oficinas, charlas o máquinas, y en la puerta debería **acercar el teléfono (NFC) o mostrar un QR** en vez de llenar un formulario.
- **Recepción:** tiene un **terminal** en la puerta que lee la credencial, la cruza con la reserva del bloque en curso y muestra verde (pasa) o rojo (no pasa), con nombre y foto, nunca el RUT completo.
- **Administración:** ve ocupación, entradas, horas punta, quiénes vienen y aprueba las capacitaciones obligatorias para usar máquinas.

## 2. Tecnología

| Capa | Herramienta |
|---|---|
| Interfaz web | Next.js 15.5 (App Router), React 19.1, TypeScript, Tailwind CSS 4 |
| Estado en el navegador | Zustand 5 (`src/lib/store.ts`) |
| Backend | **Supabase**: PostgreSQL + Auth (correo y contraseña) + permisos por fila (RLS) + Vault para la clave de cifrado del RUT |
| Reglas de negocio | Funciones SQL (`security definer`) en `supabase/migrations/` |
| QR en pantalla | `qrcode.react` |
| Pruebas | Playwright (23 pruebas e2e contra la base real, con cuentas desechables) |
| Zona horaria | Siempre `America/Santiago` en el servidor |

La app se usa desde el navegador (teléfono, tablet o computador). **No hay app nativa** (ni Android ni iOS) y no hay backend propio aparte de Supabase: el navegador llama directamente a las funciones SQL con la clave pública, y los permisos los decide la base.

## 3. Estructura de carpetas y qué contiene cada archivo

```
aforoon/
├── src/app/                      Pantallas (cada carpeta es una ruta)
│   ├── page.tsx                  /            Landing pública (estilo Uber)
│   ├── landing.css               Estilos de las páginas públicas
│   ├── globals.css               Sistema de diseño de toda la app (tokens y componentes)
│   ├── layout.tsx                Fuente Inter y metadatos
│   ├── hub/[slug]/page.tsx       /hub/lab881, /hub/cowork-textil, …  Páginas de detalle de cada espacio
│   ├── registro/page.tsx         /registro    Cuenta + datos únicos + CREDENCIAL (NFC y QR dinámico)
│   ├── reservar/page.tsx         /reservar    Reserva de mesas, oficinas, set, salas (bloques de 2 h)
│   ├── inicio/page.tsx           /inicio      Próxima reserva, aforo en vivo, charlas, capacitaciones
│   ├── maquinas/page.tsx         /maquinas    Reserva de impresoras 3D, láser, resina, máquinas de coser
│   ├── capacitaciones/page.tsx   /capacitaciones  Inscripción a capacitaciones obligatorias
│   ├── recepcion/page.tsx        /recepcion   TERMINAL DE ACCESO (lo que se conecta al hardware)
│   ├── admin/page.tsx            /admin       Panel de ocupación + aprobación de capacitaciones
│   └── avance/page.tsx           /avance      Portada del avance del proyecto
├── src/components/
│   ├── ui.tsx                    Componentes compartidos (barra, botón, tarjeta, pestañas, hoja, aviso)
│   ├── charts.tsx                Gráficos del panel
│   ├── training-admin.tsx        Aprobación de capacitaciones (admin, ya conectado a Supabase)
│   └── landing/                  Piezas de la landing y páginas del Hub (imágenes, textos, secciones)
├── src/lib/
│   ├── supabase.ts               Cliente de Supabase del navegador + conversión de horas a Santiago
│   ├── store.ts                  Estado de la app: carga desde Supabase y llama a las funciones SQL
│   ├── data.ts                   Catálogo (zonas, unidades, bloques, charlas) y datos de ejemplo deterministas
│   └── lab.ts                    Máquinas, capacitaciones, horarios y reglas del Lab881 y cowork textil
├── supabase/migrations/
│   ├── 0001_esquema.sql          17 tablas
│   ├── 0002_reglas.sql           Reglas de negocio como funciones SQL (incluye registrar_acceso)
│   ├── 0003_seguridad.sql        Permisos por fila (RLS)
│   ├── 0004_reloj_demo.sql       Reloj fijo de demo (10:24) y versión final de registrar_acceso
│   └── 0005_borrar_personas.sql  Borrado seguro de personas
├── scripts/seed-demo.mjs         Carga 286 socios y ~1.800 reservas de ejemplo
├── tests/                        Pruebas Playwright (una por pantalla) y limpieza de cuentas de prueba
└── docs/backend.md               Plan del backend
```

## 4. Datos relevantes para la puerta

### Tablas (PostgreSQL)

- **`personas`**: `id` (uuid), `user_id` (cuenta de Supabase Auth), `nombre`, `rut_cifrado` (bytea, pgcrypto), `rut_huella` (HMAC para buscar), `rut_mascara` ("17.482.***-2", lo único que ve recepción), `segmento`, `rol` (`vecino` / `recepcion` / `admin`), `verificada` (booleano: terminó su enrolamiento), `tono` (color del avatar).
- **`reservas`**: espacio (`unidad_id`), `dia`, `bloque_id` (bloques de 2 h, de 08:00 a 20:00), `estado` (`confirmada` / `completada` / `no_show` / `cancelada`), `entrada_at`, `salida_at`, `metodo` (`nfc` / `qr`).
- **`reservas_maquina`**: máquina, `inicio`, `fin`, `horas`, `estado`, `motivo_cancelacion` (`usuario` / `atraso` / `administracion`), `entrada_at`. Si la persona llega más de 20 minutos tarde, la reserva se cancela.
- **`inscripciones_capacitacion`**: para usar una máquina hay que tener aprobada su capacitación; esto se revisa también en la puerta.
- **`accesos`**: **cada lectura en la puerta**, con `persona_id`, `sentido` (`entrada` / `salida`), `resultado` (`aprobado` / `sin_reserva` / `no_enrolado` / `excepcion` / `sin_capacitacion` / `atrasado`), `metodo` (`nfc` / `qr` / `rut`), `latencia` (segundos), `en_cola` (se registró sin conexión), `registrado_por`, `ocurrido_at`.

### La función que valida un acceso (ya existe en el servidor)

```sql
registrar_acceso(
  p_persona  uuid,              -- quién se identificó
  p_metodo   text,              -- 'nfc' | 'qr' | 'rut'
  p_sentido  text default 'entrada',   -- 'entrada' | 'salida'
  p_latencia numeric default null,     -- segundos que tardó la lectura
  p_en_cola  boolean default false     -- true si se registró sin conexión y se sincroniza después
) returns json  -- { acceso_id, resultado, reserva_id, reserva_maquina_id }
```

- **Permisos:** solo una sesión con rol `recepcion` o `admin` puede llamarla (si no, `sin_permiso`).
- **Qué hace:**
  1. Busca la reserva de esa persona en el **bloque en curso**.
  2. Si no la hay, busca una **reserva de máquina** que empiece dentro de la próxima hora o esté en curso.
  3. Decide el resultado y cancela la reserva de máquina si hubo atraso de más de 20 minutos.
  4. Marca entrada o salida en la reserva y guarda la fila en `accesos`.
- **Excepción manual de recepción:** `permitir_excepcion(p_persona uuid, p_metodo text) returns uuid`.
- **Hora:** usa `ahora()` y `hora_local()`. Con el ajuste de demo activo (`ajustes.hora_demo = '10:24'`), la hora queda fija; para producción se borra ese ajuste.

**Importante:** `registrar_acceso` recibe **el id de la persona**. Traducir "lo que leyó el lector" (UID de una tarjeta, contenido de un QR) a ese id **todavía no existe**: es justamente lo que hay que diseñar.

## 5. Estado actual de NFC, QR y la recepción (sin hardware)

| Pieza | Cómo está hoy | Qué falta |
|---|---|---|
| **"Credencial NFC activa"** en `/registro` | Es **solo un texto en pantalla**. El navegador no emite NFC. | Definir el soporte real (ver sección 6). |
| **QR dinámico** en `/registro` | Cambia cada **30 s**. Contenido actual: `AFORO:1:<últimos 6 dígitos del RUT>:<marca de tiempo>`. **No está firmado ni se verifica**: es de demostración. | Un formato firmado y verificable (por ejemplo HMAC o tipo TOTP con un secreto por persona), que el terminal valide incluso sin conexión y que no exponga el RUT. |
| **Terminal `/recepcion`** | **Simulado**: una lista de personas con botones "NFC" y "QR" que imitan la lectura (latencia inventada de 0,5 a 1,6 s). Usa datos de ejemplo locales y **todavía no llama a `registrar_acceso`**. Tiene modo "sin conexión" simulado (cola local que se sincroniza al volver). | Recibir lecturas reales del hardware, llamar a `registrar_acceso` con una sesión de recepción y guardar una copia local del día para validar sin internet. |
| **Luz o puerta** | En pantalla: círculo verde ("Verde · pasa") o rojo ("Rojo · no pasa"). No controla nada físico. | Decidir si hay LED, buzzer o relé de cerradura, y cómo recibe la orden. |
| **Respaldo sin teléfono** | La persona da su RUT en recepción (método `rut`). | Buscar por la huella del RUT (`rut_huella`) sin exponerlo. |

**Metas del equipo:** validar en **menos de 7 segundos** desde que la persona se acerca, y **seguir funcionando sin internet**.

## 6. Decisiones de hardware que hay que tomar (preguntas para la IA)

### 6.1 Qué lleva la persona

Las opciones a evaluar (no hay nada decidido):

- **a) El teléfono emite NFC** (emulación de tarjeta, HCE). Un sitio web **no puede** hacerlo: requiere una **app nativa Android**. En iPhone la emulación de tarjeta por apps de terceros está muy restringida (conviene verificar el estado actual por país). Otra vía son las **tarjetas de Apple Wallet o Google Wallet con NFC**, que requieren aprobación de Apple o Google.
- **b) Tarjeta o llavero NFC físico** (por ejemplo MIFARE o NTAG) entregado al enrolarse. Es lo más simple y barato. El UID de la tarjeta se asocia a la persona, aunque un UID se puede clonar: hay que evaluar NTAG 424 DNA o MIFARE DESFire si se necesita seguridad real.
- **c) Solo QR dinámico** en la pantalla del teléfono, leído por una cámara o lector de QR. Funciona hoy con la web y sirve en cualquier teléfono.
- Lo más probable es una **combinación**: QR dinámico para todos, más tarjeta NFC para quien no tenga teléfono o prefiera no usarlo.

### 6.2 Qué lee en la puerta y cómo llega a la app

Opciones a evaluar:

1. **Lectores USB conectados al tablet o PC de recepción**, que corre `/recepcion` en el navegador.
   - Los lectores de QR suelen funcionar como **teclado (HID)**: "escriben" el contenido del QR seguido de Enter. Es lo más fácil de integrar: un campo oculto con foco recibe la lectura.
   - Los lectores NFC USB pueden ser tipo teclado (escriben el UID) o PC/SC (por ejemplo ACR122U), que necesitan un puente local: un pequeño servicio que lee PC/SC y lo pasa al navegador por WebSocket.
   - Otra alternativa es **Web NFC** (solo Chrome en Android) si el terminal es un teléfono o tablet Android.
2. **Equipo autónomo en la puerta**, por ejemplo ESP32 o Raspberry Pi con un módulo PN532/RC522 y un módulo lector de QR (GM65 u otro). Este equipo llama por HTTPS a un endpoint del servidor y enciende el LED o el relé según la respuesta. Necesita su propia credencial de dispositivo.
3. **Cámara del tablet** leyendo el QR desde el navegador (`getUserMedia` + una librería de decodificación). No requiere hardware extra, pero es más lento y depende de la luz.

### 6.3 Preguntas concretas para resolver

1. ¿Qué combinación de lector NFC y lector de QR recomiendas para el Hub (costo, robustez, velocidad menor a 7 s), y cómo se conecta: USB HID, PC/SC con puente local, o equipo autónomo?
2. ¿Qué formato de **QR firmado** conviene (HMAC, TOTP, JWT corto) para que el terminal lo verifique sin internet y una captura de pantalla no sirva, dado que hoy cambia cada 30 s?
3. ¿Cómo se asocia una **tarjeta NFC** a una persona? Habría que agregar una tabla de credenciales (`credenciales`: persona_id, tipo `nfc_uid` / `qr_secreto`, valor con hash, estado, fecha de alta y baja) y una función `identificar(tipo, valor) → persona_id`.
4. ¿Cómo se **autentica el dispositivo** de la puerta ante Supabase: una cuenta con rol `recepcion` por terminal, una clave de dispositivo con una Edge Function intermedia, u otra opción? Hoy `registrar_acceso` exige una sesión con rol `recepcion` o `admin`.
5. **Sin internet:** ¿cómo descarga el terminal la copia del día (reservas del bloque, credenciales válidas, capacitaciones vigentes), cómo valida localmente y cómo sincroniza después? `registrar_acceso` ya acepta `p_en_cola = true`.
6. Si hay **cerradura o relé**: ¿quién manda la orden (el navegador del terminal, un microcontrolador, un servicio local) y qué pasa si se corta la luz o la red?
7. **Datos personales (Ley 21.719 de Chile):** el terminal no debe ver el RUT completo, y las lecturas quedan registradas en `accesos`. ¿Qué más hay que cuidar al guardar UID de tarjetas o secretos de QR?

## 7. Cómo probarlo localmente

```bash
npm install
npm run dev          # http://localhost:3000
npm run test:e2e     # pruebas contra el Supabase de .env.local
```

- **Claves:** se necesita un archivo `.env.local` (no está en el repositorio) con `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`.
- **Recepción:** el terminal está en `/recepcion`.
- **Demo:** la base trae 286 socios de ejemplo, con el reloj fijo en las 10:24 (bloque de 10:00 a 12:00 en curso).

## 8. Lo que todavía no está hecho (para no asumirlo)

- **Recepción y panel de ocupación:** usan datos locales de ejemplo; no están conectados a Supabase.
- **Sin integración física:** no hay app nativa, ni NFC real, ni QR firmado, ni lector conectado.
- **Sin modelo de credenciales:** no existe una tabla de credenciales (UID o secretos de QR) ni una función para identificar a la persona desde una lectura.
- **Sin dispositivos:** no hay autenticación de dispositivos ni endpoint para equipos autónomos.
- **Sin publicar:** la app no está desplegada; solo corre en local (`localhost:3000`).
