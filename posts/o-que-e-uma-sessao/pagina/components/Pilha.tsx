import { useState } from 'react'
import { Figura, Opcoes } from '#base/Figura.tsx'
import { numero } from '#base/formato.ts'
import { PASSOS, pedido } from '../tarefa.ts'

/**
 * O pedido de cada chamada do laço, bloco por bloco. Sem o cache, marca o que é novo na chamada; com o cache, o que
 * é lido do cache e o que é gravado nele.
 */
export function Pilha({ cache }: { cache: boolean }) {
  const [n, setN] = useState(3)
  const { anteriores, novos } = pedido(n)
  const blocos = [...anteriores.map((bloco) => ({ ...bloco, novo: false })), ...novos.map((bloco) => ({ ...bloco, novo: true }))]
  const total = blocos.reduce((soma, bloco) => soma + bloco.tokens, 0)
  const novosTokens = novos.reduce((soma, bloco) => soma + bloco.tokens, 0)
  // Na primeira chamada, com o cache vazio, o pedido inteiro é gravado.
  const gravado = (bloco: { novo: boolean }) => n === 1 || bloco.novo
  const nomes = cache
    ? { antigo: 'Lido do cache', novo: 'Gravado no cache' }
    : { antigo: 'Já mandado antes', novo: 'Novo nesta chamada' }

  return (
    <Figura
      titulo={`O que a chamada ${n} manda ao modelo`}
      subtitulo={
        cache
          ? n === 1
            ? `${numero(total)} tokens, todos gravados no cache: é a primeira chamada.`
            : `${numero(total)} tokens: ${numero(total - novosTokens)} lidos do cache e ${numero(novosTokens)} gravados.`
          : `${numero(total)} tokens, dos quais ${numero(novosTokens)} são novos.`
      }
      legenda={[
        { nome: nomes.antigo, cor: 'var(--serie-1)', marca: 'area' },
        { nome: nomes.novo, cor: 'var(--serie-2)', marca: 'area' },
      ]}
      controles={
        <Opcoes
          rotulo="Chamada"
          opcoes={PASSOS.map((_, i) => ({ valor: String(i + 1), nome: String(i + 1) }))}
          valor={String(n)}
          aoMudar={(valor) => setN(Number(valor))}
        />
      }
      fonte="Tamanhos ilustrativos, para a tarefa do laço do primeiro post da série. A ordem é a do pedido à API: ferramentas, instruções e, depois, as mensagens."
    >
      <ol className="pilha" aria-label={`Os blocos do pedido da chamada ${n}`}>
        {blocos.map((bloco, i) => {
          const novo = cache ? gravado(bloco) : bloco.novo
          return (
            <li key={i} className={novo ? 'pilha-novo' : undefined}>
              <span className="pilha-marca" style={{ background: novo ? 'var(--serie-2)' : 'var(--serie-1)' }} aria-hidden="true" />
              <span className="pilha-nome">
                {bloco.nome}
                <span className="visualmente-oculto"> ({novo ? nomes.novo : nomes.antigo})</span>
              </span>
              <span className="pilha-tokens">{numero(bloco.tokens)}</span>
            </li>
          )
        })}
      </ol>
      <p className="pilha-resposta">
        O modelo responde: <strong>{PASSOS[n - 1].responde.nome}</strong> ({numero(PASSOS[n - 1].responde.tokens)} tokens de saída)
        {n < PASSOS.length ? ', que entra no pedido da chamada seguinte.' : '. A tarefa acabou.'}
      </p>
    </Figura>
  )
}
