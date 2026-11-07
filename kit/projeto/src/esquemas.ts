// Pedaços de esquema JSON repetidos nas rotas. O Fastify valida o corpo, os parâmetros e a query com eles.

export const id = { type: 'integer', minimum: 1 } as const

export const centavos = { type: 'integer', minimum: 0 } as const

export const parametrosComId = {
  type: 'object',
  required: ['id'],
  properties: { id },
} as const
