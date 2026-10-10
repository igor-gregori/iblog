import { useRef, useState, type KeyboardEvent } from 'react'
import { useLargura } from '#base/useLargura.ts'

interface Props {
  /** Rótulo de cada linha e de cada coluna. `valores[linha][coluna]`; `null` fica em branco. */
  linhas: string[]
  colunas: string[]
  valores: (number | null)[][]
  /** O valor em que a cor satura, dos dois lados do zero. */
  limite: number
  formato: (valor: number) => string
  /** Frase da dica para uma célula (ex.: "Brasil em 2021"). */
  nomeDaCelula: (linha: number, coluna: number) => string
  /** Linhas com o rótulo em destaque. */
  destaques?: string[]
  /** Uma marca no eixo horizontal a cada quantas colunas. */
  passoDasColunas?: number
  larguraDosRotulos?: number
  alturaDaLinha?: number
  rotuloDasLinhas?: string
  rotuloDasColunas?: string
  selecionada?: [number, number] | null
  aoEscolher?: (linha: number, coluna: number) => void
  /** O que o gráfico mostra, para leitores de tela. */
  descricao: string
}

/** A cor de um valor: azul acima de zero, vermelho abaixo, cinza neutro no zero. */
function corDoValor(valor: number, limite: number): string {
  const intensidade = Math.min(1, Math.abs(valor) / limite)
  // A raiz deixa os valores pequenos visíveis sem estourar os grandes.
  const mistura = Math.round(Math.sqrt(intensidade) * 100)
  return `color-mix(in oklab, var(${valor >= 0 ? '--div-azul' : '--div-vermelho'}) ${mistura}%, var(--div-neutro))`
}

export function MapaDeCalor({
  linhas,
  colunas,
  valores,
  limite,
  formato,
  nomeDaCelula,
  destaques = [],
  passoDasColunas = 1,
  larguraDosRotulos = 104,
  alturaDaLinha = 22,
  rotuloDasLinhas,
  rotuloDasColunas,
  selecionada,
  aoEscolher,
  descricao,
}: Props) {
  const caixa = useRef<HTMLDivElement>(null)
  const largura = useLargura(caixa)
  const [ativa, setAtiva] = useState<[number, number] | null>(null)

  const topo = rotuloDasColunas ? 34 : 20
  const celula = Math.max((largura - larguraDosRotulos) / colunas.length, 1)
  const altura = topo + linhas.length * alturaDaLinha + 4
  const preenchida = (linha: number, coluna: number) => valores[linha]?.[coluna] !== null && valores[linha]?.[coluna] !== undefined

  // As setas andam de célula em célula, pulando as vazias.
  function aoTeclar(evento: KeyboardEvent<HTMLDivElement>) {
    const passo = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[evento.key]
    if (evento.key === 'Enter' && ativa && aoEscolher) return aoEscolher(...ativa)
    if (!passo) return
    evento.preventDefault()
    setAtiva((atual) => {
      let [linha, coluna] = atual ?? primeiraPreenchida()
      for (let tentativas = 0; tentativas < Math.max(linhas.length, colunas.length); tentativas++) {
        linha += passo[0]
        coluna += passo[1]
        if (linha < 0 || linha >= linhas.length || coluna < 0 || coluna >= colunas.length) return atual ?? primeiraPreenchida()
        if (preenchida(linha, coluna)) return [linha, coluna]
      }
      return atual
    })
  }

  function primeiraPreenchida(): [number, number] {
    for (let linha = 0; linha < linhas.length; linha++) {
      const coluna = valores[linha].findIndex((valor) => valor !== null)
      if (coluna >= 0) return [linha, coluna]
    }
    return [0, 0]
  }

  const valorAtivo = ativa ? valores[ativa[0]][ativa[1]] : null
  const xDica = ativa ? larguraDosRotulos + (ativa[1] + 0.5) * celula : 0

  return (
    <div
      ref={caixa}
      className="grafico"
      tabIndex={0}
      role="group"
      aria-label={`${descricao}. Use as setas para percorrer as células.`}
      onKeyDown={aoTeclar}
      onFocus={() => setAtiva((atual) => atual ?? selecionada ?? primeiraPreenchida())}
      onBlur={() => setAtiva(null)}
    >
      {largura > 0 && (
        <svg width={largura} height={altura} role="img" aria-label={descricao} onPointerLeave={() => setAtiva(null)}>
          {rotuloDasColunas && (
            <text className="g-nome-eixo" x={larguraDosRotulos} y={11}>
              {rotuloDasColunas}
            </text>
          )}
          {rotuloDasLinhas && (
            <text className="g-nome-eixo" x={0} y={topo - 8}>
              {rotuloDasLinhas}
            </text>
          )}
          {colunas.map((coluna, j) =>
            j % passoDasColunas === 0 ? (
              <text key={coluna} className="g-tique" x={larguraDosRotulos + (j + 0.5) * celula} y={topo - 8} textAnchor="middle">
                {coluna}
              </text>
            ) : null,
          )}

          {linhas.map((linha, i) => (
            <g key={linha}>
              <text className={destaques.includes(linha) ? 'g-tique g-tique-forte' : 'g-tique'} x={larguraDosRotulos - 8} y={topo + (i + 0.5) * alturaDaLinha} dy="0.32em" textAnchor="end">
                {linha}
              </text>
              {valores[i].map((valor, j) =>
                valor === null ? null : (
                  <rect
                    key={j}
                    x={larguraDosRotulos + j * celula + 1}
                    y={topo + i * alturaDaLinha + 1}
                    width={Math.max(celula - 2, 0.5)}
                    height={alturaDaLinha - 2}
                    style={{ fill: corDoValor(valor, limite), cursor: aoEscolher ? 'pointer' : undefined }}
                    onPointerMove={() => setAtiva([i, j])}
                    onClick={() => aoEscolher?.(i, j)}
                  />
                ),
              )}
            </g>
          ))}

          {selecionada && preenchida(...selecionada) && (
            <rect
              className="g-celula-escolhida"
              x={larguraDosRotulos + selecionada[1] * celula}
              y={topo + selecionada[0] * alturaDaLinha}
              width={celula}
              height={alturaDaLinha}
            />
          )}
          {ativa && preenchida(...ativa) && (
            <rect className="g-celula-ativa" x={larguraDosRotulos + ativa[1] * celula} y={topo + ativa[0] * alturaDaLinha} width={celula} height={alturaDaLinha} />
          )}
        </svg>
      )}

      {ativa && valorAtivo !== null && (
        <div
          className="dica"
          style={xDica > largura * 0.6 ? { right: largura - xDica + celula / 2 + 8, top: topo + ativa[0] * alturaDaLinha } : { left: xDica + celula / 2 + 8, top: topo + ativa[0] * alturaDaLinha }}
        >
          <div className="dica-titulo">{nomeDaCelula(ativa[0], ativa[1])}</div>
          <div className="dica-linha">
            <span className="chave-area" style={{ background: corDoValor(valorAtivo, limite) }} />
            <strong>{formato(valorAtivo)}</strong>
          </div>
        </div>
      )}
    </div>
  )
}

interface EscalaProps {
  negativo: string
  positivo: string
}

/** A régua de cores do mapa: vermelho de um lado, azul do outro. */
export function EscalaDeCores({ negativo, positivo }: EscalaProps) {
  return (
    <div className="escala">
      <span>{negativo}</span>
      <span className="escala-barra" />
      <span>{positivo}</span>
    </div>
  )
}
