import { numero } from '#base/formato.ts'

interface Populacao {
  homens: number[]
  mulheres: number[]
}

interface Props {
  /** Faixas de idade, da mais nova para a mais velha. */
  faixas: string[]
  /** O ano mostrado em barras. */
  populacao: Populacao
  /** Um ano de comparação, mostrado como um traço sobre cada barra. */
  referencia?: Populacao
  /** A maior faixa entre todos os anos comparáveis: mantém a escala parada quando o ano muda. */
  maximo: number
  /** O que o gráfico mostra, para leitores de tela. */
  descricao: string
}

/** Pirâmide etária: homens à esquerda, mulheres à direita, os mais velhos no alto. */
export function Piramide({ faixas, populacao, referencia, maximo, descricao }: Props) {
  const largura = (pessoas: number) => `${(pessoas / maximo) * 100}%`
  const milhoes = (pessoas: number) => `${numero(pessoas / 1e6, 1)} mi`

  return (
    <div className="piramide" role="img" aria-label={descricao}>
      <div className="piramide-linha piramide-cabecalho">
        <span>Homens</span>
        <span>Idade</span>
        <span>Mulheres</span>
      </div>
      {faixas
        .map((faixa, i) => ({ faixa, i }))
        .toReversed()
        .map(({ faixa, i }) => (
          <div key={faixa} className="piramide-linha" title={`${faixa} anos: ${milhoes(populacao.homens[i])} de homens e ${milhoes(populacao.mulheres[i])} de mulheres`}>
            <span className="piramide-trilho piramide-esquerda">
              <span className="piramide-area">
                <span className="piramide-barra" style={{ width: largura(populacao.homens[i]) }} />
                {referencia && <span className="piramide-traco" style={{ right: largura(referencia.homens[i]) }} />}
                <span className="piramide-valor" style={{ right: largura(Math.max(populacao.homens[i], referencia?.homens[i] ?? 0)) }}>
                  {milhoes(populacao.homens[i])}
                </span>
              </span>
            </span>
            <span className="piramide-faixa">{faixa}</span>
            <span className="piramide-trilho piramide-direita">
              <span className="piramide-area">
                <span className="piramide-barra" style={{ width: largura(populacao.mulheres[i]) }} />
                {referencia && <span className="piramide-traco" style={{ left: largura(referencia.mulheres[i]) }} />}
                <span className="piramide-valor" style={{ left: largura(Math.max(populacao.mulheres[i], referencia?.mulheres[i] ?? 0)) }}>
                  {milhoes(populacao.mulheres[i])}
                </span>
              </span>
            </span>
          </div>
        ))}
    </div>
  )
}
