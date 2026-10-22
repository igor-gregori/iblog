import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import type { Preco } from '#base/precos.ts'
import { chamadas, comPrazoCurto, custoAcumulado, custoReal, type Chamada, type ChamadaReal, type Sessao } from '../pagina/sessao.ts'

// Os casos são gerados pela análise em Python (`uv run python -m o_que_e_uma_sessao`). Se a conta mudar de um lado
// e não do outro, estes testes quebram.

interface Casos {
  sessoes: { sessao: Sessao; chamadas: Chamada[]; custos: Record<string, { com_cache: number[]; sem_cache: number[] }> }[]
  sessao_real: { com_cache: number[]; sem_cache: number[]; prazo_curto: number[] }
}

const ler = (caminho: string) => JSON.parse(readFileSync(new URL(caminho, import.meta.url), 'utf8'))
const casos: Casos = ler('./casos.json')
const dados = ler('../pagina/dados.json')
const precos: Preco[] = dados.precos
const real: ChamadaReal[] = dados.sessao_real.chamadas
const modeloReal = precos.find((p) => p.modelo === dados.sessao_real.modelo)!

function quase(a: number[], b: number[], rotulo: string) {
  assert.equal(a.length, b.length, rotulo)
  a.forEach((valor, i) => assert.ok(Math.abs(valor - b[i]) < 1e-9, `${rotulo}, posição ${i}: ${valor} × ${b[i]}`))
}

test('os tokens de cada chamada são os mesmos do Python', () => {
  for (const caso of casos.sessoes) assert.deepEqual(chamadas(caso.sessao), caso.chamadas)
})

test('o custo de cada sessão, com e sem cache, é o mesmo do Python', () => {
  for (const caso of casos.sessoes) {
    for (const preco of precos) {
      const esperado = caso.custos[preco.modelo]
      quase(custoAcumulado(preco, caso.sessao), esperado.com_cache, `${preco.modelo} com cache`)
      quase(custoAcumulado(preco, caso.sessao, false), esperado.sem_cache, `${preco.modelo} sem cache`)
    }
  }
})

test('o custo da sessão real é o mesmo do Python', () => {
  quase(real.map((c) => custoReal(modeloReal, c)), casos.sessao_real.com_cache, 'com cache')
  quase(real.map((c) => custoReal(modeloReal, c, false)), casos.sessao_real.sem_cache, 'sem cache')
  quase(comPrazoCurto(real, dados.sessao_real.prazo_curto).map((c) => custoReal(modeloReal, c)), casos.sessao_real.prazo_curto, 'prazo curto')
})
