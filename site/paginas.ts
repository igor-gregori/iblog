// O que transforma as pastas do repositório nas páginas do blog.
//
// Cada pasta de `posts/` com um `post.json` é um post. O endereço dele é o nome da pasta:
// `posts/comprar-ou-alugar/pagina/index.html` vai ao ar em `/comprar-ou-alugar/`. A capa (`site/capa/`)
// fica na raiz e lista os posts, do mais novo para o mais antigo.
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import type { Plugin } from 'vite'

export interface Post {
  /** O nome da pasta e o endereço do post: /<slug>/ */
  slug: string
  titulo: string
  /** A linha pequena acima do título, na capa. */
  assunto: string
  /** O parágrafo que aparece na capa. */
  resumo: string
  /** A frase que os buscadores e as redes sociais mostram. */
  descricao: string
  /** Dia da publicação, no formato AAAA-MM-DD. */
  data: string
}

const RAIZ = resolve(import.meta.dirname, '..')
const CAMPOS = ['titulo', 'assunto', 'resumo', 'descricao', 'data'] as const
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export function lerPosts(): Post[] {
  const pasta = resolve(RAIZ, 'posts')
  return readdirSync(pasta)
    .filter((slug) => existsSync(resolve(pasta, slug, 'post.json')))
    .map((slug) => {
      const post = JSON.parse(readFileSync(resolve(pasta, slug, 'post.json'), 'utf8')) as Omit<Post, 'slug'>
      for (const campo of CAMPOS) {
        if (typeof post[campo] !== 'string' || !post[campo]) throw new Error(`posts/${slug}/post.json: falta o campo "${campo}"`)
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(post.data)) throw new Error(`posts/${slug}/post.json: "data" deve ser AAAA-MM-DD`)
      return { slug, ...post }
    })
    .sort((a, b) => b.data.localeCompare(a.data) || a.slug.localeCompare(b.slug))
}

function escapar(texto: string) {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Aplica o tema salvo antes da primeira pintura, evitando um flash de tema errado.
// A chave é a mesma de site/base/tema.ts.
const SCRIPT_DO_TEMA = `<script>
      (function () {
        var pref
        try {
          pref = JSON.parse(localStorage.getItem('iblog:tema'))
        } catch (e) {}
        var escuro = pref === 'escuro' || (pref !== 'claro' && matchMedia('(prefers-color-scheme: dark)').matches)
        document.documentElement.dataset.theme = escuro ? 'dark' : 'light'
      })()
    </script>`

/** O que todo <head> do blog tem. Nos posts, o título e a descrição vêm do post.json. */
function cabeca(icone: string, post?: Post) {
  const linhas = [
    '<meta charset="UTF-8" />',
    `<link rel="icon" type="image/svg+xml" href="${icone}" />`,
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
  ]
  if (post) linhas.push(`<meta name="description" content="${escapar(post.descricao)}" />`, `<title>${escapar(post.titulo)}</title>`)
  linhas.push(SCRIPT_DO_TEMA)
  return linhas.join('\n    ')
}

function itemDaCapa(post: Post) {
  const [ano, mes] = post.data.split('-')
  return `
        <li class="post">
          <p class="sobretitulo"><time datetime="${post.data}">${MESES[Number(mes) - 1]} de ${ano}</time> · ${escapar(post.assunto)}</p>
          <h2><a href="/${post.slug}/">${escapar(post.titulo)}</a></h2>
          <p>${escapar(post.resumo)}</p>
        </li>`
}

export function paginas(): Plugin {
  const posts = lerPosts()
  const porArquivo = new Map(posts.map((post) => [`posts/${post.slug}/pagina/index.html`, post]))

  // Arquivo de origem → endereço no site.
  const destinos = new Map([
    ['site/capa/index.html', 'index.html'],
    ['site/capa/404.html', '404.html'],
    ...posts.map((post): [string, string] => [`posts/${post.slug}/pagina/index.html`, `${post.slug}/index.html`]),
  ])
  const rotas = new Map([...destinos].map(([arquivo, destino]) => [`/${destino.replace(/index\.html$/, '')}`, `/${arquivo}`]))

  let saida: string | null = null

  return {
    name: 'iblog-paginas',

    config: () => ({
      appType: 'mpa',
      publicDir: false,
      build: { rollupOptions: { input: [...destinos.keys()].map((arquivo) => resolve(RAIZ, arquivo)) } },
      // Dados, notebooks e o ambiente do Python não fazem parte do site: o servidor não precisa vigiar.
      server: { watch: { ignored: ['**/.venv/**', '**/dados/**', '**/notebooks/**'] } },
    }),

    configResolved(config) {
      if (config.command === 'build') saida = resolve(config.root, config.build.outDir)
    },

    // No `npm run dev`, os endereços são os mesmos do site publicado.
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const [caminho, consulta] = (req.url ?? '').split('?')
        const arquivo = rotas.get(caminho.endsWith('/') ? caminho : `${caminho}/`)
        if (arquivo) req.url = consulta ? `${arquivo}?${consulta}` : arquivo
        next()
      })
    },

    transformIndexHtml: {
      order: 'pre',
      handler(html, contexto) {
        const arquivo = relative(RAIZ, contexto.filename).replaceAll('\\', '/')
        const post = porArquivo.get(arquivo)
        const iconeDoPost = post && existsSync(resolve(RAIZ, 'posts', post.slug, 'pagina/favicon.svg'))
        const icone = iconeDoPost ? `/posts/${post.slug}/pagina/favicon.svg` : '/site/capa/favicon.svg'
        return html.replace('<!-- cabeca -->', cabeca(icone, post)).replace('<!-- posts -->', posts.map(itemDaCapa).join(''))
      },
    },

    // O Vite grava cada HTML no caminho da origem (dist/posts/<slug>/pagina/index.html);
    // aqui eles vão para o endereço final (dist/<slug>/index.html).
    closeBundle() {
      if (!saida) return
      for (const [arquivo, destino] of destinos) {
        const de = resolve(saida, arquivo)
        if (!existsSync(de)) continue
        mkdirSync(dirname(resolve(saida, destino)), { recursive: true })
        renameSync(de, resolve(saida, destino))
      }
      for (const pasta of ['site', 'posts']) rmSync(resolve(saida, pasta), { recursive: true, force: true })
    },
  }
}
