// Regras que só a especificação conta.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cliente, estoque, montar, produto, type Contexto } from './ajuda.ts'

async function cupom(ctx: Contexto, dados: Record<string, unknown> = {}) {
  return ctx.post('/cupons', {
    codigo: 'BEMVINDO',
    tipo: 'percentual',
    valor: 10,
    validoAte: '2026-12-31',
    minimo: 0,
    ...dados,
  })
}

async function pedir(ctx: Contexto, clienteId: number, itens: [number, number][], codigo?: string) {
  return ctx.post('/pedidos', {
    clienteId,
    itens: itens.map(([produtoId, quantidade]) => ({ produtoId, quantidade })),
    ...(codigo === undefined ? {} : { cupom: codigo }),
  })
}

test('o código não diferencia maiúsculas: é guardado e devolvido em maiúsculas', async () => {
  const ctx = montar()
  const ana = await cliente(ctx)
  const caneca = await produto(ctx, { preco: 5000 })
  const criado = await cupom(ctx, { codigo: 'natal10' })
  assert.equal(criado.status, 201)
  assert.equal(criado.corpo.codigo, 'NATAL10')
  const { status, corpo } = await pedir(ctx, ana.id, [[caneca.id, 1]], 'Natal10')
  assert.equal(status, 201, JSON.stringify(corpo))
  assert.equal(corpo.desconto, 500)
  assert.equal(corpo.cupom, 'NATAL10')
})

test('código repetido, em qualquer caixa, é recusado com 409', async () => {
  const ctx = montar()
  assert.equal((await cupom(ctx, { codigo: 'NATAL10' })).status, 201)
  assert.equal((await cupom(ctx, { codigo: 'natal10' })).status, 409)
})

test('o cupom vale até o fim do dia de validoAte, em UTC', async () => {
  const ctx = montar()
  const ana = await cliente(ctx)
  const bia = await cliente(ctx)
  const caneca = await produto(ctx, { preco: 5000 })
  await cupom(ctx, { codigo: 'HOJE', validoAte: '2026-03-10' })
  ctx.relogio.irPara('2026-03-10T23:59:59Z')
  assert.equal((await pedir(ctx, ana.id, [[caneca.id, 1]], 'HOJE')).status, 201)
  ctx.relogio.irPara('2026-03-11T00:00:00Z')
  assert.equal((await pedir(ctx, bia.id, [[caneca.id, 1]], 'HOJE')).status, 422)
})

test('cada cliente usa o mesmo cupom uma vez só', async () => {
  const ctx = montar()
  const ana = await cliente(ctx)
  const bia = await cliente(ctx)
  const caneca = await produto(ctx, { preco: 5000 })
  await cupom(ctx, { codigo: 'UMAVEZ' })
  assert.equal((await pedir(ctx, ana.id, [[caneca.id, 1]], 'UMAVEZ')).status, 201)
  assert.equal((await pedir(ctx, ana.id, [[caneca.id, 1]], 'umavez')).status, 422)
  assert.equal((await pedir(ctx, bia.id, [[caneca.id, 1]], 'UMAVEZ')).status, 201)
})

test('um pedido recusado não gasta o uso do cupom', async () => {
  const ctx = montar()
  const ana = await cliente(ctx)
  const caneca = await produto(ctx, { preco: 5000, estoque: 1 })
  await cupom(ctx, { codigo: 'UMAVEZ' })
  assert.equal((await pedir(ctx, ana.id, [[caneca.id, 5]], 'UMAVEZ')).status, 422)
  const { status, corpo } = await pedir(ctx, ana.id, [[caneca.id, 1]], 'UMAVEZ')
  assert.equal(status, 201)
  assert.equal(corpo.desconto, 500)
})

test('itens em promoção não recebem o desconto do cupom', async () => {
  const ctx = montar()
  const ana = await cliente(ctx)
  const normal = await produto(ctx, { nome: 'Normal', preco: 6000 })
  const promocao = await produto(ctx, { nome: 'Promo', preco: 5000, precoPromocional: 4000 })
  await cupom(ctx, { codigo: 'DEZ', valor: 10 })
  const { corpo } = await pedir(
    ctx,
    ana.id,
    [
      [normal.id, 1],
      [promocao.id, 1],
    ],
    'DEZ',
  )
  assert.equal(corpo.subtotal, 10000)
  assert.equal(corpo.desconto, 600)
  assert.equal(corpo.total, 9400)
})

test('o desconto fixo não passa do valor dos itens sem promoção', async () => {
  const ctx = montar()
  const ana = await cliente(ctx)
  const normal = await produto(ctx, { nome: 'Normal', preco: 1000 })
  const promocao = await produto(ctx, { nome: 'Promo', preco: 5000, precoPromocional: 4000 })
  await cupom(ctx, { codigo: 'TRINTA', tipo: 'fixo', valor: 3000 })
  const { corpo } = await pedir(
    ctx,
    ana.id,
    [
      [normal.id, 1],
      [promocao.id, 1],
    ],
    'TRINTA',
  )
  assert.equal(corpo.desconto, 1000)
  assert.equal(corpo.total, 4000)
})

test('se todos os itens estão em promoção, o cupom é recusado e nada muda', async () => {
  const ctx = montar()
  const ana = await cliente(ctx)
  const promocao = await produto(ctx, { preco: 5000, precoPromocional: 4000, estoque: 3 })
  await cupom(ctx, { codigo: 'DEZ' })
  assert.equal((await pedir(ctx, ana.id, [[promocao.id, 1]], 'DEZ')).status, 422)
  assert.equal(await estoque(ctx, promocao.id), 3)
  assert.equal((await pedir(ctx, ana.id, [[promocao.id, 1]])).status, 201)
})

test('o mínimo vale sobre o subtotal de todos os itens, e o próprio mínimo basta', async () => {
  const ctx = montar()
  const ana = await cliente(ctx)
  const normal = await produto(ctx, { nome: 'Normal', preco: 6000 })
  const promocao = await produto(ctx, { nome: 'Promo', preco: 5000, precoPromocional: 4000 })
  await cupom(ctx, { codigo: 'MINIMO', minimo: 10000 })
  const { status, corpo } = await pedir(
    ctx,
    ana.id,
    [
      [normal.id, 1],
      [promocao.id, 1],
    ],
    'MINIMO',
  )
  assert.equal(status, 201, JSON.stringify(corpo))
  assert.equal(corpo.desconto, 600)
})

test('o desconto percentual é arredondado para baixo, ao centavo', async () => {
  const ctx = montar()
  const ana = await cliente(ctx)
  const caneca = await produto(ctx, { preco: 3333 })
  await cupom(ctx, { codigo: 'QUINZE', valor: 15 })
  const { corpo } = await pedir(ctx, ana.id, [[caneca.id, 1]], 'QUINZE')
  assert.equal(corpo.desconto, 499)
  assert.equal(corpo.total, 2834)
})

test('cadastro recusa porcentagem fora de 1 a 100, valor zero e data inválida', async () => {
  const ctx = montar()
  for (const dados of [
    { codigo: 'A', tipo: 'percentual', valor: 0 },
    { codigo: 'B', tipo: 'percentual', valor: 101 },
    { codigo: 'C', tipo: 'fixo', valor: 0 },
    { codigo: 'D', validoAte: '2026-13-01' },
    { codigo: 'E', validoAte: '31/12/2026' },
    { codigo: 'F', tipo: 'brinde' },
  ]) {
    const { status } = await cupom(ctx, dados)
    assert.equal(status, 400, JSON.stringify(dados))
  }
  assert.equal((await cupom(ctx, { codigo: 'G', tipo: 'percentual', valor: 100 })).status, 201)
  assert.equal((await cupom(ctx, { codigo: 'H', tipo: 'fixo', valor: 99999 })).status, 201)
})

test('pedido sem cupom responde cupom null', async () => {
  const ctx = montar()
  const ana = await cliente(ctx)
  const caneca = await produto(ctx)
  const { corpo } = await pedir(ctx, ana.id, [[caneca.id, 1]])
  assert.equal(corpo.cupom, null)
})
