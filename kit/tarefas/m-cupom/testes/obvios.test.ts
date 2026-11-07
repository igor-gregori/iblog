// O que qualquer dev deduziria do pedido.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cliente, ehErroDoCliente, estoque, montar, produto, type Contexto } from './ajuda.ts'

async function cupom(ctx: Contexto, dados: Record<string, unknown> = {}) {
  const { status, corpo } = await ctx.post('/cupons', {
    codigo: 'BEMVINDO',
    tipo: 'percentual',
    valor: 10,
    validoAte: '2026-12-31',
    minimo: 0,
    ...dados,
  })
  assert.equal(status, 201, JSON.stringify(corpo))
  return corpo
}

async function cenario(ctx: Contexto) {
  const ana = await cliente(ctx)
  const caneca = await produto(ctx, { preco: 5000, estoque: 10 })
  return { ana, caneca }
}

test('cadastra um cupom', async () => {
  const ctx = montar()
  await cupom(ctx)
})

test('cupom percentual tira a porcentagem do pedido', async () => {
  const ctx = montar()
  const { ana, caneca } = await cenario(ctx)
  await cupom(ctx, { codigo: 'DEZ', tipo: 'percentual', valor: 10 })
  const { status, corpo } = await ctx.post('/pedidos', {
    clienteId: ana.id,
    itens: [{ produtoId: caneca.id, quantidade: 2 }],
    cupom: 'DEZ',
  })
  assert.equal(status, 201, JSON.stringify(corpo))
  assert.equal(corpo.subtotal, 10000)
  assert.equal(corpo.desconto, 1000)
  assert.equal(corpo.total, 9000)
})

test('cupom fixo tira o valor do pedido', async () => {
  const ctx = montar()
  const { ana, caneca } = await cenario(ctx)
  await cupom(ctx, { codigo: 'QUINZE', tipo: 'fixo', valor: 1500 })
  const { corpo } = await ctx.post('/pedidos', {
    clienteId: ana.id,
    itens: [{ produtoId: caneca.id, quantidade: 1 }],
    cupom: 'QUINZE',
  })
  assert.equal(corpo.subtotal, 5000)
  assert.equal(corpo.desconto, 1500)
  assert.equal(corpo.total, 3500)
})

test('pedido sem cupom não tem desconto', async () => {
  const ctx = montar()
  const { ana, caneca } = await cenario(ctx)
  const { status, corpo } = await ctx.post('/pedidos', {
    clienteId: ana.id,
    itens: [{ produtoId: caneca.id, quantidade: 1 }],
  })
  assert.equal(status, 201)
  assert.equal(corpo.subtotal, 5000)
  assert.equal(corpo.desconto, 0)
  assert.equal(corpo.total, 5000)
})

test('o desconto fica guardado no pedido', async () => {
  const ctx = montar()
  const { ana, caneca } = await cenario(ctx)
  await cupom(ctx, { codigo: 'DEZ', valor: 10 })
  const criado = await ctx.post('/pedidos', {
    clienteId: ana.id,
    itens: [{ produtoId: caneca.id, quantidade: 1 }],
    cupom: 'DEZ',
  })
  const { corpo } = await ctx.get(`/pedidos/${criado.corpo.id}`)
  assert.equal(corpo.subtotal, 5000)
  assert.equal(corpo.desconto, 500)
  assert.equal(corpo.total, 4500)
})

for (const [nome, dadosDoCupom, codigoUsado] of [
  ['inexistente', null, 'NAOEXISTE'],
  ['vencido', { codigo: 'VELHO', validoAte: '2026-02-01' }, 'VELHO'],
  ['com pedido abaixo do mínimo', { codigo: 'GRANDE', minimo: 20000 }, 'GRANDE'],
] as const) {
  test(`recusa o pedido com cupom ${nome}, sem mexer no estoque`, async () => {
    const ctx = montar()
    const { ana, caneca } = await cenario(ctx)
    if (dadosDoCupom) await cupom(ctx, dadosDoCupom)
    const { status } = await ctx.post('/pedidos', {
      clienteId: ana.id,
      itens: [{ produtoId: caneca.id, quantidade: 1 }],
      cupom: codigoUsado,
    })
    assert.ok(ehErroDoCliente(status), `status ${status}`)
    assert.equal(await estoque(ctx, caneca.id), 10)
    assert.deepEqual((await ctx.get(`/pedidos?clienteId=${ana.id}`)).corpo.itens, [])
  })
}
