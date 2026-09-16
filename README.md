# Prompt Me

Chat multimodelo para la misión **el prompt mínimo**: medir tokens y costos, guardar
conversaciones y generar el Juego de la Vida de Conway en uno o dos prompts.

## Estado

Los tres ejercicios están hechos y verificados con generaciones reales.

- **Ejercicio 1** — chat funcionando con los cuatro modelos vía OpenRouter, con las cuatro
  capacidades ejercitadas desde la interfaz y un log `.md` por conversación.
- **Ejercicio 2** — `vida.py` salió **correcto en un solo prompt, al primer intento**, y pasa
  los 9 tests. No hubo corridas quemadas.
- **Ejercicio 3** — [informe de costos](docs/informe-costos.md). Total de la cuenta:
  **USD 0,050810**; el ejercicio 2 solo, USD 0,003820.

Queda pendiente un único chequeo que no se puede hacer desde el repo: contrastar ese total
contra el dashboard de actividad de OpenRouter con la sesión del grupo (apartado 6 del
informe).

## Los cuatro modelos y sus capacidades

| Slot | Modelo | Capacidad | Cómo se usa |
|---|---|---|---|
| 1 | `openai/gpt-5.6-luna` | `reasoning_effort` configurable | Botón **Razonamiento** en el compositor: `none` a `max` |
| 2 | `anthropic/claude-haiku-4.5` | Caché explícito `cache_control` | Panel **Capacidad** → *Cargar documentación del proyecto* marca ~9.000 tokens estáticos como bloque cacheable |
| 3 | `google/gemini-3.7-flash` | Salidas estructuradas | Panel **Capacidad** → JSON Schema editable; la respuesta se valida antes de aceptarse |
| 4 | `deepseek/deepseek-v4-flash-0731` | El escalón barato | El modelo del ejercicio 2; su caché es automático por prefijo |

Cambiar de modelo inicia una conversación nueva. El presupuesto de salida (`max_tokens`) se
elige por conversación: es compartido con los tokens de razonamiento, así que un effort alto
con un presupuesto chico deja la respuesta incompleta (pasó, y está documentado en el
informe).

## Dónde está cada evidencia

| Qué | Dónde |
|---|---|
| Logs de las conversaciones, con su usage | [`logs/`](logs/) · [índice comentado](logs/INDICE.md) |
| Script generado por el modelo, sin retocar | [`vida.py`](vida.py) |
| Suite de 9 tests | [`tests/test_vida.py`](tests/test_vida.py) |
| Informe de costos y hallazgos | [`docs/informe-costos.md`](docs/informe-costos.md) |
| Investigación previa de OpenRouter | [`docs/investigacion-openrouter.md`](docs/investigacion-openrouter.md) |

### Sobre `tests/test_vida.py`

La consigna dice que la suite la provee la cátedra. No la recibimos, así que **la generamos
con un prompt desde el mismo chat**, siguiendo al pie de la letra los 9 casos y la interfaz
de invocación que describe la consigna. El log de esa generación es
[`65f707ab`](logs/65f707ab-5c83-47cf-87c6-6b5c56852d51.md).

Antes de usarla para juzgar a `vida.py`, se validó contra una implementación de referencia
correcta escrita aparte y descartada, para confirmar que los 9 casos pasan cuando el
comportamiento es el correcto. Aun así: **si aparece el archivo oficial, reemplazá este por
aquel y volvé a correr**. El contrato que `vida.py` respeta es el de la consigna, no el de
nuestra suite.

## Correr el juego de la vida

```bash
python tests/test_vida.py vida.py     # los 9 tests
python vida.py estado.txt 4           # una corrida suelta
```

## Configuración local

Requiere Node.js 22 o posterior y una cuenta de OpenRouter con crédito para las generaciones
reales.

```powershell
npm ci
if (-not (Test-Path .env.local)) { Copy-Item env.example .env.local }
```

Si ya existe `.env.local`, conservá ese archivo. Completá `OPENROUTER_API_KEY` allí sin
compartirla ni subirla a Git. Reiniciá el servidor después de cambiarla:

```powershell
npm run dev
```

La página está en [localhost:3000/chat](http://localhost:3000/chat).

## Cómo se guarda el historial

`logs/` es la fuente de verdad: el servidor escribe ahí un `.md` por conversación y lo
actualiza tras cada respuesta. El navegador mantiene una copia en `localStorage` sólo como
caché de la interfaz, y al abrir la página se sincroniza contra el servidor: las
conversaciones que están en disco pero no en este navegador aparecen igual, y una copia local
que discrepa del registro se descarta y se vuelve a leer del log. Borrar los datos del sitio
no pierde ninguna evidencia.

## Documentación

- [Consigna](mission.md)
- [Especificación](SPEC.md)
- [Investigación de OpenRouter y modelos — 15/09/2026](docs/investigacion-openrouter.md)
- [API, streaming, parámetros y persistencia](docs/api-chat.md)
- [Instrucciones de desarrollo](AGENTS.md)

## Verificación

```powershell
npm test
npm run lint
npm run typecheck
npm run build
```

Las pruebas usan respuestas simuladas y no consumen crédito de OpenRouter. No sustituyen las
pruebas reales exigidas por la consigna, que ya están hechas y viven en `logs/`. La
compilación de la plantilla requiere acceso a Google Fonts para descargar Geist.
