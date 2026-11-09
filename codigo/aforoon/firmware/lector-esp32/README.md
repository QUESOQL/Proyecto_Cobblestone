# Lector de tarjetas AforoON (ESP32 + PN532)

Firmware del lector del mesón de recepción. Lee tarjetas con el PN532 y se enlaza por
**Bluetooth (BLE)** con el celular del guardia, que abre `/recepcion` en Chrome. El lector no usa
Wi-Fi ni habla con Supabase: el celular valida y le devuelve el color (verde, rojo, ámbar o
celeste). Diseño completo en el informe de hardware v4, secciones 5 a 7.

## Materiales y cableado

| PN532 (modo I2C: SW1 = ON, SW2 = OFF) | ESP32 DevKit (WROOM-32) |
|---|---|
| VCC | 3V3 |
| GND | GND |
| SDA | GPIO21 |
| SCL | GPIO22 |
| IRQ | GPIO4 |
| RSTO | GPIO16 |

| Otros | ESP32 |
|---|---|
| Anillo WS2812 de 12 LED: DIN (con resistencia de 330 Ω) | GPIO18 |
| Anillo WS2812: 5V y GND | VIN (5 V) y GND |
| Buzzer pasivo, vía transistor NPN 2N2222 y resistencia de 1 kΩ a la base | GPIO19 |

- Si el módulo PN532 no trae resistencias pull-up, agrega 4,7 kΩ de SDA y de SCL a 3,3 V.
- Todas las tierras unidas. Alimentación con un cargador USB de 5 V / 2 A.
- El anillo y el buzzer son opcionales para probar: sin ellos, el LED azul de la placa se
  enciende cuando el celular está enlazado y autenticado.

## Compilar y cargar

Con [PlatformIO](https://platformio.org/install/cli) (o la extensión de VS Code):

```sh
cd firmware/lector-esp32
pio run -t upload        # compila y carga por USB
pio device monitor       # monitor serie a 115200
```

## Darlo de alta y grabarle la clave

1. En la raíz del proyecto (usa la clave secreta de `.env.local`):

   ```sh
   node scripts/equipo.mjs lector AforoON-Lector-01
   ```

   La clave del lector queda en `.env.lector.local` (no se sube a git) y nunca se muestra.

2. Con el lector por USB y `pio device monitor` abierto, escribe:

   ```
   NOMBRE AforoON-Lector-01
   CLAVE <el valor de LECTOR_AFOROON_LECTOR_01 en .env.lector.local>
   REINICIAR
   ```

   `ESTADO` muestra el nombre, si tiene clave y si el PN532 responde. La clave no se imprime nunca.

Volver a correr `equipo.mjs lector` con el mismo nombre cambia la clave: el lector deja de
enlazarse hasta que le grabes la nueva.

## Probarlo con el celular

1. En el celular Android del guardia, abre https://aforo-on.vercel.app/recepcion en Chrome,
   entra con la cuenta del terminal y abre el turno con tu PIN.
2. En "Lector de tarjetas", toca **Conectar lector** y elige `AforoON-Lector-01`. Chrome pide
   permiso de Bluetooth (y de ubicación en algunos Android).
3. El anillo pasa de morado a azul tenue. Acerca una tarjeta: en la pantalla aparece
   **Ámbar · revisar** con su UID y el anillo parpadea en ámbar.
4. Registra a alguien por RUT o con su QR: el anillo se pone verde (o rojo) al mismo tiempo que
   la pantalla.

Mientras no lleguen las tarjetas NTAG 424 DNA (fase 5), `MODO_PRUEBAS_UID` en
`include/config.h` hace que cualquier tarjeta (MIFARE, NTAG213, el llavero que trae el PN532) se
envíe con su UID para probar el enlace. En producción se deja en `0`.

## Luz y sonido

| Situación | Anillo | Buzzer |
|---|---|---|
| Sin celular enlazado | Morado, respiración lenta | Pitido largo si acercan una tarjeta |
| Listo | Azul tenue | — |
| Leyendo | Blanco girando | Clic corto |
| Aprobado | Verde 2 s | Dos tonos ascendentes |
| Rechazado | Rojo 2 s | Dos tonos graves |
| Revisar (o el celular no respondió en 3 s) | Ámbar | Un tono medio |
| Salida | Celeste 2 s | Un tono corto |
| PN532 sin respuesta | Rojo parpadeo rápido | Tres pitidos; se reinicia por RSTO |

## Seguridad del enlace

Al conectarse, el lector entrega un desafío de 8 bytes al azar y el celular debe responder con
HMAC-SHA256 usando la clave del lector, que pide a Supabase con la sesión del terminal
(`clave_lector()`). Un celular que no responde en 5 s se desconecta, y un intento fallido gasta
el desafío. Así un celular ajeno no puede hacerle mostrar verde, y el celular sabe que habla
con su lector y no con uno que imita el nombre. Las tarjetas mismas se protegen con su CMAC
(fase 5).

## Pruebas

`test/test_ndef` prueba el intérprete de la URL SUN (`pio test -e native`, necesita gcc en el
computador). La parte de la app se prueba con un lector simulado que sigue este mismo protocolo
(`tests/lector.spec.ts`).
