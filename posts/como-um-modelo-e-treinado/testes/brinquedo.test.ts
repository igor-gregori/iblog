import assert from 'node:assert/strict'
import { test } from 'node:test'
import { prever, tokens, treinar } from '../pagina/brinquedo.ts'
import { ANTES_DO_CORTE, DEPOIS_DO_CORTE } from '../pagina/corpus.ts'

test('quebra o código em nomes, sinais e textos entre aspas', () => {
  assert.deepEqual(tokens("app.get('/usuarios', async"), ['app', '.', 'get', '(', "'/usuarios'", ',', 'async'])
})

test('antes do corte, o modelo nunca viu a biblioteca nova', () => {
  const previsoes = prever(treinar(ANTES_DO_CORTE), 'app .')
  assert.equal(previsoes[0].token, 'get')
  assert.ok(!previsoes.some((p) => p.token === 'rota'))
  assert.equal(
    previsoes.reduce((soma, p) => soma + p.chance, 0),
    1,
  )
})

test('com um exemplo, a biblioteca nova aparece com pouca chance; com dez, passa a ser a mais provável', () => {
  const umExemplo = prever(treinar(ANTES_DO_CORTE + DEPOIS_DO_CORTE), 'app .')
  const rota = umExemplo.find((p) => p.token === 'rota')
  assert.ok(rota && rota.chance < 0.15)
  const dezExemplos = prever(treinar(ANTES_DO_CORTE + DEPOIS_DO_CORTE.repeat(10)), 'app .')
  assert.equal(dezExemplos[0].token, 'rota')
})

test('um contexto que nunca apareceu não tem previsão', () => {
  assert.deepEqual(prever(treinar(ANTES_DO_CORTE), 'return ctx'), [])
})
