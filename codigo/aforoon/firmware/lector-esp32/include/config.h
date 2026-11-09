// Configuración del lector. Los UUID y códigos del protocolo son los mismos que usa la app en
// src/lib/lector/protocolo-ble.ts: si cambia uno, cambia el otro.
#pragma once

#define FW_VERSION 1

// ------------------------------------------------------------------ pines (informe v4, figura 6)
#define PIN_I2C_SDA 21
#define PIN_I2C_SCL 22
#define PIN_PN532_IRQ 4
#define PIN_PN532_RST 16
#define PIN_LED_DATA 18   // anillo WS2812 (con resistencia de 330 ohm)
#define PIN_BUZZER 19     // buzzer pasivo, vía transistor NPN
#define PIN_LED_PLACA 2   // LED azul del DevKit: encendido = enlazado y autenticado
#define LED_CANTIDAD 12
#define LED_BRILLO 77     // 30 % de 255

// ------------------------------------------------------------------ BLE
#define BLE_SERVICIO "6f1d0001-2b5a-4c8e-9a41-7a0f0c1e5a01"
#define BLE_LECTURA "6f1d0002-2b5a-4c8e-9a41-7a0f0c1e5a01"    // notify: trama de la tarjeta
#define BLE_RESULTADO "6f1d0003-2b5a-4c8e-9a41-7a0f0c1e5a01"  // write: secuencia, color, décimas
#define BLE_ESTADO "6f1d0004-2b5a-4c8e-9a41-7a0f0c1e5a01"     // read + notify: versión, banderas, desafío, lecturas
#define BLE_AUTH "6f1d0005-2b5a-4c8e-9a41-7a0f0c1e5a01"       // write: HMAC del desafío (16 bytes)
#define NOMBRE_POR_DEFECTO "AforoON-Lector-01"

// Tramas (sección 7)
#define TRAMA_SUN 0x11
#define TRAMA_UID 0x12
#define TRAMA_ERROR 0x1F
#define ERROR_SIN_NDEF 1
#define ERROR_NO_AFOROON 2
#define ERROR_INTERRUMPIDA 3

// Colores que manda el celular
#define COLOR_VERDE 1
#define COLOR_ROJO 2
#define COLOR_AMBAR 3
#define COLOR_SALIDA 4

// ------------------------------------------------------------------ tarjetas
// Dominio de la URL SUN grabada en las tarjetas NTAG 424 DNA (se define en la fase 5).
#define URL_SUN_PREFIJO "aforoon.cl/c?"
// Mientras no lleguen las NTAG 424 DNA (fase 5): las tarjetas comunes (MIFARE, NTAG213) se
// envían como trama 0x12 con su UID, para probar el enlace. En producción: 0.
#define MODO_PRUEBAS_UID 1

// ------------------------------------------------------------------ tiempos (ms)
#define MS_ENTRE_BUSQUEDAS 150
#define MS_ESPERA_TARJETA 50      // cuánto espera el PN532 una tarjeta en cada búsqueda
#define MS_ESPERA_RESULTADO 3000  // sin respuesta del celular: ámbar, "mire la pantalla del guardia"
#define MS_MOSTRAR_RESULTADO 2000
#define MS_AUTH_MAXIMO 5000       // un celular que no se autentica en 5 s se desconecta
#define MS_MISMA_TARJETA 2500     // la misma tarjeta no se vuelve a enviar antes de esto
#define MS_REVISAR_PN532 5000
#define S_WATCHDOG 8
