import assert from 'node:assert/strict'
import { test } from 'node:test'
import { criarCliente, criarPedido, criarProduto, montar, type Contexto } from './ajuda.ts'

async function estoqueDe(ctx: Contexto, produtoId: number): Promise<number> {
  return (await ctx.pedir({ method: 'GET', url: `/produtos/${produtoId}` })).corpo.estoque
}

test('cria um pedido pago, com o total e o estoque baixado', async () => {
  const ctx = montar()
  const cliente = await criarCliente(ctx)
  const caneca = await criarProduto(ctx, { preco: 3990, estoque: 10 })
  const pires = await criarProduto(ctx, { nome: 'Pires', preco: 1500, estoque: 3 })

  const { status, corpo } = await criarPedido(ctx, {
    clienteId: cliente.id,
    itens: [
      { produtoId: caneca.id, quantidade: 2 },
      { produtoId: pires.id, quantidade: 1 },
    ],
  })
  assert.equal(status, 201)
  assert.equal(corpo.status, 'pago')
  assert.equal(corpo.total, 2 * 3990 + 1500)
  assert.equal(corpo.criadoEm, '2026-03-01T12:00:00.000Z')
  assert.deepEqual(corpo.itens, [
    { produtoId: caneca.id, quantidade: 2, precoUnitario: 3990 },
    { produtoId: pires.id, quantidade: 1, precoUnitario: 1500 },
  ])
  assert.equal(await estoqueDe(ctx, caneca.id), 8)
  assert.equal(await estoqueDe(ctx, pires.id), 2)
})

test('usa o preço promocional quando há', async () => {
  const ctx = montar()
  const cliente = await criarCliente(ctx)
  const caneca = await criarProduto(ctx, { preco: 3990, precoPromocional: 2990 })
  const { corpo } = await criarPedido(ctx, { clienteId: cliente.id, itens: [{ produtoId: caneca.id, quantidade: 1 }] })
  assert.equal(corpo.total, 2990)
  assert.equal(corpo.itens[0].precoUnitario, 2990)
})

test('o pedido guarda o preço da compra, mesmo que o produto mude depois', async () => {
  const ctx = montar()
  const cliente = await criarCliente(ctx)
  const caneca = await criarProduto(ctx, { preco: 3990 })
  const { corpo } = await criarPedido(ctx, { clienteId: cliente.id, itens: [{ produtoId: caneca.id, quantidade: 1 }] })
  await ctx.pedir({ method: 'PATCH', url: `/produtos/${caneca.id}`, payload: { preco: 9990 } })
  const depois = await ctx.pedir({ method: 'GET', url: `/pedidos/${corpo.id}` })
  assert.equal(depois.corpo.itens[0].precoUnitario, 3990)
  assert.equal(depois.corpo.total, 3990)
})

test('sem estoque, recusa o pedido inteiro e não baixa nada', async () => {
  const ctx = montar()
  const cliente = await criarCliente(ctx)
  const caneca = await criarProduto(ctx, { estoque: 10 })
  const pires = await criarProduto(ctx, { nome: 'Pires', estoque: 1 })
  const { status, corpo } = await criarPedido(ctx, {
    clienteId: cliente.id,
    itens: [
      { produtoId: caneca.id, quantidade: 3 },
      { produtoId: pires.id, quantidade: 2 },
    ],
  })
  assert.equal(status, 422)
  assert.equal(corpo.erro.codigo, 'estoque_insuficiente')
  assert.equal(await estoqueDe(ctx, caneca.id), 10)
  assert.equal(await estoqueDe(ctx, pires.id), 1)
})

test('recusa produto inativo, cliente inexistente e item repetido', async () => {
  const ctx = montar()
  const cliente = await criarCliente(ctx)
  const caneca = await criarProduto(ctx)
  const inativo = await criarProduto(ctx, { nome: 'Velho' })
  await ctx.pedir({ method: 'PATCH', url: `/produtos/${inativo.id}`, payload: { ativo: false } })

  const casos: [Record<string, unknown>, string][] = [
    [{ clienteId: cliente.id, itens: [{ produtoId: inativo.id, quantidade: 1 }] }, 'produto_indisponivel'],
    [{ clienteId: 999, itens: [{ produtoId: caneca.id, quantidade: 1 }] }, 'cliente_inexistente'],
    [
      {
        clienteId: cliente.id,
        itens: [
          { produtoId: caneca.id, quantidade: 1 },
          { produtoId: caneca.id, quantidade: 2 },
        ],
      },
      'item_repetido',
    ],
  ]
  for (const [payload, codigo] of casos) {
    const { status, corpo } = await criarPedido(ctx, payload)
    assert.equal(status, 422, codigo)
    assert.equal(corpo.erro.codigo, codigo)
  }
})

test('recusa pedido sem itens ou com quantidade zero', async () => {
  const ctx = montar()
  const cliente = await criarCliente(ctx)
  const caneca = await criarProduto(ctx)
  assert.equal((await criarPedido(ctx, { clienteId: cliente.id, itens: [] })).status, 400)
  assert.equal(
    (await criarPedido(ctx, { clienteId: cliente.id, itens: [{ produtoId: caneca.id, quantidade: 0 }] })).status,
    400,
  )
})

test('envia e entrega, guardando as datas e o histórico', async () => {
  const ctx = montar()
  const cliente = await criarCliente(ctx)
  const caneca = await criarProduto(ctx)
  const { corpo: pedido } = await criarPedido(ctx, {
    clienteId: cliente.id,
    itens: [{ produtoId: caneca.id, quantidade: 1 }],
  })

  ctx.relogio.avancarDias(1)
  const enviado = await ctx.pedir({ method: 'POST', url: `/pedidos/${pedido.id}/enviar` })
  assert.equal(enviado.status, 200)
  assert.equal(enviado.corpo.status, 'enviado')
  assert.equal(enviado.corpo.enviadoEm, '2026-03-02T12:00:00.000Z')

  ctx.relogio.avancarDias(2)
  const entregue = await ctx.pedir({ method: 'POST', url: `/pedidos/${pedido.id}/entregar` })
  assert.equal(entregue.corpo.status, 'entregue')
  assert.equal(entregue.corpo.entregueEm, '2026-03-04T12:00:00.000Z')

  const historico = await ctx.pedir({ method: 'GET', url: `/pedidos/${pedido.id}/historico` })
  assert.deepEqual(historico.corpo.itens, [
    { de: null, para: 'pago', em: '2026-03-01T12:00:00.000Z' },
    { de: 'pago', para: 'enviado', em: '2026-03-02T12:00:00.000Z' },
    { de: 'enviado', para: 'entregue', em: '2026-03-04T12:00:00.000Z' },
  ])
})

test('não entrega um pedido que não foi enviado, nem envia duas vezes', async () => {
  const ctx = montar()
  const cliente = await criarCliente(ctx)
  const caneca = await criarProduto(ctx)
  const { corpo: pedido } = await criarPedido(ctx, {
    clienteId: cliente.id,
    itens: [{ produtoId: caneca.id, quantidade: 1 }],
  })
  const entregar = await ctx.pedir({ method: 'POST', url: `/pedidos/${pedido.id}/entregar` })
  assert.equal(entregar.status, 409)
  assert.equal(entregar.corpo.erro.codigo, 'transicao_invalida')

  await ctx.pedir({ method: 'POST', url: `/pedidos/${pedido.id}/enviar` })
  assert.equal((await ctx.pedir({ method: 'POST', url: `/pedidos/${pedido.id}/enviar` })).status, 409)
})

test('lista os pedidos de um cliente, do mais novo para o mais antigo', async () => {
  const ctx = montar()
  const ana = await criarCliente(ctx)
  const bia = await criarCliente(ctx)
  const caneca = await criarProduto(ctx)
  const primeiro = await criarPedido(ctx, { clienteId: ana.id, itens: [{ produtoId: caneca.id, quantidade: 1 }] })
  ctx.relogio.avancarDias(1)
  const segundo = await criarPedido(ctx, { clienteId: ana.id, itens: [{ produtoId: caneca.id, quantidade: 1 }] })
  await criarPedido(ctx, { clienteId: bia.id, itens: [{ produtoId: caneca.id, quantidade: 1 }] })

  const { corpo } = await ctx.pedir({ method: 'GET', url: `/pedidos?clienteId=${ana.id}` })
  assert.deepEqual(
    corpo.itens.map((p: { id: number }) => p.id),
    [segundo.corpo.id, primeiro.corpo.id],
  )
})

test('404 para pedido que não existe', async () => {
  const ctx = montar()
  assert.equal((await ctx.pedir({ method: 'GET', url: '/pedidos/7' })).status, 404)
  assert.equal((await ctx.pedir({ method: 'POST', url: '/pedidos/7/enviar' })).status, 404)
})
