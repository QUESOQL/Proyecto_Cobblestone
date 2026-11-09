#include "feedback.h"

#include <Adafruit_NeoPixel.h>
#include <Arduino.h>

#include "config.h"

static Adafruit_NeoPixel anillo(LED_CANTIDAD, PIN_LED_DATA, NEO_GRB + NEO_KHZ800);

enum Modo { RESPIRAR, FIJO, GIRAR, PARPADEAR };
static Modo modo = RESPIRAR;
static uint32_t colorActual = 0;
static uint32_t desde = 0;

// Cola corta de tonos: frecuencia (0 = silencio) y duración.
struct Tono {
  uint16_t hz;
  uint16_t ms;
};
static Tono cola[6];
static uint8_t nTonos = 0, iTono = 0;
static uint32_t tTono = 0;
static const uint8_t CANAL_BUZZER = 0;

static void tonos(std::initializer_list<Tono> t) {
  nTonos = 0;
  for (const Tono& x : t)
    if (nTonos < 6) cola[nTonos++] = x;
  iTono = 0;
  tTono = millis();
  ledcWriteTone(CANAL_BUZZER, nTonos ? cola[0].hz : 0);
}

static void poner(Modo m, uint32_t color) {
  modo = m;
  colorActual = color;
  desde = millis();
}

void feedbackIniciar() {
  anillo.begin();
  anillo.setBrightness(LED_BRILLO);
  anillo.show();
  ledcSetup(CANAL_BUZZER, 2000, 8);
  ledcAttachPin(PIN_BUZZER, CANAL_BUZZER);
  ledcWriteTone(CANAL_BUZZER, 0);
  pinMode(PIN_LED_PLACA, OUTPUT);
  feedbackSinEnlace();
}

void feedbackEnlazado(bool si) { digitalWrite(PIN_LED_PLACA, si ? HIGH : LOW); }

void feedbackSinEnlace() {
  if (modo != RESPIRAR) poner(RESPIRAR, anillo.Color(120, 0, 160));
}
void feedbackSinEnlaceLectura() { tonos({{440, 700}}); }
void feedbackListo() { poner(FIJO, anillo.Color(0, 0, 40)); }
void feedbackLeyendo() {
  poner(GIRAR, anillo.Color(255, 255, 255));
  tonos({{2400, 25}});
}
void feedbackSinRespuesta() {
  poner(FIJO, anillo.Color(255, 140, 0));
  tonos({{880, 200}});
}
void feedbackError() {
  poner(PARPADEAR, anillo.Color(255, 0, 0));
  tonos({{300, 100}, {0, 80}, {300, 100}, {0, 80}, {300, 100}});
}

void feedbackColor(uint8_t color, uint16_t ms) {
  (void)ms;  // el tiempo que dura lo controla main.cpp
  switch (color) {
    case COLOR_VERDE:
      poner(FIJO, anillo.Color(0, 255, 0));
      tonos({{1320, 90}, {1760, 140}});
      break;
    case COLOR_ROJO:
      poner(FIJO, anillo.Color(255, 0, 0));
      tonos({{330, 160}, {247, 240}});
      break;
    case COLOR_SALIDA:
      poner(FIJO, anillo.Color(0, 160, 255));
      tonos({{1320, 90}});
      break;
    default:  // ámbar: revisar en la pantalla del guardia
      poner(PARPADEAR, anillo.Color(255, 140, 0));
      tonos({{880, 200}});
  }
}

void feedbackActualizar() {
  const uint32_t t = millis() - desde;
  if (modo == FIJO) {
    anillo.fill(colorActual);
  } else if (modo == RESPIRAR) {
    // Sube y baja en 3 s.
    const float f = 0.15f + 0.85f * (0.5f - 0.5f * cosf((t % 3000) / 3000.0f * 2 * PI));
    const uint8_t r = ((colorActual >> 16) & 255) * f, g = ((colorActual >> 8) & 255) * f, b = (colorActual & 255) * f;
    anillo.fill(anillo.Color(r, g, b));
  } else if (modo == GIRAR) {
    anillo.clear();
    const uint8_t i = (t / 60) % LED_CANTIDAD;
    anillo.setPixelColor(i, colorActual);
    anillo.setPixelColor((i + 1) % LED_CANTIDAD, colorActual);
  } else {
    anillo.fill((t / 150) % 2 ? 0 : colorActual);
  }
  anillo.show();

  if (nTonos && millis() - tTono >= cola[iTono].ms) {
    iTono++;
    tTono = millis();
    if (iTono >= nTonos) {
      nTonos = 0;
      ledcWriteTone(CANAL_BUZZER, 0);
    } else {
      ledcWriteTone(CANAL_BUZZER, cola[iTono].hz);
    }
  }
}
