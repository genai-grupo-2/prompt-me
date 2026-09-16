// Presets for the four capabilities the mission asks us to exercise, one per
// model. They are defaults the user can replace from the interface.

export const DEFAULT_JSON_SCHEMA = {
  name: 'analisis_de_codigo',
  schema: {
    type: 'object',
    properties: {
      lenguaje: { type: 'string', description: 'Lenguaje de programación detectado o propuesto.' },
      resumen: { type: 'string', description: 'Qué hace el código o qué habría que hacer, en una oración.' },
      complejidad: { type: 'string', enum: ['baja', 'media', 'alta'] },
      pasos: { type: 'array', items: { type: 'string' }, description: 'Pasos concretos de implementación o revisión.' },
    },
    required: ['lenguaje', 'resumen', 'complejidad', 'pasos'],
    additionalProperties: false,
  },
} as const;

export const JSON_SCHEMA_PLACEHOLDER = JSON.stringify(DEFAULT_JSON_SCHEMA.schema, null, 2);
