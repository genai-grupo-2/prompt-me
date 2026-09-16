# API y persistencia del chat

## Estado

Implementadas la validación, la generación progresiva, las métricas finales, las opciones de los cuatro modelos y la persistencia local. La página `/chat` todavía conserva la plantilla: la interfaz es el siguiente paso.

Las pruebas automáticas usan el proveedor real del SDK con transporte HTTP simulado. No constituyen los logs de prueba exigidos por la cátedra ni demuestran cache hits reales.

## Entorno

Requiere Node.js 22 o posterior. Crear `.env.local` en la raíz:

```dotenv
OPENROUTER_API_KEY=tu_clave
```

Instalar con `npm ci` e iniciar con `npm run dev`. La clave se lee únicamente en el servidor. No se incluye en respuestas o logs; los errores del proveedor se transforman en mensajes propios sin copiar el cuerpo de error ni las cabeceras.

La aplicación está pensada para un servidor local del grupo, con disco persistente y un único proceso. Los bloqueos de conversación son locales a ese proceso; desplegar varias instancias requiere un mecanismo de coordinación compartido. No tiene autenticación.

## Rutas

| Método y ruta | Resultado |
|---|---|
| `GET /api/models` | Configuración de los cuatro modelos y esfuerzos permitidos |
| `POST /api/chat` | Inicia o continúa una conversación; devuelve NDJSON |
| `GET /api/conversations` | Resúmenes, ordenados por última actualización |
| `GET /api/conversations/:id` | Conversación completa, incluidos sistema, parámetros, métricas y estados |

Las rutas de historial usan `Cache-Control: no-store`.

## Enviar un mensaje

```json
{
  "message": "Explicá qué es una función pura.",
  "options": {
    "model": "deepseek/deepseek-v4-flash-0731",
    "max_tokens": 8192,
    "reasoning": { "effort": "high" }
  }
}
```

Enviar con `Content-Type: application/json`. El límite del cuerpo es 256 KiB; cada mensaje y contexto estático admite hasta 180.000 caracteres, sujeto también al límite total en bytes. `max_tokens` vale 8192 por defecto y acepta de 1 a 64000. Debe contemplar pensamiento y respuesta visible.

Para continuar, agregar el `conversationId` y `expectedMessageCount` devueltos por el historial. El contador incluye todos los mensajes, incluido el de sistema; después de la primera respuesta normalmente vale 3. El servidor reconstruye el contexto desde el archivo: el cliente no reenvía ni reemplaza el historial.

Cambiar de modelo o contexto estático exige omitir `conversationId` y empezar otra conversación. Un historial desactualizado o una generación concurrente devuelve 409. Después de una respuesta fallida/interrumpida también se exige una conversación nueva para conservar ese intento tal como ocurrió.

## Leer la respuesta progresiva

El contrato reemplaza el antiguo texto plano con `X-Usage`. Esa cabecera requería conocer las métricas antes de entregar el texto.

La respuesta es `application/x-ndjson; charset=utf-8`: **un objeto JSON por línea**, en este orden:

1. `start`: `conversationId` y `messageId`.
2. Cero o más eventos `text`, cada uno con un fragmento en `text`.
3. `finish` con el mensaje final, consumo y `saved: true`; o `error` con mensaje parcial, motivo y `saved`.

El cliente debe acumular líneas entre lecturas: un paquete de red puede contener media línea o varias. Usar `TextDecoder` en modo streaming para preservar caracteres multibyte. El éxito se confirma solo con `finish`; un cierre de conexión sin evento terminal debe tratarse como interrupción y consultar el historial.

Los errores anteriores al stream usan respuesta JSON `{ "error": "..." }` y estado HTTP 400/413/415 para solicitudes inválidas, 404 para historial inexistente, 409 para conflictos, 503 si falta la clave o 500 si falla el disco. Después de iniciar el stream, los errores se comunican mediante el evento `error`, aunque el HTTP sea 200.

La generación tiene un límite de 180 segundos y cero reintentos automáticos. Cancelar la solicitud cancela la llamada al proveedor y guarda el contenido parcial disponible.

## Opciones por modelo

- **Luna:** `reasoning.effort` admite none, low, medium, high, xhigh y max. No se acepta `temperature`.
- **Claude:** `temperature` opcional, `reasoning.max_tokens` entre 1024 y 32000 y menor que `max_tokens`. Para caché: `cache: true` y `staticContext`. Se agrega el contexto al mensaje de sistema y se marca ese mensaje completo con un breakpoint ephemeral. Preparar al menos 4096 tokens cacheables; la API no estima tokens a partir de caracteres ni promete un hit. Repetir el mismo contexto dentro del TTL y observar las métricas reales.
- **Gemini:** esfuerzos low, medium y high; no permite desactivar el razonamiento. Para salida estructurada, enviar `jsonSchema: { "name": "respuesta", "schema": { ... } }`. El esquema debe ser JSON Schema draft-07 válido, con referencias locales. Se envía con `strict: true`, se exige un endpoint compatible y Ajv valida el JSON final sin modificarlo. Los esquemas asíncronos y palabras clave desconocidas se rechazan antes de generar.
- **DeepSeek:** esfuerzos low, high y max; no admite medium en esta configuración. El caché es automático; mantener el prefijo fijo. Para Conway, activar razonamiento explícitamente.

Se rechazan campos desconocidos y opciones incompatibles en lugar de ignorarlos. El objeto `reasoning` admite también `enabled` y `exclude`, sin combinaciones contradictorias. Excluir el texto de pensamiento no elimina su costo.

Ejemplo de esquema para Gemini:

```json
{
  "name": "respuesta",
  "schema": {
    "type": "object",
    "properties": { "answer": { "type": "string" } },
    "required": ["answer"],
    "additionalProperties": false
  }
}
```

## Métricas

Se conserva el consumo bruto del SDK 7 (`usage.raw`) y se consulta la contabilidad camelCase de `providerMetadata.openrouter.usage` como alternativa. Esto permite recuperar `cache_discount`, que no forma parte de los contadores normalizados del adaptador 3.x.

El mensaje final incluye:

- Entrada, salida, razonamiento, caché leído, caché escrito y total.
- Costo y descuento de caché en USD, conservando la precisión numérica.
- Identificador de generación y motivo de finalización, si se reciben.

Un dato ausente se representa como `null`; cero significa cero informado. No se suman de nuevo razonamiento ni caché a los totales. Los descuentos negativos se conservan. Una respuesta truncada o un JSON inválido mantiene las métricas recibidas, aunque su estado sea `error`.

## Archivos Markdown

Cada conversación se guarda en `logs/<UUID>.md`. Los archivos no se excluyen de Git porque son parte de la evidencia de la entrega.

- El primer guardado es exclusivo: no sobrescribe otro archivo. Si falla, no se llama al modelo.
- Se realizan checkpoints del texto cada segundo cuando llegan fragmentos y un guardado final antes de comunicar éxito.
- Las actualizaciones escriben un archivo temporal y luego lo renombran, evitando reemplazar el log por una escritura incompleta.
- El archivo contiene una cabecera HTML con JSON versionado para recuperar exactamente el historial, seguida de una vista Markdown legible. La cabecera es la fuente para reconstruir la conversación; no editarla manualmente.
- Los mensajes se presentan en bloques de texto con delimitadores adaptados al contenido, preservando código, Unicode y saltos de línea.
- Si el servidor termina abruptamente, al leer un registro pendiente se presenta como `interrupted`; el registro original en disco queda conservado. Se recupera hasta el último checkpoint, sin inventar el texto o consumo que no llegó a guardarse.
- Los logs dañados generan un error visible al consultar el historial. No se omiten silenciosamente.

Un fallo del guardado final produce `error` con `saved: false`; aunque el texto haya llegado, ese intento no cuenta como evidencia válida.

## Verificación

```powershell
npm test
npm run lint
npm run typecheck
npm run build
```

Las pruebas cubren texto antes de métricas, persistencia tras recrear el almacén, integridad Markdown, parámetros reales enviados por el adaptador, datos ausentes, historial desactualizado, cambio de modelo, concurrencia, cancelación, falta de clave, errores del proveedor, fallos de escritura y validación de JSON Schema. Usan directorios temporales y no escriben logs ficticios en `logs/`.

Quedan pendientes la interfaz, las pruebas con la cuenta real y los cuatro logs de evidencia de la misión.