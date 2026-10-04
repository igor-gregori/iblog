// A mesma família dos artigos: uma serifa feita para leitura longa, com o eixo de tamanho óptico.
import '@fontsource-variable/literata/opsz.css'
import '@fontsource-variable/literata/opsz-italic.css'
import './index.css'

type Tema = 'sistema' | 'claro' | 'escuro'

const ORDEM: Tema[] = ['sistema', 'claro', 'escuro']

const NOMES: Record<Tema, string> = {
  sistema: 'Sistema',
  claro: 'Claro',
  escuro: 'Escuro',
}

const ICONES: Record<Tema, string> = {
  // Monitor, sol e lua, em traço simples.
  sistema: 'M4 5h16v11H4zM9 20h6M12 16v4',
  claro:
    'M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  escuro: 'M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z',
}

// A mesma chave é lida pelo script do index.html, para aplicar o tema antes desta página carregar.
const CHAVE = 'posts:tema'

function temaSalvo(): Tema {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) ?? 'null')
    return ORDEM.includes(salvo) ? salvo : 'sistema'
  } catch {
    return 'sistema'
  }
}

const preferencia = matchMedia('(prefers-color-scheme: dark)')
const botao = document.querySelector<HTMLButtonElement>('#botao-tema')!
let tema = temaSalvo()

function aplicar() {
  const escuro = tema === 'sistema' ? preferencia.matches : tema === 'escuro'
  document.documentElement.dataset.theme = escuro ? 'dark' : 'light'

  const rotulo = `Tema: ${NOMES[tema]} (clique para trocar)`
  botao.title = rotulo
  botao.setAttribute('aria-label', rotulo)
  botao.querySelector('path')!.setAttribute('d', ICONES[tema])
}

botao.addEventListener('click', () => {
  tema = ORDEM[(ORDEM.indexOf(tema) + 1) % ORDEM.length]
  try {
    localStorage.setItem(CHAVE, JSON.stringify(tema))
  } catch {
    // Armazenamento indisponível (ex.: aba anônima); segue só em memória.
  }
  aplicar()
})

preferencia.addEventListener('change', aplicar)
aplicar()
