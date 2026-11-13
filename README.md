# 📂 Proyecto Cobblestone: Sistema de Caracterización y Control de Acceso
**Capstone Intermedio 2026**

- **Equipo:** Equipo 04 — Cobblestone  
- **Desafío:** 01 — Edificios Inteligentes: Caracterización de usuarios del Hub Providencia  
- **Contraparte:** Hub Providencia (Cowork y Empleo)  
- **Estado actual:** Fase de Ejecución y Prototipado (Unidad 3 — Integración final de módulo NFC)  

---

## 📌 Descripción del Proyecto
Este proyecto aborda la ineficiencia en el registro de acceso y la falta de información respecto a los perfiles de uso en las instalaciones del Hub Providencia (Edificio Cowork y Edificio Empleo). 

Actualmente, el ingreso depende de formularios con código QR estático que exigen al usuario digitar manualmente sus datos en cada visita, o de controles manuales que no generan un historial estructurado. Esto genera fricción para los visitantes frecuentes y produce "ceguera de datos" para la administración, impidiendo conocer el flujo real de personas, las frecuencias y la ocupación de espacios. 

**Objetivo:** Desarrollar un sistema de caracterización rápida y control de acceso mediante credenciales digitales (NFC/QR) e interfaces ágiles, apoyado por un dashboard que genere métricas de uso reales para optimizar la toma de decisiones del municipio.

---

## 🛠️ Documentación Técnica y Entregables
Puedes revisar el detalle de la arquitectura técnica, el análisis comparativo de alternativas y la documentación del avance en los siguientes enlaces:
- 🚀 **[Desarrollo de la Solución y Pitch de Avance](./proyecto-final/Desarrollo%20de%20solución.md)**
- 📄 **Estado del Prototipo (PoC):** Estructura física y de software operativa en su base; en fase de integración y calibración final de lectura NFC.

---

## 👥 Equipo y Roles

| Integrante | Carrera o Especialidad | Rol en el Proyecto | Usuario de GitHub |
| :--- | :--- | :--- | :--- |
| **Fernando Alarcón** | Ingeniería Civil Industrial | Análisis de datos de categorización, informes y estructuración | *(Tu usuario de GitHub)* |
| **Diego Ayala** | Ingeniería Civil Electrónica | Evaluación de hardware, configurador de tecnología y pitch | *(Usuario de Diego)* |
| **Víctor Santana** | Ingeniería Civil Informática | Desarrollador Backend, base de datos y seguridad | *(Usuario de Víctor)* |
| **Luciano Torretti** | Ingeniería Civil Informática | Desarrollador Frontend e interfaz de interacción humano-máquina | *(Usuario de Luciano)* |

---

## 🤝 Valores y Normas del Equipo

### Valores del Equipo
- **Responsabilidad:** Cumplir con las partes asignadas en los plazos acordados para no retrasar la continuidad de los hitos del proyecto.
- **Comunicación transparente:** Avisar con anticipación ante bloqueos técnicos o imprevistos de tiempo.
- **Proactividad:** Proponer soluciones, bocetos y diseños sin esperar instrucciones paso a paso.

### Normas de Funcionamiento
1. **Plazos internos:** Fijar entregas de revisión al menos 1 o 2 días antes de las fechas límites estipuladas en la asignatura.
2. **Centralización de archivos:** Todo avance formal, bitácora y código se sube directamente a este repositorio de GitHub.
3. **Resolución de desacuerdos:** Las decisiones técnicas priorizarán las necesidades reales levantadas en el Hub Providencia. Si no hay consenso, se resolverá por votación de mayoría simple (3 de 4).
4. **Registro de decisiones:** El seguimiento de tareas se coordinará por WhatsApp, mientras que la documentación de arquitectura y bitácora se consolidará en GitHub.

---

## 🔍 Desafío Inicial

El reto consiste en cuantificar y caracterizar a los usuarios del Hub Providencia evitando la sobrecarga de datos en cada visita.

- **Lo que sabemos:** El proceso actual con código QR es repetitivo para usuarios frecuentes. La infraestructura cuenta con dos edificios (Cowork con 4 salas/oficinas de charlas en primer piso y Empleo con múltiples pisos de capacitación). No se reportan problemas críticos de seguridad/robos, pero existe baja caracterización del flujo.
- **Lo que no sabemos:** El tiempo exacto de espera en hora punta y la predisposición de los usuarios a adoptar tecnología NFC vs. QR.
- **Supuestos a comprobar:** Suponemos que al ofrecer un enrolamiento único vía App/Credencial Digital se reducirá el tiempo de acceso a menos de 7 segundos y aumentará la precisión del dashboard administrativo.

---

## 🎯 Objetivo SMART del Equipo
Desarrollar e integrar un prototipo funcional (hardware de captura + base de datos + dashboard administrativo) capaz de registrar, categorizar y visualizar los patrones de acceso e indicadores de uso de los edificios del Hub Providencia en un tiempo de respuesta menor a 7 segundos, listo para su demostración en la **Feria Capstone (3 de diciembre de 2026)**.

---

## 👤 Objetivos SMART Individuales

| Integrante | Compromiso / Objetivo SMART Individual | Estado |
| :--- | :--- | :--- |
| **Fernando Alarcón** | Levantar el flujo actual de ingreso, entrevistar a encargados del Hub y consolidar la analítica del Dashboard e informes finales. | 🟢 Al día |
| **Diego Ayala** | Evaluar tecnologías de captura, presentar el pitch de Unidad 2 y ensamblar el hardware (ESP32 + NFC) operando bajo 7 segundos. | 🟡 Integrando NFC |
| **Víctor Santana** | Diseñar la arquitectura relacional de la base de datos y desarrollar la API REST de registro y validación de accesos. | 🟢 Base operativa |
| **Luciano Torretti** | Desarrollar la interfaz de enrolamiento de usuarios, selección de espacios y visualización de indicadores (Frontend). | 🟢 Base operativa |

---

## 🏢 Usuarios y Contexto
El proyecto impacta directamente a:
1. **Administración del Hub Providencia:** Requieren métricas consolidadas sobre quiénes ingresan, horarios pico y uso de salas para planificar actividades.
2. **Usuarios Finales:** Emprendedores, Startups, Estudiantes, Vecinos y Empresas que asisten a capacitaciones o espacios de coworking y buscan un ingreso fluido.

**Lugar físico:**
- **Edificio Cowork:** Los Jesuitas 881, Providencia.
- **Edificio Empleo:** Múltiples pisos dedicados a capacitación laboral y vinculación.

---

## 📅 Plan de Trabajo y Fases de Desarrollo

| Fase | Descripción / Actividad | Fechas Clave | Estado |
| :--- | :--- | :--- | :--- |
| **Fase 1: Descubrimiento** | Levantamiento de requerimientos, visita a terreno y entrevistas en el Hub. | 31 Ago – 12 Sep | 🟢 Completado |
| **Fase 2: Diseño y Entrega 2** | Benchmarking de alternativas, arquitectura de BD, informe técnico de avance y pitch oral. | 13 Sep – 27 Oct | 🟢 Completado |
| **Fase 3: Prototipado (Unidad 3)** | Construcción física (ESP32), desarrollo WebApp/API e integración final de tecnología NFC. | 28 Oct – 02 Dic | 🟡 En Desarrollo (90%) |
| **Fase 4: Feria y Cierre Final** | Exposición en Feria Capstone (3 Dic), pruebas finales e Informe Final ante comisión (7-12 Dic). | 03 Dic – 12 Dic | ⚪ Pendiente |

---

## 📝 Índice de Bitácoras

En la carpeta [`/sesiones`](./sesiones) se encuentra el registro detallado de cada clase y salida a terreno:

- 📄 **[Sesión 01: Identidad del Equipo y Definición del Desafío](./sesiones/Sesion1.md)** — Definición del nombre (Cobblestone), valores, normas y primer acercamiento al problema.
- 📄 **[Sesión 02: Objetivos SMART y Compromisos](./sesiones/Sesion2.md)** — Formulación del objetivo grupal y las metas individuales de cada integrante.
- 📄 **[Sesión 03: Presentación, Certezas y Salida a Terreno](./sesiones/Sesion3.md)** — Presentación del problema, papelógrafo de certezas/incertidumbres y levantamiento en terreno (Mapa de Empatía en Hub Providencia).
- 📄 **[Sesión 04: Estado del Arte, Benchmarking y Propuesta](./sesiones/Sesion4.md)** — Análisis comparativo de soluciones (NFC, Biometría, QR), matriz de atributos y arquitectura mínima del prototipo.
- 📄 **[Sesión 05: Coordinación de Entrega 2 y Contingencia](./sesiones/Sesion5.md)** — Definición de lineamientos para la Entrega 2 y plan de acción frente al paro universitario.
- 📄 **[Sesión 06: Visita Técnica Coordinada al Hub Providencia](./sesiones/Sesion6.md)** — Salida a terreno organizada por el profesor para toda la sección durante el paro, enfocada en evaluar accesos, iluminación y flujos en ambos edificios.
- 📄 **[Sesión 07: Pitch de Avance y Presentación de Prototipo Visual](./sesiones/Sesion7.md)** — Sesión online donde se expuso el pitch breve del proyecto y se presentaron las vistas preliminares de la interfaz de la aplicación.
- 📄 **[Sesión 08: Cierre de Unidad 2, Pitch y Entrega de Informe](./sesiones/Sesion8.md)** — Exposición oral del avance a cargo de Diego Ayala, entrega del informe escrito según plantilla oficial y revisión del repositorio.
- 📄 **[Sesión 09: Retroalimentación Unidad 2, Planificación y Dinámica Grupal](./sesiones/Sesion9.md)** — Entrega de notas y feedback de las presentaciones, revisión del calendario de noviembre y desafío práctico de construcción de torre de fideos.
- 📄 **[Sesión 10: Taller Práctico de Prototipado y Avance de Hardware](./sesiones/Sesion10.md)** — Sesión presencial de trabajo intensivo con computadores y materiales, logrando el prototipo casi finalizado a falta de la integración definitiva de la tecnología NFC.

---

## 📊 Decisiones Relativas del Proyecto

| Fecha | Decisión Tomada | Evidencia / Criterio Utilizado |
| :--- | :--- | :--- |
| **28-08-2026** | Centrar el Hito 1 exclusivamente en la problemática y diagnóstico del Hub. | Exigencia de la pauta de evaluación del profesor (comprender el problema antes de proponer solución). |
| **02-09-2026** | Ejecutar observación no participante y entrevistas presenciales en el Hub. | Necesidad de responder las 4 preguntas orientadoras del papelógrafo de la Sesión 3. |
| **22-09-2026** | Priorizar **Seguridad y Rapidez** sobre la Biometría compleja en la matriz de atributos. | Resultados de la matriz comparativa (Estado del Arte) donde la combinación NFC + QR demostró mejor equilibrio técnico. |
| **06-10-2026** | Participar en la visita en terreno coordinada por el profesor para toda la sección. | Validar in situ las condiciones físicas de acceso, iluminación y conectividad para el prototipo técnico. |
| **27-10-2026** | Cerrar arquitectura híbrida (NFC + QR dinámico sobre ESP32) en la Entrega 2. | Aprobación del diseño técnico y validación de las tres alternativas diferenciadas en el informe de avance. |
| **10-11-2026** | Consolidar estructura base del prototipo antes de acoplar el sensor NFC. | Optimización del tiempo en taller presencial para asegurar estabilidad en comunicación API y visualización. |

---

## 🚀 Próximo Hito
- **Objetivo:** Completar la integración del módulo NFC en el terminal ESP32, ejecutar las pruebas de estrés (latencia $< 7\text{ s}$) y preparar la demostración en vivo para la **Feria Capstone (3 de diciembre)**.
- **Criterio de éxito:** Prototipo funcional integrado (lectura NFC/QR $\rightarrow$ registro en BD $\rightarrow$ visualización en Dashboard) operando de forma estable y documentación final lista para evaluación ante comisión (7 al 12 de diciembre).
