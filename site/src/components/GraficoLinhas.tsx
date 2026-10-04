import { scaleLinear } from 'd3-scale'
import { area, line } from 'd3-shape'
import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { useLargura } from '../hooks/useLargura.ts'

export interface Serie {
  nome: string
  cor: string
  valores: (number | null)[]
  /** Série de contexto: fica na legenda e na dica, mas não ganha rótulo no fim da linha. */
  contexto?: boolean
}

/** Uma área entre dois limites, como o intervalo em torno de uma mediana. */
export interface Faixa {
  nome: string
  cor: string
  opacidade: number
  inferior: number[]
  superior: number[]
}

interface Props {
  /** Posição de cada ponto no eixo horizontal: instante (ms) ou número. */
  x: number[]
  series: Serie[]
  faixas?: Faixa[]
  formatoX: (x: number) => string
  formatoY: (y: number) => string
  /** Formato das marcas do eixo vertical, se for diferente do dos valores. */
  formatoTiqueY?: (y: number) => string
  tiquesX: number[]
  formatoTiqueX: (x: number) => string
  /** Linha horizontal de referência (zero, 100, 50%...). */
  base?: number
  limitesY?: [number, number]
  rotuloX?: string
  /** Altura total, já contando a faixa do eixo horizontal. */
  altura?: number
  /** O que o gráfico mostra, para leitores de tela. */
  descricao: string
}

const DISTANCIA_ENTRE_ROTULOS = 16
const ESPACO_MINIMO_ENTRE_TIQUES = 44
const LARGURA_MEDIA_DO_CARACTERE = 7.6
// As marcas dos eixos usam 12px na fonte monoespaçada: cada caractere ocupa uns 7,2px.
const LARGURA_MEDIA_DO_TIQUE = 7.3

export function GraficoLinhas({
  x,
  series,
  faixas = [],
  formatoX,
  formatoY,
  formatoTiqueY = formatoY,
  tiquesX,
  formatoTiqueX,
  base,
  limitesY,
  rotuloX,
  altura = 340,
  descricao,
}: Props) {
  const caixa = useRef<HTMLDivElement>(null)
  const largura = useLargura(caixa)
  const [ativo, setAtivo] = useState<number | null>(null)

  // A margem direita acompanha o maior rótulo de fim de linha ("R$ 523 mil" pede mais espaço que "+8%").
  const maiorRotulo = Math.max(
    0,
    ...series.map((serie) => {
      const fim = serie.contexto ? undefined : serie.valores.findLast((valor) => valor !== null)
      return fim === undefined || fim === null ? 0 : formatoY(fim).length
    }),
  )
  const topo = 14
  const margemBase = rotuloX ? 46 : 28

  const escalaY = useMemo(() => {
    const valores = [
      ...series.flatMap((serie) => serie.valores.filter((valor) => valor !== null)),
      ...faixas.flatMap((faixa) => [...faixa.inferior, ...faixa.superior]),
      ...(base === undefined ? [] : [base]),
    ]
    const dominioY = limitesY ?? [Math.min(...valores), Math.max(...valores)]
    const y = scaleLinear().domain(dominioY).range([altura - margemBase, topo])
    if (!limitesY) y.nice(5)
    return y
  }, [series, faixas, base, limitesY, altura, margemBase])

  // A margem esquerda acompanha a maior marca do eixo vertical ("R$ 1,10 mi" pede mais espaço que "20%").
  const maiorTique = Math.max(0, ...escalaY.ticks(5).map((tique) => formatoTiqueY(tique).length))
  const margem = {
    topo,
    direita: 22 + maiorRotulo * LARGURA_MEDIA_DO_CARACTERE,
    base: margemBase,
    esquerda: Math.max(50, 14 + maiorTique * LARGURA_MEDIA_DO_TIQUE),
  }

  const escalaX = useMemo(
    () =>
      scaleLinear()
        .domain([x[0], x[x.length - 1]])
        .range([margem.esquerda, Math.max(largura - margem.direita, margem.esquerda + 1)]),
    [x, largura, margem.direita, margem.esquerda],
  )

  const tracar = line<number | null>()
    .defined((valor) => valor !== null)
    .x((_, i) => escalaX(x[i]))
    .y((valor) => escalaY(valor ?? 0))

  const rotulos = rotulosDoFim(series, x, escalaX, escalaY, formatoY)

  // Em telas estreitas as marcas do eixo horizontal se encostam: fica uma a cada duas, três...
  const visiveis = tiquesX.filter((tique) => tique >= x[0] && tique <= x[x.length - 1])
  const espaco = visiveis.length > 1 ? escalaX(visiveis[1]) - escalaX(visiveis[0]) : ESPACO_MINIMO_ENTRE_TIQUES
  const salto = Math.max(1, Math.ceil(ESPACO_MINIMO_ENTRE_TIQUES / espaco))
  const marcasX = visiveis.filter((_, i) => i % salto === 0)

  function maisProximo(evento: PointerEvent<SVGRectElement>) {
    const alvo = escalaX.invert(evento.nativeEvent.offsetX)
    let melhor = 0
    for (let i = 1; i < x.length; i++) {
      if (Math.abs(x[i] - alvo) < Math.abs(x[melhor] - alvo)) melhor = i
    }
    setAtivo(melhor)
  }

  // O mesmo detalhe do ponteiro, pelo teclado: as setas andam de ponto em ponto.
  function aoTeclar(evento: KeyboardEvent<HTMLDivElement>) {
    const passo = { ArrowLeft: -1, ArrowRight: 1 }[evento.key]
    if (!passo) return
    evento.preventDefault()
    setAtivo((atual) => Math.min(x.length - 1, Math.max(0, (atual ?? x.length - 1) + passo)))
  }

  const xAtivo = ativo === null ? 0 : escalaX(x[ativo])
  const dicaAEsquerda = xAtivo > largura * 0.6

  return (
    <div
      ref={caixa}
      className="grafico"
      tabIndex={0}
      role="group"
      aria-label={`${descricao}. Use as setas para percorrer os valores.`}
      onKeyDown={aoTeclar}
      onFocus={() => setAtivo((atual) => atual ?? x.length - 1)}
      onBlur={() => setAtivo(null)}
    >
      {largura > 0 && (
        <svg width={largura} height={altura} role="img" aria-label={descricao}>
          {escalaY.ticks(5).map((tique) => (
            <g key={tique}>
              <line className="g-grade" x1={margem.esquerda} x2={largura - margem.direita} y1={escalaY(tique)} y2={escalaY(tique)} />
              <text className="g-tique" x={margem.esquerda - 8} y={escalaY(tique)} dy="0.32em" textAnchor="end">
                {formatoTiqueY(tique)}
              </text>
            </g>
          ))}

          <line className="g-eixo" x1={margem.esquerda} x2={largura - margem.direita} y1={altura - margem.base} y2={altura - margem.base} />
          {marcasX.map((tique) => (
            <text key={tique} className="g-tique" x={escalaX(tique)} y={altura - margem.base + 18} textAnchor="middle">
              {formatoTiqueX(tique)}
            </text>
          ))}
          {rotuloX && (
            <text className="g-nome-eixo" x={(margem.esquerda + largura - margem.direita) / 2} y={altura - 6} textAnchor="middle">
              {rotuloX}
            </text>
          )}

          {base !== undefined && (
            <line className="g-base" x1={margem.esquerda} x2={largura - margem.direita} y1={escalaY(base)} y2={escalaY(base)} />
          )}

          {faixas.map((faixa) => (
            <path
              key={faixa.nome}
              style={{ fill: faixa.cor, opacity: faixa.opacidade }}
              d={
                area<number>()
                  .x((_, i) => escalaX(x[i]))
                  .y0((_, i) => escalaY(faixa.inferior[i]))
                  .y1((_, i) => escalaY(faixa.superior[i]))(faixa.superior) ?? undefined
              }
            />
          ))}

          {series.map((serie) => (
            <path key={serie.nome} className="g-linha" style={{ stroke: serie.cor }} d={tracar(serie.valores) ?? undefined} />
          ))}

          {rotulos.map((rotulo) => (
            <g key={rotulo.nome}>
              {Math.abs(rotulo.yTexto - rotulo.y) > 2 && (
                <line className="g-ligacao" x1={rotulo.x + 6} y1={rotulo.y} x2={rotulo.x + 9} y2={rotulo.yTexto} />
              )}
              <circle className="g-ponto" cx={rotulo.x} cy={rotulo.y} r={4.5} style={{ fill: rotulo.cor }} />
              <text className="g-rotulo" x={rotulo.x + 11} y={rotulo.yTexto} dy="0.32em">
                {rotulo.texto}
              </text>
            </g>
          ))}

          {ativo !== null && (
            <g>
              <line className="g-mira" x1={xAtivo} x2={xAtivo} y1={margem.topo} y2={altura - margem.base} />
              {series.map((serie) => {
                const valor = serie.valores[ativo]
                return valor === null ? null : (
                  <circle key={serie.nome} className="g-ponto" cx={xAtivo} cy={escalaY(valor)} r={4.5} style={{ fill: serie.cor }} />
                )
              })}
            </g>
          )}

          <rect
            x={margem.esquerda}
            y={margem.topo}
            width={Math.max(largura - margem.esquerda - margem.direita, 0)}
            height={altura - margem.topo - margem.base}
            fill="transparent"
            onPointerMove={maisProximo}
            onPointerLeave={() => setAtivo(null)}
          />
        </svg>
      )}

      {ativo !== null && (
        <div
          className="dica"
          style={dicaAEsquerda ? { right: largura - xAtivo + 12, top: margem.topo } : { left: xAtivo + 12, top: margem.topo }}
        >
          <div className="dica-titulo">{formatoX(x[ativo])}</div>
          {series.map((serie) => {
            const valor = serie.valores[ativo]
            return valor === null ? null : (
              <div key={serie.nome} className="dica-linha">
                <span className="chave-linha" style={{ background: serie.cor }} />
                <strong>{formatoY(valor)}</strong>
                <span>{serie.nome}</span>
              </div>
            )
          })}
          {faixas.map((faixa) => (
            <div key={faixa.nome} className="dica-linha">
              <span className="chave-area" style={{ background: faixa.cor, opacity: faixa.opacidade + 0.15 }} />
              <strong>
                {formatoY(faixa.inferior[ativo])} a {formatoY(faixa.superior[ativo])}
              </strong>
              <span>{faixa.nome}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface Rotulo {
  nome: string
  cor: string
  texto: string
  x: number
  y: number
  yTexto: number
}

/** O último valor de cada série, com os textos afastados quando ficariam um sobre o outro. */
function rotulosDoFim(
  series: Serie[],
  x: number[],
  escalaX: (valor: number) => number,
  escalaY: (valor: number) => number,
  formatoY: (valor: number) => string,
): Rotulo[] {
  const rotulos: Rotulo[] = []
  for (const serie of series) {
    if (serie.contexto) continue
    const fim = serie.valores.findLastIndex((valor) => valor !== null)
    if (fim < 0) continue
    const valor = serie.valores[fim] as number
    const y = escalaY(valor)
    rotulos.push({ nome: serie.nome, cor: serie.cor, texto: formatoY(valor), x: escalaX(x[fim]), y, yTexto: y })
  }

  // De cima para baixo, cada texto fica pelo menos a uma linha de distância do anterior.
  const ordenados = rotulos.toSorted((a, b) => a.y - b.y)
  for (let i = 1; i < ordenados.length; i++) {
    ordenados[i].yTexto = Math.max(ordenados[i].yTexto, ordenados[i - 1].yTexto + DISTANCIA_ENTRE_ROTULOS)
  }
  return rotulos
}
