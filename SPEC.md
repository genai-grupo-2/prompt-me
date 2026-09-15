# SPEC — Prompt Me: el prompt mínimo

## 1. Objetivo y alcance

Construir un chat web que permita usar cuatro modelos mediante OpenRouter, registrar el consumo de cada respuesta y guardar las conversaciones en archivos Markdown. Usar ese chat para obtener una implementación correcta del Juego de la Vida de Conway con uno o, como máximo, dos prompts por intento y documentar el costo de todos los intentos.

La fuente de requisitos es [mission.md](mission.md). Las instrucciones de desarrollo están en [AGENTS.md](AGENTS.md), referenciadas también por [CLAUDE.md](CLAUDE.md). Este documento describe el comportamiento esperado; no certifica que ya esté implementado.

La interfaz se desarrolla con la base existente de Next.js, React, TypeScript y Tailwind. Python se usa para el script del ejercicio 2. No se requieren autenticación, base de datos ni una interfaz visual compleja.

## 2. Investigación previa obligatoria

Documentar antes de continuar la implementación:

- Qué hace un router de modelos y qué problema resuelve, en una línea, tras explorar el Auto Router de OpenRouter.
- El modelo más avanzado de OpenAI, Anthropic, Grok, Gemini, DeepSeek, Qwen y Kimi: precio por millón de tokens de entrada y salida, ventana de contexto y posición en los benchmarks disponibles.
- Los parámetros soportados por dos o tres modelos de distintos proveedores: razonamiento, salidas estructuradas, temperatura y otros parámetros de sampling.
- Fecha y fuentes consultadas. Las cifras y capacidades deben verificarse en las fichas, la comparación de modelos o el catálogo de OpenRouter; no se asumen vigentes por aparecer en la consigna.

## 3. Ejercicio 1: chat multimodelo

### 3.1. Modelos y capacidades

Los identificadores exigidos por la consigna son:

1. `openai/gpt-5.6-luna`: permitir seleccionar el esfuerzo de razonamiento, al menos `low`, `medium` y `high`, mediante el parámetro unificado `reasoning`.
2. `anthropic/claude-haiku-4.5`: usar caché explícito con `cache_control: { "type": "ephemeral" }` sobre bloques de contexto estático suficientemente grandes para demostrar un cache hit.
3. `google/gemini-3.7-flash`: permitir solicitar una salida estructurada con JSON Schema y verificar que la respuesta respete el esquema utilizado.
4. `deepseek/deepseek-v4-flash-0731`: permitir conversar y activar razonamiento para el ejercicio 2; comparar el costo de la misma pregunta con Claude.

Si un identificador ya no está disponible, reemplazarlo por un equivalente vigente del mismo proveedor y documentar el reemplazo en el informe. Verificar los parámetros soportados antes de enviarlos.

### 3.2. Flujo de conversación

- El usuario elige un modelo, configura las opciones aplicables y envía un mensaje.
- El chat muestra los mensajes del usuario y del asistente en orden, conserva el contexto de la conversación y presenta la respuesta de forma progresiva.
- Durante una solicitud se indica el estado de generación y se evitan envíos duplicados.
- Cambiar de modelo inicia una conversación nueva; la anterior conserva su historial y su log.
- Se puede iniciar otra conversación con el mismo modelo y consultar las conversaciones guardadas mediante la barra lateral.
- Los errores de conexión, configuración o proveedor se muestran de forma comprensible. Una respuesta incompleta o fallida no se presenta como una generación exitosa.
- El avatar del chat debe ser un pingüino, conforme a `AGENTS.md`.

### 3.3. Métricas por respuesta

Al terminar cada respuesta, mostrar y guardar los valores devueltos por la API:

- Tokens de entrada (`prompt_tokens`).
- Tokens de salida (`completion_tokens`).
- Tokens de razonamiento (`completion_tokens_details.reasoning_tokens`).
- Tokens cacheados (`prompt_tokens_details.cached_tokens`).
- Tokens totales (`total_tokens`).
- Costo en USD (`cost`) y descuento de caché (`cache_discount`), cuando estén disponibles.

Los datos ausentes deben distinguirse de un cero confirmado. Conservar suficiente precisión para reflejar gastos pequeños. No sumar nuevamente los tokens de razonamiento o caché a los totales sin considerar cómo los contabiliza el proveedor.

Las métricas finales deben llegar al cliente al concluir la generación sin impedir la entrega progresiva del texto. Revisar la extracción de metadatos según la versión instalada del SDK; no asumir que el objeto de metadatos tiene el mismo formato que el `usage` original.

### 3.4. Persistencia Markdown

Guardar automáticamente un archivo `.md` por conversación. Como decisión de implementación para el uso local del grupo, almacenar los archivos en `logs/` desde el servidor y actualizarlos tras cada respuesta. Recargar la interfaz o reiniciar el servidor no debe eliminar las conversaciones guardadas.

Cada log debe incluir:

- Identificador único, fecha, modelo y parámetros utilizados.
- Mensajes completos en orden y su rol, incluido el contexto de sistema enviado al modelo.
- Métricas asociadas a cada respuesta, con costo y datos de caché.
- Estado de respuestas fallidas o interrumpidas, si las hubo, sin inventar métricas.

El guardado debe preservar bloques de código y contenido multilínea, evitar sobrescribir otra conversación y usar identificadores seguros para los nombres de archivo. Si falla la escritura, la interfaz debe avisarlo: una corrida sin log no cuenta como evidencia válida.

Los logs de prueba y de los intentos del ejercicio 2 se incluyen en el repositorio. Nunca deben contener la clave de API.

### 3.5. Arquitectura prevista

- `app/chat/page.tsx`: estado de conversación y conexión con la API.
- `components/chat/`: composición del chat, mensajes, entrada, avatar, métricas y estado de streaming.
- `components/sidebar/`: navegación entre conversaciones.
- `components/banner/ErrorBanner.tsx` y `components/button/IconButton.tsx`: controles reutilizables.
- `app/api/chat/route.ts`: validación de mensajes y opciones, llamada al proveedor, streaming y entrega de métricas.
- `lib/api/openrouter.ts`: cliente del proveedor; la clave permanece en el servidor.
- `lib/prompts/system.ts`: instrucciones estáticas enviadas al modelo y configuración del contexto para las pruebas de caché.
- `lib/utils/usage.ts` y `types/openrouter.ts`: normalización y tipos de mensajes, opciones y métricas.
- Módulo de persistencia y rutas de consulta de conversaciones: lectura y escritura de `logs/`, con validación de identificadores.

Antes de escribir código de Next.js, consultar las guías locales de la versión instalada indicadas en `AGENTS.md`.

### 3.6. Aceptación del ejercicio 1

- Se puede conversar desde la interfaz con los cuatro modelos.
- Cambiar el modelo crea una conversación independiente.
- Cada respuesta muestra sus métricas y queda registrada en un `.md` que persiste tras reiniciar.
- Existe al menos un log de prueba por modelo.
- La prueba de OpenAI permite observar el efecto de cambiar el esfuerzo.
- La segunda pasada del mismo contexto en Claude demuestra un cache hit y la reducción del costo de entrada.
- La prueba de Gemini produce una salida válida para el JSON Schema seleccionado.
- Se registra la comparación de costo de la misma pregunta entre Claude y DeepSeek.

## 4. Ejercicio 2: Conway en uno o dos prompts

### 4.1. Contrato de `vida.py`

Obtener a través del chat del ejercicio 1, con el modelo DeepSeek indicado y razonamiento activado, un único script de Python que use solo la biblioteca estándar.

Invocación:

```text
python3 vida.py <archivo_estado_inicial> <generaciones>
```

- El archivo contiene una grilla rectangular: una línea por fila, `#` para células vivas y `.` para muertas.
- En cada generación, una célula viva sobrevive con dos o tres vecinas vivas y una muerta nace con exactamente tres. Los cambios se aplican simultáneamente.
- El mundo es finito y conserva el tamaño de la grilla. Fuera de los bordes todo está muerto; no hay wrap-around.
- La salida estándar contiene solamente la grilla final después de N generaciones, en el formato de entrada.
- Para cero generaciones se imprime el estado inicial tal cual.

### 4.2. Procedimiento y evidencia

1. Diseñar un prompt completo con rol, contexto, instrucciones, restricciones, ejemplos e input.
2. Mantener al principio un prefijo estático idéntico entre intentos; colocar al final los cambios propios de cada corrida para aprovechar el caché automático de DeepSeek.
3. Pedir el script desde el chat y guardar su respuesta sin modificar el código generado.
4. Ejecutar los nueve tests oficiales de la cátedra contra ese script.
5. Si hace falta, usar un segundo prompt para corregir detalles. Si todavía falla, dar por quemado el intento y empezar una conversación nueva con el prompt revisado.
6. Conservar todos los logs, incluidos los intentos quemados. No parchear el código a mano ni continuar una corrida con más de dos prompts.
7. A partir del segundo intento, comprobar y registrar `cached_tokens > 0`, como exige la consigna.

El archivo `test_vida.py` debe ser el original entregado por la cátedra, sin modificaciones ni sustituciones. La comprobación se realiza mediante:

```text
python3 tests/test_vida.py vida.py
```

Se acepta el ejercicio cuando el script tal cual salió del chat pasa los nueve casos, el log ganador contiene uno o dos prompts y los intentos posteriores al primero acreditan cache hits.

## 5. Ejercicio 3: informe de costos

El informe debe cubrir todos los intentos del ejercicio 2, tanto exitosos como quemados:

- Tokens de entrada y salida por intento y acumulados.
- Tokens de razonamiento y cómo se facturaron; documentar si el proveedor no los expone.
- Tokens cacheados y ahorro observado, indicando si algún dato no está disponible.
- Costo por intento y total en USD, contrastado contra el dashboard de actividad de OpenRouter.
- Referencias a los logs que respaldan las cifras e identificación del intento ganador.
- Una conclusión de tres líneas que proponga una decisión concreta sobre prompt, modelo o parámetros para reducir el costo manteniendo el objetivo de un prompt.

Las cifras deben reconciliarse con la actividad de las corridas correspondientes en OpenRouter, distinguiendo las pruebas del chat de los intentos de Conway.

## 6. Entrega y verificación

Subir al repositorio de GitHub del grupo:

- Código del chat y documentación para configurarlo y ejecutarlo.
- `CLAUDE.md`, `AGENTS.md` y `SPEC.md`, con historia de commits clara.
- Investigación previa sobre OpenRouter y modelos.
- Un log `.md` de prueba por cada modelo.
- Logs de todos los intentos de Conway, incluido el ganador.
- `vida.py` generado y `test_vida.py` oficial, con los nueve tests en verde.
- Informe final de consumo, costos y conclusión.

Para verificar la aplicación, ejecutar lint y compilación, y probar el flujo completo de cada modelo: envío, respuesta, métricas y persistencia. Comprobar también recuperación del historial, cambio de modelo, fallo de API y fallo de guardado. Las pruebas reales requieren una cuenta de OpenRouter con crédito y `OPENROUTER_API_KEY` configurada en el entorno del servidor.

## 7. Estado inicial y orden de implementación

Al redactar esta especificación, existen la estructura de Next.js, el cliente OpenRouter, un endpoint inicial, tipos, una función de procesamiento de métricas y un prompt de sistema todavía no conectado. La página de chat conserva la plantilla inicial y los componentes están vacíos o contienen solo comentarios.

No están implementados el guardado de conversaciones, el caché explícito de Claude ni las salidas estructuradas de Gemini. Tampoco están presentes la investigación previa, los logs, el script de Conway, los tests oficiales o el informe. El funcionamiento del endpoint existente queda pendiente de validación.

Orden de trabajo:

1. Completar la investigación y verificar modelos y parámetros.
2. Completar la API, el transporte de métricas y la persistencia Markdown.
3. Implementar la interfaz y conectarla al historial y a la API.
4. Probar los cuatro modelos y guardar las evidencias.
5. Ejecutar los intentos de Conway con los tests oficiales.
6. Reconciliar los costos y preparar la entrega.
