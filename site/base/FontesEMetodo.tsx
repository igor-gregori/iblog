import type { ReactNode } from 'react'
import type { Link } from './links.ts'

interface Props {
  /** De onde vêm os dados desta parte. */
  fontes: Link[]
  /** Como a conta foi feita, em uma ou duas frases. */
  metodo: ReactNode
  /** Os arquivos do repositório em que a análise está; vazio numa parte só de texto. */
  analise: Link[]
}

/** O quadro "Fontes e método" que fecha cada parte de um post de dados: o método, os dados e a análise. */
export function FontesEMetodo({ fontes, metodo, analise }: Props) {
  return (
    <details className="fontes">
      <summary>
        <span>Fontes e método</span>
        <span className="fontes-resumo">{fontes.map((fonte) => fonte.nome).join(' · ')}</span>
      </summary>
      <div className="fontes-corpo">
        <p>{metodo}</p>
        <ListaDeLinks titulo="Dados" links={fontes} />
        {analise.length > 0 && <ListaDeLinks titulo="Análise" links={analise} />}
      </div>
    </details>
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
