import { scaleLinear } from 'd3-scale'
import { useRef, useState, type MouseEvent } from 'react'
import { pct } from '#base/formato.ts'
import { useLargura } from '#base/useLargura.ts'

interface Props {
  /** Valorização real do imóvel ao ano (colunas), em fração. */
  xs: number[]
  /** O que a carteira rende (linhas), em fração. */
  ys: number[]
  /** Nome do eixo vertical e as marcas que ele mostra. */
  rotuloY: string
  tiquesY: number[]
  formatoY: (y: number) => string
  /** Vantagem do aluguel em cada célula: `valores[linha][coluna]`. */
  valores: number[][]
  /** A cor satura em ±limite. */
  limite: number
  /** O cenário escolhido nos controles. */
  marcador: { x: number; y: number }
  referencias: { nome: string; y: number }[]
  aoEscolher: (x: number, y: number) => void
  descricao: string
}

const ALTURA = 340

/** Azul: alugar e investir ganha. Vermelho: comprar ganha. Cinza neutro no empate. */
function cor(valor: number, limite: number): string {
  const forca = Math.round(Math.min(Math.abs(valor) / limite, 1) * 100)
  const polo = valor >= 0 ? 'var(--div-azul)' : 'var(--div-vermelho)'
  return `color-mix(in oklab, ${polo} ${forca}%, var(--div-neutro))`
}

export function MapaDeCalor({ xs, ys, rotuloY, tiquesY, formatoY, valores, limite, marcador, referencias, aoEscolher, descricao }: Props) {
  const caixa = useRef<HTMLDivElement>(null)
  const largura = useLargura(caixa)
  const [ativa, setAtiva] = useState<{ linha: number; coluna: number } | null>(null)

  const largo = largura >= 600
  const margem = { topo: 10, direita: largo ? 168 : 10, base: 46, esquerda: 58 }
  const passoX = xs[1] - xs[0]
  const passoY = ys[1] - ys[0]
  // Cada célula fica centrada no seu valor, então a escala vai meio passo além dos extremos.
  const escalaX = scaleLinear()
    .domain([xs[0] - passoX / 2, xs[xs.length - 1] + passoX / 2])
    .range([margem.esquerda, Math.max(largura - margem.direita, margem.esquerda + 1)])
  const escalaY = scaleLinear()
    .domain([ys[0] - passoY / 2, ys[ys.length - 1] + passoY / 2])
    .range([ALTURA - margem.base, margem.topo])
  const larguraCelula = escalaX(xs[1]) - escalaX(xs[0])
  const alturaCelula = escalaY(ys[0]) - escalaY(ys[1])

  // Em cada coluna, o retorno em que a vantagem troca de sinal (interpolado entre duas linhas).
  const empate: [number, number][] = []
  xs.forEach((x, coluna) => {
    for (let linha = 0; linha < ys.length - 1; linha++) {
      const abaixo = valores[linha][coluna]
      const acima = valores[linha + 1][coluna]
      if (abaixo < 0 === acima < 0) continue
      const y = ys[linha] + (passoY * -abaixo) / (acima - abaixo)
      empate.push([escalaX(x), escalaY(y)])
      break
    }
  })

  function celulaDoPonteiro(evento: MouseEvent<SVGRectElement>) {
    const coluna = Math.round((escalaX.invert(evento.nativeEvent.offsetX) - xs[0]) / passoX)
    const linha = Math.round((escalaY.invert(evento.nativeEvent.offsetY) - ys[0]) / passoY)
    return {
      coluna: Math.min(xs.length - 1, Math.max(0, coluna)),
      linha: Math.min(ys.length - 1, Math.max(0, linha)),
    }
  }

  const valorAtivo = ativa ? valores[ativa.linha][ativa.coluna] : 0
  const xDica = ativa ? escalaX(xs[ativa.coluna]) : 0
  const yDica = ativa ? escalaY(ys[ativa.linha]) : 0

  return (
    <div ref={caixa} className="grafico">
      {largura > 0 && (
        <svg width={largura} height={ALTURA} role="img" aria-label={descricao}>
          {valores.map((linha, i) =>
            linha.map((valor, j) => (
              <rect
                key={`${i}-${j}`}
                x={escalaX(xs[j]) - larguraCelula / 2}
                y={escalaY(ys[i]) - alturaCelula / 2}
                width={Math.max(larguraCelula - 1, 1)}
                height={Math.max(alturaCelula - 1, 1)}
                style={{ fill: cor(valor, limite) }}
              />
            )),
          )}

          {xs
            .filter((x) => Math.abs(x * 100 - Math.round(x * 100)) < 1e-9)
            .map((x) => (
              <text key={x} className="g-tique" x={escalaX(x)} y={ALTURA - margem.base + 16} textAnchor="middle">
                {pct(x, 0, true)}
              </text>
            ))}
          {tiquesY.map((y) => (
            <text key={y} className="g-tique" x={margem.esquerda - 8} y={escalaY(y)} dy="0.32em" textAnchor="end">
              {formatoY(y)}
            </text>
          ))}
          <text className="g-nome-eixo" x={(margem.esquerda + largura - margem.direita) / 2} y={ALTURA - 8} textAnchor="middle">
            valorização real do imóvel, ao ano
          </text>
          <text className="g-nome-eixo" transform={`translate(12 ${(margem.topo + ALTURA - margem.base) / 2}) rotate(-90)`} textAnchor="middle">
            {rotuloY}
          </text>

          {referencias.map((referencia) => (
            <g key={referencia.nome}>
              <line className="g-referencia" x1={margem.esquerda} x2={largura - margem.direita} y1={escalaY(referencia.y)} y2={escalaY(referencia.y)} />
              {largo && (
                <text className="g-tique" x={largura - margem.direita + 8} y={escalaY(referencia.y)} dy="0.32em">
                  {referencia.nome} ({formatoY(referencia.y)})
                </text>
              )}
            </g>
          ))}

          {empate.length > 1 && <polyline className="g-empate" points={empate.map((ponto) => ponto.join(',')).join(' ')} />}

          {ativa && (
            <rect
              className="g-celula-ativa"
              x={xDica - larguraCelula / 2}
              y={yDica - alturaCelula / 2}
              width={larguraCelula - 1}
              height={alturaCelula - 1}
            />
          )}
          <circle className="g-marcador" cx={escalaX(marcador.x)} cy={escalaY(marcador.y)} r={7} />

          <rect
            x={margem.esquerda}
            y={margem.topo}
            width={Math.max(largura - margem.esquerda - margem.direita, 0)}
            height={ALTURA - margem.topo - margem.base}
            fill="transparent"
            style={{ cursor: 'pointer' }}
            onPointerMove={(evento) => setAtiva(celulaDoPonteiro(evento))}
            onPointerLeave={() => setAtiva(null)}
            onClick={(evento) => {
              const { linha, coluna } = celulaDoPonteiro(evento)
              aoEscolher(xs[coluna], ys[linha])
            }}
          />
        </svg>
      )}

      {ativa && (
        <div
          className="dica"
          style={
            xDica > largura * 0.55
              ? { right: largura - xDica + larguraCelula, top: Math.max(yDica - 30, 0) }
              : { left: xDica + larguraCelula, top: Math.max(yDica - 30, 0) }
          }
        >
          <div className="dica-titulo">
            Imóvel {pct(xs[ativa.coluna], 1, true)} · fundos {formatoY(ys[ativa.linha])}
          </div>
          <div className="dica-linha">
            <span className="chave-area" style={{ background: cor(valorAtivo, limite) }} />
            <strong>{pct(Math.abs(valorAtivo))}</strong>
            <span>do valor do imóvel a favor de {valorAtivo >= 0 ? 'alugar' : 'comprar'}</span>
          </div>
        </div>
      )}
    </div>
  )
}
