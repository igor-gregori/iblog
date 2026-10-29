import { useState } from 'react'
import { Figura, Opcoes } from '#base/Figura.tsx'
import { GraficoBarras } from '#base/GraficoBarras.tsx'
import { dolares, numero } from '#base/formato.ts'
import type { Preco } from '#base/precos.ts'
import { Regua } from '#base/Regua.tsx'
import { custoMensal, custoMensalSemCache } from '../conta.ts'
import { CORES } from '../dados.ts'

/** Os dias de trabalho num mês. */
export const DIAS = 21

interface Props {
  precos: Preco[]
  /** Os valores antes de o leitor mexer: os da sessão real. */
  inicial: { tokens: number; chamadas: number; gravacoes: number }
}

/** Quanto uma memória do tamanho que o leitor escolher custa num mês de trabalho, em cada modelo. */
export function Calculadora({ precos, inicial }: Props) {
  const [tamanho, setTamanho] = useState(inicial.tokens)
  const [chamadas, setChamadas] = useState(inicial.chamadas)
  const [gravacoes, setGravacoes] = useState(inicial.gravacoes)
  const [cache, setCache] = useState<'sim' | 'nao'>('sim')
  const linhas = precos
    .map((preco) => ({
      preco,
      valor:
        cache === 'sim'
          ? custoMensal(preco, tamanho, chamadas, gravacoes, DIAS)
          : custoMensalSemCache(preco, tamanho, chamadas, DIAS),
    }))
    .sort((a, b) => a.valor - b.valor)
  const fornecedores = [...new Set(precos.map((p) => p.fornecedor))]

  return (
    <Figura
      titulo="Quanto a memória custa num mês"
      subtitulo={`${numero(tamanho)} tokens de memória em ${numero(chamadas)} chamadas por dia, ${DIAS} dias de trabalho; ${
        cache === 'sim' ? `gravada no cache ${numero(gravacoes)} ${gravacoes === 1 ? 'vez' : 'vezes'} por dia e lida dele no resto` : 'sem cache'
      }.`}
      legenda={fornecedores.map((nome) => ({ nome, cor: CORES[nome], marca: 'area' }))}
      controles={
        <Opcoes
          rotulo="Cache"
          opcoes={[
            { valor: 'sim', nome: 'Com cache' },
            { valor: 'nao', nome: 'Sem cache' },
          ]}
          valor={cache}
          aoMudar={setCache}
        />
      }
      fonte="Preços públicos por milhão de tokens. A gravação usa o prazo longo do cache, onde existe, como o Claude Code."
      tabela={{
        colunas: ['Modelo', 'Fornecedor', 'Por mês'],
        linhas: linhas.map(({ preco, valor }) => [preco.nome, preco.fornecedor, dolares(valor)]),
      }}
    >
      <div className="campos">
        <Regua rotulo="Tamanho da memória (tokens)" valor={tamanho} min={500} max={50_000} passo={500} formato={numero} aoMudar={setTamanho} />
        <Regua rotulo="Chamadas por dia" valor={chamadas} min={5} max={500} passo={5} formato={numero} aoMudar={setChamadas} />
        <Regua
          rotulo="Gravações no cache por dia"
          valor={gravacoes}
          min={1}
          max={20}
          passo={1}
          formato={numero}
          aoMudar={setGravacoes}
        />
      </div>
      <GraficoBarras
        grupos={[{ barras: linhas.map(({ preco, valor }) => ({ nome: preco.nome, valor, cor: CORES[preco.fornecedor] })) }]}
        formato={dolares}
        descricao={`Custo da memória num mês: ${linhas.map(({ preco, valor }) => `${preco.nome}, ${dolares(valor)}`).join('; ')}`}
      />
    </Figura>
  )
}
