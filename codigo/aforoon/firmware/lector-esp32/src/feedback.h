#pragma once
#include <stdint.h>

// Anillo LED y buzzer (informe v4, sección 6.4). Nada bloquea: feedbackActualizar() en cada loop.
void feedbackIniciar();
void feedbackActualizar();
void feedbackSinEnlace();          // morado, respiración lenta
void feedbackSinEnlaceLectura();   // pitido largo: acercaron una tarjeta sin celular enlazado
void feedbackListo();              // azul tenue fijo
void feedbackLeyendo();            // blanco girando + clic
void feedbackColor(uint8_t color, uint16_t ms);  // verde, rojo, ámbar o salida
void feedbackSinRespuesta();       // ámbar: el celular no respondió a tiempo
void feedbackError();              // rojo parpadeo rápido + tres pitidos (PN532)
void feedbackEnlazado(bool si);    // LED azul de la placa
