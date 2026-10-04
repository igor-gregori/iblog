import type { ReactNode } from 'react'

export interface ItemDaLegenda {
  nome: string
  cor: string
  /** Como a série é desenhada: a chave da legenda imita a marca. */
  marca?: 'linha' | 'area'
  opacidade?: number
}

export interface TabelaDeDados {
  colunas: string[]
  linhas: string[][]
}

interface Props {
  titulo: string
  subtitulo: string
  legenda?: ItemDaLegenda[]
  /** Controles que valem só para este gráfico (ex.: trocar o horizonte). */
  controles?: ReactNode
  fonte: string
  /** Os mesmos números do gráfico, para quem prefere ou precisa ler em tabela. */
  tabela: TabelaDeDados
  children: ReactNode
}

export function Figura({ titulo, subtitulo, legenda, controles, fonte, tabela, children }: Props) {
  return (
    <figure className="figura">
      <div className="figura-topo">
        <div>
          <h3>{titulo}</h3>
          <p>{subtitulo}</p>
        </div>
        {controles}
      </div>

      {legenda && legenda.length > 1 && (
        <ul className="legenda">
          {legenda.map((item) => (
            <li key={item.nome}>
              <span
                className={item.marca === 'area' ? 'chave-area' : 'chave-linha'}
                style={{ background: item.cor, opacity: item.opacidade }}
              />
              {item.nome}
            </li>
          ))}
        </ul>
      )}

      {children}

      <figcaption>{fonte}</figcaption>

      <details className="dados">
        <summary>Ver os dados em tabela</summary>
        <div className="rolagem">
          <table>
            <thead>
              <tr>
                {tabela.colunas.map((coluna) => (
                  <th key={coluna}>{coluna}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tabela.linhas.map((linha) => (
                <tr key={linha[0]}>
                  {linha.map((celula, i) => (i === 0 ? <th key={i}>{celula}</th> : <td key={i}>{celula}</td>))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  )
}

interface OpcoesProps<T extends string> {
  rotulo: string
  opcoes: { valor: T; nome: string }[]
  valor: T
  aoMudar: (valor: T) => void
}

/** Botões de escolha única, lado a lado. */
export function Opcoes<T extends string>({ rotulo, opcoes, valor, aoMudar }: OpcoesProps<T>) {
  return (
    <div className="opcoes" role="group" aria-label={rotulo}>
      {opcoes.map((opcao) => (
        <button key={opcao.valor} type="button" aria-pressed={opcao.valor === valor} onClick={() => aoMudar(opcao.valor)}>
          {opcao.nome}
        </button>
      ))}
    </div>
  )
}
