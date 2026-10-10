import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { test } from 'node:test'
import { ANALISE, FONTES } from '../src/fontes.ts'

// O quadro "Fontes e método" de cada seção aponta para arquivos do repositório.
// Se um notebook ou um módulo mudar de nome, o link quebra em silêncio: este teste avisa.

const REPOSITORIO = 'https://github.com/igor-gregori/juro-negativo/blob/main/'
const RAIZ = new URL('../../', import.meta.url)

test('os links de análise apontam para arquivos que existem no repositório', () => {
  for (const [chave, link] of Object.entries(ANALISE)) {
    assert.ok(link.url.startsWith(REPOSITORIO), `${chave} não aponta para o repositório`)
    const caminho = link.url.slice(REPOSITORIO.length)
    assert.ok(existsSync(new URL(caminho, RAIZ)), `${chave} aponta para ${caminho}, que não existe`)
  }
})

test('toda fonte tem endereço seguro, nome próprio e quem publica', () => {
  const fontes = Object.values(FONTES)
  for (const fonte of fontes) {
    assert.match(fonte.url, /^https:\/\//, fonte.nome)
    assert.ok(fonte.origem && fonte.detalhe, fonte.nome)
  }
  // O nome é a chave de cada item nas listas do quadro: não pode repetir.
  const nomes = [...fontes, ...Object.values(ANALISE)].map((link) => link.nome)
  assert.equal(new Set(nomes).size, nomes.length)
})
