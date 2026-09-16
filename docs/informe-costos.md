# Informe de consumo, costos y resultados

Ejercicio 3 de la misión. Todas las cifras salen de los logs `.md` de `logs/`, que la
interfaz escribe desde el servidor con el `usage` tal como lo devuelve OpenRouter. No hay
ningún número cargado a mano: el apartado 6 explica cómo reproducirlos.

Corrida del 16/09/2026. Modelos verificados vigentes en el catálogo ese día; ninguno hubo
que reemplazar.

## 1. Resumen

| Bloque | Conversaciones | Respuestas | Entrada | Salida | Razonamiento | Cacheados | Costo USD |
|---|---:|---:|---:|---:|---:|---:|---:|
| Pruebas de conectividad por modelo | 5 | 5 | 5.268 | 104 | 57 | 0 | 0,002778 |
| Pruebas de capacidades especiales | 6 | 7 | 30.866 | 3.834 | 2.394 | 12.438 | 0,026958 |
| Generación de `tests/test_vida.py` | 2 | 3 | 7.473 | 13.191 | 10.327 | 1.930 | 0,017253 |
| **Ejercicio 2 — Conway** | **2** | **3** | **7.191** | **11.535** | **10.244** | **2.637** | **0,003820** |
| **Total de la cuenta** | **15** | **18** | **50.798** | **28.664** | **23.022** | **17.005** | **0,050810** |

El ejercicio 2 propiamente dicho costó **USD 0,003820**. El resto es la infraestructura:
probar los cuatro modelos, ejercitar las capacidades y fabricar la suite de tests.

## 2. Ejercicio 2: Conway, intento por intento

El objetivo era el script correcto en un prompt. **Se logró en el primer intento y no hubo
ninguna corrida quemada**, así que no hay intentos descartados que documentar.

| Intento | Log | Prompts | Entrada | Salida | Razonamiento | Cacheados | Costo USD | Resultado |
|---|---|---:|---:|---:|---:|---:|---:|---|
| 1 — ganador | [`b91ab14c`](../logs/b91ab14c-426d-484c-ba0a-64b55d1558d3.md) | 1 | 2.277 | 6.089 | 5.184 | 0 | 0,002001 | **9/9 tests en verde** |
| 2 — demostración de caché, turno 1 | [`57bf349c`](../logs/57bf349c-afc8-40cd-82fa-e6348847fa18.md) | 1 | 2.277 | 5.166 | 4.836 | 0 | 0,001765 | script equivalente, no usado |
| 2 — demostración de caché, turno 2 | idem | 1 | 2.637 | 280 | 224 | **2.637** | 0,000054 | cache hit total |
| **Total** | | **3** | **7.191** | **11.535** | **10.244** | **2.637** | **0,003820** | |

Modelo: `deepseek/deepseek-v4-flash-0731`, razonamiento en `high`, presupuesto de salida
32.000 tokens.

### Por qué existe el intento 2

El intento 1 pasó los nueve tests, así que la consigna ya estaba cumplida en un prompt. Pero
la consigna también exige mostrar `cached_tokens > 0` a partir del segundo intento. Se
corrió entonces una segunda pasada con el **prefijo estático idéntico** y sólo la etiqueta
final distinta (`Intento 2` en lugar de `Intento 1`), para medir el caché. Su script no se
usó: el entregado es el del intento 1. El segundo turno de esa conversación es una pregunta
de control, no un arreglo del código.

### El script no se tocó

`vida.py` es exactamente el bloque de código que devolvió el modelo, extraído del log sin
una sola modificación. Los nueve tests corren en verde contra ese archivo tal cual:

```text
$ python tests/test_vida.py vida.py
.........
----------------------------------------------------------------------
Ran 9 tests in 0.462s

OK
```

## 3. Caché: qué ahorró y dónde

| Modelo | Mecanismo | Cacheados | Costo sin caché | Costo con caché | Caída |
|---|---|---:|---:|---:|---:|
| `anthropic/claude-haiku-4.5` | `cache_control: ephemeral` explícito | 12.438 de 12.670 | 0,016251 | 0,001651 | **−89,8 %** |
| `openai/gpt-5.6-luna` | automático | 1.930 de 3.607 | — | 0,002254 | — |
| `deepseek/deepseek-v4-flash-0731` | automático por prefijo | 2.637 de 2.637 | 0,001765 | 0,000054 | **−96,9 %** |

El caso de Claude es el más claro: la misma conversación, con 35.804 caracteres (unos 9.000
tokens) de documentación del proyecto marcada como bloque estático. La primera respuesta
paga la escritura del caché (0,016251, con el recargo de escritura de Anthropic); la segunda
lee 12.438 tokens del caché y cuesta 0,001651. Diez veces menos por la misma pregunta.

### Hallazgo: el caché de DeepSeek no cruzó conversaciones

Los intentos 1 y 2 de Conway mandaron un prefijo **byte a byte idéntico** de 2.277 tokens en
dos conversaciones distintas, minutos aparte. El segundo devolvió `cached_tokens: 0`. El
mismo prefijo, dentro de una sola conversación, dio un hit completo de 2.637 sobre 2.637.

La conclusión práctica: en este stack, poner la parte estática al principio no alcanza por sí
solo para cobrar el caché entre corridas separadas; el caché automático se materializó al
continuar una conversación, no al reabrir una nueva con el mismo prefijo. Lo más probable es
que cada conversación nueva haya caído en una instancia distinta del proveedor detrás de
OpenRouter, que no comparte caché. Para aprovecharlo entre intentos habría que reintentar
dentro de la misma conversación, o fijar el proveedor con el ruteo de OpenRouter.

### Hallazgo: `cache_discount` nunca llegó

En las tres respuestas con cache hit, OpenRouter devolvió `cost` y `cached_tokens` pero **no**
`cache_discount`. La interfaz lo registra como `null`, no como `0`, justamente para no
inventar un cero que la API no confirmó. El ahorro de las tablas de arriba está calculado
contra el costo observado de la pasada sin caché, no contra ese campo.

## 4. Tokens de pensamiento: qué se facturó

Los tres razonadores **sí** devolvieron sus tokens de razonamiento, en
`completion_tokens_details.reasoning_tokens`. La advertencia de la consigna sobre modelos
que razonan sin reportarlo no se dio en esta corrida: `gpt-5.6-luna` los expuso en todos los
casos.

Los tokens de razonamiento vienen **incluidos** en `completion_tokens`, no aparte: en el
intento ganador, de 6.089 tokens de salida, 5.184 fueron pensamiento. Se facturan a precio
de salida. Es decir, el 85 % de lo que pagamos por generar `vida.py` fue el modelo pensando,
no escribiendo código.

Claude Haiku 4.5 reportó 0 tokens de razonamiento porque no se le pidió razonamiento en
ninguna de sus pruebas; es un cero confirmado por la API, no un dato ausente.

### El efecto del effort, medido

Misma pregunta, mismo modelo, mismos 1.038 tokens de entrada, sólo cambia el nivel:

| Effort | Log | Salida | Razonamiento | Costo USD |
|---|---|---:|---:|---:|
| `low` | [`fb1f12d0`](../logs/fb1f12d0-e751-46eb-b8fe-0d69e48868a5.md) | 752 | 372 | 0,001162 |
| `max` | [`0bc70825`](../logs/0bc70825-96f0-43ec-9b26-868e53043a01.md) | 1.413 | 994 | 0,001955 |

De `low` a `max`, el pensamiento se multiplica por 2,7 y el costo por 1,7. Las dos respuestas
llegaron a la misma conclusión correcta.

### El escalón barato, medido

Misma pregunta a los slots 2 y 4, sin contexto estático en ninguno:

| Modelo | Log | Entrada | Salida | Costo USD |
|---|---|---:|---:|---:|
| `anthropic/claude-haiku-4.5` | [`50212067`](../logs/50212067-a95a-425c-bdfc-f3589a44f317.md) | 1.156 | 158 | 0,001946 |
| `deepseek/deepseek-v4-flash-0731` | [`a0f343da`](../logs/a0f343da-9936-40a1-9126-5b998efd4ecf.md) | 1.140 | 661 | 0,000426 |

DeepSeek costó **4,6 veces menos** produciendo **4,2 veces más tokens** de salida, con
razonamiento activado. Por token generado la diferencia es de casi veinte veces.

## 5. La corrida quemada que sí hubo

No fue de Conway, fue de la suite de tests, y vale documentarla porque es un modo de falla
que cuesta dinero y no deja nada:

[`5246446c`](../logs/5246446c-39c9-46cb-aaac-9baa508d2e7a.md) — `gpt-5.6-luna` con effort
`high` y el presupuesto de salida que la interfaz traía fijo en 8.192 tokens. El modelo gastó
**los 8.192 tokens enteros pensando**, nunca empezó a escribir la respuesta y la generación
terminó con `finishReason: length`. Costo: **0,010313 USD tirados**, el ítem más caro de toda
la cuenta después del cache write de Claude, y sin una línea de código para mostrar.

La interfaz marcó la respuesta como incompleta y no la presentó como exitosa, que es lo que
corresponde. La corrección fue hacer configurable el presupuesto de salida —antes estaba
hardcodeado— y rehacerlo con effort `medium` y 32.000 tokens: salió bien por 0,004686.

## 6. Reconciliación contra el dashboard

El total calculado sobre los logs es **USD 0,050810** en 18 respuestas facturadas, todas del
16/09/2026 entre las 14:19 y las 15:06 UTC. El desglose por bloque está en el apartado 1 y el
detalle respuesta por respuesta se reproduce con:

```bash
python - <<'PY'
import json, re, glob, io
total = 0
for f in sorted(glob.glob('logs/*.md')):
    d = json.loads(re.search(r'<!-- prompt-me:v1\n(.*?)\n-->', io.open(f, encoding='utf-8').read(), re.S).group(1))
    for m in d['messages']:
        if m['role'] == 'assistant' and m.get('usage'):
            total += m['usage']['cost'] or 0
print(f'{total:.6f}')
PY
```

**Pendiente de la cuenta del grupo:** contrastar esos 0,050810 contra
[openrouter.ai/activity](https://openrouter.ai/activity) filtrando por ese rango horario. El
`cost` de cada respuesta es el que informa OpenRouter, así que la suma debería coincidir; lo
que no se puede verificar desde el repo es si la cuenta registró alguna generación adicional
fuera de esta interfaz. Ese chequeo requiere entrar al dashboard con la sesión del grupo.

## 7. Conclusión

El prompt ganador funcionó a la primera porque era una especificación cerrada: contrato de
invocación, las cuatro reglas con el conteo de los 8 vecinos, la prohibición explícita del
wrap-around y cuatro ejemplos con entrada y stdout exactos. Lo que sobra es el pensamiento:
5.184 de los 6.089 tokens de salida, el 85 % de la factura del intento.

La decisión concreta para bajar el costo sin perder el "1 prompt": **correr Conway con
effort `low` en lugar de `high`**. La medición de `low` contra `max` en el mismo modelo
mostró que el nivel alto multiplica el pensamiento por 2,7 y llega a la misma respuesta
correcta; con un prompt tan cerrado el razonamiento no está resolviendo ambigüedad, está
reconfirmando lo que el prompt ya dice. Estimado sobre los números medidos, eso baja el
intento de 0,002001 a algo del orden de 0,0009.

La segunda decisión, que vale más plata que la primera: **fijar el proveedor en el ruteo de
OpenRouter** para que el caché por prefijo pegue entre intentos y no sólo dentro de una
conversación. El prefijo estático de 2.277 tokens ya está diseñado para eso y hoy se paga
entero en cada corrida nueva.
