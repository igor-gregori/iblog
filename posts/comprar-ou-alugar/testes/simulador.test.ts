import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { simular, taxaMensal, type Cenario, type Parametros, type Resultado } from '../pagina/simulador.ts'

// Os casos são gerados pelo simulador em Python (`uv run python -m comprar_ou_alugar`).
// Se a lógica mudar de um lado e não do outro, estes testes quebram.

interface Caso {
  nome: string
  parametros: Parametros
  cenario: Cenario
  esperado: { mes: number[] } & Record<keyof Resultado, number[]>
}

const casos: Caso[] = JSON.parse(readFileSync(new URL('./casos_simulador.json', import.meta.url), 'utf8'))

function quaseIgual(obtido: number, esperado: number, mensagem: string) {
  const tolerancia = 1e-6 + 1e-9 * Math.abs(esperado)
  assert.ok(Math.abs(obtido - esperado) <= tolerancia, `${mensagem}: obtido ${obtido}, esperado ${esperado}`)
}

for (const caso of casos) {
  test(`igual ao Python: ${caso.nome}`, () => {
    const resultado = simular(caso.parametros, caso.cenario)
    const { mes, ...colunas } = caso.esperado

    for (const [coluna, valores] of Object.entries(colunas)) {
      mes.forEach((m, posicao) => {
        quaseIgual(resultado[coluna as keyof Resultado][m], valores[posicao], `${coluna} no mês ${m}`)
      })
    }
  })
}

test('há casos para comparar', () => {
  assert.ok(casos.length >= 9)
})

test('taxa mensal compõe até a anual', () => {
  quaseIgual((1 + taxaMensal(0.11)) ** 12, 1.11, 'doze meses')
})
