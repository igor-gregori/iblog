import { useState } from 'react'
import { Figura, Opcoes } from '#base/Figura.tsx'
import { numero, pct } from '#base/formato.ts'
import { GraficoLinhas, type Serie } from '#base/GraficoLinhas.tsx'
import type { Carga, Pedido } from '../dados.ts'

const MOTIVOS: Record<Carga['motivo'], string> = {
  inicio: 'começo da sessão',
  retomada: 'sessão retomada, arquivo mudado',
  pasta: 'leu um arquivo da pasta',
  compactacao: 'depois da compactação',
}

interface Props {
  pedidos: Pedido[]
  cargas: Carga[]
}

/** Quanto de cada pedido da sessão real era CLAUDE.md, com e sem as cópias antigas. */
export function MemoriaNaSessao({ pedidos, cargas }: Props) {
  const [medida, setMedida] = useState<'tokens' | 'parte'>('tokens')
  const valor = (p: Pedido, tokens: number) => (medida === 'tokens' ? tokens : tokens / p.contexto)
  const series: Serie[] = [
    { nome: 'Todos os CLAUDE.md no pedido', cor: 'var(--serie-1)', valores: pedidos.map((p) => valor(p, p.memoria)) },
    { nome: 'Só a versão mais nova de cada um', cor: 'var(--serie-2)', valores: pedidos.map((p) => valor(p, p.memoria_atual)) },
  ]
  const formato = medida === 'tokens' ? (y: number) => numero(y) : (y: number) => pct(y, 1)
  const maior = Math.max(...series.flatMap((s) => s.valores as number[]))
  const ultima = pedidos[pedidos.length - 1].chamada
  const tiques = [1, 50, 100, 150, 200, 250, 300].filter((n) => n <= ultima)

  return (
    <Figura
      titulo="A memória dentro de cada pedido"
      subtitulo={
        medida === 'tokens'
          ? 'Tokens de CLAUDE.md em cada uma das chamadas da sessão real.'
          : 'A parte de cada pedido que era CLAUDE.md, chamada a chamada.'
      }
      legenda={series.map((s) => ({ nome: s.nome, cor: s.cor }))}
      controles={
        <Opcoes
          rotulo="Medida"
          opcoes={[
            { valor: 'tokens', nome: 'Tokens' },
            { valor: 'parte', nome: 'Parte do pedido' },
          ]}
          valor={medida}
          aoMudar={setMedida}
        />
      }
      fonte="Registro de uma sessão do Claude Code com o Claude Opus 5.5. O tamanho dos CLAUDE.md é estimado; o do pedido é o da API."
      tabela={{
        colunas: ['Chamada', 'Arquivo', 'Por que entrou', 'Tokens (estimados)'],
        linhas: cargas.map((c) => [numero(c.chamada), c.arquivo, MOTIVOS[c.motivo], numero(c.tokens)]),
      }}
    >
      <GraficoLinhas
        x={pedidos.map((p) => p.chamada)}
        series={series}
        formatoX={(n) => `Chamada ${n}`}
        formatoY={formato}
        tiquesX={tiques}
        formatoTiqueX={(n) => numero(n)}
        base={0}
        limitesY={[0, maior]}
        rotuloX="Chamada"
        altura={300}
        descricao={`CLAUDE.md em cada pedido da sessão real: começa com ${numero(pedidos[0].memoria)} tokens e chega a ${numero(Math.max(...pedidos.map((p) => p.memoria)))}, com cópias antigas do mesmo arquivo.`}
      />
    </Figura>
  )
}
