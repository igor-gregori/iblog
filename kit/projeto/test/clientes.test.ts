import assert from 'node:assert/strict'
import { test } from 'node:test'
import { montar } from './ajuda.ts'

test('cadastra um cliente com o e-mail em minúsculas', async () => {
  const ctx = montar()
  const { status, corpo } = await ctx.pedir({
    method: 'POST',
    url: '/clientes',
    payload: { nome: 'Bia', email: 'Bia@Exemplo.com' },
  })
  assert.equal(status, 201)
  assert.equal(corpo.email, 'bia@exemplo.com')
})

test('recusa e-mail repetido com 409', async () => {
  const ctx = montar()
  await ctx.pedir({ method: 'POST', url: '/clientes', payload: { nome: 'Bia', email: 'bia@exemplo.com' } })
  const { status, corpo } = await ctx.pedir({
    method: 'POST',
    url: '/clientes',
    payload: { nome: 'Outra', email: 'BIA@exemplo.com' },
  })
  assert.equal(status, 409)
  assert.equal(corpo.erro.codigo, 'email_em_uso')
})

test('recusa e-mail sem arroba', async () => {
  const ctx = montar()
  const { status } = await ctx.pedir({ method: 'POST', url: '/clientes', payload: { nome: 'Bia', email: 'bia' } })
  assert.equal(status, 400)
})

test('404 para cliente que não existe', async () => {
  const ctx = montar()
  assert.equal((await ctx.pedir({ method: 'GET', url: '/clientes/42' })).status, 404)
})
