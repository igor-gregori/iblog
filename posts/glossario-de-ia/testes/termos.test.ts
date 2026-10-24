import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import { POSTS, TERMOS } from '../pagina/termos.ts'

// Cada termo aponta para a parte de um post. Se um post mudar uma parte de nome, o link do glossário quebra em
// silêncio: este teste avisa.

const POSTS_DO_BLOG = new URL('../../', import.meta.url)

test('cada post citado existe e tem o número da série que o glossário mostra', () => {
  for (const [slug, post] of Object.entries(POSTS)) {
    const caminho = new URL(`${slug}/post.json`, POSTS_DO_BLOG)
    assert.ok(existsSync(caminho), `${slug} não existe`)
    const { assunto } = JSON.parse(readFileSync(caminho, 'utf8'))
    assert.ok(assunto.endsWith(`· ${post.numero}`), `${slug}: o assunto é "${assunto}"`)
  }
})

test('cada termo aponta para uma parte que existe no post', () => {
  for (const termo of TERMOS) {
    const app = readFileSync(new URL(`${termo.post}/pagina/App.tsx`, POSTS_DO_BLOG), 'utf8')
    assert.ok(app.includes(`{ id: '${termo.parte}'`), `${termo.nome}: o post ${termo.post} não tem a parte ${termo.parte}`)
  }
})

test('os termos têm âncora única e simples', () => {
  assert.equal(new Set(TERMOS.map((t) => t.id)).size, TERMOS.length)
  for (const termo of TERMOS) assert.match(termo.id, /^[a-z0-9-]+$/, termo.nome)
})
