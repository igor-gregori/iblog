import type { ReactNode } from 'react'
import type { Fonte, Link } from '../fontes.ts'
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
  /** De onde vêm os dados desta seção. */
  fontes: Fonte[]
  /** Como a conta foi feita, em poucas frases. */
  metodo: ReactNode
  /** Os arquivos do repositório em que a análise está. */
  analise: Link[]
}

/** Uma seção do artigo: o título, a checagem em texto e, no fim, as fontes e o método. */
export function Secao({ id, numero, rubrica, titulo, children, fontes, metodo, analise }: SecaoProps) {
  // Fechado, o quadro mostra só quem publica os dados, uma vez cada.
  const origens = [...new Set(fontes.map((fonte) => fonte.origem))]

  return (
    <section className="secao" id={id}>
      <p className="rubrica">
        <span>{numero}</span> {rubrica}
      </p>
      <div className="corpo">
        <h2>{titulo}</h2>
        {children}
        <details className="fontes">
          <summary>
            <span>Fontes e método</span>
            <span className="fontes-resumo">{origens.join(' · ')}</span>
          </summary>
          <div className="fontes-corpo">
            <p>{metodo}</p>
            <ListaDeLinks titulo="Dados" links={fontes} />
            <ListaDeLinks titulo="Análise" links={analise} />
          </div>
        </details>
      </div>
    </section>
  )
}

function ListaDeLinks({ titulo, links }: { titulo: string; links: Link[] }) {
  return (
    <div className="links">
      <h3>{titulo}</h3>
      <ul>
        {links.map((link) => (
          <li key={link.nome}>
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
