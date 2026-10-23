import { useState } from 'react'
import { Figura } from '#base/Figura.tsx'
import { GraficoBarras } from '#base/GraficoBarras.tsx'
import { numero, pct } from '#base/formato.ts'
import { Regua } from '#base/Regua.tsx'
import { CATEGORIAS, janelaPorExtenso, type Composicao } from '../dados.ts'

interface Props {
  composicao: Composicao[]
  /** A janela do modelo da sessão, em tokens. */
  janela: number
  nomeDoModelo: string
}

/** 0.545 → "54%"; 0.003 → "0,3%" */
function parte(valor: number) {
  return pct(valor, valor < 0.01 ? 1 : 0)
}

/** Do que era feito o pedido de cada chamada da sessão real, dentro da janela do modelo. O leitor escolhe a chamada. */
export function Janela({ composicao, janela, nomeDoModelo }: Props) {
  const maisCheia = composicao.reduce((a, b) => (b.contexto > a.contexto ? b : a))
  const depois = composicao.find((c, i) => i > 0 && c.contexto < composicao[i - 1].contexto)
  const [n, setN] = useState(maisCheia.chamada)
  const atual = composicao[n - 1]
  const atalhos = [
    { nome: 'Primeira', chamada: 1 },
    { nome: 'Mais cheia', chamada: maisCheia.chamada },
    ...(depois ? [{ nome: 'Depois do /compact', chamada: depois.chamada }] : []),
  ]

  return (
    <Figura
      titulo={`O que estava na janela na chamada ${n}`}
      subtitulo={`${numero(atual.contexto)} tokens, ${pct(atual.contexto / janela)} da janela de ${janelaPorExtenso(janela)} do ${nomeDoModelo}.`}
      legenda={CATEGORIAS.map((c) => ({ nome: c.nome, cor: c.cor, marca: 'area' }))}
      fonte="Registro de uma sessão do Claude Code. O tamanho de cada pedido é o que a API cobrou; a divisão por tipo é estimada pelo texto de cada parte."
      tabela={{
        colunas: ['Chamada', 'Pedido inteiro', ...CATEGORIAS.map((c) => c.nome)],
        linhas: composicao.map((c) => [String(c.chamada), numero(c.contexto), ...CATEGORIAS.map((cat) => numero(c[cat.id]))]),
      }}
    >
      <div className="campos um-campo">
        <Regua rotulo="Chamada" valor={n} min={1} max={composicao.length} passo={1} formato={numero} aoMudar={setN} />
        <div className="atalhos janela-atalhos">
          {atalhos.map((atalho) => (
            <button key={atalho.nome} type="button" aria-pressed={atalho.chamada === n} onClick={() => setN(atalho.chamada)}>
              {atalho.nome} <span>{atalho.chamada}</span>
            </button>
          ))}
        </div>
      </div>
      <div
        className="janela-barra"
        role="img"
        aria-label={`Janela de ${janelaPorExtenso(janela)} de tokens: ${CATEGORIAS.map((c) => `${c.nome}, ${numero(atual[c.id])}`).join('; ')}; livre, ${numero(janela - atual.contexto)}`}
      >
        {CATEGORIAS.map((c) => (
          <span key={c.id} style={{ width: `${(atual[c.id] / janela) * 100}%`, background: c.cor }} />
        ))}
      </div>
      <p className="janela-escala" aria-hidden="true">
        <span>0</span>
        <span>{janelaPorExtenso(janela)}</span>
      </p>
      <GraficoBarras
        grupos={[{ barras: CATEGORIAS.map((c) => ({ nome: c.nome, valor: atual[c.id], cor: c.cor, nota: parte(atual[c.id] / atual.contexto) })) }]}
        formato={(valor) => numero(valor)}
        descricao={`Tokens de cada tipo na chamada ${n}: ${CATEGORIAS.map((c) => `${c.nome}, ${numero(atual[c.id])}`).join('; ')}`}
      />
    </Figura>
  )
}
