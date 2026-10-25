import { useId, useState } from 'react'
import { Figura, Opcoes } from '#base/Figura.tsx'
import { GraficoBarras } from '#base/GraficoBarras.tsx'
import { dolares, numero } from '#base/formato.ts'
import type { Preco } from '#base/precos.ts'
import { custoDaPergunta, PERGUNTAS_NA_CONTA } from '../conta.ts'

interface Props {
  precos: Preco[]
  /** O tamanho dos documentos deste blog, em tokens. */
  corpus: number
  /** Os tokens dos pedaços que a busca põe no pedido. */
  pedacos: number
  /** O modelo antes de o leitor mexer. */
  inicial: string
}

/** 26080 → "26 mil"; 1000000 → "1 milhão"; 10000000 → "10 milhões" */
function porExtenso(valor: number) {
  if (valor < 1e6) return `${numero(valor / 1e3)} mil`
  const milhoes = valor / 1e6
  return `${numero(milhoes, Number.isInteger(milhoes) ? 0 : 2)} ${milhoes < 2 ? 'milhão' : 'milhões'}`
}

/** "26 mil tokens", "1 milhão de tokens" */
const deTokens = (valor: number) => `${porExtenso(valor)}${valor >= 1e6 ? ' de' : ''} tokens`

/** Quanto custam mil perguntas com todos os documentos no pedido e com só os pedaços da busca. */
export function Custo({ precos, corpus, pedacos, inicial }: Props) {
  const id = useId()
  const [modelo, setModelo] = useState(inicial)
  const [tamanho, setTamanho] = useState(String(corpus))
  const preco = precos.find((p) => p.modelo === modelo)!
  const total = Number(tamanho)
  const c = custoDaPergunta(preco, total, pedacos)
  const vezes = (valor: number | null) => (valor === null ? null : valor * PERGUNTAS_NA_CONTA)
  const barras = [
    { nome: 'Tudo no pedido, fora do cache', valor: vezes(c.tudoSemCache) },
    { nome: 'Tudo no pedido, lido do cache', valor: vezes(c.tudoComCache) },
    { nome: 'Só os pedaços da busca', valor: vezes(c.rag) },
  ].map((b, i) => ({ ...b, cor: i === 2 ? 'var(--serie-3)' : 'var(--serie-1)', nota: b.valor === null ? 'não cabe na janela' : undefined }))
  const tamanhos = [corpus, 200_000, 1_000_000, 10_000_000]

  return (
    <Figura
      titulo={`Quanto custam ${numero(PERGUNTAS_NA_CONTA)} perguntas`}
      subtitulo={`Documentos com ${deTokens(total)} no ${preco.nome}, cuja janela é de ${deTokens(preco.janela)}.`}
      controles={
        <Opcoes
          rotulo="Tamanho dos documentos"
          opcoes={tamanhos.map((v, i) => ({ valor: String(v), nome: i === 0 ? 'os deste blog' : porExtenso(v) }))}
          valor={tamanho}
          aoMudar={setTamanho}
        />
      }
      fonte={`Preços públicos por milhão de tokens. Cada pergunta leva ${numero(c.extra)} tokens de instruções e pergunta e recebe uma resposta de ${numero(c.saida)}; a busca põe ${numero(pedacos)} tokens de pedaços no pedido.`}
      tabela={{
        colunas: ['Jeito', `${numero(PERGUNTAS_NA_CONTA)} perguntas`],
        linhas: barras.map((b) => [b.nome, b.valor === null ? 'não cabe' : dolares(b.valor)]),
      }}
    >
      <div className="campos um-campo">
        <div className="campo">
          <label htmlFor={id}>Modelo</label>
          <select id={id} value={modelo} onChange={(evento) => setModelo(evento.target.value)}>
            {precos.map((p) => (
              <option key={p.modelo} value={p.modelo}>
                {p.nome}
              </option>
            ))}
          </select>
        </div>
      </div>
      <GraficoBarras
        grupos={[{ barras }]}
        formato={dolares}
        descricao={barras.map((b) => `${b.nome}: ${b.valor === null ? 'não cabe na janela' : dolares(b.valor)}`).join('; ')}
      />
    </Figura>
  )
}
