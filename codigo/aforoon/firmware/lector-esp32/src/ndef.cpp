#include "ndef.h"

#include <string.h>

// Busca "<nombre>=" en la consulta y lee 2*n dígitos hexadecimales.
static bool hexParam(const char* url, size_t largo, const char* nombre, uint8_t* out, size_t n) {
  const size_t ln = strlen(nombre);
  for (size_t i = 0; i + ln < largo; i++) {
    const bool inicio = i == 0 || url[i - 1] == '?' || url[i - 1] == '&';
    if (!inicio || strncmp(url + i, nombre, ln) != 0 || url[i + ln] != '=') continue;
    const char* h = url + i + ln + 1;
    if (h + 2 * n > url + largo) return false;
    for (size_t b = 0; b < n; b++) {
      uint8_t v = 0;
      for (int k = 0; k < 2; k++) {
        const char c = h[2 * b + k];
        v <<= 4;
        if (c >= '0' && c <= '9') v |= c - '0';
        else if (c >= 'A' && c <= 'F') v |= c - 'A' + 10;
        else if (c >= 'a' && c <= 'f') v |= c - 'a' + 10;
        else return false;
      }
      out[b] = v;
    }
    // El valor debe terminar ahí (fin de la URL u otro parámetro).
    const char* fin = h + 2 * n;
    return fin == url + largo || *fin == '&';
  }
  return false;
}

ResultadoNdef ndefExtraerSUN(const uint8_t* m, size_t largo, const char* prefijo, LecturaSUN& out) {
  // Registro corto bien conocido: cabecera con SR (0x10) y TNF 1, tipo de 1 byte 'U'.
  if (largo < 5) return NDEF_INVALIDO;
  const uint8_t cabecera = m[0];
  if ((cabecera & 0x07) != 0x01 || !(cabecera & 0x10) || m[1] != 1) return NDEF_INVALIDO;
  const size_t datos = m[2];
  if (m[3] != 'U' || 4 + datos > largo || datos < 2) return NDEF_INVALIDO;
  // Primer byte de los datos: prefijo de la URI (0x04 = "https://").
  if (m[4] != 0x04) return NDEF_NO_AFOROON;
  const char* url = (const char*)(m + 5);
  const size_t lurl = datos - 1;
  const size_t lp = strlen(prefijo);
  if (lurl < lp || strncmp(url, prefijo, lp) != 0) return NDEF_NO_AFOROON;
  const char* consulta = url + lp - 1;  // desde el '?'
  const size_t lc = lurl - lp + 1;
  if (!hexParam(consulta, lc, "u", out.uid, 7) || !hexParam(consulta, lc, "n", out.contador, 3) || !hexParam(consulta, lc, "m", out.cmac, 8))
    return NDEF_NO_AFOROON;
  return NDEF_OK;
}
