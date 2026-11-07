import assert from 'node:assert/strict'
import { test } from 'node:test'
import { criarProduto, montar } from './ajuda.ts'

test('cadastra um produto e devolve com id', async () => {
  const ctx = montar()
  const produto = await criarProduto(ctx, { nome: 'Caneca', preco: 3990, estoque: 5 })
  assert.equal(typeof produto.id, 'number')
  assert.deepEqual(
    { ...produto, id: 0 },
    { id: 0, nome: 'Caneca', preco: 3990, precoPromocional: null, estoque: 5, ativo: true },
  )
})

test('recusa preço quebrado: dinheiro é sempre em centavos', async () => {
  const ctx = montar()
  const { status, corpo } = await ctx.pedir({ method: 'POST', url: '/produtos', payload: { nome: 'X', preco: 39.9 } })
  assert.equal(status, 400)
  assert.equal(corpo.erro.codigo, 'dados_invalidos')
})

test('recusa preço promocional maior ou igual ao preço normal', async () => {
  const ctx = montar()
  const { status, corpo } = await ctx.pedir({
    method: 'POST',
    url: '/produtos',
    payload: { nome: 'X', preco: 1000, precoPromocional: 1000 },
  })
  assert.equal(status, 422)
  assert.equal(corpo.erro.codigo, 'promocao_invalida')
})

test('lista só os produtos ativos, em ordem de nome', async () => {
  const ctx = montar()
  await criarProduto(ctx, { nome: 'Pires' })
  const caneca = await criarProduto(ctx, { nome: 'Caneca' })
  await criarProduto(ctx, { nome: 'Bule' })
  await ctx.pedir({ method: 'PATCH', url: `/produtos/${caneca.id}`, payload: { ativo: false } })

  const { status, corpo } = await ctx.pedir({ method: 'GET', url: '/produtos' })
  assert.equal(status, 200)
  assert.deepEqual(
    corpo.itens.map((p: { nome: string }) => p.nome),
    ['Bule', 'Pires'],
  )
})

test('busca um produto pelo id, e 404 se não existe', async () => {
  const ctx = montar()
  const produto = await criarProduto(ctx)
  assert.equal((await ctx.pedir({ method: 'GET', url: `/produtos/${produto.id}` })).corpo.nome, 'Caneca')
  const { status, corpo } = await ctx.pedir({ method: 'GET', url: '/produtos/999' })
  assert.equal(status, 404)
  assert.equal(corpo.erro.codigo, 'nao_encontrado')
})

test('atualiza preço, promoção e estoque', async () => {
  const ctx = montar()
  const produto = await criarProduto(ctx, { preco: 3990 })
  const { status, corpo } = await ctx.pedir({
    method: 'PATCH',
    url: `/produtos/${produto.id}`,
    payload: { preco: 4500, precoPromocional: 3500, estoque: 2 },
  })
  assert.equal(status, 200)
  assert.equal(corpo.preco, 4500)
  assert.equal(corpo.precoPromocional, 3500)
  assert.equal(corpo.estoque, 2)

  const semPromocao = await ctx.pedir({
    method: 'PATCH',
    url: `/produtos/${produto.id}`,
    payload: { precoPromocional: null },
  })
  assert.equal(semPromocao.corpo.precoPromocional, null)
})
