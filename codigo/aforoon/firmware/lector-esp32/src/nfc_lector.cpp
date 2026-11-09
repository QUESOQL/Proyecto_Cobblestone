// PN532 por I2C (informe v4, sección 6.1). Se lee el archivo NDEF como lo haría un teléfono;
// al leerlo, la NTAG 424 DNA genera una URL con contador y CMAC nuevos.
#include "nfc_lector.h"

#include <Adafruit_PN532.h>
#include <Arduino.h>
#include <Wire.h>

#include "config.h"

static Adafruit_PN532 nfc(PIN_PN532_IRQ, PIN_PN532_RST, &Wire);

bool nfcIniciar() {
  Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL, 100000);
  nfc.begin();
  if (!nfc.getFirmwareVersion()) return false;  // sin respuesta: revisar cableado o interruptores I2C
  nfc.SAMConfig();
  nfc.setPassiveActivationRetries(0x01);  // no bloquear el loop esperando tarjetas
  return true;
}

bool nfcResponde() { return nfc.getFirmwareVersion() != 0; }

void nfcReiniciar() {
  pinMode(PIN_PN532_RST, OUTPUT);
  digitalWrite(PIN_PN532_RST, LOW);
  delay(10);
  digitalWrite(PIN_PN532_RST, HIGH);
  delay(50);
  nfcIniciar();
}

// Envía una APDU; true si la tarjeta respondió 90 00.
static bool apdu(const uint8_t* cmd, uint8_t largo, uint8_t* resp, uint8_t& rlargo) {
  uint8_t max = rlargo;
  if (!nfc.inDataExchange((uint8_t*)cmd, largo, resp, &max)) return false;
  rlargo = max;
  return rlargo >= 2 && resp[rlargo - 2] == 0x90 && resp[rlargo - 1] == 0x00;
}

Lectura nfcLeer() {
  Lectura l = {};
  uint8_t uid[7] = {0};
  uint8_t uidLargo = 0;
  if (!nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &uidLargo, MS_ESPERA_TARJETA)) return l;
  memcpy(l.uid, uid, uidLargo > 7 ? 7 : uidLargo);

  static const uint8_t SEL_APP[] = {0x00, 0xA4, 0x04, 0x00, 0x07, 0xD2, 0x76, 0x00, 0x00, 0x85, 0x01, 0x01, 0x00};
  static const uint8_t SEL_NDEF[] = {0x00, 0xA4, 0x00, 0x0C, 0x02, 0xE1, 0x04};
  static const uint8_t LEER_LARGO[] = {0x00, 0xB0, 0x00, 0x00, 0x02};
  uint8_t r[64];
  uint8_t rl;

  // Sin aplicación NDEF ISO-DEP: tarjeta común (o una NTAG 424 sin configurar).
  rl = sizeof(r);
  if (!apdu(SEL_APP, sizeof(SEL_APP), r, rl)) {
    l.tipo = LECTURA_SOLO_UID;
    return l;
  }
  rl = sizeof(r);
  if (!apdu(SEL_NDEF, sizeof(SEL_NDEF), r, rl)) {
    l.tipo = LECTURA_SOLO_UID;
    return l;
  }
  rl = sizeof(r);
  if (!apdu(LEER_LARGO, sizeof(LEER_LARGO), r, rl)) {
    l.tipo = LECTURA_INTERRUMPIDA;
    return l;
  }
  const uint16_t nlargo = (r[0] << 8) | r[1];
  if (nlargo == 0 || nlargo > 200) {
    l.tipo = LECTURA_NO_AFOROON;
    return l;
  }

  uint8_t msg[200];
  uint16_t leido = 0;
  while (leido < nlargo) {
    const uint8_t n = min<uint16_t>(48, nlargo - leido);
    const uint16_t desde = 2 + leido;
    const uint8_t cmd[] = {0x00, 0xB0, (uint8_t)(desde >> 8), (uint8_t)desde, n};
    rl = sizeof(r);
    if (!apdu(cmd, sizeof(cmd), r, rl) || rl < 3) {
      l.tipo = LECTURA_INTERRUMPIDA;
      return l;
    }
    const uint16_t llegaron = min<uint16_t>(rl - 2, nlargo - leido);
    memcpy(msg + leido, r, llegaron);
    leido += llegaron;
  }

  l.tipo = ndefExtraerSUN(msg, nlargo, URL_SUN_PREFIJO, l.sun) == NDEF_OK ? LECTURA_SUN : LECTURA_NO_AFOROON;
  return l;
}
