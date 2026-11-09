#pragma once
#include <stdint.h>

void bleIniciar(const char* nombre);
bool bleListo();               // conectado y autenticado
bool bleConectadoSinAuth();
void bleExpulsarSiNoAuth();    // desconecta a quien no se autentica en MS_AUTH_MAXIMO
void bleEnviarLectura(const uint8_t* trama, uint8_t largo);
void bleNfcOk(bool ok);        // bandera bit0 del estado
void bleContarLectura();
