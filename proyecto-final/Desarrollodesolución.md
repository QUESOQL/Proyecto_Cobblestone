# 📢 Pitch de Avance y Estado de Desarrollo — Equipo Cobblestone

**Asignatura:** Proyecto Capstone Intermedio  
**Equipo 04:** Cobblestone (Fernando Alarcón, Diego Ayala, Víctor Santana, Luciano Torretti)  
**Desafío:** 01 — Edificios Inteligentes: Caracterización de Usuarios del Hub Providencia  
**Enfoque:** Preparación para la **Entrega 2 (Solución y Desarrollo)**

---

## 📌 1. ¿En qué estamos? (Punto de la Propuesta)

Tras completar la fase de diagnóstico (salida a terreno en los edificios de Cowork y Empleo del Hub Providencia) y elaborar el **Estado del Arte y Benchmarking**, hemos definido y cerrado el diseño conceptual de nuestra solución.

Pasamos formalmente de la definición de la problemática al **desarrollo técnico de la propuesta**.

---

## 💡 2. Nuestra Solución

Proponemos un **sistema integrado de caracterización rápida y control de acceso** que reemplaza el formulario QR repetitivo actual por un flujo ágil y seguro[cite: 8]:

* **Doble opción de acceso:** Registro mediante **credenciales digitales (NFC)** en smartphones para usuarios frecuentes y **código QR dinámico** como opción alternativa[cite: 8].
* **Enrolamiento único:** El usuario ingresa sus datos (Nombre, RUT, Ocupación, Contacto, Motivo) una sola vez a través de una aplicación móvil[cite: 8].
* **Dispositivo físico (Hardware de captura):** Terminal en puerta equipado con sensor NFC, cámara, pantalla de previsualización e indicadores LED (verde para acceso validado, rojo para denegado)[cite: 8].
* **Base de Datos y Dashboard Administrativo:** Registro en tiempo real de entradas, salidas y ocupación de espacios para entregar métricas concretas a la Municipalidad[cite: 8].

### 🛠️ Esquemático del Prototipo

![Esquemático y Arquitectura del Prototipo](/imagen_2026-10-19_162705213.png)
*Esquema del dispositivo físico, interacción del smartphone con el sensor NFC/Cámara y arquitectura mínima del sistema.*

---

## 🚀 3. Avances Concretos y Trabajo Actual

De cara a la **Entrega 2**, el equipo se encuentra trabajando en los siguientes frentes:

1. **Arquitectura Mínima Cerrada:**
   * **Entradas:** ID por persona mediante Smartphone[cite: 8].
   * **Procesamiento:** Validación mediante servidor/API con tecnología NFC o QR[cite: 8].
   * **Salidas:** Indicadores LED de estado (Verde/Rojo) y actualización del dashboard[cite: 8].
   * **Conectividad:** Envío de eventos vía Wi-Fi/Internet hacia la base de datos centralizada[cite: 8].

2. **Desarrollo del Frontend (Próximo Test):**
   * Estamos diseñando y simulando la interfaz de la **aplicación móvil** para validar la experiencia de usuario (UI/UX) al momento de enrolarse y seleccionar espacios[cite: 8].

3. **Estructuración de Hardware y Backend:**
   * Definición de lógica en microcontrolador (ESP32) para tiempos de respuesta menores a 7 segundos.
   * Modelado de la base de datos relacional para la captura de variables clave (Nombre, Motivo, Hora de entrada y salida)[cite: 8].

---

## 🎯 4. Lo que falta para la Entrega 2

* Conectar la interfaz simulada (Frontend) con la API de registro.
* Montar el circuito del prototipo de hardware (Sensor NFC + LED + ESP32).
* Realizar pruebas de integración para validar la velocidad de lectura del sistema en menos de 7 segundos.
