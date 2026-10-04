import { defineConfig, type Plugin } from 'vite'
import { POSTS, type Post } from './posts.ts'

const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

function escapar(texto: string) {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function mesAno(data: string) {
  const [ano, mes] = data.split('-')
  return `${MESES[Number(mes) - 1]} de ${ano}`
}

function itemDaLista(post: Post) {
  return `
        <li class="post">
          <p class="sobretitulo"><time datetime="${post.data}">${mesAno(post.data)}</time> · ${escapar(post.assunto)}</p>
          <h2><a href="/${post.slug}/">${escapar(post.titulo)}</a></h2>
          <p>${escapar(post.resumo)}</p>
        </li>`
}

// A capa é HTML pronto: a lista de posts entra no index.html durante o build, sem depender de JavaScript.
function listaDePosts(): Plugin {
  return {
    name: 'lista-de-posts',
    transformIndexHtml: (html) => html.replace('<!-- posts -->', POSTS.map(itemDaLista).join('')),
  }
}

export default defineConfig({
  plugins: [listaDePosts()],
  build: {
    rollupOptions: {
      input: ['index.html', '404.html'],
    },
  },
})
