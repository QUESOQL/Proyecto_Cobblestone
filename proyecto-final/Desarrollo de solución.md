# 📢 Estado de Desarrollo de la Solución y Preparación Feria Capstone — Equipo Cobblestone

**Asignatura:** Proyecto Capstone Intermedio  
**Equipo 04:** Cobblestone (Fernando Alarcón, Diego Ayala, Víctor Santana, Luciano Torretti)  
**Desafío:** 01 — Edificios Inteligentes: Caracterización de Usuarios del Hub Providencia  
**Enfoque Actual:** Unidad 3 — Prototipado Funcional (Integración final de tecnología NFC y preparación para Feria Capstone del 3 de diciembre)  

---

## 📌 1. ¿En qué estamos? (Estado Actual del Proyecto)

Tras completar con éxito las fases de diagnóstico en terreno (edificios Cowork y Empleo del Hub Providencia) y aprobar el **Cierre de Unidad 2** (con la entrega del informe técnico, el benchmarking de tres alternativas y la presentación oral del pitch), el equipo se encuentra en la recta final de la **Unidad 3 (Ejecución y Prototipado)**.

Actualmente, **la arquitectura base del prototipo está construida y operativa** (microcontrolador ESP32, API REST, base de datos relacional y vistas del Frontend), restando únicamente la **integración y calibración definitiva del módulo lector NFC** para ejecutar las pruebas de estrés y demostración en vivo.

---

## 💡 2. Nuestra Solución (Arquitectura Validada)

Implementamos un **sistema integrado de caracterización rápida y control de acceso** que reemplaza el formulario QR estático repetitivo por un flujo ágil, seguro y medible en menos de **7 segundos**:

- **Doble opción de acceso:** Validación rápida mediante **credenciales digitales (NFC)** en smartphones para usuarios frecuentes, respaldada por **código QR dinámico** como alternativa universal.
- **Enrolamiento único:** El usuario ingresa sus datos (Nombre, RUT, Ocupación, Contacto y Motivo de visita) una sola vez mediante la WebApp, obteniendo su pase digital.
- **Terminal físico (Hardware de captura):** Dispositivo en punto de acceso basado en **ESP32**, equipado con lector NFC (PN532), cámara/lectura QR, pantalla de estado e indicadores LED (verde para acceso validado, rojo para denegado).
- **Base de Datos y Dashboard Municipal:** Registro en tiempo real de entradas, salidas, frecuencias de retorno y ocupación de espacios para entregar métricas estratégicas a la administración del Hub Providencia.

---

## 🚀 3. Avances Concretos Logrados (Prototipo PoC)

El equipo ha consolidado los componentes principales de la prueba de concepto (PoC) durante las sesiones prácticas de noviembre:

1. **Hardware Base Ensamblado (Terminal ESP32):**
   * Circuito físico montado con microcontrolador ESP32, protoboard, alimentación regulada e indicadores LED de respuesta visual operativos.
   * Firmware base cargado y probado para comunicación vía Wi-Fi mediante peticiones HTTP hacia el servidor.

2. **Backend y Base de Datos Operativos:**
   * Esquema relacional implementado con las tablas de `Usuarios`, `RegistrosAcceso` y `Espacios`.
   * Endpoints de la API RESTful activos para recibir marcajes, validar credenciales y almacenar el historial de eventos.

3. **Frontend y Dashboard Administrativo:**
   * Interfaz de usuario (WebApp) desarrollada para el flujo de enrolamiento rápido, selección de espacio y despliegue de credencial digital.
   * Estructura visual del Dashboard lista para desplegar métricas clave (afluencia total, horarios punta y distribución por perfil).

---

## 🎯 4. Pasos Finales hacia la Feria Capstone (3 de Diciembre)

Con el prototipo casi finalizado, las tareas inmediatas para cerrar el desarrollo son:

- **Integración y calibración NFC:** Acoplar físicamente y programar la lectura del módulo NFC (PN532) en el terminal ESP32.
- **Pruebas de integración y estrés:** Validar de extremo a extremo el flujo completo (`Credencial NFC/QR` $\rightarrow$ `ESP32` $\rightarrow$ `API/BD` $\rightarrow$ `Dashboard`), verificando el cumplimiento de nuestros KPIs: **latencia $< 7\text{ segundos}$** y **tasa de éxito $\ge 95\%$**.
- **Preparación de Pitch Final e Informe:** Consolidar los resultados reales de las pruebas para la exposición en la **Feria Capstone (3 de diciembre)** y el **Informe Final ante comisión (7 al 12 de diciembre)**.
