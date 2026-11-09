// Intérprete del mensaje NDEF de una tarjeta NTAG 424 DNA con SUN. Sin dependencias de
// Arduino, para poder probarlo en el computador (test/test_ndef).
#pragma once
#include <stddef.h>
#include <stdint.h>

struct LecturaSUN {
  uint8_t uid[7];
  uint8_t contador[3];  // en el orden de la URL
  uint8_t cmac[8];
};

enum ResultadoNdef {
  NDEF_OK = 0,
  NDEF_INVALIDO,     // no es un registro URI bien formado
  NDEF_NO_AFOROON,   // es una URL, pero no la de AforoON o le faltan parámetros
};

// Mensaje NDEF (sin los 2 bytes de largo NLEN) → u, n y m de https://<prefijo>u=..&n=..&m=..
ResultadoNdef ndefExtraerSUN(const uint8_t* msg, size_t largo, const char* prefijo, LecturaSUN& out);
