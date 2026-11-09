// Primera configuración por el monitor serie (115200 baudios, fin de línea \n):
//
//   NOMBRE AforoON-Lector-01     nombre con que se anuncia por BLE (el mismo del alta en AforoON)
//   CLAVE <64 hex>               clave HMAC que entregó scripts/equipo.mjs lector
//   ESTADO                       muestra nombre, si tiene clave y si el PN532 responde
//   REINICIAR                    reinicia (para anunciar el nombre nuevo)
//
// La clave nunca se imprime de vuelta.
#include "aprovisionamiento.h"

#include <Arduino.h>
#include <Preferences.h>

#include "config.h"
#include "nfc_lector.h"

static Preferences prefs;
static char nombre[30] = NOMBRE_POR_DEFECTO;
static uint8_t clave[32];
static bool conClave = false;
static String linea;

void aprovisionamientoCargar() {
  prefs.begin("aforoon", false);
  String n = prefs.getString("nombre", NOMBRE_POR_DEFECTO);
  strncpy(nombre, n.c_str(), sizeof(nombre) - 1);
  conClave = prefs.getBytes("clave", clave, sizeof(clave)) == sizeof(clave);
  Serial.printf("AforoON lector v%d · %s · %s\n", FW_VERSION, nombre, conClave ? "con clave" : "SIN CLAVE: envía CLAVE <64 hex>");
}

const char* nombreLector() { return nombre; }
bool tieneClave() { return conClave; }
const uint8_t* claveLector() { return clave; }

static bool nombreValido(const String& n) {
  if (n.length() < 3 || n.length() > 29) return false;
  for (char c : n)
    if (!isalnum(c) && c != '-') return false;
  return true;
}

static int hexDigito(char c) {
  if (c >= '0' && c <= '9') return c - '0';
  if (c >= 'a' && c <= 'f') return c - 'a' + 10;
  if (c >= 'A' && c <= 'F') return c - 'A' + 10;
  return -1;
}

static void atender(String cmd) {
  cmd.trim();
  if (cmd.startsWith("NOMBRE ")) {
    String n = cmd.substring(7);
    n.trim();
    if (!nombreValido(n)) {
      Serial.println("ERROR: el nombre lleva de 3 a 29 letras, números o guiones (ej.: AforoON-Lector-01)");
      return;
    }
    prefs.putString("nombre", n);
    Serial.printf("OK: nombre %s. Envía REINICIAR para anunciarlo.\n", n.c_str());
  } else if (cmd.startsWith("CLAVE ")) {
    String h = cmd.substring(6);
    h.trim();
    uint8_t nueva[32];
    if (h.length() != 64) {
      Serial.println("ERROR: la clave son 64 caracteres hexadecimales");
      return;
    }
    for (int i = 0; i < 32; i++) {
      const int a = hexDigito(h[2 * i]), b = hexDigito(h[2 * i + 1]);
      if (a < 0 || b < 0) {
        Serial.println("ERROR: la clave solo lleva 0-9 y a-f");
        return;
      }
      nueva[i] = (a << 4) | b;
    }
    prefs.putBytes("clave", nueva, sizeof(nueva));
    memcpy(clave, nueva, sizeof(clave));
    conClave = true;
    Serial.println("OK: clave guardada.");
  } else if (cmd == "ESTADO") {
    Serial.printf("Lector %s · firmware v%d · %s · PN532 %s\n", nombre, FW_VERSION, conClave ? "con clave" : "sin clave",
                  nfcResponde() ? "responde" : "NO RESPONDE (revisa cableado e interruptores I2C)");
  } else if (cmd == "REINICIAR") {
    Serial.println("Reiniciando…");
    delay(100);
    ESP.restart();
  } else if (cmd.length()) {
    Serial.println("Comandos: NOMBRE <nombre> · CLAVE <64 hex> · ESTADO · REINICIAR");
  }
}

void aprovisionamientoAtenderSerial() {
  while (Serial.available()) {
    const char c = Serial.read();
    if (c == '\n' || c == '\r') {
      if (linea.length()) atender(linea);
      linea = "";
    } else if (linea.length() < 100) {
      linea += c;
    }
  }
}
