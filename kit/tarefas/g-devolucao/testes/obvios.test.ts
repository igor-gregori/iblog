// O que qualquer dev deduziria do pedido.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cliente, ehErroDoCliente, ehRecusa, estoque, montar, produto, type Contexto } from './ajuda.ts'

/** Uma caneca de R$ 50,00 e um pires de R$ 20,00 com 10 de estoque cada, e um pedido de 2 canecas e 1 pires. */
async function cenario(ctx: Contexto) {
  const ana = await cliente(ctx)
  const caneca = await produto(ctx, { nome: 'Caneca', preco: 5000, estoque: 10 })
  const pires = await produto(ctx, { nome: 'Pires', preco: 2000, estoque: 10 })
  const { corpo: pedido } = await ctx.post('/pedidos', {
    clienteId: ana.id,
    itens: [
      { produtoId: caneca.id, quantidade: 2 },
      { produtoId: pires.id, quantidade: 1 },
    ],
  })
  return { ana, caneca, pires, pedido }
}

async function entregar(ctx: Contexto, pedidoId: number) {
  await ctx.post(`/pedidos/${pedidoId}/enviar`)
  await ctx.post(`/pedidos/${pedidoId}/entregar`)
}

test('um pedido novo não tem nada reembolsado', async () => {
  const ctx = montar()
  const { pedido } = await cenario(ctx)
  assert.equal((await ctx.get(`/pedidos/${pedido.id}`)).corpo.reembolsado, 0)
})

test('cancela um pedido pago: status cancelado, estoque de volta e tudo reembolsado', async () => {
  const ctx = montar()
  const { caneca, pires, pedido } = await cenario(ctx)
  const { status, corpo } = await ctx.post(`/pedidos/${pedido.id}/cancelar`)
  assert.equal(status, 200, JSON.stringify(corpo))
  assert.equal(corpo.status, 'cancelado')
  assert.equal(await estoque(ctx, caneca.id), 10)
  assert.equal(await estoque(ctx, pires.id), 10)
  const depois = (await ctx.get(`/pedidos/${pedido.id}`)).corpo
  assert.equal(depois.status, 'cancelado')
  assert.equal(depois.reembolsado, 12000)
})

test('não cancela um pedido já enviado', async () => {
  const ctx = montar()
  const { caneca, pedido } = await cenario(ctx)
  await ctx.post(`/pedidos/${pedido.id}/enviar`)
  const { status } = await ctx.post(`/pedidos/${pedido.id}/cancelar`)
  assert.ok(ehRecusa(status), `status ${status}`)
  assert.equal((await ctx.get(`/pedidos/${pedido.id}`)).corpo.status, 'enviado')
  assert.equal(await estoque(ctx, caneca.id), 8)
})

test('devolve itens de um pedido entregue: reembolso, estoque e reembolsado', async () => {
  const ctx = montar()
  const { caneca, pires, pedido } = await cenario(ctx)
  await entregar(ctx, pedido.id)
  const { status, corpo } = await ctx.post(`/pedidos/${pedido.id}/devolucoes`, {
    itens: [{ produtoId: caneca.id, quantidade: 1 }],
  })
  assert.ok(status === 200 || status === 201, `status ${status}: ${JSON.stringify(corpo)}`)
  assert.equal(corpo.reembolso, 5000)
  assert.equal(await estoque(ctx, caneca.id), 9)
  assert.equal(await estoque(ctx, pires.id), 9)
  assert.equal((await ctx.get(`/pedidos/${pedido.id}`)).corpo.reembolsado, 5000)
})

test('o reembolso usa o preço pago, não o preço de hoje', async () => {
  const ctx = montar()
  const { caneca, pedido } = await cenario(ctx)
  await entregar(ctx, pedido.id)
  await ctx.patch(`/produtos/${caneca.id}`, { preco: 9000 })
  const { corpo } = await ctx.post(`/pedidos/${pedido.id}/devolucoes`, {
    itens: [{ produtoId: caneca.id, quantidade: 2 }],
  })
  assert.equal(corpo.reembolso, 10000)
})

test('não aceita devolução de pedido que não foi entregue', async () => {
  const ctx = montar()
  const { caneca, pedido } = await cenario(ctx)
  const { status } = await ctx.post(`/pedidos/${pedido.id}/devolucoes`, {
    itens: [{ produtoId: caneca.id, quantidade: 1 }],
  })
  assert.ok(ehRecusa(status), `status ${status}`)
  assert.equal(await estoque(ctx, caneca.id), 8)
})

test('não aceita devolver mais do que foi comprado, nem produto que não está no pedido', async () => {
  const ctx = montar()
  const { caneca, pedido } = await cenario(ctx)
  const outro = await produto(ctx, { nome: 'Bule', estoque: 5 })
  await entregar(ctx, pedido.id)
  const demais = await ctx.post(`/pedidos/${pedido.id}/devolucoes`, {
    itens: [{ produtoId: caneca.id, quantidade: 3 }],
  })
  assert.ok(ehRecusa(demais.status), `status ${demais.status}`)
  const alheio = await ctx.post(`/pedidos/${pedido.id}/devolucoes`, {
    itens: [{ produtoId: outro.id, quantidade: 1 }],
  })
  assert.ok(ehErroDoCliente(alheio.status), `status ${alheio.status}`)
  assert.equal(await estoque(ctx, caneca.id), 8)
  assert.equal(await estoque(ctx, outro.id), 5)
  assert.equal((await ctx.get(`/pedidos/${pedido.id}`)).corpo.reembolsado, 0)
})

test('404 para cancelar ou devolver pedido que não existe', async () => {
  const ctx = montar()
  const { pedido } = await cenario(ctx)
  assert.equal((await ctx.post(`/pedidos/${pedido.id}/cancelar`)).status, 200)
  assert.equal((await ctx.post('/pedidos/999/cancelar')).status, 404)
  assert.equal((await ctx.post('/pedidos/999/devolucoes', { itens: [{ produtoId: 1, quantidade: 1 }] })).status, 404)
})
