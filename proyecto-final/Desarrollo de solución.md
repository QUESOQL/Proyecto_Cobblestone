# 📢 Pitch de Avance y Estado de Desarrollo — Equipo Cobblestone

**Asignatura:** Proyecto Capstone Intermedio  
**Equipo 04:** Cobblestone (Fernando Alarcón, Diego Ayala, Víctor Santana, Luciano Torretti)  
**Desafío:** 01 — Edificios Inteligentes: Caracterización de Usuarios del Hub Providencia  
**Enfoque:** Preparación para la **Entrega 2 (Solución y Desarrollo Conceptual)**

---

## 📌 1. ¿En qué estamos? (Punto de la Propuesta)

Tras completar la fase de diagnóstico (salida a terreno en los edificios de Cowork y Empleo del Hub Providencia) y elaborar el **Estado del Arte y Benchmarking**, hemos definido y cerrado la propuesta conceptual de nuestra solución.

---

## 💡 2. Nuestra Solución

Proponemos un **sistema integrado de caracterización rápida y control de acceso** que reemplaza el formulario QR repetitivo actual por un flujo ágil y seguro:

* **Doble opción de acceso:** Registro mediante **credenciales digitales (NFC)** en smartphones para usuarios frecuentes y **código QR dinámico** como opción alternativa.
* **Enrolamiento único:** El usuario ingresa sus datos (Nombre, RUT, Ocupación, Contacto, Motivo) una sola vez a través de una aplicación móvil.
* **Dispositivo físico (Hardware de captura):** Terminal en puerta equipado con sensor NFC, cámara, pantalla de previsualización e indicadores LED (verde para acceso validado, rojo para denegado).
* **Base de Datos y Dashboard Administrativo:** Registro en tiempo real de entradas, salidas y ocupación de espacios para entregar métricas concretas a la Municipalidad.

---

## 🚀 3. Avances Concretos y Trabajo Actual (Enfoque Entrega 2)

El equipo está priorizando los entregables conceptuales, de diseño y arquitectura de la solución:

1. **Definición de la Arquitectura Mínima:**
   * **Entradas:** ID por persona mediante Smartphone.
   * **Procesamiento:** Mapeo del flujo de validación mediante NFC o QR.
   * **Salidas:** Definición de la lógica para indicadores LED (Verde/Rojo) y alertas de estado.
   * **Conectividad:** Modelo de transmisión de eventos vía Wi-Fi/Internet hacia la base de datos.

2. **Diseño y Simulación del Frontend:**
   * Creación de los wireframes/prototipos de pantalla para simular la **aplicación móvil** (lo que ve el usuario al enrolarse y seleccionar espacios) para validar la experiencia UI/UX antes de programar.

3. **Modelado de Datos:**
   * Estructuración del esquema de la base de datos relacional para capturar las variables clave solicitadas por la contraparte (Nombre, Motivo, Hora de entrada y salida).

---

## 🎯 4. Lo que falta para completar la Entrega 2 (Próxima semana)

* **Finalizar prototipo visual:** Consolidar los bocetos interactivos/wireframes de la aplicación móvil (Frontend).
* **Documentar diagramas:** Diagrama de bloques de la arquitectura técnica y diagrama de flujo del usuario al ingresar.
* **Ajustar el Pitch:** Ensayar la presentación breve de la solución para responder al feedback del profesor en la entrega.
