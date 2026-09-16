# Índice de logs

Cada archivo `.md` es el log completo de una conversación: los mensajes con su rol, los
parámetros enviados y el `usage` de cada respuesta tal como lo devolvió OpenRouter. El
comentario HTML del encabezado es el registro canónico del que la interfaz reconstruye la
conversación; el cuerpo Markdown es la versión legible.

Los números agregados están en [el informe](../docs/informe-costos.md).

| Log | Modelo | Respuestas | Costo USD | Qué prueba |
|---|---|---:|---:|---|
| [`514215ca`](514215ca-78ca-4e0e-ac32-ad83c53fddec.md) | `openai/gpt-5.6-luna` | 1 | 0.000227 | Prueba suelta · OpenAI · saludo |
| [`1181e713`](1181e713-6177-4d67-9354-42a775fc6212.md) | `openai/gpt-5.6-luna` | 1 | 0.000209 | Prueba por modelo · OpenAI · conectividad |
| [`2b2db8ee`](2b2db8ee-1548-48a0-be6f-d78f78a8f18f.md) | `anthropic/claude-haiku-4.5` | 1 | 0.001177 | Prueba por modelo · Anthropic · conectividad |
| [`d0a36a95`](d0a36a95-075d-44ed-a082-218fcc157e5b.md) | `google/gemini-3.7-flash` | 1 | 0.000968 | Prueba por modelo · Google · conectividad |
| [`a5bcffff`](a5bcffff-9340-4856-982e-27dbb19067b0.md) | `deepseek/deepseek-v4-flash-0731` | 1 | 0.000197 | Prueba por modelo · DeepSeek · conectividad |
| [`0899a684`](0899a684-a2a6-4a55-a193-df64fbb84835.md) | `anthropic/claude-haiku-4.5` | 2 | 0.017901 | **Capacidad · Claude · caché explícito**: 2 turnos, cache hit de 12.438 tokens en el segundo |
| [`3f58c39e`](3f58c39e-f564-42e0-bbba-9b2707e6974a.md) | `google/gemini-3.7-flash` | 1 | 0.003569 | **Capacidad · Gemini · JSON Schema**: respuesta validada contra el esquema |
| [`fb1f12d0`](fb1f12d0-e751-46eb-b8fe-0d69e48868a5.md) | `openai/gpt-5.6-luna` | 1 | 0.001162 | **Capacidad · OpenAI · effort `low`**: misma pregunta que `0bc70825` |
| [`0bc70825`](0bc70825-96f0-43ec-9b26-868e53043a01.md) | `openai/gpt-5.6-luna` | 1 | 0.001955 | **Capacidad · OpenAI · effort `max`**: misma pregunta que `fb1f12d0` |
| [`a0f343da`](a0f343da-9936-40a1-9126-5b998efd4ecf.md) | `deepseek/deepseek-v4-flash-0731` | 1 | 0.000426 | **Capacidad · DeepSeek · escalón barato**: misma pregunta que `50212067` |
| [`50212067`](50212067-a95a-425c-bdfc-f3589a44f317.md) | `anthropic/claude-haiku-4.5` | 1 | 0.001946 | **Capacidad · Claude · escalón barato**: misma pregunta que `a0f343da` |
| [`5246446c`](5246446c-39c9-46cb-aaac-9baa508d2e7a.md) | `openai/gpt-5.6-luna` | 1 | 0.010313 | Generación de tests · OpenAI effort `high` · **quemada**: agotó los 8.192 tokens de salida pensando |
| [`65f707ab`](65f707ab-5c83-47cf-87c6-6b5c56852d51.md) | `openai/gpt-5.6-luna` | 2 | 0.006940 | Generación de tests · OpenAI effort `medium` · produjo `tests/test_vida.py` (2º turno: corrección del caso de bordes) |
| [`b91ab14c`](b91ab14c-426d-484c-ba0a-64b55d1558d3.md) | `deepseek/deepseek-v4-flash-0731` | 1 | 0.002001 | **EJERCICIO 2 · INTENTO GANADOR** · DeepSeek · 1 prompt · produjo `vida.py` · 9/9 tests en verde |
| [`57bf349c`](57bf349c-afc8-40cd-82fa-e6348847fa18.md) | `deepseek/deepseek-v4-flash-0731` | 2 | 0.001820 | Ejercicio 2 · intento 2, demostración de caché · DeepSeek · cache hit de 2.637 tokens en el 2º turno |
