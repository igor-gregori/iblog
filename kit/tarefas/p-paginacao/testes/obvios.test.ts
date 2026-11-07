// O que qualquer dev deduziria do pedido.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { montar, produto, type Contexto } from './ajuda.ts'

async function vinteECinco(ctx: Contexto) {
  for (let i = 1; i <= 25; i++) {
    await produto(ctx, { nome: `Produto ${String(i).padStart(2, '0')}`, preco: i * 100 })
  }
}

const nomes = (corpo: any): string[] => corpo.itens.map((p: { nome: string }) => p.nome)

test('sem parâmetros, lista todos os produtos ativos com o total', async () => {
  const ctx = montar()
  await produto(ctx, { nome: 'Bule' })
  await produto(ctx, { nome: 'Pires' })
  const { status, corpo } = await ctx.get('/produtos')
  assert.equal(status, 200)
  assert.deepEqual(nomes(corpo), ['Bule', 'Pires'])
  assert.equal(corpo.total, 2)
})

test('pagina e porPagina devolvem a fatia certa, em ordem de nome', async () => {
  const ctx = montar()
  await vinteECinco(ctx)
  const segunda = await ctx.get('/produtos?pagina=2&porPagina=10')
  assert.equal(segunda.status, 200)
  assert.deepEqual(
    nomes(segunda.corpo),
    Array.from({ length: 10 }, (_, i) => `Produto ${String(i + 11).padStart(2, '0')}`),
  )
  assert.equal(segunda.corpo.total, 25)

  const terceira = await ctx.get('/produtos?pagina=3&porPagina=10')
  assert.equal(terceira.corpo.itens.length, 5)
  assert.equal(terceira.corpo.total, 25)
})

test('busca acha os produtos pelo trecho do nome', async () => {
  const ctx = montar()
  await produto(ctx, { nome: 'Caneca Azul' })
  await produto(ctx, { nome: 'Prato Fundo' })
  await produto(ctx, { nome: 'Caneca Verde' })
  const { corpo } = await ctx.get('/produtos?busca=Caneca')
  assert.deepEqual(nomes(corpo), ['Caneca Azul', 'Caneca Verde'])
  assert.equal(corpo.total, 2)
})

test('precoMin e precoMax filtram pela faixa de preço, em centavos', async () => {
  const ctx = montar()
  await produto(ctx, { nome: 'Barato', preco: 500 })
  await produto(ctx, { nome: 'Médio', preco: 2500 })
  await produto(ctx, { nome: 'Caro', preco: 9900 })
  assert.deepEqual(nomes((await ctx.get('/produtos?precoMin=1000&precoMax=5000')).corpo), ['Médio'])
  assert.deepEqual(nomes((await ctx.get('/produtos?precoMin=1000')).corpo), ['Caro', 'Médio'])
  assert.deepEqual(nomes((await ctx.get('/produtos?precoMax=1000')).corpo), ['Barato'])
})

test('o total conta só o que passa nos filtros, não só a página', async () => {
  const ctx = montar()
  await vinteECinco(ctx)
  await produto(ctx, { nome: 'Outro', preco: 100 })
  const { corpo } = await ctx.get('/produtos?busca=Produto&precoMax=1500&porPagina=5&pagina=1')
  assert.equal(corpo.total, 15)
  assert.equal(corpo.itens.length, 5)
})

test('produtos inativos continuam fora, com ou sem filtro', async () => {
  const ctx = montar()
  await produto(ctx, { nome: 'Caneca Azul' })
  const velha = await produto(ctx, { nome: 'Caneca Velha' })
  await ctx.patch(`/produtos/${velha.id}`, { ativo: false })
  assert.deepEqual(nomes((await ctx.get('/produtos?busca=Caneca')).corpo), ['Caneca Azul'])
  assert.equal((await ctx.get('/produtos')).corpo.total, 1)
})
