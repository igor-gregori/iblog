import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import {
  anualizar,
  comparar,
  descontar,
  distanciaDoPico,
  indiceDescontado,
  maiorQueda,
  matrizDePeriodos,
  mesesEntre,
  poderDeCompra,
  quedas,
  somarMeses,
  type Queda,
  type Tabela,
} from '../pagina/contas.ts'

// Os casos são gerados pela análise em Python (`uv run python -m juros_negativos`), a partir dos
// mesmos níveis que a página recebe. Se a conta mudar de um lado e não do outro, estes testes quebram.

interface Casos {
  periodos: {
    inicio: string
    fim: string
    ativo: string
    regua: string
    esperado: { meses: number; variacao_do_ativo: number; variacao_da_regua: number; acima_da_regua: number; acima_da_regua_aa: number }
  }[]
  quedas: { serie: string; inicio: string; fim: string; minima: number; esperado: Queda[] }[]
  distancia_do_pico_do_bitcoin_desde_2011: Record<string, number>
  matriz_selic_m2: { inicio: number; fim: number; esperado: number }[]
  poder_de_compra_da_selic_desde_2008: Record<string, number>
}

const ler = (caminho: string) => JSON.parse(readFileSync(new URL(caminho, import.meta.url), 'utf8'))
const casos: Casos = ler('./casos_calculadora.json')
const niveis: Tabela = ler('../pagina/dados.json').niveis
const ultimaAbertura = somarMeses(niveis.datas[niveis.datas.length - 1], 1)

function quaseIgual(obtido: number | null | undefined, esperado: number, mensagem: string) {
  assert.ok(typeof obtido === 'number', `${mensagem}: sem resultado`)
  const tolerancia = 1e-9 + 1e-9 * Math.abs(esperado)
  assert.ok(Math.abs(obtido - esperado) <= tolerancia, `${mensagem}: obtido ${obtido}, esperado ${esperado}`)
}

for (const caso of casos.periodos) {
  test(`igual ao Python: ${caso.ativo} contra ${caso.regua}, de ${caso.inicio} a ${caso.fim}`, () => {
    const resultado = comparar(niveis, caso.ativo, caso.regua, caso.inicio, caso.fim)
    assert.ok(resultado)
    assert.equal(resultado.meses, caso.esperado.meses)
    quaseIgual(resultado.variacaoDoAtivo, caso.esperado.variacao_do_ativo, 'variação do ativo')
    quaseIgual(resultado.variacaoDaRegua, caso.esperado.variacao_da_regua, 'variação da régua')
    quaseIgual(resultado.acimaDaRegua, caso.esperado.acima_da_regua, 'acima da régua')
    quaseIgual(resultado.acimaDaReguaAoAno, caso.esperado.acima_da_regua_aa, 'acima da régua ao ano')
  })
}

test('há casos para comparar', () => {
  assert.ok(casos.periodos.length >= 12)
})

test('matriz de períodos igual à do Python', () => {
  const matriz = matrizDePeriodos(niveis, 'selic', 'm2')
  for (const caso of casos.matriz_selic_m2) {
    const valor = matriz.valores[matriz.inicios.indexOf(caso.inicio)][matriz.fins.indexOf(caso.fim)]
    quaseIgual(valor, caso.esperado, `de ${caso.inicio} a ${caso.fim}`)
  }
  // O fim nunca vem antes do início.
  assert.equal(matriz.valores[matriz.inicios.indexOf(2010)][matriz.fins.indexOf(2010)], null)
  assert.equal(matriz.valores[matriz.inicios.indexOf(2010)][matriz.fins.indexOf(2005)], null)
})

test('poder de compra igual ao do Python', () => {
  const esperado = casos.poder_de_compra_da_selic_desde_2008
  const obtido = poderDeCompra(niveis, 'selic', Object.keys(esperado), '2008-01', ultimaAbertura)
  for (const [coisa, valor] of Object.entries(esperado)) quaseIgual(obtido[coisa], valor, coisa)
})

for (const caso of casos.quedas) {
  test(`quedas iguais às do Python: ${caso.serie} desde ${caso.inicio}, de pelo menos ${caso.minima}`, () => {
    const obtidas = quedas(niveis, caso.serie, caso.inicio, caso.fim, caso.minima)
    assert.deepEqual(
      obtidas.map(({ pico, fundo }) => ({ pico, fundo })),
      caso.esperado.map(({ pico, fundo }) => ({ pico, fundo })),
    )
    obtidas.forEach((queda, i) => quaseIgual(queda.queda, caso.esperado[i].queda, `queda de ${queda.pico}`))
  })
}

test('há quedas para comparar, e quem só sobe não tem nenhuma', () => {
  assert.ok(casos.quedas.some((caso) => caso.esperado.length >= 5))
  assert.ok(casos.quedas.some((caso) => caso.esperado.length === 0))
  assert.equal(maiorQueda([]), null)
  const doBitcoin = quedas(niveis, 'bitcoin', '2011-01', ultimaAbertura, 0.5)
  assert.equal(maiorQueda(doBitcoin)?.queda, Math.min(...doBitcoin.map((queda) => queda.queda)))
})

test('distância do pico igual à do Python', () => {
  const distancia = distanciaDoPico(niveis, 'bitcoin', '2011-01', ultimaAbertura)
  assert.equal(distancia.datas[0], '2010-12')
  assert.equal(distancia.datas[distancia.datas.length - 1], niveis.datas[niveis.datas.length - 1])
  for (const [mes, esperado] of Object.entries(casos.distancia_do_pico_do_bitcoin_desde_2011)) {
    quaseIgual(distancia.valores[distancia.datas.indexOf(mes)], esperado, mes)
  }
  // Antes de existir preço não há distância; o primeiro mês com preço é o primeiro recorde.
  const antiga = distanciaDoPico(niveis, 'bitcoin', '2005-01', '2011-01')
  assert.equal(antiga.valores[0], null)
  assert.equal(antiga.valores.find((valor) => valor !== null), 0)
})

test('período sem dado não tem resultado', () => {
  assert.equal(comparar(niveis, 'bitcoin', 'ipca', '2005-01', '2010-01'), null) // o bitcoin não existia
  assert.equal(comparar(niveis, 'selic', 'm4', '1998-01', '2008-01'), null) // o M4 só tem série desde dez/2001
  assert.equal(comparar(niveis, 'selic', 'ipca', '2010-01', '2010-01'), null)
})

test('o índice descontado começa em 100 e termina onde a comparação diz', () => {
  const indice = indiceDescontado(niveis, 'selic', 'ipca', '2008-01')
  const comparacao = comparar(niveis, 'selic', 'ipca', '2008-01', ultimaAbertura)
  assert.equal(indice.datas[0], '2007-12')
  quaseIgual(indice.valores[0], 100, 'partida')
  quaseIgual(indice.valores[indice.valores.length - 1], 100 * (1 + comparacao!.acimaDaRegua), 'chegada')
})

test('meses e taxas', () => {
  assert.equal(somarMeses('2008-01', -1), '2007-12')
  assert.equal(somarMeses('2007-12', 1), '2008-01')
  assert.equal(somarMeses('2026-08', 13), '2027-09')
  assert.equal(mesesEntre('2008-01', '2018-01'), 120)
  quaseIgual(descontar(0.21, 0.1), 0.1, 'descontar')
  quaseIgual(anualizar(0.21, 24), 0.1, 'anualizar')
})
