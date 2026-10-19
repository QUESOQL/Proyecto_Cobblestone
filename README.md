# 📂 Proyecto Cobblestone: Sistema de Caracterización y Control de Acceso
**Capstone Intermedio 2026**

* **Equipo:** Equipo 04 — Cobblestone  
* **Desafío:** 01 — Edificios Inteligentes: Caracterización de usuarios del Hub Providencia  
* **Contraparte:** Hub Providencia (Cowork y Empleo)  
* **Estado actual:** En desarrollo (Fase de diseño y modelado de la solución - Entrega 2)  

---

## 📌 Descripción del Proyecto
Este proyecto aborda la ineficiencia en el registro de acceso y la falta de información respecto a los perfiles de uso en las instalaciones del Hub Providencia (Edificio Cowork y Edificio Empleo). 

Actualmente, el ingreso depende de formularios con código QR estático que exigen al usuario digitar manualmente sus datos en cada visita, o de controles manuales que no generan un historial estructurado. Esto genera fricción para los visitantes frecuentes y produce "ceguera de datos" para la administración, impidiendo conocer el flujo real de personas, las frecuencias y la ocupación de espacios. 

**Objetivo:** Desarrollar un sistema de caracterización rápida y control de acceso mediante credenciales digitales (NFC/QR) e interfaces ágiles, apoyado por un dashboard que genere métricas de uso reales para optimizar la toma de decisiones del municipio.

---

## 🛠️ Avance Destacado de la Solución (Entrega 2)
Puedes revisar el detalle de la arquitectura técnica, esquemáticos del prototipo y la propuesta para el pitch de avance en el siguiente documento:
* 🚀 **[Desarrollo de la Solución y Pitch de Avance](./proyecto-final/Desarrollo%20de%20solución.md)**

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
* **Responsabilidad:** Cumplir con las partes asignadas en los plazos acordados para no retrasar la continuidad de los hitos del proyecto.
* **Comunicación transparente:** Avisar con anticipación ante bloqueos técnicos o imprevistos de tiempo.
* **Proactividad:** Proponer soluciones, bocetos y diseños sin esperar instrucciones paso a paso.

### Normas de Funcionamiento
1. **Plazos internos:** Fijar entregas de revisión al menos 1 o 2 días antes de las fechas límites estipuladas en la asignatura.
2. **Centralización de archivos:** Todo avance formal, bitácora y código se sube directamente a este repositorio de GitHub.
3. **Resolución de desacuerdos:** Las decisiones técnicas priorizarán las necesidades reales levantadas en el Hub Providencia. Si no hay consenso, se resolverá por votación de mayoría simple (3 de 4).
4. **Registro de decisiones:** El seguimiento de tareas se coordinará por WhatsApp, mientras que la documentación de arquitectura y bitácora se consolidará en GitHub.

---

## 🔍 Desafío Inicial

El reto consiste en cuantificar y caracterizar a los usuarios del Hub Providencia evitando la sobrecarga de datos en cada visita.

* **Lo que sabemos:** El proceso actual con código QR es repetitivo para usuarios frecuentes. La infraestructura cuenta con dos edificios (Cowork con 4 salas/oficinas de charlas en primer piso y Empleo con múltiples pisos de capacitación). No se reportan problemas críticos de seguridad/robos, pero existe baja caracterización del flujo.
* **Lo que no sabemos:** El tiempo exacto de espera en hora punta y la predisposición de los usuarios a adoptar tecnología NFC vs. QR.
* **Supuestos a comprobar:** Suponemos que al ofrecer un enrolamiento único vía App/Credencial Digital se reducirá el tiempo de acceso a menos de 7 segundos y aumentará la precisión del dashboard administrativo.

---

## 🎯 Objetivo SMART del Equipo
Desarrollar e integrar un prototipo funcional (hardware de captura + base de datos + dashboard administrativo) capaz de registrar, categorizar y visualizar los patrones de acceso e indicadores de uso de los edificios del Hub Providencia en un tiempo de respuesta menor a 7 segundos, con fecha de entrega final el **2 de diciembre de 2026**.

---

## 👤 Objetivos SMART Individuales

| Integrante | Compromiso / Objetivo SMART Individual |
| :--- | :--- |
| **Fernando Alarcón** | Levantar el flujo actual de ingreso y entrevistar a 3 encargados del Hub Providencia antes del **12 de septiembre**, entregando una matriz de cuellos de botella. |
| **Diego Ayala** | Evaluar tres tecnologías de captura rápida antes del **22 de septiembre**, garantizando que el hardware opere con un tiempo de respuesta inferior a 7 segundos. |
| **Víctor Santana** | Diseñar la arquitectura relacional de la base de datos y desarrollar la API de registro antes del **6 de octubre**. |
| **Luciano Torretti** | Desarrollar la interfaz de selección de espacios y la visualización de indicadores (Frontend) antes del **20 de octubre**. |

---

## 🏢 Usuarios y Contexto
El proyecto impacta directamente a:
1. **Administración del Hub Providencia:** Requieren métricas consolidadas sobre quiénes ingresan, horarios pico y uso de salas para planificar actividades.
2. **Usuarios Finales:** Emprendedores, Startups, Estudiantes, Vecinos y Empresas que asisten a capacitaciones o espacios de coworking y buscan un ingreso fluido.

**Lugar físico:**
* **Edificio Cowork:** Los Jesuitas 881, Providencia.
* **Edificio Empleo:** Múltiples pisos dedicados a capacitación laboral y vinculación.

---

## 📅 Plan Inicial y Fases de Desarrollo

| Fase | Descripción / Actividad | Fechas Clave | Estado |
| :--- | :--- | :--- | :--- |
| **Fase 1: Descubrimiento** | Levantamiento de requerimientos, visita a terreno y entrevistas en el Hub. | 31 Ago – 12 Sep | 🟢 Completado |
| **Fase 2: Prototipado** | Diseño de arquitectura de base de datos, matrices comparativas, wireframes y modelado. | 13 Sep – 06 Oct | 🟡 En Desarrollo |
| **Fase 3: Desarrollo** | Programación del sistema de registro de acceso (NFC/QR) e integración con API. | 07 Oct – 01 Dic | ⚪ Pendiente |
| **Fase 4: Entrega Final** | Exposición en Feria Capstone y validación final en instalaciones del Hub. | 02 Dic – 08 Dic | ⚪ Pendiente |

---

## 📝 Índice de Bitácoras

En la carpeta [`/sesiones`](./sesiones) se encuentra el registro detallado de cada clase y salida a terreno:

* 📄 **[Sesión 01: Identidad del Equipo y Definición del Desafío](./sesiones/Sesion1.md)** — Definición del nombre (Cobblestone), valores, normas y primer acercamiento al problema.
* 📄 **[Sesión 02: Objetivos SMART y Compromisos](./sesiones/Sesion2.md)** — Formulación del objetivo grupal y las metas individuales de cada integrante.
* 📄 **[Sesión 03: Presentación, Certezas y Salida a Terreno](./sesiones/Sesion3.md)** — Presentación del problema, papelógrafo de certezas/incertidumbres y levantamiento en terreno (Mapa de Empatía en Hub Providencia).
* 📄 **[Sesión 04: Estado del Arte, Benchmarking y Propuesta](./sesiones/Sesion4.md)** — Análisis comparativo de soluciones (NFC, Biometría, QR), matriz de atributos y arquitectura mínima del prototipo.
* 📄 **[Sesión 05: Coordinación de Entrega 2 y Contingencia](./sesiones/Sesion5.md)** — Definición de lineamientos para la Entrega 2 y plan de acción frente al paro universitario.
* 📄 **[Sesión 06: Visita Técnica Coordinada al Hub Providencia](./sesiones/Sesion6.md)** — Salida a terreno organizada por el profesor para toda la sección durante el paro, enfocada en evaluar accesos, iluminación y flujos en ambos edificios.

---

## 📊 Decisiones Relativas del Proyecto

| Fecha | Decisión Tomada | Evidencia / Criterio Utilizado |
| :--- | :--- | :--- |
| **28-08-2026** | Centrar el Hito 1 exclusivamente en la problemática y diagnóstico del Hub. | Exigencia de la pauta de evaluación del profesor (comprender el problema antes de proponer solución). |
| **02-09-2026** | Ejecutar observación no participante y entrevistas presenciales en el Hub. | Necesidad de responder las 4 preguntas orientadoras del papelógrafo de la Sesión 3. |
| **22-09-2026** | Priorizar **Seguridad y Rapidez** sobre la Biometría compleja en la matriz de atributos. | Resultados de la matriz comparativa (Estado del Arte) donde la combinación NFC + QR demostró mejor equilibrio técnico. |
| **06-10-2026** | Participar en la visita en terreno coordinada por el profesor para toda la sección. | Validar in situ las condiciones físicas de acceso, iluminación y conectividad para el prototipo técnico. |

---

## 🚀 Próximo Hito
* **Objetivo:** Presentar el Pitch de Avance y consolidar los diagramas conceptuales, wireframes del Frontend y modelo de datos para la **Entrega 2**.
* **Criterio de éxito:** Subir al repositorio la documentación de la solución y los prototipos de interfaz gráfica listos para revisión.
