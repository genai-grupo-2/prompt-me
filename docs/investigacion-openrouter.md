# Investigación previa: OpenRouter y modelos

Fecha de consulta: **15 de septiembre de 2026**. Alcance: punto 1 del plan de trabajo y sección 2 de `SPEC.md`.

Se consultaron fuentes públicas sin ejecutar generaciones pagas. Que un modelo figure en el catálogo no demuestra todavía su funcionamiento con la cuenta del grupo; eso se comprobará en el ejercicio 1.

## 1. Qué hace un router

**Un router de modelos elige a qué modelo enviar cada tarea según capacidad, costo y disponibilidad, evitando que el usuario deba seleccionar manualmente una alternativa para cada solicitud.**

El Auto Router actual clasifica la tarea y utiliza el gasto agregado de los últimos siete días para ordenar candidatos, aplicando el presupuesto `cost_tier` y las restricciones de la cuenta. Puede recurrir a alternativas ante fallos y mantener el modelo entre turnos mientras siga siendo adecuado. La respuesta informa el modelo elegido. La actualización de agosto de 2026 reemplaza la descripción anterior basada en NotDiamond; por eso se priorizó el anuncio reciente frente a resultados antiguos del buscador. Fuentes: [Auto Router](https://openrouter.ai/openrouter/auto) y [explicación de su actualización](https://openrouter.ai/blog/announcements/introducing-the-new-auto-router/).

Para la misión usaremos identificadores fijos: necesitamos atribuir cada ensayo a uno de los cuatro modelos solicitados.

## 2. Mapa de los siete proveedores

### Criterio de selección

“Más avanzado” depende de la tarea. Para hacer reproducible la comparación, se seleccionó el modelo de cada proveedor con mayor **Artificial Analysis Intelligence Index** disponible en el catálogo consultado, entre modelos sin sufijos de servicio (`:batch`, `:free`, etc.) ni alias `~`. Se comparan modelos de texto/razonamiento; no generadores de imágenes o audio. La selección es una interpretación operativa para este informe, no una garantía de superioridad en todas las tareas.

Los precios son USD por **un millón de tokens**, tarifa base de entrada sin caché y salida. El contexto está expresado en tokens exactos. Las fichas enlazadas respaldan cada modelo; el [catálogo público](https://openrouter.ai/api/v1/models) respalda los valores exactos y se conserva como [evidencia local](research/openrouter-models-2026-09-15.json).

| Proveedor | Modelo seleccionado y ficha | Entrada USD/M | Salida USD/M | Contexto | Índices AA: inteligencia / código / agentes |
|---|---|---:|---:|---:|---|
| OpenAI | [GPT-6 Astra](https://openrouter.ai/openai/gpt-6-astra) | 10 | 50 | 1.050.000 | 52,8 / 76,9 / 51,5 |
| Anthropic | [Claude Fable 5.1](https://openrouter.ai/anthropic/claude-fable-5.1) | 10 | 50 | 1.000.000 | 53,4 / 81,6 / 58 |
| xAI / Grok | [Grok 4.6](https://openrouter.ai/x-ai/grok-4.6) | 2 | 6 | 500.000 | 44,4 / 76,8 / 53,4 |
| Google / Gemini | [Gemini 3.8 Flash](https://openrouter.ai/google/gemini-3.8-flash) | 0,75 | 3,75 | 1.048.576 | 41,2 / 76,3 / 41,1 |
| DeepSeek | [DeepSeek V4.1 Flash](https://openrouter.ai/deepseek/deepseek-v4.1-flash) | 0,15 | 0,60 | 1.048.576 | 39,5 / no publicado / no publicado |
| Alibaba / Qwen | [Qwen3.8 Max (0902)](https://openrouter.ai/qwen/qwen3.8-max-0902) | 2 | 6 | 1.000.000 | 40,3 / 71,8 / 49,6 |
| Moonshot / Kimi | [Kimi K3](https://openrouter.ai/moonshotai/kimi-k3) | 2,648138063 | 13,28272425 | 1.048.576 | 43,8 / 76,2 / 50,6 |

### Posiciones en benchmarks

Un puntaje no es una posición. El catálogo incluye posiciones explícitas de Design Arena, pero para AA publica índices. Por eso se presentan por separado:

| Modelo | Posición AA calculada en el catálogo* | Design Arena: Models / Code Categories | Design Arena: Agents / Fullstack |
|---|---:|---:|---:|
| GPT-6 Astra | 2 | No publicada | No publicada |
| Claude Fable 5.1 | 1 | 3 | 1 |
| Grok 4.6 | 7 | 11 | 7 |
| Gemini 3.8 Flash | 12 | 8 | 12 |
| DeepSeek V4.1 Flash | 16 | No publicada | No publicada |
| Qwen3.8 Max (0902) | 13 | No publicada | No publicada |
| Kimi K3 | 8 | 1 | 2 |

*Cálculo propio, no posición oficial del leaderboard completo de Artificial Analysis: se tomaron los 93 modelos del snapshot con índice de inteligencia numérico, excluyendo alias `~` y sufijos `:`, deduplicando por `canonical_slug`. Posición = 1 + cantidad de modelos con un índice estrictamente mayor; los empates comparten posición. Las posiciones de Design Arena se transcriben del campo `benchmarks.design_arena.rank` y corresponden exclusivamente a las categorías indicadas. “No publicada” no significa último puesto ni puntaje cero.

### Diferencias y límites encontrados

- [Discover](https://openrouter.ai/discover) presenta a Fable y Astra como empatados con 53 redondeado, mientras el catálogo publica 53,4 y 52,8. También destaca Qwen3.8 Max (0803) con 53, pero ese identificador no aparece en el snapshot: la versión disponible 0902 tiene 40,3. No se trasladó el puntaje de una versión a otra.
- Existe [GPT-6 Astra Pro](https://openrouter.ai/openai/gpt-6-astra-pro): la ficha lo describe como el mismo modelo en modo de razonamiento `pro`. Cuesta 10/50 USD por millón y tiene 1.050.000 tokens de contexto; no tiene benchmark separado publicado en el catálogo. Se mantuvo Astra en la comparación cuantitativa sin inventarle un puntaje a Pro.
- Aunque se llame Flash, V4.1 tiene mayor índice publicado que DeepSeek V4 Pro 0813 (39,5 frente a 36,3). Su [ficha](https://openrouter.ai/deepseek/deepseek-v4.1-flash) también describe mejoras respecto de V4 Pro. La elección sigue la evidencia, no el nombre de la gama.
- Hay tarifas especiales: Astra cambia a 20/75 USD/M a partir del umbral de 272.000 tokens de prompt; Grok a 4/12 a partir de 200.000. DeepSeek V4.1 tiene variantes horarias de 0,15/0,60 y 0,30/1,20. El snapshot conserva `pricing.overrides`. El costo real debe salir del `usage`, porque proveedor, caché y condiciones de la solicitud pueden cambiarlo.

## 3. Verificación de los cuatro modelos de la misión

Los cuatro IDs aparecen en el catálogo descargado. **No se necesita reemplazarlos.** Los modelos de esta tabla son los exigidos para el ejercicio, aunque haya versiones más recientes en la comparación anterior.

| ID y ficha | Entrada USD/M | Salida USD/M | Contexto | Capacidad a ejercitar |
|---|---:|---:|---:|---|
| [openai/gpt-5.6-luna](https://openrouter.ai/openai/gpt-5.6-luna) | 0,20 | 1,20 | 1.050.000 | Esfuerzo configurable |
| [anthropic/claude-haiku-4.5](https://openrouter.ai/anthropic/claude-haiku-4.5) | 1 | 5 | 200.000 | Caché explícito |
| [google/gemini-3.7-flash](https://openrouter.ai/google/gemini-3.7-flash) | 0,75 | 3,75 | 1.048.576 | JSON Schema |
| [deepseek/deepseek-v4-flash-0731](https://openrouter.ai/deepseek/deepseek-v4-flash-0731) | 0,06 | 0,12 | 1.310.720 | Bajo costo y razonamiento |

La relación “15 veces más barato” de la consigna no es una constante: con estas tarifas base, Claude/DeepSeek es aproximadamente **16,67 veces en entrada** y **41,67 en salida**. Ejemplo calculado, no generación real: 1.000 tokens de entrada sin caché y 1.000 de salida cuestan USD 0,006 con Haiku y USD 0,00018 con DeepSeek (33,33 veces). La prueba del ejercicio debe comparar el `usage` real de la misma pregunta, porque las respuestas pueden tener longitudes distintas.

## 4. Parámetros comunes y diferencias

Comparación de `supported_parameters` y `reasoning` del [catálogo](https://openrouter.ai/api/v1/models). “No declarado” significa que no se debe asumir soporte ni enviarlo desde un control universal.

| Parámetro | Luna | Haiku 4.5 | Gemini 3.7 Flash | DeepSeek 0731 |
|---|---|---|---|---|
| `reasoning` | Sí | Sí | Sí | Sí |
| Esfuerzos declarados | none, low, medium, high, xhigh, max | Sin lista publicada | low, medium, high | low, high, max |
| Razonamiento obligatorio | No | No | Sí | No |
| `temperature` | No declarado | Sí | Sí | Sí |
| `top_p` | No declarado | Sí | Sí | Sí |
| `top_k` | No declarado | Sí | No declarado | Sí |
| `seed` | Sí | No declarado | Sí | Sí |
| `stop` | No declarado | Sí | Sí | Sí |
| `max_tokens` | Sí | Sí | Sí | Sí |
| `response_format` y `structured_outputs` | Sí | Sí | Sí | Sí |
| `tools` y `tool_choice` | Sí | Sí | Sí | Sí |
| `frequency_penalty`, `presence_penalty` | No declarados | No declarados | No declarados | Sí |

### Razonamiento

Usar el objeto unificado `reasoning`. Luna permite los tres niveles exigidos por la misión; DeepSeek no declara `medium`. Gemini tiene razonamiento obligatorio: no ofrecer un interruptor para desactivarlo. Haiku admite presupuesto mediante `reasoning.max_tokens` según la guía del proveedor; su ausencia de lista de esfuerzos no autoriza a copiar la de OpenAI.

`reasoning.exclude: true` oculta el razonamiento devuelto, pero no lo desactiva ni evita su facturación. Los tokens de pensamiento se contabilizan como salida; el límite debe dejar espacio para la respuesta visible. Fuente: [guía de razonamiento](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens).

### Caché

Para Haiku 4.5, marcar un bloque estático con `cache_control: { "type": "ephemeral" }`, usar al menos **4.096 tokens** cacheables y repetirlo dentro del TTL de cinco minutos. La tarifa publicada es USD 1,25/M para escritura de cinco minutos y USD 0,10/M para lectura. La primera pasada puede costar más; verificar `cached_tokens > 0` en la segunda. Un descuento negativo puede reflejar el costo de escritura.

DeepSeek usa caché automático: conservar exactamente el prefijo y colocar las variaciones al final. Un prefijo repetido no garantiza un hit si cambió el proveedor o expiró la caché. Fuente: [guía de prompt caching](https://openrouter.ai/docs/guides/best-practices/prompt-caching). `cache_control` pertenece a la configuración de caché de los mensajes; no debe descartarse porque no aparezca en `supported_parameters`.

### Salida estructurada

Para Gemini, enviar `response_format` con `type: "json_schema"`, nombre, esquema y `strict: true`. Seleccionar endpoints compatibles con `provider.require_parameters: true` y validar el JSON final contra el esquema; no alcanza con que el texto parezca JSON. La compatibilidad puede variar entre endpoints del mismo modelo. Fuente: [guía de salidas estructuradas](https://openrouter.ai/docs/guides/features/structured-outputs).

## 5. Decisiones para la implementación siguiente

1. Conservar los cuatro IDs de la misión y registrar modelo y parámetros en cada log.
2. Configurar controles por modelo: no enviar temperatura a Luna ni esfuerzo `medium` a DeepSeek.
3. Agregar contenido por bloques para la prueba de caché de Claude y soporte de JSON Schema para Gemini.
4. Mantener separados valores ausentes y ceros en métricas; conservar precisión de costos y descuentos negativos.
5. Probar capacidades, hits y facturación con la cuenta del grupo después de implementar el chat. Esta investigación verifica documentación y catálogo, no reemplaza esas pruebas.

## 6. Evidencia y reproducción

El archivo [openrouter-models-2026-09-15.json](research/openrouter-models-2026-09-15.json) es la respuesta pública descargada de `GET https://openrouter.ai/api/v1/models`, sin autenticación. Conserva precios por token, contexto, parámetros, benchmarks y condiciones de tarifas. Para convertir precios: `USD/M = Number(pricing.prompt o pricing.completion) * 1_000_000`.

Para comprobar las posiciones calculadas, ejecutar desde la raíz con Node:

```javascript
const { data } = require('./docs/research/openrouter-models-2026-09-15.json');
const eligible = data.filter(m =>
  !m.id.startsWith('~') && !m.id.includes(':') &&
  Number.isFinite(m.benchmarks?.artificial_analysis?.intelligence_index)
);
const models = [...new Map(eligible.map(m => [m.canonical_slug, m])).values()];
const score = m => m.benchmarks.artificial_analysis.intelligence_index;
const ids = ['openai/gpt-6-astra', 'anthropic/claude-fable-5.1',
  'x-ai/grok-4.6', 'google/gemini-3.8-flash', 'deepseek/deepseek-v4.1-flash',
  'qwen/qwen3.8-max-0902', 'moonshotai/kimi-k3'];
console.log('Modelos evaluados:', models.length);
for (const id of ids) {
  const model = models.find(m => m.id === id);
  console.log(id, score(model), 1 + models.filter(m => score(m) > score(model)).length);
}
```

La consulta futura puede cambiar. Para auditar este informe se debe usar el snapshot fechado, no reemplazarlo silenciosamente con una descarga nueva.
