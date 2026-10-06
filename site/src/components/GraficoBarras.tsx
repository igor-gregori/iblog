export interface Barra {
  nome: string
  valor: number | null
  cor: string
  /** Texto pequeno depois do nome (ex.: "até jul/2026"). */
  nota?: string
}

export interface GrupoDeBarras {
  titulo?: string
  barras: Barra[]
}

interface Props {
  grupos: GrupoDeBarras[]
  formato: (valor: number) => string
  /** De onde as barras partem. Com valores dos dois lados, as barras crescem para a direita e para a esquerda. */
  base?: number
  /** O que o gráfico mostra, para leitores de tela. */
  descricao: string
}

/**
 * Barras horizontais finas, com o valor escrito na ponta. Todas dividem a mesma escala,
 * então dá para comparar barras de grupos diferentes.
 */
export function GraficoBarras({ grupos, formato, base = 0, descricao }: Props) {
  const valores = grupos.flatMap((grupo) => grupo.barras.map((barra) => barra.valor)).filter((valor) => valor !== null)
  const minimo = Math.min(base, ...valores)
  const maximo = Math.max(base, ...valores)
  const posicao = (valor: number) => ((valor - minimo) / (maximo - minimo || 1)) * 100
  const temNegativos = minimo < base

  return (
    <div className={`barras${temNegativos ? ' barras-dos-dois-lados' : ''}`} role="img" aria-label={descricao}>
      {grupos.map((grupo, n) => (
        <div key={grupo.titulo ?? n} className="barras-grupo">
          {grupo.titulo && <p className="barras-titulo">{grupo.titulo}</p>}
          {grupo.barras.map((barra) => {
            const valor = barra.valor
            return (
              <div key={barra.nome} className="barra-linha">
                <span className="barra-nome">
                  {barra.nome}
                  {barra.nota && <small> {barra.nota}</small>}
                </span>
                <span className="barra-trilho">
                  <span className="barra-base" style={{ left: `${posicao(base)}%` }} />
                  {valor === null ? (
                    <span className="barra-valor" style={{ left: `${posicao(base)}%` }}>
                      sem dado
                    </span>
                  ) : valor >= base ? (
                    <>
                      <span className="barra barra-positiva" style={{ left: `${posicao(base)}%`, width: `${posicao(valor) - posicao(base)}%`, background: barra.cor }} />
                      <span className="barra-valor" style={{ left: `${posicao(valor)}%` }}>
                        {formato(valor)}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="barra barra-negativa" style={{ left: `${posicao(valor)}%`, width: `${posicao(base) - posicao(valor)}%`, background: barra.cor }} />
                      <span className="barra-valor barra-valor-negativo" style={{ right: `${100 - posicao(valor)}%` }}>
                        {formato(valor)}
                      </span>
                    </>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
