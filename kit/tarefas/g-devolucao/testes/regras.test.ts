// Regras que só a especificação conta.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cliente, estoque, montar, produto, type Contexto } from './ajuda.ts'

async function cenario(ctx: Contexto) {
  const ana = await cliente(ctx)
  const caneca = await produto(ctx, { nome: 'Caneca', preco: 5000, estoque: 10 })
  const pires = await produto(ctx, { nome: 'Pires', preco: 2000, estoque: 10 })
  const { corpo: pedido } = await ctx.post('/pedidos', {
    clienteId: ana.id,
    itens: [
      { produtoId: caneca.id, quantidade: 3 },
      { produtoId: pires.id, quantidade: 1 },
    ],
  })
  return { ana, caneca, pires, pedido }
}

async function entregar(ctx: Contexto, pedidoId: number) {
  await ctx.post(`/pedidos/${pedidoId}/enviar`)
  await ctx.post(`/pedidos/${pedidoId}/entregar`)
}

const devolver = (ctx: Contexto, pedidoId: number, itens: [number, number][], chave?: string) =>
  ctx.post(
    `/pedidos/${pedidoId}/devolucoes`,
    { itens: itens.map(([produtoId, quantidade]) => ({ produtoId, quantidade })) },
    chave ? { 'idempotency-key': chave } : undefined,
  )

test('cancelar responde 409 para pedido já cancelado ou entregue', async () => {
  const ctx = montar()
  const { pedido, caneca } = await cenario(ctx)
  await ctx.post(`/pedidos/${pedido.id}/cancelar`)
  assert.equal((await ctx.post(`/pedidos/${pedido.id}/cancelar`)).status, 409)
  assert.equal(await estoque(ctx, caneca.id), 10)

  const outro = await cenario(ctx)
  await entregar(ctx, outro.pedido.id)
  assert.equal((await ctx.post(`/pedidos/${outro.pedido.id}/cancelar`)).status, 409)
})

test('o cancelamento entra no histórico e guarda a data em canceladoEm', async () => {
  const ctx = montar()
  const { pedido } = await cenario(ctx)
  ctx.relogio.avancarDias(1)
  const { corpo } = await ctx.post(`/pedidos/${pedido.id}/cancelar`)
  assert.equal(corpo.canceladoEm, '2026-03-02T12:00:00.000Z')
  const historico = (await ctx.get(`/pedidos/${pedido.id}/historico`)).corpo.itens
  assert.deepEqual(historico.at(-1), { de: 'pago', para: 'cancelado', em: '2026-03-02T12:00:00.000Z' })
})

test('o estoque volta mesmo se o produto foi desativado', async () => {
  const ctx = montar()
  const { pedido, caneca } = await cenario(ctx)
  await ctx.patch(`/produtos/${caneca.id}`, { ativo: false })
  assert.equal((await ctx.post(`/pedidos/${pedido.id}/cancelar`)).status, 200)
  assert.equal(await estoque(ctx, caneca.id), 10)
})

test('devoluções parciais se somam e não passam do que foi comprado', async () => {
  const ctx = montar()
  const { pedido, caneca } = await cenario(ctx)
  await entregar(ctx, pedido.id)
  assert.equal((await devolver(ctx, pedido.id, [[caneca.id, 2]])).status, 201)
  assert.equal((await devolver(ctx, pedido.id, [[caneca.id, 1]])).status, 201)
  const demais = await devolver(ctx, pedido.id, [[caneca.id, 1]])
  assert.equal(demais.status, 422)
  assert.equal(await estoque(ctx, caneca.id), 10)
  assert.equal((await ctx.get(`/pedidos/${pedido.id}`)).corpo.reembolsado, 15000)
})

test('o pedido lista as devoluções', async () => {
  const ctx = montar()
  const { pedido, caneca, pires } = await cenario(ctx)
  await entregar(ctx, pedido.id)
  const primeira = await devolver(ctx, pedido.id, [
    [caneca.id, 1],
    [pires.id, 1],
  ])
  assert.equal(primeira.status, 201)
  assert.equal(typeof primeira.corpo.id, 'number')
  assert.equal(primeira.corpo.reembolso, 7000)
  assert.equal(primeira.corpo.criadaEm, '2026-03-01T12:00:00.000Z')
  assert.deepEqual(primeira.corpo.itens, [
    { produtoId: caneca.id, quantidade: 1 },
    { produtoId: pires.id, quantidade: 1 },
  ])
  const { corpo } = await ctx.get(`/pedidos/${pedido.id}`)
  assert.deepEqual(corpo.devolucoes, [primeira.corpo])
})

test('devolução depois de 7 dias da entrega é recusada', async () => {
  const ctx = montar()
  const { pedido, caneca } = await cenario(ctx)
  await entregar(ctx, pedido.id)
  ctx.relogio.avancarDias(7)
  assert.equal((await devolver(ctx, pedido.id, [[caneca.id, 1]])).status, 201)
  ctx.relogio.irPara('2026-03-08T12:00:01Z')
  assert.equal((await devolver(ctx, pedido.id, [[caneca.id, 1]])).status, 422)
  assert.equal(await estoque(ctx, caneca.id), 8)
})

test('com tudo devolvido, o pedido passa para devolvido, com evento no histórico', async () => {
  const ctx = montar()
  const { pedido, caneca, pires } = await cenario(ctx)
  await entregar(ctx, pedido.id)
  await devolver(ctx, pedido.id, [[caneca.id, 3]])
  assert.equal((await ctx.get(`/pedidos/${pedido.id}`)).corpo.status, 'entregue')
  await devolver(ctx, pedido.id, [[pires.id, 1]])
  const { corpo } = await ctx.get(`/pedidos/${pedido.id}`)
  assert.equal(corpo.status, 'devolvido')
  assert.equal(corpo.reembolsado, corpo.total)
  const historico = (await ctx.get(`/pedidos/${pedido.id}/historico`)).corpo.itens
  assert.deepEqual(historico.at(-1), { de: 'entregue', para: 'devolvido', em: '2026-03-01T12:00:00.000Z' })
  assert.equal((await devolver(ctx, pedido.id, [[pires.id, 1]])).status, 409)
})

test('a mesma Idempotency-Key devolve a mesma devolução, sem repetir nada', async () => {
  const ctx = montar()
  const { pedido, caneca } = await cenario(ctx)
  await entregar(ctx, pedido.id)
  const primeira = await devolver(ctx, pedido.id, [[caneca.id, 1]], 'abc-123')
  const segunda = await devolver(ctx, pedido.id, [[caneca.id, 1]], 'abc-123')
  assert.equal(primeira.status, 201)
  assert.equal(segunda.status, 200)
  assert.deepEqual(segunda.corpo, primeira.corpo)
  assert.equal(await estoque(ctx, caneca.id), 8)
  assert.equal((await ctx.get(`/pedidos/${pedido.id}`)).corpo.reembolsado, 5000)
  assert.equal((await devolver(ctx, pedido.id, [[caneca.id, 1]], 'outra')).status, 201)
})

test('a mesma Idempotency-Key com outro corpo é recusada com 409', async () => {
  const ctx = montar()
  const { pedido, caneca } = await cenario(ctx)
  await entregar(ctx, pedido.id)
  await devolver(ctx, pedido.id, [[caneca.id, 1]], 'abc-123')
  assert.equal((await devolver(ctx, pedido.id, [[caneca.id, 2]], 'abc-123')).status, 409)
  assert.equal(await estoque(ctx, caneca.id), 8)
})

test('devolução sem itens, com quantidade zero ou com item repetido é recusada', async () => {
  const ctx = montar()
  const { pedido, caneca } = await cenario(ctx)
  await entregar(ctx, pedido.id)
  assert.equal((await ctx.post(`/pedidos/${pedido.id}/devolucoes`, { itens: [] })).status, 400)
  assert.equal((await devolver(ctx, pedido.id, [[caneca.id, 0]])).status, 400)
  assert.equal(
    (
      await devolver(ctx, pedido.id, [
        [caneca.id, 1],
        [caneca.id, 1],
      ])
    ).status,
    422,
  )
  assert.equal(await estoque(ctx, caneca.id), 7)
})
