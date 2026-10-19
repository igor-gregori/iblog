import type { ReactNode } from 'react'
import { FontesEMetodo } from '#base/FontesEMetodo.tsx'
import type { Link } from '#base/links.ts'

interface Props {
  /** Âncora da seção, usada no sumário e nos links do resumo. */
  id: string
  numero: number
  titulo: string
  children: ReactNode
  /** De onde vêm os dados desta resposta. */
  fontes: Link[]
  /** Como a conta foi feita, em uma ou duas frases. */
  metodo: ReactNode
  /** Os arquivos do repositório em que a análise está. */
  analise: Link[]
}

/** Uma pergunta do artigo: o título, a resposta em texto e, no fim, as fontes e o método. */
export function Pergunta({ id, numero, titulo, children, fontes, metodo, analise }: Props) {
  return (
    <section className="pergunta" id={id} aria-labelledby={`${id}-titulo`}>
      <h2 id={`${id}-titulo`}>
        <span className="numero">{numero}</span>
        {titulo}
      </h2>
      {children}
      <FontesEMetodo fontes={fontes} metodo={metodo} analise={analise} />
    </section>
  )
}
