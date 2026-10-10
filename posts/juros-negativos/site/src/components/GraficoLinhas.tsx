import { scaleLinear, scaleLog } from 'd3-scale'
import { area, line } from 'd3-shape'
import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { useLargura } from '../hooks/useLargura.ts'

export interface Serie {
  nome: string
  cor: string
  valores: (number | null)[]
  /** Série de contexto: fica na legenda e na dica, mas não ganha rótulo no fim da linha. */
  contexto?: boolean
  /** Escreve o nome antes do valor no fim da linha, para séries cinza que a cor não distingue. */
  nomeNoRotulo?: boolean
}

/** Uma área entre a linha de base e a série, para marcar de que lado da base ela está. */
export interface Preenchimento {
  serie: string
  cor: string
}

/** Um trecho do eixo horizontal destacado com um fundo (ex.: os meses de juro real negativo). */
export interface Intervalo {
  de: number
  ate: number
  rotulo: string
}

/** Uma data marcada com um traço vertical e um rótulo no alto (ex.: o dia em que o texto foi publicado). */
export interface Marca {
  x: number
  rotulo: string
}

interface Props {
  /** Posição de cada ponto no eixo horizontal: instante (ms) ou número. */
  x: number[]
  series: Serie[]
  preenchimento?: Preenchimento
  intervalos?: Intervalo[]
  marcas?: Marca[]
  formatoX: (x: number) => string
  formatoY: (y: number) => string
  /** Formato das marcas do eixo vertical, se for diferente do dos valores. */
  formatoTiqueY?: (y: number) => string
  tiquesX: number[]
  formatoTiqueX: (x: number) => string
  /** Linha horizontal de referência (zero, 100...). */
  base?: number
  limitesY?: [number, number]
  /** Escala logarítmica: distâncias iguais são multiplicações iguais. Para séries que crescem por décadas. */
  log?: boolean
  rotuloX?: string
  /** Altura total, já contando a faixa do eixo horizontal. */
  altura?: number
  /** O que o gráfico mostra, para leitores de tela. */
  descricao: string
}

const DISTANCIA_ENTRE_ROTULOS = 16
const ESPACO_MINIMO_ENTRE_TIQUES = 46
const LARGURA_MEDIA_DO_CARACTERE = 7.4

export function GraficoLinhas({
  x,
  series,
  preenchimento,
  intervalos = [],
  marcas = [],
  formatoX,
  formatoY,
  formatoTiqueY = formatoY,
  tiquesX,
  formatoTiqueX,
  base,
  limitesY,
  log = false,
  rotuloX,
  altura = 340,
  descricao,
}: Props) {
  const caixa = useRef<HTMLDivElement>(null)
  const largura = useLargura(caixa)
  const [ativo, setAtivo] = useState<number | null>(null)

  // A margem direita acompanha o maior rótulo de fim de linha ("R$ 567" pede mais espaço que "4%").
  const maiorRotulo = Math.max(
    0,
    ...series.map((serie) => {
      const fim = serie.contexto ? undefined : serie.valores.findLast((valor) => valor !== null)
      return fim === undefined || fim === null ? 0 : textoDoRotulo(serie, fim, formatoY).length
    }),
  )
  const margem = {
    topo: marcas.length || intervalos.length ? 26 : 14,
    direita: 20 + maiorRotulo * LARGURA_MEDIA_DO_CARACTERE,
    base: rotuloX ? 46 : 28,
    esquerda: 48,
  }

  const { escalaX, escalaY } = useMemo(() => {
    const valores = [
      ...series.flatMap((serie) => serie.valores.filter((valor) => valor !== null)),
      ...(base === undefined ? [] : [base]),
    ]
    const dominioY = limitesY ?? [Math.min(...valores), Math.max(...valores)]
    const y = (log ? scaleLog() : scaleLinear()).domain(dominioY).range([altura - margem.base, margem.topo])
    if (!limitesY) y.nice(5)
    const escala = scaleLinear()
      .domain([x[0], x[x.length - 1]])
      .range([margem.esquerda, Math.max(largura - margem.direita, margem.esquerda + 1)])
    return { escalaX: escala, escalaY: y }
  }, [x, series, base, limitesY, log, altura, largura, margem.base, margem.topo, margem.direita, margem.esquerda])

  const tracar = line<number | null>()
    .defined((valor) => valor !== null)
    .x((_, i) => escalaX(x[i]))
    .y((valor) => escalaY(valor ?? 0))

  const rotulos = rotulosDoFim(series, x, escalaX, escalaY, formatoY)
  const tiquesY = log ? tiquesDaEscalaLog(escalaY.domain() as [number, number]) : escalaY.ticks(5)

  // Em telas estreitas as marcas do eixo horizontal se encostam: fica uma a cada duas, três...
  const visiveis = tiquesX.filter((tique) => tique >= x[0] && tique <= x[x.length - 1])
  const espaco = visiveis.length > 1 ? escalaX(visiveis[1]) - escalaX(visiveis[0]) : ESPACO_MINIMO_ENTRE_TIQUES
  const salto = Math.max(1, Math.ceil(ESPACO_MINIMO_ENTRE_TIQUES / espaco))
  const marcasX = visiveis.filter((_, i) => i % salto === 0)

  const preenchida = preenchimento && series.find((serie) => serie.nome === preenchimento.serie)

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
  const fundo = altura - margem.base

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
          {intervalos.map((intervalo) => (
            <g key={intervalo.rotulo}>
              <rect className="g-intervalo" x={escalaX(intervalo.de)} y={margem.topo} width={escalaX(intervalo.ate) - escalaX(intervalo.de)} height={fundo - margem.topo} />
              <text className="g-anotacao" x={(escalaX(intervalo.de) + escalaX(intervalo.ate)) / 2} y={margem.topo - 8} textAnchor="middle">
                {intervalo.rotulo}
              </text>
            </g>
          ))}

          {tiquesY.map((tique) => (
            <g key={tique}>
              <line className="g-grade" x1={margem.esquerda} x2={largura - margem.direita} y1={escalaY(tique)} y2={escalaY(tique)} />
              <text className="g-tique" x={margem.esquerda - 8} y={escalaY(tique)} dy="0.32em" textAnchor="end">
                {formatoTiqueY(tique)}
              </text>
            </g>
          ))}

          <line className="g-eixo" x1={margem.esquerda} x2={largura - margem.direita} y1={fundo} y2={fundo} />
          {marcasX.map((tique) => (
            <text key={tique} className="g-tique" x={escalaX(tique)} y={fundo + 18} textAnchor="middle">
              {formatoTiqueX(tique)}
            </text>
          ))}
          {rotuloX && (
            <text className="g-nome-eixo" x={(margem.esquerda + largura - margem.direita) / 2} y={altura - 6} textAnchor="middle">
              {rotuloX}
            </text>
          )}

          {preenchida && base !== undefined && (
            <path
              style={{ fill: preenchimento.cor, opacity: 0.12 }}
              d={
                area<number | null>()
                  .defined((valor) => valor !== null)
                  .x((_, i) => escalaX(x[i]))
                  .y0(escalaY(base))
                  .y1((valor) => escalaY(valor ?? base))(preenchida.valores) ?? undefined
              }
            />
          )}

          {base !== undefined && <line className="g-base" x1={margem.esquerda} x2={largura - margem.direita} y1={escalaY(base)} y2={escalaY(base)} />}

          {marcas.map((marca) => (
            <g key={marca.rotulo}>
              <line className="g-marca" x1={escalaX(marca.x)} x2={escalaX(marca.x)} y1={margem.topo - 4} y2={fundo} />
              <text className="g-anotacao" x={escalaX(marca.x)} y={margem.topo - 8} textAnchor={escalaX(marca.x) > largura * 0.75 ? 'end' : 'middle'}>
                {marca.rotulo}
              </text>
            </g>
          ))}

          {series.map((serie) => (
            <path key={serie.nome} className="g-linha" style={{ stroke: serie.cor }} d={tracar(serie.valores) ?? undefined} />
          ))}

          {rotulos.map((rotulo) => (
            <g key={rotulo.nome}>
              {Math.abs(rotulo.yTexto - rotulo.y) > 2 && <line className="g-ligacao" x1={rotulo.x + 6} y1={rotulo.y} x2={rotulo.x + 9} y2={rotulo.yTexto} />}
              <circle className="g-ponto" cx={rotulo.x} cy={rotulo.y} r={4.5} style={{ fill: rotulo.cor }} />
              <text className="g-rotulo" x={rotulo.x + 11} y={rotulo.yTexto} dy="0.32em">
                {rotulo.texto}
              </text>
            </g>
          ))}

          {ativo !== null && (
            <g>
              <line className="g-mira" x1={xAtivo} x2={xAtivo} y1={margem.topo} y2={fundo} />
              {series.map((serie) => {
                const valor = serie.valores[ativo]
                return valor === null ? null : <circle key={serie.nome} className="g-ponto" cx={xAtivo} cy={escalaY(valor)} r={4.5} style={{ fill: serie.cor }} />
              })}
            </g>
          )}

          <rect
            x={margem.esquerda}
            y={margem.topo}
            width={Math.max(largura - margem.esquerda - margem.direita, 0)}
            height={fundo - margem.topo}
            fill="transparent"
            onPointerMove={maisProximo}
            onPointerLeave={() => setAtivo(null)}
          />
        </svg>
      )}

      {ativo !== null && (
        <div className="dica" style={dicaAEsquerda ? { right: largura - xAtivo + 12, top: margem.topo } : { left: xAtivo + 12, top: margem.topo }}>
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
    rotulos.push({ nome: serie.nome, cor: serie.cor, texto: textoDoRotulo(serie, valor, formatoY), x: escalaX(x[fim]), y, yTexto: y })
  }

  // De cima para baixo, cada texto fica pelo menos a uma linha de distância do anterior.
  const ordenados = rotulos.toSorted((a, b) => a.y - b.y)
  for (let i = 1; i < ordenados.length; i++) {
    ordenados[i].yTexto = Math.max(ordenados[i].yTexto, ordenados[i - 1].yTexto + DISTANCIA_ENTRE_ROTULOS)
  }
  return rotulos
}

function textoDoRotulo(serie: Serie, valor: number, formatoY: (valor: number) => string): string {
  return serie.nomeNoRotulo ? `${serie.nome} ${formatoY(valor)}` : formatoY(valor)
}

/** Marcas redondas para a escala logarítmica: 1, 2, 5, 10, 20, 50, 100... dentro do domínio. */
function tiquesDaEscalaLog([minimo, maximo]: [number, number]): number[] {
  const tiques: number[] = []
  for (let potencia = Math.floor(Math.log10(minimo)); potencia <= Math.ceil(Math.log10(maximo)); potencia++) {
    for (const passo of [1, 2, 5]) {
      const valor = passo * 10 ** potencia
      if (valor >= minimo && valor <= maximo) tiques.push(valor)
    }
  }
  return tiques
}
