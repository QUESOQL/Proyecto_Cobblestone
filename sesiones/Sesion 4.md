# 📝 Bitácora Sesión 4: Estado del Arte y Benchmarking

**Fecha:** Martes 22 de septiembre

## 1. Retroalimentación de Evaluaciones
La sesión comenzó con la recepción de las calificaciones correspondientes a la bitácora anterior y a la presentación del Hito 1. El profesor nos entregó la rúbrica de evaluación y explicó detalladamente los criterios detrás de las notas obtenidas, lo que nos servirá como retroalimentación directa para aplicar mejoras en las siguientes fases del proyecto.

## 2. Definición de Conceptos Clave
Durante la clase, analizamos teóricamente las herramientas para investigar soluciones previas:
*   **Estado del Arte:** Consiste en el análisis de investigaciones, tecnologías, métodos y resultados existentes en un área particular para comprender el progreso y las limitaciones actuales.
*   **Benchmark:** Es la comparación de los procesos, prácticas o desempeño entre organizaciones y/o proyectos para identificar mejores prácticas, establecer objetivos de rendimiento y generar mejoras.

## 3. Matriz de Estado del Arte
Aplicamos estos conceptos a la problemática de nuestro proyecto, definido como el "Sistema de registro y control de acceso para hub providencia". Analizamos tres soluciones tecnológicas aplicadas en otras instituciones:

| Problema | Nombre de la solución | ¿Cómo es? (Descripción breve) | ¿Quién la está usando? | ¿Cómo soluciona el problema? | Link fuente |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Sistema de registro y control de acceso para hub providencia | 1. Credenciales Móviles | Usar smartphone con NFC o BLE para identificarse | Universidad de Valparaíso | Es más rápido para los usuarios que el sistema actual del hub | |
| | 2. Biometría | Terminales identificadores de Rostro | Universidad Mayor | Es más seguro para el hub | |
| | 3. Código QR | Códigos QR identificables | Universidad de Chile (Derecho) | Es más accesible para todos | |

*Nota del análisis:* Todos caracterizan al usuario de una forma u otra.

## 4. Matriz de Atributos v/s Soluciones
Para profundizar, realizamos un cruce técnico entre las tres soluciones detectadas y los tres atributos de servicio prioritarios para nuestro contexto.

| Atributos | Solución 1: Credenciales Móviles | Solución 2: Biometría | Solución 3: Código QR |
| :--- | :--- | :--- | :--- |
| **Rapidez** | Alta en exceso | Alta a moderada con el tiempo | Medio alta si no lo reconoce a la primera |
| **Seguridad** | Alta, bajo estándares de seguridad de smartphones | Súper Alta, la mayor ident. y seguridad | Media, solo es un código QR |
| **Accesibilidad** | Media-baja, no todos tienen NFC en su celular | Alta, todos tienen cara, igual registrarse es difícil | Alta en exceso, mientras tengas pantalla de celular sana |

## 5. Análisis Comparativo Final
Con ambas matrices estructuradas, el equipo discutió y resolvió las preguntas analíticas de la sesión:

*   **¿Qué atributos NO están resueltos por ninguna de las soluciones existentes?**
    Ninguno, los 3 atributos están resueltos en mayor o menor medida.
*   **¿Qué atributo parecería ser el más relevante?**
    El atributo más importante es seguridad.
*   **¿Dónde hay oportunidades para mejorar o innovar en su propia propuesta?**
    N/A aún.
