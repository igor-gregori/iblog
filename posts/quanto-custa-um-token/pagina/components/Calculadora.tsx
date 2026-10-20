import { useId, useState } from 'react'
import { Figura, Opcoes } from '#base/Figura.tsx'
import { GraficoBarras } from '#base/GraficoBarras.tsx'
import { numero, pct } from '#base/formato.ts'
import { custo, type Preco } from '../custos.ts'
import { CENARIOS, dolares, type Chave } from '../cenarios.ts'
import { CORES } from '../dados.ts'

interface Props {
  precos: Preco[]
  /** Os tokens do texto do tokenizador, se o leitor quiser usar como entrada. */
  tokensDoTexto: number | null
}

const PEDIDOS = 1_000

/** O custo de mil pedidos iguais em cada modelo, com a entrada, a saída e o cache que o leitor escolher. */
export function Calculadora({ precos, tokensDoTexto }: Props) {
  const [chave, setChave] = useState<Chave | 'proprio'>('agente')
  const [entrada, setEntrada] = useState(CENARIOS.agente.entrada)
  const [saida, setSaida] = useState(CENARIOS.agente.saida)
  const [cache, setCache] = useState(CENARIOS.agente.fracaoEmCache)

  function escolher(nova: Chave | 'proprio') {
    setChave(nova)
    if (nova === 'proprio') return
    setEntrada(CENARIOS[nova].entrada)
    setSaida(CENARIOS[nova].saida)
    setCache(CENARIOS[nova].fracaoEmCache)
  }

  function mudar(aplicar: () => void) {
    aplicar()
    setChave('proprio')
  }

  const linhas = precos
    .map((preco) => ({ preco, valor: custo(preco, entrada, saida, cache) * PEDIDOS }))
    .sort((a, b) => a.valor - b.valor)
  const fornecedores = [...new Set(precos.map((p) => p.fornecedor))]

  return (
    <Figura
      titulo={`Quanto custam ${numero(PEDIDOS)} pedidos`}
      subtitulo={`${numero(entrada)} tokens de entrada (${pct(cache)} no cache) e ${numero(saida)} de saída em cada pedido.`}
      legenda={fornecedores.map((nome) => ({ nome, cor: CORES[nome], marca: 'area' }))}
      controles={
        <Opcoes
          rotulo="Pedido típico"
          opcoes={[...(Object.keys(CENARIOS) as Chave[]).map((valor) => ({ valor, nome: CENARIOS[valor].nome })), { valor: 'proprio', nome: 'Meu' }]}
          valor={chave}
          aoMudar={escolher}
        />
      }
      fonte="Preços públicos por milhão de tokens, sem o custo de gravar no cache e sem as faixas para pedidos muito longos. A saída inclui os tokens de raciocínio."
      tabela={{
        colunas: ['Modelo', 'Fornecedor', 'Um pedido', `${numero(PEDIDOS)} pedidos`],
        linhas: linhas.map(({ preco, valor }) => [preco.nome, preco.fornecedor, dolares(valor / PEDIDOS), dolares(valor)]),
      }}
    >
      <div className="calculadora-campos">
        <Regua rotulo="Tokens de entrada" valor={entrada} min={0} max={100_000} passo={500} formato={numero} aoMudar={(v) => mudar(() => setEntrada(v))} />
        <Regua rotulo="Tokens de saída" valor={saida} min={0} max={20_000} passo={100} formato={numero} aoMudar={(v) => mudar(() => setSaida(v))} />
        <Regua rotulo="Entrada que já está no cache" valor={cache} min={0} max={0.95} passo={0.05} formato={(v) => pct(v)} aoMudar={(v) => mudar(() => setCache(v))} />
      </div>
      {tokensDoTexto !== null && tokensDoTexto > 0 && (
        <div className="atalhos calculadora-atalho">
          <button type="button" onClick={() => mudar(() => setEntrada(Math.min(tokensDoTexto, 100_000)))}>
            Usar os {numero(tokensDoTexto)} tokens do texto acima como entrada
          </button>
        </div>
      )}
      <GraficoBarras
        grupos={[{ barras: linhas.map(({ preco, valor }) => ({ nome: preco.nome, valor, cor: CORES[preco.fornecedor] })) }]}
        formato={dolares}
        descricao={`Custo de ${numero(PEDIDOS)} pedidos: ${linhas.map(({ preco, valor }) => `${preco.nome}, ${dolares(valor)}`).join('; ')}`}
      />
    </Figura>
  )
}

interface ReguaProps {
  rotulo: string
  valor: number
  min: number
  max: number
  passo: number
  formato: (valor: number) => string
  aoMudar: (valor: number) => void
}

function Regua({ rotulo, valor, min, max, passo, formato, aoMudar }: ReguaProps) {
  const id = useId()
  return (
    <div className="campo">
      <label htmlFor={id}>
        {rotulo}
        <output htmlFor={id}>{formato(valor)}</output>
      </label>
      <input id={id} type="range" min={min} max={max} step={passo} value={valor} onChange={(evento) => aoMudar(evento.target.valueAsNumber)} />
    </div>
  )
}
