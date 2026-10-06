import type { ReactNode } from 'react'
import { Selo, type Veredito } from './Selo.tsx'

interface AfirmacaoProps {
  /** Um trecho curto do texto analisado, entre aspas. */
  children: ReactNode
  veredito: Veredito
  rotulo?: string
}

/** A frase do texto que a seção testa, com o carimbo do resultado. */
export function Afirmacao({ children, veredito, rotulo }: AfirmacaoProps) {
  return (
    <blockquote className="afirmacao">
      <p>{children}</p>
      <footer>
        <span>O texto diz</span>
        <Selo veredito={veredito} rotulo={rotulo} />
      </footer>
    </blockquote>
  )
}

interface SecaoProps {
  id: string
  numero: number
  /** O assunto da seção em uma ou duas palavras; fica ao lado do número. */
  rubrica: string
  titulo: string
  children: ReactNode
}

export function Secao({ id, numero, rubrica, titulo, children }: SecaoProps) {
  return (
    <section className="secao" id={id}>
      <p className="rubrica">
        <span>{numero}</span> {rubrica}
      </p>
      <div className="corpo">
        <h2>{titulo}</h2>
        {children}
      </div>
    </section>
  )
}
