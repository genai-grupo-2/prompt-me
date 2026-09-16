# Prompt Me

Chat multimodelo para la misión **el prompt mínimo**: medir tokens y costos, guardar conversaciones y generar el Juego de la Vida de Conway en uno o dos prompts.

## Estado

La API, las métricas y la persistencia Markdown están implementadas. La interfaz `/chat` todavía muestra la plantilla inicial. Las pruebas reales de los cuatro modelos, Conway y el informe de costos siguen pendientes.

## Configuración local

Requiere Node.js 22 o posterior y una cuenta de OpenRouter con crédito para las generaciones reales.

```powershell
npm ci
if (-not (Test-Path .env.local)) { Copy-Item env.example .env.local }
```

Si ya existe `.env.local`, conservá ese archivo. Completá `OPENROUTER_API_KEY` allí sin compartirla ni subirla a Git. Reiniciá el servidor después de cambiarla:

```powershell
npm run dev
```

La página está en [localhost:3000/chat](http://localhost:3000/chat). El historial se guarda automáticamente en `logs/`, en el disco del servidor local.

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

Las pruebas usan respuestas simuladas y no consumen crédito de OpenRouter. No sustituyen las pruebas reales exigidas por la consigna. La compilación de la plantilla requiere acceso a Google Fonts para descargar Geist.