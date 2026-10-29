import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import type { Preco } from '#base/precos.ts'
import { custoDaMemoria, custoDoPedido, custoMensal, custoMensalSemCache, type Pedido } from '../pagina/conta.ts'

// Os casos são gerados pela análise em Python (`uv run python -m memoria_de_ia`). Se a conta do custo da memória
// mudar de um lado e não do outro, este teste quebra.

interface Casos {
  sessao: { modelo: string; custo: number; memoria: number }[]
  meses: { modelo: string; tokens: number; chamadas: number; gravacoes: number; dias: number; com_cache: number; sem_cache: number }[]
}

const ler = (caminho: string) => JSON.parse(readFileSync(new URL(caminho, import.meta.url), 'utf8'))
const casos: Casos = ler('./casos.json')
const dados: { precos: Preco[]; pedidos: Pedido[] } = ler('../pagina/dados.json')
const preco = (modelo: string) => dados.precos.find((p) => p.modelo === modelo)!
const perto = (a: number, b: number) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b))

test('o custo da sessão real e o da memória são os mesmos do Python', () => {
  for (const caso of casos.sessao) {
    const p = preco(caso.modelo)
    const custo = dados.pedidos.reduce((total, pedido) => total + custoDoPedido(p, pedido), 0)
    const memoria = dados.pedidos.reduce((total, pedido) => total + custoDaMemoria(p, pedido), 0)
    assert.ok(perto(custo, caso.custo), `${caso.modelo}: ${custo} × ${caso.custo}`)
    assert.ok(perto(memoria, caso.memoria), `${caso.modelo}: ${memoria} × ${caso.memoria}`)
  }
})

test('o custo mensal da calculadora é o mesmo do Python', () => {
  for (const caso of casos.meses) {
    const p = preco(caso.modelo)
    const com = custoMensal(p, caso.tokens, caso.chamadas, caso.gravacoes, caso.dias)
    const sem = custoMensalSemCache(p, caso.tokens, caso.chamadas, caso.dias)
    assert.ok(perto(com, caso.com_cache), `${caso.modelo}, ${caso.tokens}: ${com} × ${caso.com_cache}`)
    assert.ok(perto(sem, caso.sem_cache), `${caso.modelo}, ${caso.tokens}: ${sem} × ${caso.sem_cache}`)
  }
})

test('a memória de cada pedido cabe nele, e a parte lida do cache cabe na memória', () => {
  for (const p of dados.pedidos) {
    assert.ok(p.memoria_atual <= p.memoria && p.memoria < p.contexto, `chamada ${p.chamada}`)
    assert.ok(p.memoria_lida >= 0 && p.memoria_lida <= p.memoria, `chamada ${p.chamada}`)
    assert.equal(p.fora + p.lidos + p.gravados + p.gravados_longos, p.contexto, `chamada ${p.chamada}`)
  }
})
