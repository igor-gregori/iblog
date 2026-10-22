import { useId, useState } from 'react'
import { Figura } from '#base/Figura.tsx'
import { dolares, numero } from '#base/formato.ts'
import { tiqueDolares } from '../formato.ts'
import { GraficoLinhas, type Serie } from '#base/GraficoLinhas.tsx'
import type { Preco } from '#base/precos.ts'
import { Regua } from '#base/Regua.tsx'
import { chamadaDaPausa, chamadas, custoAcumulado, type Sessao } from '../sessao.ts'

interface Props {
  precos: Preco[]
  padrao: Sessao
  /** O modelo que aparece antes de o leitor escolher. */
  modeloInicial: string
}

/** O custo acumulado de uma sessão, chamada a chamada, sem cache, com cache e com uma pausa no meio. */
export function Simulador({ precos, padrao, modeloInicial }: Props) {
  const idModelo = useId()
  const [modelo, setModelo] = useState(modeloInicial)
  const [total, setTotal] = useState(padrao.chamadas)
  const [novos, setNovos] = useState(padrao.novos)
  const [comeco, setComeco] = useState(padrao.comeco)
  const [pausa, setPausa] = useState(false)

  const preco = precos.find((p) => p.modelo === modelo)!
  const sessao: Sessao = { ...padrao, chamadas: total, novos, comeco, pausa: null }
  const comPausa: Sessao = { ...sessao, pausa: chamadaDaPausa(total) }
  const semCache = custoAcumulado(preco, sessao, false)
  const comCache = custoAcumulado(preco, sessao)
  const depoisDaPausa = custoAcumulado(preco, comPausa)
  const x = semCache.map((_, i) => i + 1)
  const entradas = chamadas(sessao).map((chamada) => chamada.entrada)
  const ultimo = (valores: number[]) => valores[valores.length - 1]

  const series: Serie[] = [
    { nome: 'Sem cache', cor: 'var(--serie-3)', valores: semCache },
    ...(pausa ? [{ nome: 'Com cache e uma pausa', cor: 'var(--serie-2)', valores: depoisDaPausa }] : []),
    { nome: 'Com cache', cor: 'var(--serie-1)', valores: comCache },
  ]
  const tiques = [1, ...[10, 20, 30, 40].filter((t) => t <= total)]

  return (
    <Figura
      titulo={`Quanto custa a sessão no ${preco.nome}`}
      subtitulo={`${numero(total)} chamadas: ${dolares(ultimo(semCache))} sem cache, ${dolares(ultimo(comCache))} com cache${pausa ? ` e ${dolares(ultimo(depoisDaPausa))} com a pausa` : ''}.`}
      legenda={series.map((serie) => ({ nome: serie.nome, cor: serie.cor }))}
      fonte={`Custo acumulado até cada chamada, pelos preços públicos. Cada chamada acrescenta ${numero(novos)} tokens novos e ${numero(padrao.saida)} de resposta, que também ficam no histórico. A gravação no cache usa o prazo padrão do fornecedor.`}
      tabela={{
        colunas: ['Chamada', 'Entrada', 'Sem cache', 'Com cache', ...(pausa ? ['Com a pausa'] : [])],
        linhas: x.map((n, i) => [
          String(n),
          numero(entradas[i]),
          dolares(semCache[i]),
          dolares(comCache[i]),
          ...(pausa ? [dolares(depoisDaPausa[i])] : []),
        ]),
      }}
    >
      <div className="campos sessao-campos">
        <div className="campo">
          <label htmlFor={idModelo}>Modelo</label>
          <select id={idModelo} value={modelo} onChange={(evento) => setModelo(evento.target.value)}>
            {precos.map((p) => (
              <option key={p.modelo} value={p.modelo}>
                {p.nome}
              </option>
            ))}
          </select>
        </div>
        <Regua rotulo="Chamadas" valor={total} min={5} max={40} passo={1} formato={numero} aoMudar={setTotal} />
        <Regua rotulo="Tokens novos por chamada" valor={novos} min={200} max={1_500} passo={100} formato={numero} aoMudar={setNovos} />
        <Regua rotulo="Começo fixo (instruções e ferramentas)" valor={comeco} min={5_000} max={20_000} passo={1_000} formato={numero} aoMudar={setComeco} />
        <label className="marcar sessao-pausa">
          <input type="checkbox" checked={pausa} onChange={(evento) => setPausa(evento.target.checked)} />
          <span>
            Uma pausa maior que o prazo do cache antes da chamada {chamadaDaPausa(total)}
            {preco.prazo_cache ? ` (o prazo padrão aqui é de ${numero(preco.prazo_cache)} minutos)` : ' (o Google não informa o prazo)'}
          </span>
        </label>
      </div>
      <GraficoLinhas
        x={x}
        series={series}
        formatoX={(n) => `Chamada ${n}`}
        formatoY={dolares}
        formatoTiqueY={tiqueDolares(ultimo(semCache))}
        tiquesX={tiques}
        formatoTiqueX={(n) => numero(n)}
        limitesY={[0, ultimo(semCache)]}
        rotuloX="Chamada"
        altura={300}
        descricao={`Custo acumulado de ${total} chamadas no ${preco.nome}: ${dolares(ultimo(semCache))} sem cache e ${dolares(ultimo(comCache))} com cache`}
      />
    </Figura>
  )
}
