// A capa é HTML pronto (a lista de posts entra no build); o único JavaScript é o botão de tema.
import '@fontsource-variable/literata/opsz.css'
import '@fontsource-variable/literata/opsz-italic.css'
import './capa.css'
import { aplicarTema, CHAVE_DO_TEMA, ICONES_DOS_TEMAS, NOMES_DOS_TEMAS, proximoTema, rotuloDoTema, type Tema } from '../base/tema.ts'

function temaSalvo(): Tema {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE_DO_TEMA) ?? 'null')
    return salvo in NOMES_DOS_TEMAS ? salvo : 'sistema'
  } catch {
    return 'sistema'
  }
}

const botao = document.querySelector<HTMLButtonElement>('#botao-tema')!
let tema = temaSalvo()

function aplicar() {
  aplicarTema(tema)
  const rotulo = rotuloDoTema(tema)
  botao.title = rotulo
  botao.setAttribute('aria-label', rotulo)
  botao.querySelector('path')!.setAttribute('d', ICONES_DOS_TEMAS[tema])
}

botao.addEventListener('click', () => {
  tema = proximoTema(tema)
  try {
    localStorage.setItem(CHAVE_DO_TEMA, JSON.stringify(tema))
  } catch {
    // Armazenamento indisponível (ex.: aba anônima); segue só em memória.
  }
  aplicar()
})

matchMedia('(prefers-color-scheme: dark)').addEventListener('change', aplicar)
aplicar()
