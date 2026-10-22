import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { custo, type Preco } from '#base/precos.ts'
import { contar, pedacos, type Pedaco } from '../pagina/tokens.ts'

// Os casos são gerados pela análise em Python (`uv run python -m quanto_custa_um_token`). Se a contagem ou a
// conta mudarem de um lado e não do outro, estes testes quebram.

interface Casos {
  tokens: { texto: string; tokens: number; pedacos: Pedaco[] }[]
  custos: { modelo: string; entrada: number; saida: number; fracao_em_cache: number; esperado: number }[]
}

const ler = (caminho: string) => JSON.parse(readFileSync(new URL(caminho, import.meta.url), 'utf8'))
const casos: Casos = ler('./casos.json')
const precos: Preco[] = ler('../pagina/dados.json').precos

test('o tokenizador do navegador conta igual ao do Python', () => {
  for (const caso of casos.tokens) {
    assert.equal(contar(caso.texto), caso.tokens, caso.texto)
    assert.deepEqual(pedacos(caso.texto), caso.pedacos, caso.texto)
  }
})

test('os pedaços voltam a ser o texto', () => {
  for (const caso of casos.tokens) assert.equal(pedacos(caso.texto).map(([texto]) => texto).join(''), caso.texto)
})

test('o custo em TypeScript é o mesmo do Python', () => {
  for (const caso of casos.custos) {
    const preco = precos.find((p) => p.modelo === caso.modelo)!
    const valor = custo(preco, caso.entrada, caso.saida, caso.fracao_em_cache)
    assert.ok(Math.abs(valor - caso.esperado) < 1e-12, `${caso.modelo}: ${valor} × ${caso.esperado}`)
  }
})
