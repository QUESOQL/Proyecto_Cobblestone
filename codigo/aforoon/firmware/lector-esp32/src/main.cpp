// Lector de tarjetas de AforoON (informe v4, sección 6.3): máquina de estados.
//
//   SIN_ENLACE  anuncia por BLE · morado lento · si acercan una tarjeta, pitido largo
//   ENLAZADO    un celular conectó · espera la autenticación (máx. 5 s)
//   LISTO       azul tenue · busca tarjeta cada 150 ms
//   ESPERANDO   trama enviada · blanco girando · máx. 3 s; si no responde, ámbar
//   MOSTRANDO   verde, rojo, ámbar o celeste por 2 s
#include <Arduino.h>
#include <esp_task_wdt.h>

#include "aprovisionamiento.h"
#include "ble_enlace.h"
#include "config.h"
#include "feedback.h"
#include "nfc_lector.h"

enum Estado { SIN_ENLACE, ENLAZADO, LISTO, ESPERANDO_RESULTADO, MOSTRANDO };
static Estado estado = SIN_ENLACE;
static uint8_t seq = 0;
static uint8_t ultimoUid[7];
static uint32_t tUltimo = 0, tEstado = 0, duracion = MS_MOSTRAR_RESULTADO;
static bool nfcOk = false;
static uint8_t fallosNfc = 0;

// Llega desde el callback BLE: se deja anotado y se atiende en el loop.
static volatile bool hayResultado = false;
static volatile uint8_t rSeq = 0, rColor = 0, rDecimas = 0;

void alRecibirResultado(uint8_t s, uint8_t color, uint8_t decimas) {
  rSeq = s;
  rColor = color;
  rDecimas = decimas;
  hayResultado = true;
}

static void atenderResultado() {
  if (!hayResultado) return;
  hayResultado = false;
  // seq 0: resultado de una lectura hecha sin el lector (QR con la cámara, RUT): se muestra igual.
  // Con otra secuencia, solo si es la respuesta a la última tarjeta enviada.
  if (rSeq != 0 && (estado != ESPERANDO_RESULTADO || rSeq != seq)) return;
  if (rColor < COLOR_VERDE || rColor > COLOR_SALIDA) return;
  duracion = rDecimas ? rDecimas * 100 : MS_MOSTRAR_RESULTADO;
  feedbackColor(rColor, duracion);
  estado = MOSTRANDO;
  tEstado = millis();
}

static void revisarPN532() {
  static uint32_t tRevision = 0;
  if (millis() - tRevision < MS_REVISAR_PN532) return;
  tRevision = millis();
  if (nfcResponde()) {
    fallosNfc = 0;
    if (!nfcOk) {
      nfcOk = true;
      bleNfcOk(true);
      if (estado == LISTO) feedbackListo();
    }
    return;
  }
  // Tras 3 revisiones fallidas: pulso en RSTO y se inicia de nuevo.
  if (++fallosNfc >= 3) {
    nfcReiniciar();
    fallosNfc = 0;
  }
  if (nfcOk) {
    nfcOk = false;
    bleNfcOk(false);
    feedbackError();
  }
}

void setup() {
  Serial.begin(115200);
  aprovisionamientoCargar();
  feedbackIniciar();
  nfcOk = nfcIniciar();
  if (!nfcOk) {
    Serial.println("PN532 sin respuesta: revisa el cableado I2C y los interruptores (SW1 = ON, SW2 = OFF).");
    feedbackError();
  }
  bleIniciar(nombreLector());
  bleNfcOk(nfcOk);
  // Si el loop se cuelga más de 8 s, el ESP32 se reinicia solo.
  esp_task_wdt_init(S_WATCHDOG, true);
  esp_task_wdt_add(NULL);
}

void loop() {
  esp_task_wdt_reset();
  aprovisionamientoAtenderSerial();
  bleExpulsarSiNoAuth();
  feedbackActualizar();
  revisarPN532();
  atenderResultado();

  // Enlace con el celular.
  const bool listo = bleListo();
  feedbackEnlazado(listo);
  if (!listo) {
    const Estado nuevo = bleConectadoSinAuth() ? ENLAZADO : SIN_ENLACE;
    if (estado != nuevo && estado != MOSTRANDO) {
      estado = nuevo;
      if (nfcOk) feedbackSinEnlace();
    }
  } else if (estado == SIN_ENLACE || estado == ENLAZADO) {
    estado = LISTO;
    if (nfcOk) feedbackListo();
  }

  if (estado == ESPERANDO_RESULTADO && millis() - tEstado > MS_ESPERA_RESULTADO) {
    feedbackSinRespuesta();  // "mire la pantalla del guardia"
    estado = MOSTRANDO;
    tEstado = millis();
    duracion = MS_MOSTRAR_RESULTADO;
  }
  if (estado == MOSTRANDO && millis() - tEstado > duracion) {
    estado = listo ? LISTO : SIN_ENLACE;
    if (!nfcOk) feedbackError();
    else if (listo) feedbackListo();
    else feedbackSinEnlace();
  }

  // Buscar tarjeta.
  static uint32_t tBusqueda = 0;
  if (!nfcOk || millis() - tBusqueda < MS_ENTRE_BUSQUEDAS) return;
  tBusqueda = millis();
  if (estado != LISTO && estado != SIN_ENLACE) return;

  const Lectura l = nfcLeer();
  if (l.tipo == LECTURA_NADA) return;
  if (memcmp(l.uid, ultimoUid, 7) == 0 && millis() - tUltimo < MS_MISMA_TARJETA) return;
  memcpy(ultimoUid, l.uid, 7);
  tUltimo = millis();

  if (estado == SIN_ENLACE) {
    feedbackSinEnlaceLectura();  // no hay celular: pitido largo
    return;
  }

  uint8_t trama[20] = {0};
  uint8_t largo = 0;
  if (++seq == 0) seq = 1;  // la secuencia 0 queda para lecturas sin el lector
  trama[1] = seq;
  if (l.tipo == LECTURA_SUN) {
    trama[0] = TRAMA_SUN;
    memcpy(trama + 2, l.sun.uid, 7);
    memcpy(trama + 9, l.sun.contador, 3);
    memcpy(trama + 12, l.sun.cmac, 8);
    largo = 20;
  } else if (MODO_PRUEBAS_UID && (l.tipo == LECTURA_SOLO_UID || l.tipo == LECTURA_NO_AFOROON)) {
    trama[0] = TRAMA_UID;
    memcpy(trama + 2, l.uid, 7);
    largo = 9;
  } else {
    trama[0] = TRAMA_ERROR;
    trama[2] = l.tipo == LECTURA_SOLO_UID ? ERROR_SIN_NDEF : l.tipo == LECTURA_NO_AFOROON ? ERROR_NO_AFOROON : ERROR_INTERRUMPIDA;
    largo = 3;
  }
  bleEnviarLectura(trama, largo);
  bleContarLectura();
  estado = ESPERANDO_RESULTADO;
  tEstado = millis();
  feedbackLeyendo();
}
