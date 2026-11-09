#pragma once
#include <stdint.h>

// Nombre BLE y clave HMAC del lector, guardados en la memoria NVS del ESP32.
void aprovisionamientoCargar();
void aprovisionamientoAtenderSerial();
const char* nombreLector();
bool tieneClave();
const uint8_t* claveLector();  // 32 bytes
