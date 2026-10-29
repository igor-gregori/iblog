import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { test } from 'node:test'
import { ANALISE, FONTES } from '../pagina/fontes.ts'

// O quadro "Fontes e método" de cada parte aponta para arquivos do repositório: os do post e os de `comum/`.
// Se um módulo ou um arquivo de dados mudar de nome, o link quebra em silêncio: este teste avisa.

const REPOSITORIO = 'https://github.com/igor-gregori/iblog/blob/main/'
const RAIZ = new URL('../../../', import.meta.url)

test('os links para o repositório apontam para arquivos que existem', () => {
  const links = [...Object.values(ANALISE), ...Object.values(FONTES)].filter((link) => link.url.includes('github.com/igor-gregori'))
  assert.ok(links.length > 0)
  for (const link of links) {
    assert.ok(link.url.startsWith(REPOSITORIO), `${link.nome} não aponta para o repositório`)
    const caminho = link.url.slice(REPOSITORIO.length)
    assert.ok(existsSync(new URL(caminho, RAIZ)), `${link.nome} aponta para ${caminho}, que não existe`)
  }
})

test('toda fonte tem endereço seguro e nome único', () => {
  const links = [...Object.values(FONTES), ...Object.values(ANALISE)]
  for (const link of links) assert.match(link.url, /^https:\/\//, link.nome)
  assert.equal(new Set(links.map((link) => link.nome)).size, links.length)
})
