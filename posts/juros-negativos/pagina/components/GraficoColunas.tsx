import { scaleLinear } from 'd3-scale'
import { useRef, useState, type KeyboardEvent } from 'react'
import { useLargura } from '#base/useLargura.ts'

export interface Coluna {
  /** O que vai no eixo horizontal (o ano). */
  rotulo: string
  valor: number
  /** Linhas a mais na dica (ex.: a Selic e a inflação daquele ano). */
  detalhes?: { nome: string; valor: string }[]
}

interface Props {
  colunas: Coluna[]
  cor: string
  /** O nome da medida, para a dica. */
  nomeDoValor: string
  formato: (valor: number) => string
  formatoTique?: (valor: number) => string
  /** Colunas que ganham o valor escrito na ponta; as outras ficam com o eixo, a dica e a tabela. */
  rotuladas?: string[]
  /** Altura total, já contando a faixa do eixo horizontal. */
  altura?: number
  /** O que o gráfico mostra, para leitores de tela. */
  descricao: string
}

const LARGURA_MAXIMA = 24
const RAIO = 4
const VAO = 2
const ESPACO_MINIMO_ENTRE_ROTULOS = 36

/** Colunas finas que saem de uma linha de zero, para cima e para baixo: uma por ano. */
export function GraficoColunas({ colunas, cor, nomeDoValor, formato, formatoTique = formato, rotuladas = [], altura = 280, descricao }: Props) {
  const caixa = useRef<HTMLDivElement>(null)
  const largura = useLargura(caixa)
  const [ativa, setAtiva] = useState<number | null>(null)

  const margem = { topo: 22, direita: 8, base: 28, esquerda: 48 }
  const valores = colunas.map((coluna) => coluna.valor)
  const escalaY = scaleLinear()
    .domain([Math.min(0, ...valores), Math.max(0, ...valores)])
    .range([altura - margem.base, margem.topo])
    .nice(5)
  const zero = escalaY(0)
  const espaco = Math.max((largura - margem.esquerda - margem.direita) / colunas.length, 1)
  const espessura = Math.max(Math.min(LARGURA_MAXIMA, espaco - VAO), 1)
  const centro = (i: number) => margem.esquerda + (i + 0.5) * espaco
  // Em telas estreitas os anos se encostam: fica um a cada dois, três...
  const salto = Math.max(1, Math.ceil(ESPACO_MINIMO_ENTRE_ROTULOS / espaco))

  // As setas andam de coluna em coluna, como o ponteiro.
  function aoTeclar(evento: KeyboardEvent<HTMLDivElement>) {
    const passo = { ArrowLeft: -1, ArrowRight: 1 }[evento.key]
    if (!passo) return
    evento.preventDefault()
    setAtiva((atual) => Math.min(colunas.length - 1, Math.max(0, (atual ?? colunas.length - 1) + passo)))
  }

  const destacada = ativa === null ? null : colunas[ativa]
  const xDaDica = ativa === null ? 0 : centro(ativa)

  return (
    <div
      ref={caixa}
      className="grafico"
      tabIndex={0}
      role="group"
      aria-label={`${descricao}. Use as setas para percorrer os valores.`}
      onKeyDown={aoTeclar}
      onFocus={() => setAtiva((atual) => atual ?? colunas.length - 1)}
      onBlur={() => setAtiva(null)}
    >
      {largura > 0 && (
        <svg width={largura} height={altura} role="img" aria-label={descricao} onPointerLeave={() => setAtiva(null)}>
          {escalaY.ticks(5).map((tique) => (
            <g key={tique}>
              <line className="g-grade" x1={margem.esquerda} x2={largura - margem.direita} y1={escalaY(tique)} y2={escalaY(tique)} />
              <text className="g-tique" x={margem.esquerda - 8} y={escalaY(tique)} dy="0.32em" textAnchor="end">
                {formatoTique(tique)}
              </text>
            </g>
          ))}

          {colunas.map((coluna, i) => (
            <path
              key={coluna.rotulo}
              d={contorno(centro(i) - espessura / 2, espessura, zero, escalaY(coluna.valor))}
              style={{ fill: cor, stroke: i === ativa ? 'var(--texto)' : 'none', strokeWidth: 1.5 }}
            />
          ))}
          <line className="g-eixo" x1={margem.esquerda} x2={largura - margem.direita} y1={zero} y2={zero} />

          {colunas.map((coluna, i) =>
            rotuladas.includes(coluna.rotulo) ? (
              <text key={coluna.rotulo} className="g-rotulo" x={centro(i)} y={escalaY(coluna.valor) + (coluna.valor >= 0 ? -7 : 15)} textAnchor="middle">
                {formato(coluna.valor)}
              </text>
            ) : null,
          )}

          {colunas.map((coluna, i) =>
            i % salto === 0 ? (
              <text key={coluna.rotulo} className="g-tique" x={centro(i)} y={altura - 8} textAnchor="middle">
                {coluna.rotulo}
              </text>
            ) : null,
          )}

          {/* A área sensível de cada coluna é a faixa inteira, do alto ao eixo: não é preciso acertar a barra. */}
          {colunas.map((coluna, i) => (
            <rect
              key={coluna.rotulo}
              x={margem.esquerda + i * espaco}
              y={margem.topo}
              width={espaco}
              height={altura - margem.topo - margem.base}
              fill="transparent"
              onPointerMove={() => setAtiva(i)}
            />
          ))}
        </svg>
      )}

      {destacada && (
        <div className="dica" style={xDaDica > largura * 0.6 ? { right: largura - xDaDica + espaco / 2 + 6, top: margem.topo } : { left: xDaDica + espaco / 2 + 6, top: margem.topo }}>
          <div className="dica-titulo">{destacada.rotulo}</div>
          <div className="dica-linha">
            <span className="chave-area" style={{ background: cor }} />
            <strong>{formato(destacada.valor)}</strong>
            <span>{nomeDoValor}</span>
          </div>
          {destacada.detalhes?.map((detalhe) => (
            <div key={detalhe.nome} className="dica-linha">
              <strong>{detalhe.valor}</strong>
              <span>{detalhe.nome}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** O contorno de uma coluna: reta na linha de zero, arredondada na ponta, para cima ou para baixo. */
function contorno(x: number, largura: number, zero: number, ponta: number): string {
  const sentido = ponta <= zero ? 1 : -1 // 1: a coluna sobe; −1: desce
  const raio = Math.min(RAIO, largura / 2, Math.abs(zero - ponta))
  const curva = ponta + sentido * raio
  return [
    `M${x},${zero}`,
    `V${curva}`,
    `Q${x},${ponta} ${x + raio},${ponta}`,
    `H${x + largura - raio}`,
    `Q${x + largura},${ponta} ${x + largura},${curva}`,
    `V${zero}`,
    'Z',
  ].join(' ')
}
