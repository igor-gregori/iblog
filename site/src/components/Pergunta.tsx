import type { ReactNode } from 'react'
import type { Link } from '../fontes.ts'

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
      <details className="fontes">
        <summary>
          <span>Fontes e método</span>
          <span className="fontes-resumo">{fontes.map((fonte) => fonte.nome).join(' · ')}</span>
        </summary>
        <div className="fontes-corpo">
          <p>{metodo}</p>
          <ListaDeLinks titulo="Dados" links={fontes} />
          <ListaDeLinks titulo="Análise" links={analise} />
        </div>
      </details>
    </section>
  )
}

function ListaDeLinks({ titulo, links }: { titulo: string; links: Link[] }) {
  return (
    <div className="links">
      <h3>{titulo}</h3>
      <ul>
        {links.map((link) => (
          <li key={link.url}>
            <a href={link.url} target="_blank" rel="noreferrer">
              {link.nome}
            </a>
            <span>{link.detalhe}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
