// Servidor GATT y autenticación del celular (informe v4, secciones 6.2 y 7).
// Al conectarse un celular, el lector genera un desafío de 8 bytes al azar; el celular debe
// escribir en Auth los primeros 16 bytes de HMAC-SHA256(clave del lector, desafío). Hasta
// entonces el lector no envía lecturas ni acepta colores, y a los 5 s lo desconecta.
#include "ble_enlace.h"

#include <Arduino.h>
#include <NimBLEDevice.h>
#include <esp_random.h>
#include <mbedtls/md.h>

#include "aprovisionamiento.h"
#include "config.h"

extern void alRecibirResultado(uint8_t seq, uint8_t color, uint8_t decimas);  // main.cpp

static NimBLEServer* servidor = nullptr;
static NimBLECharacteristic *cLectura = nullptr, *cEstado = nullptr;
static uint8_t desafio[8];
static volatile bool autenticado = false;
static volatile uint32_t tConexion = 0;
static bool nfcOk = true;
static uint16_t lecturas = 0;

static void publicarEstado() {
  uint8_t e[12];
  e[0] = FW_VERSION;
  e[1] = (nfcOk ? 0b01 : 0) | (autenticado ? 0b10 : 0);
  memcpy(e + 2, desafio, sizeof(desafio));
  e[10] = lecturas & 0xff;
  e[11] = lecturas >> 8;
  cEstado->setValue(e, sizeof(e));
  cEstado->notify();
}

static void nuevoDesafio() { esp_fill_random(desafio, sizeof(desafio)); }

static bool hmacValido(const uint8_t* respuesta, size_t largo) {
  if (!tieneClave() || largo != 16) return false;
  uint8_t esperado[32];
  mbedtls_md_hmac(mbedtls_md_info_from_type(MBEDTLS_MD_SHA256), claveLector(), 32, desafio, sizeof(desafio), esperado);
  // Comparación en tiempo constante.
  uint8_t dif = 0;
  for (int i = 0; i < 16; i++) dif |= esperado[i] ^ respuesta[i];
  return dif == 0;
}

class Servidor : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer* s, NimBLEConnInfo& info) override {
    autenticado = false;
    tConexion = millis();
    nuevoDesafio();
    publicarEstado();
  }
  void onDisconnect(NimBLEServer* s, NimBLEConnInfo& info, int razon) override {
    autenticado = false;
    nuevoDesafio();
    NimBLEDevice::startAdvertising();
  }
};

class Auth : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* c, NimBLEConnInfo& info) override {
    const std::string v = c->getValue();
    autenticado = hmacValido((const uint8_t*)v.data(), v.size());
    // Un intento fallido gasta el desafío: no se puede probar claves sobre el mismo.
    if (!autenticado) nuevoDesafio();
    publicarEstado();
  }
};

class Resultado : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* c, NimBLEConnInfo& info) override {
    const std::string v = c->getValue();
    if (autenticado && v.size() == 3) alRecibirResultado(v[0], v[1], v[2]);
  }
};

void bleIniciar(const char* nombre) {
  NimBLEDevice::init(nombre);
  servidor = NimBLEDevice::createServer();
  servidor->setCallbacks(new Servidor());
  NimBLEService* svc = servidor->createService(BLE_SERVICIO);
  cLectura = svc->createCharacteristic(BLE_LECTURA, NIMBLE_PROPERTY::NOTIFY);
  cEstado = svc->createCharacteristic(BLE_ESTADO, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);
  svc->createCharacteristic(BLE_AUTH, NIMBLE_PROPERTY::WRITE)->setCallbacks(new Auth());
  svc->createCharacteristic(BLE_RESULTADO, NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR)->setCallbacks(new Resultado());
  svc->start();
  nuevoDesafio();
  publicarEstado();

  NimBLEAdvertising* adv = NimBLEDevice::getAdvertising();
  adv->addServiceUUID(BLE_SERVICIO);  // Chrome filtra por este servicio
  adv->setName(nombre);
  adv->enableScanResponse(true);
  adv->start();
}

bool bleListo() { return autenticado && servidor && servidor->getConnectedCount() > 0; }

bool bleConectadoSinAuth() { return servidor && servidor->getConnectedCount() > 0 && !autenticado; }

void bleExpulsarSiNoAuth() {
  if (bleConectadoSinAuth() && millis() - tConexion > MS_AUTH_MAXIMO) {
    servidor->disconnect(servidor->getPeerInfo(0).getConnHandle());
    tConexion = millis();
  }
}

void bleEnviarLectura(const uint8_t* trama, uint8_t largo) {
  cLectura->setValue(trama, largo);
  cLectura->notify();
}

void bleNfcOk(bool ok) {
  if (ok == nfcOk) return;
  nfcOk = ok;
  publicarEstado();
}

void bleContarLectura() {
  lecturas++;
  publicarEstado();
}
