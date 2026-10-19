# AforoON — Prototipo de frontend

Sistema de acceso, reservas con control de aforo y dashboard para el **Hub Providencia** (Los Jesuitas 881). Parte del Proyecto Capstone Intermedio 2026 del **Equipo Cobblestone**.

Reemplaza el QR estático con formulario que hoy se llena en cada visita por un **enrolamiento único**, una **credencial NFC con QR dinámico** y un **terminal en la puerta** con LED verde o rojo. La administración recibe métricas reales de ocupación y caracterización de usuarios.

## Pantallas

| Ruta | Pantalla | Quién la usa | Qué hace |
| --- | --- | --- | --- |
| `/` | Landing | Público | Presenta AforoON. Incluye una comparación en vivo entre el formulario de hoy y la puerta con AforoON. |
| `/avance` | Avance del prototipo | Equipo | Índice de las cinco pantallas para presentar. |
| `/registro` | Enrolamiento único y credencial | Socio, teléfono | Cuenta, datos con RUT validado, consentimiento (Ley 21.719), credencial NFC y QR dinámico que cambia cada 30 s. |
| `/reservar` | Selección de espacio y bloque | Socio, teléfono | Día, zona, espacio y bloque con su aforo. Bloquea bloques llenos o pasados, superposiciones y más de 3 reservas activas. |
| `/inicio` | Inicio del socio | Socio, teléfono | Próxima reserva, ocupación del Hub en este momento, charlas con inscripción y capacitadores. |
| `/recepcion` | Terminal de acceso | Recepción, tablet | Lectura NFC o QR, LED, tiempo de validación contra la meta de 7 s, excepciones, entradas y salidas, modo sin conexión. |
| `/admin` | Dashboard de ocupación | Administración, computador | Entradas, ocupación por bloque y zona, no-show, horas punta, perfiles de usuario, charlas y exportación CSV. |

Las pantallas comparten la misma sesión, guardada en el navegador: lo que reservas en el teléfono aparece en el terminal y en el dashboard. El botón "Borrar mi cuenta" o "Reiniciar demo" deja todo en blanco.

## Cómo correrlo

Requiere Node 20 o superior.

```bash
npm install
npm run dev
```

Abre http://localhost:3000.

## Pruebas

Pruebas end-to-end con Playwright. Usan el Chrome instalado en el equipo; no descargan navegadores.

```bash
npm run test:e2e
```

Cubren el flujo de cada pantalla y revisan cada ruta a 390, 768 y 1440 px, sin scroll lateral ni errores de consola. Las capturas quedan en `tests/screenshots/`.

## Diseño

- **Sistema de diseño en Figma:** [AforoON — Sistema de diseño](https://www.figma.com/design/NK1PirX0HLADYyv9tvmqcj). Tiene variables de color y espaciado con su sintaxis CSS, estilos de texto DM Sans y una lámina de fundamentos.
- **Pantallas de app:** estilo *accent-ladder* (taste skill) con el azul de HUB Providencia. El azul pleno solo va en lo ocupado y en la acción principal; sus tintes forman las pistas de aforo.
- **Landing:** dirección *The sentence is the layout*. En el nombre AforoON, la segunda O es la foto real de la puerta del Edificio Cowork.
- **Movimiento:** curvas y duraciones de Emil Kowalski (ease-out fuerte, hojas con curva *drawer*, botones que se hunden al presionar) y respeto por `prefers-reduced-motion`.
- **Revisión:** taste skill (`lint.mjs` e `inspect.mjs`) e Impeccable (`audit` y detector).

## Estructura

```
src/app/           una carpeta por pantalla (page.tsx)
src/components/    ui.tsx (marca, botones, pista de aforo, hoja inferior), charts.tsx, landing/
src/lib/data.ts    catálogo real del Hub y datos de ejemplo deterministas
src/lib/store.ts   estado compartido y reglas de aforo (Sección 8 del Master Plan)
public/hub/        fotos del Hub tomadas por el equipo en la salida a terreno
tests/             pruebas Playwright y capturas
```

## Antes de producción

- **Datos de ejemplo:** los socios, las reservas, las charlas y los capacitadores son datos de ejemplo generados en `src/lib/data.ts`. Se reemplazan por la API real (base de datos y registro de Víctor).
- **Reglas de aforo:** en el prototipo corren en el navegador. En producción la garantía contra la sobreventa debe estar en PostgreSQL (`SELECT … FOR UPDATE` sobre la tabla contadora).
- **Hardware de la puerta:** la lectura NFC y QR del terminal está simulada. Falta conectarla al hardware (ESP32 con sensor NFC y LED).
- **Inicio de sesión:** el ingreso con Google o Apple está simulado.
