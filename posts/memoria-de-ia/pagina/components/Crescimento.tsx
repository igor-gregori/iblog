import { Figura } from '#base/Figura.tsx'
import { numero } from '#base/formato.ts'
import { GraficoLinhas, type Serie } from '#base/GraficoLinhas.tsx'
import type { Dia } from '../dados.ts'

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** "2026-10-03" → instante (ms), para o eixo do tempo. */
function instante(data: string) {
  const [ano, mes, dia] = data.split('-').map(Number)
  return Date.UTC(ano, mes - 1, dia)
}

/** Instante → "3/out" */
function diaCurto(ms: number) {
  const data = new Date(ms)
  return `${data.getUTCDate()}/${MESES[data.getUTCMonth()]}`
}

interface Props {
  historico: Dia[]
  /** Tokens do o200k_base → tokens do Claude. */
  emTokens: (texto: number) => number
}

/** O tamanho dos CLAUDE.md deste blog, dia a dia, pelo git. */
export function Crescimento({ historico, emTokens }: Props) {
  const x = historico.map((d) => instante(d.data))
  const series: Serie[] = [
    { nome: 'O da raiz, que entra em toda sessão', cor: 'var(--serie-1)', valores: historico.map((d) => emTokens(d.raiz_texto)) },
    {
      nome: 'Os dos posts, somados, que entram quando o agente mexe na pasta',
      cor: 'var(--serie-3)',
      valores: historico.map((d) => emTokens(d.posts_texto)),
    },
  ]
  const maior = Math.max(...series.flatMap((s) => s.valores as number[]))
  const primeiro = historico[0]
  const ultimo = historico[historico.length - 1]
  const tiques = [x[0], instante('2026-10-10'), instante('2026-10-18'), x[x.length - 1]]

  return (
    <Figura
      titulo="Os CLAUDE.md deste blog, dia a dia"
      subtitulo="Tokens estimados no último commit de cada dia em que algum deles mudou."
      legenda={series.map((s) => ({ nome: s.nome, cor: s.cor }))}
      fonte="Histórico do git deste repositório, até o merge do post 7. Tokens do o200k_base convertidos pelo fator da sessão real."
      tabela={{
        colunas: ['Dia', 'Linhas do da raiz', 'Tokens do da raiz', 'Posts com CLAUDE.md', 'Tokens dos posts'],
        linhas: historico.map((d) => [
          diaCurto(instante(d.data)),
          numero(d.raiz_linhas),
          numero(emTokens(d.raiz_texto)),
          numero(d.posts),
          numero(emTokens(d.posts_texto)),
        ]),
      }}
    >
      <GraficoLinhas
        x={x}
        series={series}
        formatoX={(ms) => diaCurto(ms)}
        formatoY={(y) => numero(y)}
        tiquesX={tiques}
        formatoTiqueX={diaCurto}
        base={0}
        limitesY={[0, maior]}
        altura={280}
        descricao={`O CLAUDE.md da raiz foi de ${numero(primeiro.raiz_linhas)} linhas em ${diaCurto(x[0])} para ${numero(ultimo.raiz_linhas)} em ${diaCurto(x[x.length - 1])}; os dos posts somam ${numero(emTokens(ultimo.posts_texto))} tokens.`}
      />
    </Figura>
  )
}
