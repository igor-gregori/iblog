import { useMemo, useState } from 'react'
import { comparar, matrizDePeriodos, somarMeses } from '../contas.ts'
import { ATIVOS, NOMES, REGUAS, type Dados } from '../dados.ts'
import { mesAno, pct, variacao } from '#base/formato.ts'
import { Figura } from '#base/Figura.tsx'
import { EscalaDeCores, MapaDeCalor } from './MapaDeCalor.tsx'

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const SATURACAO = 0.08

interface Props {
  dados: Dados
}

/** Qualquer investimento contra qualquer régua, em qualquer período. O fim é o último mês contado, inclusive. */
export function Calculadora({ dados }: Props) {
  const { niveis } = dados
  const primeiro = somarMeses(niveis.datas[0], 1)
  const ultimo = dados.ate

  const [ativo, setAtivo] = useState('selic')
  const [regua, setRegua] = useState('m2')
  const [inicio, setInicio] = useState('2008-01')
  const [fim, setFim] = useState(ultimo)

  const comparacao = comparar(niveis, ativo, regua, inicio, somarMeses(fim, 1))
  const matriz = useMemo(() => matrizDePeriodos(niveis, ativo, regua), [niveis, ativo, regua])

  const atalhos = [
    { nome: 'jan/1998 a dez/2007', inicio: '1998-01', fim: '2007-12' },
    { nome: 'jan/2008 a dez/2017', inicio: '2008-01', fim: '2017-12' },
    { nome: 'jan/2008 até hoje', inicio: '2008-01', fim: ultimo },
    { nome: 'do texto até hoje', inicio: dados.texto.publicado_em, fim: ultimo },
  ]

  // A célula do mapa que corresponde ao período escolhido, quando ele vai de janeiro a dezembro.
  const selecionada: [number, number] | null =
    inicio.endsWith('-01') && fim.endsWith('-12') ? [matriz.inicios.indexOf(Number(inicio.slice(0, 4))), matriz.fins.indexOf(Number(fim.slice(0, 4)) + 1)] : null

  const nome = NOMES[ativo]
  const nomeDaRegua = regua === 'ipca' ? 'a inflação' : `o ${NOMES[regua]}`

  return (
    <div className="calculadora largo">
      <div className="ferramenta">
        <form className="controles" onSubmit={(evento) => evento.preventDefault()}>
        <div className="campo">
          <label htmlFor="calc-ativo">Investimento</label>
          <select id="calc-ativo" value={ativo} onChange={(evento) => setAtivo(evento.target.value)}>
            {ATIVOS.map((serie) => (
              <option key={serie} value={serie}>
                {NOMES[serie]}
              </option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="calc-regua">Régua</label>
          <select id="calc-regua" value={regua} onChange={(evento) => setRegua(evento.target.value)}>
            {REGUAS.map((serie) => (
              <option key={serie} value={serie}>
                {NOMES[serie]}
              </option>
            ))}
          </select>
        </div>
        <EscolhaDeMes rotulo="Do começo de" id="calc-inicio" valor={inicio} minimo={primeiro} maximo={ultimo} aoMudar={setInicio} />
        <EscolhaDeMes rotulo="Ao fim de" id="calc-fim" valor={fim} minimo={primeiro} maximo={ultimo} aoMudar={setFim} />
        <div className="atalhos">
          <span>Atalhos</span>
          {atalhos.map((atalho) => (
            <button
              key={atalho.nome}
              type="button"
              aria-pressed={atalho.inicio === inicio && atalho.fim === fim}
              onClick={() => {
                setInicio(atalho.inicio)
                setFim(atalho.fim)
              }}
            >
              {atalho.nome}
            </button>
          ))}
        </div>
        </form>

      <div className="resultados resultado" aria-live="polite">
        {comparacao ? (
          <>
            <p className="resultado-frase">
              Do começo de {mesAno(inicio)} ao fim de {mesAno(fim)}, {artigo(ativo)} {nome} rendeu{' '}
              <strong>{pct(Math.abs(comparacao.acimaDaReguaAoAno), 1)} ao ano {comparacao.acimaDaRegua >= 0 ? 'a mais' : 'a menos'}</strong> que{' '}
              {nomeDaRegua}.
            </p>
            <dl className="indicadores">
              <div>
                <dt>{nome}</dt>
                <dd>{variacao(comparacao.variacaoDoAtivo, true)}</dd>
                <small>no período</small>
              </div>
              <div>
                <dt>{NOMES[regua]}</dt>
                <dd>{variacao(comparacao.variacaoDaRegua, true)}</dd>
                <small>no período</small>
              </div>
              <div>
                <dt>Diferença</dt>
                <dd>{variacao(comparacao.acimaDaRegua, true)}</dd>
                <small>o que sobra do investimento depois de descontada a régua</small>
              </div>
            </dl>
          </>
        ) : (
          <p className="resultado-frase">
            {inicio > fim
              ? 'O começo precisa vir antes do fim.'
              : `Não há dados de ${NOMES[ativo]} e de ${NOMES[regua]} para todo esse período. O bitcoin começa em 2010; o M3 e o M4, em 2002.`}
          </p>
        )}
        </div>
      </div>

      <Figura
        titulo={`${nome} contra ${NOMES[regua]}, em todos os períodos`}
        subtitulo="Quanto o investimento rendeu ao ano acima da régua, do começo do ano de início ao começo do ano de fim. Clique em um quadrado para escolher o período"
        fonte={`As cores saturam em ±${pct(SATURACAO)} ao ano. Cada quadrado é um período de janeiro a janeiro.`}
      >
        <MapaDeCalor
          linhas={matriz.inicios.map(String)}
          colunas={matriz.fins.map(String)}
          valores={matriz.valores}
          limite={SATURACAO}
          formato={(v) => `${pct(v, 1, true)} ao ano`}
          nomeDaCelula={(i, j) => `De jan/${matriz.inicios[i]} a jan/${matriz.fins[j]}`}
          passoDasColunas={4}
          larguraDosRotulos={64}
          alturaDaLinha={16}
          rotuloDasLinhas="início"
          rotuloDasColunas="fim do período →"
          selecionada={selecionada}
          aoEscolher={(i, j) => {
            setInicio(`${matriz.inicios[i]}-01`)
            setFim(`${matriz.fins[j] - 1}-12`)
          }}
          descricao={`Rendimento anual de ${nome} acima de ${NOMES[regua]} para cada par de ano de início e ano de fim`}
        />
        <EscalaDeCores negativo="rendeu menos que a régua" positivo="rendeu mais que a régua" />
      </Figura>
    </div>
  )
}

function artigo(ativo: string): string {
  return ativo === 'selic' ? 'a' : 'o'
}

interface EscolhaProps {
  rotulo: string
  id: string
  valor: string
  minimo: string
  maximo: string
  aoMudar: (mes: string) => void
}

/** Mês e ano em duas caixas: o campo de mês nativo não existe em todos os navegadores. */
function EscolhaDeMes({ rotulo, id, valor, minimo, maximo, aoMudar }: EscolhaProps) {
  const [ano, mes] = valor.split('-')
  const anos = Array.from({ length: Number(maximo.slice(0, 4)) - Number(minimo.slice(0, 4)) + 1 }, (_, i) => String(Number(minimo.slice(0, 4)) + i))
  const limitar = (escolhido: string) => (escolhido < minimo ? minimo : escolhido > maximo ? maximo : escolhido)

  return (
    <div className="campo">
      <label htmlFor={id}>{rotulo}</label>
      <div className="mes-e-ano">
        <select id={id} value={mes} onChange={(evento) => aoMudar(limitar(`${ano}-${evento.target.value}`))}>
          {MESES.map((nome, i) => (
            <option key={nome} value={String(i + 1).padStart(2, '0')}>
              {nome}
            </option>
          ))}
        </select>
        <select aria-label={`${rotulo}: ano`} value={ano} onChange={(evento) => aoMudar(limitar(`${evento.target.value}-${mes}`))}>
          {anos.map((opcao) => (
            <option key={opcao} value={opcao}>
              {opcao}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
