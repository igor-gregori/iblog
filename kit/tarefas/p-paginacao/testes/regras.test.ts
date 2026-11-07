// Regras que só a especificação conta.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { montar, produto } from './ajuda.ts'

const nomes = (corpo: any): string[] => corpo.itens.map((p: { nome: string }) => p.nome)

test('porPagina vale 20 quando não vem, e a resposta diz a página e o tamanho', async () => {
  const ctx = montar()
  for (let i = 1; i <= 25; i++) await produto(ctx, { nome: `P${String(i).padStart(2, '0')}` })
  const { corpo } = await ctx.get('/produtos')
  assert.equal(corpo.itens.length, 20)
  assert.equal(corpo.total, 25)
  assert.equal(corpo.pagina, 1)
  assert.equal(corpo.porPagina, 20)
})

test('busca não diferencia maiúsculas nem acentos', async () => {
  const ctx = montar()
  await produto(ctx, { nome: 'Café com Leite' })
  await produto(ctx, { nome: 'CAFETEIRA' })
  await produto(ctx, { nome: 'Chá' })
  assert.deepEqual(nomes((await ctx.get('/produtos?busca=cafe')).corpo), ['CAFETEIRA', 'Café com Leite'])
  assert.deepEqual(nomes((await ctx.get(`/produtos?busca=${encodeURIComponent('CHÁ')}`)).corpo), ['Chá'])
  assert.deepEqual(nomes((await ctx.get('/produtos?busca=cha')).corpo), ['Chá'])
})

test('busca trata % e _ como texto, não como curinga', async () => {
  const ctx = montar()
  await produto(ctx, { nome: 'Cupom 50% off' })
  await produto(ctx, { nome: 'Kit 500 peças' })
  await produto(ctx, { nome: 'Fio_dental' })
  await produto(ctx, { nome: 'Fio dental' })
  assert.deepEqual(nomes((await ctx.get(`/produtos?busca=${encodeURIComponent('50%')}`)).corpo), ['Cupom 50% off'])
  assert.deepEqual(nomes((await ctx.get('/produtos?busca=o_d')).corpo), ['Fio_dental'])
})

test('busca vazia ou só com espaços não filtra, e os espaços das pontas são ignorados', async () => {
  const ctx = montar()
  await produto(ctx, { nome: 'Bule' })
  await produto(ctx, { nome: 'Pires' })
  assert.equal((await ctx.get('/produtos?busca=')).corpo.total, 2)
  assert.equal((await ctx.get('/produtos?busca=%20%20')).corpo.total, 2)
  assert.deepEqual(nomes((await ctx.get('/produtos?busca=%20bule%20')).corpo), ['Bule'])
})

test('a faixa de preço usa o preço de venda (o promocional, quando há)', async () => {
  const ctx = montar()
  await produto(ctx, { nome: 'Em promoção', preco: 9000, precoPromocional: 4000 })
  await produto(ctx, { nome: 'Normal', preco: 4500 })
  assert.deepEqual(nomes((await ctx.get('/produtos?precoMax=4200')).corpo), ['Em promoção'])
  assert.deepEqual(nomes((await ctx.get('/produtos?precoMin=5000')).corpo), [])
})

test('os limites da faixa de preço entram', async () => {
  const ctx = montar()
  await produto(ctx, { nome: 'A', preco: 1000 })
  await produto(ctx, { nome: 'B', preco: 2000 })
  await produto(ctx, { nome: 'C', preco: 3000 })
  assert.deepEqual(nomes((await ctx.get('/produtos?precoMin=1000&precoMax=2000')).corpo), ['A', 'B'])
  assert.deepEqual(nomes((await ctx.get('/produtos?precoMin=3000&precoMax=3000')).corpo), ['C'])
})

test('página depois da última devolve a lista vazia, com o total', async () => {
  const ctx = montar()
  await produto(ctx, { nome: 'Bule' })
  const { status, corpo } = await ctx.get('/produtos?pagina=5')
  assert.equal(status, 200)
  assert.deepEqual(corpo.itens, [])
  assert.equal(corpo.total, 1)
})

test('parâmetros fora dos limites são recusados com 400', async () => {
  const ctx = montar()
  await produto(ctx)
  for (const query of [
    'pagina=0',
    'pagina=-1',
    'porPagina=0',
    'porPagina=101',
    'pagina=abc',
    'precoMin=-1',
    'precoMin=10.5',
    'precoMin=5000&precoMax=1000',
  ]) {
    const { status, corpo } = await ctx.get(`/produtos?${query}`)
    assert.equal(status, 400, query)
    assert.equal(corpo.erro.codigo, 'dados_invalidos', query)
  }
  assert.equal((await ctx.get('/produtos?porPagina=100')).status, 200)
})
