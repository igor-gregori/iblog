import { useState } from 'react'
import { Figura, Opcoes } from '#base/Figura.tsx'
import { GraficoBarras } from '#base/GraficoBarras.tsx'
import { dolares, numero, tokens } from '#base/formato.ts'
import { custoComFaixas, naFaixaLonga, type Preco } from '#base/precos.ts'
import { Regua } from '#base/Regua.tsx'
import { CORES, SAIDA } from '../dados.ts'

interface Props {
  precos: Preco[]
  /** O tamanho do pedido antes de o leitor mexer. */
  inicial: number
}

/** Quanto custa uma chamada com o contexto do tamanho que o leitor escolher, em cada modelo, com a faixa longa. */
export function Calculadora({ precos, inicial }: Props) {
  const [entrada, setEntrada] = useState(inicial)
  const [cache, setCache] = useState<'sim' | 'nao'>('sim')
  const fracao = cache === 'sim' ? 1 : 0
  const linhas = precos
    .map((preco) => ({ preco, valor: custoComFaixas(preco, entrada, SAIDA, fracao), longa: naFaixaLonga(preco, entrada) }))
    .sort((a, b) => a.valor - b.valor)
  const fornecedores = [...new Set(precos.map((p) => p.fornecedor))]

  return (
    <Figura
      titulo="Quanto custa uma chamada com o contexto deste tamanho"
      subtitulo={`${numero(entrada)} tokens de entrada, ${cache === 'sim' ? 'todos lidos do cache' : 'nenhum no cache'}, e ${numero(SAIDA)} de saída.`}
      legenda={fornecedores.map((nome) => ({ nome, cor: CORES[nome], marca: 'area' }))}
      controles={
        <Opcoes
          rotulo="Cache"
          opcoes={[
            { valor: 'sim', nome: 'Lido do cache' },
            { valor: 'nao', nome: 'Fora do cache' },
          ]}
          valor={cache}
          aoMudar={setCache}
        />
      }
      fonte="Preços públicos por milhão de tokens. Onde há faixa longa, o pedido inteiro paga o preço dela."
      tabela={{
        colunas: ['Modelo', 'Fornecedor', 'Uma chamada', 'Faixa'],
        linhas: linhas.map(({ preco, valor, longa }) => [preco.nome, preco.fornecedor, dolares(valor), longa ? 'longa' : 'normal']),
      }}
    >
      <div className="campos um-campo">
        <Regua
          rotulo="Tamanho do contexto (tokens de entrada)"
          valor={entrada}
          min={10_000}
          max={1_000_000}
          passo={10_000}
          formato={tokens}
          aoMudar={setEntrada}
        />
      </div>
      <GraficoBarras
        grupos={[
          {
            barras: linhas.map(({ preco, valor, longa }) => ({
              nome: preco.nome,
              valor,
              cor: CORES[preco.fornecedor],
              nota: longa ? 'faixa longa' : undefined,
            })),
          },
        ]}
        formato={dolares}
        descricao={`Custo de uma chamada com ${numero(entrada)} tokens de entrada: ${linhas.map(({ preco, valor }) => `${preco.nome}, ${dolares(valor)}`).join('; ')}`}
      />
    </Figura>
  )
}
