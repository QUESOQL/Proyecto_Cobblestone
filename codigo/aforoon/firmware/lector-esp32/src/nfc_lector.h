#pragma once
#include <stdint.h>

#include "ndef.h"

enum TipoLectura {
  LECTURA_NADA = 0,     // no hay tarjeta
  LECTURA_SUN,          // NTAG 424 DNA de AforoON: uid, contador y CMAC
  LECTURA_SOLO_UID,     // tarjeta sin aplicación NDEF (MIFARE, NTAG213 sin SUN...)
  LECTURA_NO_AFOROON,   // tiene NDEF, pero no es una URL de AforoON
  LECTURA_INTERRUMPIDA, // la tarjeta se retiró a mitad de la lectura
};

struct Lectura {
  TipoLectura tipo;
  uint8_t uid[7];  // los UID de 4 bytes van rellenos con ceros
  LecturaSUN sun;
};

bool nfcIniciar();
bool nfcResponde();  // el PN532 contesta por I2C
void nfcReiniciar(); // pulso en RSTO y nfcIniciar()
Lectura nfcLeer();
