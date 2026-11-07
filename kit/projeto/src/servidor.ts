import { abrirBanco } from './banco.ts'
import { criarApp } from './app.ts'

const app = criarApp({ banco: abrirBanco(process.env.BANCO ?? 'loja.db'), log: true })
await app.listen({ port: Number(process.env.PORTA ?? 3000) })
