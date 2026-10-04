// Compila a página de cada post para dentro de dist/<slug>/, depois que o Vite já gerou a capa em dist/.
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { POSTS } from '../posts.ts'

const raiz = resolve(import.meta.dirname, '..')

for (const post of POSTS) {
  const origem = resolve(raiz, post.origem)
  const destino = resolve(raiz, 'dist', post.slug)

  if (!existsSync(resolve(origem, 'package.json'))) {
    throw new Error(`Post "${post.slug}": não encontrei um projeto em ${origem}`)
  }

  console.log(`\n→ ${post.slug} (${origem})`)
  const rodar = (comando: string, ...argumentos: string[]) =>
    execFileSync(comando, argumentos, {
      cwd: origem,
      stdio: 'inherit',
      // O endereço da capa, para a página do post poder oferecer um link de volta.
      env: { ...process.env, VITE_CAPA: '/' },
    })

  if (!existsSync(resolve(origem, 'node_modules'))) rodar('npm', 'ci')
  rodar('npx', 'tsc', '-b')
  rodar('npx', 'vite', 'build', '--base', `/${post.slug}/`, '--outDir', destino, '--emptyOutDir')
}
