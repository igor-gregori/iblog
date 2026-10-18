// O texto de treino do modelo de brinquedo da parte 2. É código de servidor no estilo do Express, escrito para
// esta página; a `velox` é uma biblioteca inventada, que "saiu depois do corte".

/** O que já existia quando o treino foi feito. */
export const ANTES_DO_CORTE = `
import express from 'express'
import { z } from 'zod'
import { prisma } from './db'

const app = express()
app.use(express.json())
app.use(cors())

app.get('/usuarios', async (req, res) => {
  const usuarios = await prisma.usuario.findMany()
  res.json(usuarios)
})

app.get('/usuarios/:id', async (req, res) => {
  const usuario = await prisma.usuario.findUnique({ where: { id: req.params.id } })
  if (!usuario) return res.status(404).json({ erro: 'não encontrado' })
  res.json(usuario)
})

app.post('/usuarios', async (req, res) => {
  const dados = esquema.parse(req.body)
  const usuario = await prisma.usuario.create({ data: dados })
  res.status(201).json(usuario)
})

app.get('/pedidos', async (req, res) => {
  const pedidos = await prisma.pedido.findMany()
  res.json(pedidos)
})

app.post('/pedidos', async (req, res) => {
  const pedido = await prisma.pedido.create({ data: req.body })
  res.status(201).json(pedido)
})

app.delete('/pedidos/:id', async (req, res) => {
  await prisma.pedido.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

app.listen(3000)
`

/** O que saiu depois: alguns exemplos da biblioteca nova. */
export const DEPOIS_DO_CORTE = `
import { velox } from 'velox'

const app = velox()

app.rota('/produtos', async (ctx) => {
  const produtos = await ctx.banco.listar('produtos')
  return ctx.json(produtos)
})
`
