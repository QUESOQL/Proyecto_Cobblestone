// Pruebas del intérprete NDEF (pio test -e native; necesita gcc en el computador).
#include <string.h>
#include <unity.h>

#include "../../src/ndef.h"

static const char* PREFIJO = "aforoon.cl/c?";

// Arma un registro URI corto: D1 01 <largo> 'U' 04 "<url>".
static size_t registro(uint8_t* m, const char* url, uint8_t prefijoUri = 0x04) {
  const size_t l = strlen(url);
  m[0] = 0xD1;
  m[1] = 0x01;
  m[2] = (uint8_t)(l + 1);
  m[3] = 'U';
  m[4] = prefijoUri;
  memcpy(m + 5, url, l);
  return 5 + l;
}

void test_url_valida() {
  uint8_t m[200];
  const size_t n = registro(m, "aforoon.cl/c?u=04A1B2C3D4E5F6&n=00002A&m=94EED9EE65337086");
  LecturaSUN s;
  TEST_ASSERT_EQUAL(NDEF_OK, ndefExtraerSUN(m, n, PREFIJO, s));
  const uint8_t uid[7] = {0x04, 0xA1, 0xB2, 0xC3, 0xD4, 0xE5, 0xF6};
  const uint8_t ctr[3] = {0x00, 0x00, 0x2A};
  const uint8_t cmac[8] = {0x94, 0xEE, 0xD9, 0xEE, 0x65, 0x33, 0x70, 0x86};
  TEST_ASSERT_EQUAL_UINT8_ARRAY(uid, s.uid, 7);
  TEST_ASSERT_EQUAL_UINT8_ARRAY(ctr, s.contador, 3);
  TEST_ASSERT_EQUAL_UINT8_ARRAY(cmac, s.cmac, 8);
}

void test_minusculas_y_otro_orden() {
  uint8_t m[200];
  const size_t n = registro(m, "aforoon.cl/c?m=94eed9ee65337086&u=04a1b2c3d4e5f6&n=00002a");
  LecturaSUN s;
  TEST_ASSERT_EQUAL(NDEF_OK, ndefExtraerSUN(m, n, PREFIJO, s));
  TEST_ASSERT_EQUAL_UINT8(0x2A, s.contador[2]);
}

void test_otro_dominio() {
  uint8_t m[200];
  const size_t n = registro(m, "example.com/c?u=04A1B2C3D4E5F6&n=00002A&m=94EED9EE65337086");
  LecturaSUN s;
  TEST_ASSERT_EQUAL(NDEF_NO_AFOROON, ndefExtraerSUN(m, n, PREFIJO, s));
}

void test_http_en_vez_de_https() {
  uint8_t m[200];
  const size_t n = registro(m, "aforoon.cl/c?u=04A1B2C3D4E5F6&n=00002A&m=94EED9EE65337086", 0x03);
  LecturaSUN s;
  TEST_ASSERT_EQUAL(NDEF_NO_AFOROON, ndefExtraerSUN(m, n, PREFIJO, s));
}

void test_parametro_corto_o_largo() {
  uint8_t m[200];
  LecturaSUN s;
  size_t n = registro(m, "aforoon.cl/c?u=04A1B2C3D4E5&n=00002A&m=94EED9EE65337086");
  TEST_ASSERT_EQUAL(NDEF_NO_AFOROON, ndefExtraerSUN(m, n, PREFIJO, s));
  n = registro(m, "aforoon.cl/c?u=04A1B2C3D4E5F6FF&n=00002A&m=94EED9EE65337086");
  TEST_ASSERT_EQUAL(NDEF_NO_AFOROON, ndefExtraerSUN(m, n, PREFIJO, s));
  n = registro(m, "aforoon.cl/c?u=04A1B2C3D4E5G6&n=00002A&m=94EED9EE65337086");
  TEST_ASSERT_EQUAL(NDEF_NO_AFOROON, ndefExtraerSUN(m, n, PREFIJO, s));
}

void test_falta_parametro() {
  uint8_t m[200];
  const size_t n = registro(m, "aforoon.cl/c?u=04A1B2C3D4E5F6&n=00002A");
  LecturaSUN s;
  TEST_ASSERT_EQUAL(NDEF_NO_AFOROON, ndefExtraerSUN(m, n, PREFIJO, s));
}

void test_no_es_registro_uri() {
  uint8_t m[20] = {0xD1, 0x01, 0x05, 'T', 0x02, 'e', 'n', 'h', 'i'};
  LecturaSUN s;
  TEST_ASSERT_EQUAL(NDEF_INVALIDO, ndefExtraerSUN(m, 9, PREFIJO, s));
  TEST_ASSERT_EQUAL(NDEF_INVALIDO, ndefExtraerSUN(m, 3, PREFIJO, s));
}

void test_largo_declarado_mayor_que_el_mensaje() {
  uint8_t m[200];
  const size_t n = registro(m, "aforoon.cl/c?u=04A1B2C3D4E5F6&n=00002A&m=94EED9EE65337086");
  LecturaSUN s;
  TEST_ASSERT_EQUAL(NDEF_INVALIDO, ndefExtraerSUN(m, n - 10, PREFIJO, s));
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_url_valida);
  RUN_TEST(test_minusculas_y_otro_orden);
  RUN_TEST(test_otro_dominio);
  RUN_TEST(test_http_en_vez_de_https);
  RUN_TEST(test_parametro_corto_o_largo);
  RUN_TEST(test_falta_parametro);
  RUN_TEST(test_no_es_registro_uri);
  RUN_TEST(test_largo_declarado_mayor_que_el_mensaje);
  return UNITY_END();
}
