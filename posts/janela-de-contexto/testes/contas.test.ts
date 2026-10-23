import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { custoComFaixas, type Preco } from '#base/precos.ts'

// Os casos são gerados pela análise em Python (`uv run python -m janela_de_contexto`). Se a conta da faixa longa
// mudar de um lado e não do outro, este teste quebra.

interface Casos {
  custos: { modelo: string; entrada: number; saida: number; fracao_em_cache: number; esperado: number }[]
}

const ler = (caminho: string) => JSON.parse(readFileSync(new URL(caminho, import.meta.url), 'utf8'))
const casos: Casos = ler('./casos.json')
const precos: Preco[] = ler('../pagina/dados.json').precos

test('o custo com a faixa longa é o mesmo do Python', () => {
  for (const caso of casos.custos) {
    const preco = precos.find((p) => p.modelo === caso.modelo)!
    const valor = custoComFaixas(preco, caso.entrada, caso.saida, caso.fracao_em_cache)
    assert.ok(Math.abs(valor - caso.esperado) < 1e-12, `${caso.modelo}, ${caso.entrada}: ${valor} × ${caso.esperado}`)
  }
})

test('a composição de cada chamada soma o pedido inteiro', () => {
  const composicao: Record<string, number>[] = ler('../pagina/dados.json').composicao
  for (const c of composicao) {
    assert.equal(c.instrucoes + c.modelo + c.comandos + c.imagens + c.outros, c.contexto, `chamada ${c.chamada}`)
  }
})
