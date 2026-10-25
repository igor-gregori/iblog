import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import { encode } from 'gpt-tokenizer/encoding/o200k_base'
import type { Preco } from '#base/precos.ts'
import { custoDaPergunta } from '../pagina/conta.ts'
import { cosseno, criarIndice, fusao, ordem, termos } from '../pagina/busca.ts'
import { busca, dividir, type Pedaco } from '../pagina/pedacos.ts'

// Os casos são gerados pela análise em Python (`uv run python -m rag_sem_misterio`). Se uma conta mudar de um lado e
// não do outro, estes testes quebram.

interface Casos {
  termos: { texto: string; esperado: string[] }[]
  bm25: { pergunta: string; notas: number[] }[]
  cosseno: { a: number[]; b: number[]; esperado: number }[]
  fusao: { listas: number[][]; limite: number; esperado: number[] }[]
  custos: {
    modelo: string
    documentos: number
    pedacos: number
    esperado: { tudo_sem_cache: number | null; tudo_com_cache: number | null; rag: number }
  }[]
  divisao: { arquivo: string; maximo: number; esperado: Pedaco[] }[]
}

interface Dados {
  tamanho_padrao: number
  sem_lugar: Record<string, { palavras: number | null; significado: number | null }>
  mapa: { explicado: number; pontos: [number, number][] }
  precos: Preco[]
  limite_da_fusao: number
  perguntas: { id: string; pergunta: string; trecho: string }[]
  tamanhos: {
    tamanho: number
    pedacos: Pedaco[]
    significado: Record<string, [number, number][]>
    posicoes: Record<string, Record<'palavras' | 'significado' | 'hibrida', number | null>>
  }[]
}

const ler = (caminho: string) => JSON.parse(readFileSync(new URL(caminho, import.meta.url), 'utf8'))
const casos: Casos = ler('./casos.json')
const dados: Dados = ler('../pagina/dados.json')
const CORPUS = new URL('../dados/corpus/', import.meta.url)
const contar = (texto: string) => encode(texto).length

test('as palavras da busca são as mesmas do Python', () => {
  for (const caso of casos.termos) assert.deepEqual(termos(caso.texto), caso.esperado, caso.texto)
})

test('as notas do BM25 são as mesmas do Python', () => {
  const pedacos = dados.tamanhos.find((t) => t.tamanho === 200)!.pedacos
  const notas = criarIndice(pedacos.map(busca))
  for (const caso of casos.bm25) {
    const valores = notas(caso.pergunta)
    assert.equal(valores.length, caso.notas.length)
    valores.forEach((v, i) => assert.ok(Math.abs(v - caso.notas[i]) < 1e-9, `${caso.pergunta}, pedaço ${i}: ${v} × ${caso.notas[i]}`))
  }
})

test('o cosseno e a fusão são os mesmos do Python', () => {
  for (const caso of casos.cosseno) assert.ok(Math.abs(cosseno(caso.a, caso.b) - caso.esperado) < 1e-12)
  for (const caso of casos.fusao) assert.deepEqual(fusao(caso.listas, caso.limite), caso.esperado)
})

test('a divisão em pedaços é a mesma do Python', () => {
  for (const caso of casos.divisao) {
    const texto = readFileSync(new URL('iblog__' + caso.arquivo.replaceAll('/', '__'), CORPUS), 'utf8')
    assert.deepEqual(dividir(caso.arquivo, texto, caso.maximo, contar), caso.esperado, `${caso.arquivo}, ${caso.maximo}`)
  }
})

test('os pedaços da página são os do corpus, em todos os tamanhos', () => {
  const arquivos = readdirSync(CORPUS).filter((nome) => nome.endsWith('.md')).sort()
  for (const { tamanho, pedacos } of dados.tamanhos) {
    const esperado = arquivos.flatMap((nome) =>
      dividir(nome.replace(/^iblog__/, '').replaceAll('__', '/'), readFileSync(new URL(nome, CORPUS), 'utf8'), tamanho, contar),
    )
    assert.deepEqual(pedacos, esperado, `tamanho ${tamanho}`)
  }
})

test('a posição do primeiro pedaço certo em cada busca é a mesma do Python', () => {
  for (const { tamanho, pedacos, significado, posicoes } of dados.tamanhos) {
    const notas = criarIndice(pedacos.map(busca))
    for (const pergunta of dados.perguntas) {
      const certo = (i: number) => pedacos[i].texto.includes(pergunta.trecho)
      const primeiro = (lista: number[]) => {
        const i = lista.findIndex(certo)
        return i < 0 ? null : i + 1
      }
      const valores = notas(pergunta.pergunta)
      const palavras = ordem(valores).filter((i) => valores[i] > 0)
      const porSignificado = significado[pergunta.id].map(([i]) => i)
      const esperado = posicoes[pergunta.id]
      assert.equal(primeiro(palavras), esperado.palavras, `${tamanho}, ${pergunta.id}, palavras`)
      assert.equal(primeiro(porSignificado), esperado.significado, `${tamanho}, ${pergunta.id}, significado`)
      assert.equal(primeiro(fusao([palavras, porSignificado], dados.limite_da_fusao)), esperado.hibrida, `${tamanho}, ${pergunta.id}, híbrida`)
    }
  }
})

test('o custo de uma pergunta é o mesmo do Python', () => {
  const perto = (a: number | null, b: number | null) => (a === null || b === null ? a === b : Math.abs(a - b) < 1e-12)
  for (const caso of casos.custos) {
    const preco = dados.precos.find((p) => p.modelo === caso.modelo)!
    const c = custoDaPergunta(preco, caso.documentos, caso.pedacos)
    const nome = `${caso.modelo}, ${caso.documentos}`
    assert.ok(perto(c.tudoSemCache, caso.esperado.tudo_sem_cache), nome)
    assert.ok(perto(c.tudoComCache, caso.esperado.tudo_com_cache), nome)
    assert.ok(perto(c.rag, caso.esperado.rag), nome)
  }
})

test('sem o arquivo e os títulos, a busca por palavras dá as mesmas posições do Python', () => {
  const { pedacos } = dados.tamanhos.find((t) => t.tamanho === dados.tamanho_padrao)!
  const notas = criarIndice(pedacos.map((p) => p.texto))
  for (const pergunta of dados.perguntas) {
    const valores = notas(pergunta.pergunta)
    const lista = ordem(valores).filter((i) => valores[i] > 0)
    const i = lista.findIndex((j) => pedacos[j].texto.includes(pergunta.trecho))
    assert.equal(i < 0 ? null : i + 1, dados.sem_lugar[pergunta.id].palavras, pergunta.id)
  }
})

test('o mapa tem um ponto por pedaço do tamanho padrão', () => {
  const { pedacos } = dados.tamanhos.find((t) => t.tamanho === dados.tamanho_padrao)!
  assert.equal(dados.mapa.pontos.length, pedacos.length)
  assert.ok(dados.mapa.explicado > 0 && dados.mapa.explicado < 1)
})
