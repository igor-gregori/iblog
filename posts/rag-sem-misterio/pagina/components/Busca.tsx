import { useId, useMemo, useState } from 'react'
import { Figura, Opcoes } from '#base/Figura.tsx'
import { numero } from '#base/formato.ts'
import { criarIndice, fusao, ordem } from '../busca.ts'
import { METODOS, tamanho, type Dados, type Metodo } from '../dados.ts'
import { busca } from '../pedacos.ts'
import { Trecho } from './Trecho.tsx'

/** Quantos pedaços cada busca mostra. */
const MOSTRADOS = 3

interface Props {
  dados: Dados
  /** "palavras": o leitor escreve e a busca por palavras roda aqui; "comparar": as três buscas lado a lado. */
  modo: 'palavras' | 'comparar'
  /** A pergunta de exemplo antes de o leitor mexer. */
  inicial: string
}

const posicaoPorExtenso = (posicao: number | null, limite: number) =>
  posicao === null ? `fora dos ${limite} primeiros` : posicao === 1 ? 'em 1º' : `em ${posicao}º`

/** A busca nos documentos do blog: por palavras, com a pergunta que o leitor quiser, ou as três lado a lado. */
export function Busca({ dados, modo, inicial }: Props) {
  const id = useId()
  const [maximo, setMaximo] = useState(String(dados.tamanho_padrao))
  const [escolhida, setEscolhida] = useState(inicial)
  const [texto, setTexto] = useState(() => dados.perguntas.find((p) => p.id === inicial)!.pergunta)
  const t = tamanho(dados, Number(maximo))
  const notas = useMemo(() => criarIndice(t.pedacos.map(busca)), [t])

  // No modo "palavras", o leitor pode escrever qualquer coisa; se for uma das perguntas de teste, a figura marca o certo.
  const pergunta = modo === 'palavras' ? dados.perguntas.find((p) => p.pergunta === texto.trim()) : dados.perguntas.find((p) => p.id === escolhida)!
  const certo = (i: number) => !!pergunta && t.pedacos[i].texto.includes(pergunta.trecho)

  const valores = notas(modo === 'palavras' ? texto : pergunta!.pergunta)
  const palavras = ordem(valores).filter((i) => valores[i] > 0)
  const significado = pergunta ? t.significado[pergunta.id] : []
  const listas: Record<Metodo, number[]> = {
    palavras,
    significado: significado.map(([i]) => i),
    hibrida: fusao([palavras, significado.map(([i]) => i)], dados.limite_da_fusao),
  }
  const similaridade = new Map(significado)
  const nota = (metodo: Metodo, i: number) =>
    metodo === 'palavras' ? `nota ${numero(valores[i], 1)}` : metodo === 'significado' ? `cosseno ${numero(similaridade.get(i)!, 3)}` : undefined

  const metodos = modo === 'palavras' ? METODOS.filter((m) => m.id === 'palavras') : METODOS
  const escolha = (
    <div className="campo">
      <label htmlFor={id}>Pergunta de teste</label>
      <select
        id={id}
        value={modo === 'palavras' ? (pergunta?.id ?? '') : escolhida}
        onChange={(evento) => {
          setEscolhida(evento.target.value)
          const nova = dados.perguntas.find((p) => p.id === evento.target.value)
          if (nova) setTexto(nova.pergunta)
        }}
      >
        {modo === 'palavras' && !pergunta && <option value="">(a sua pergunta)</option>}
        {dados.perguntas.map((p) => (
          <option key={p.id} value={p.id}>
            {p.pergunta}
          </option>
        ))}
      </select>
    </div>
  )

  return (
    <Figura
      titulo={modo === 'palavras' ? 'Busque nos documentos do blog' : 'As três buscas, lado a lado'}
      subtitulo={
        modo === 'palavras'
          ? `A busca por palavras roda nesta página, em ${numero(t.pedacos.length)} pedaços de até ${maximo} tokens. Escreva uma pergunta ou escolha uma das de teste.`
          : `Os ${MOSTRADOS} primeiros pedaços de cada busca, em ${numero(t.pedacos.length)} pedaços de até ${maximo} tokens.`
      }
      controles={
        <Opcoes
          rotulo="Tamanho máximo do pedaço"
          opcoes={dados.tamanhos.map((x) => ({ valor: String(x.tamanho), nome: `${x.tamanho}` }))}
          valor={maximo}
          aoMudar={setMaximo}
        />
      }
      fonte={
        modo === 'palavras'
          ? 'BM25 com k1 = 1,2 e b = 0,75, sobre o texto do pedaço e o lugar dele (arquivo e títulos). Palavras sem acento, sem as mais comuns do português e sem o plural em s.'
          : `Embeddings do ${dados.modelo_de_embeddings}, calculados antes; a fusão junta os ${dados.limite_da_fusao} primeiros de cada lista.`
      }
    >
      <div className="campos busca-campos">
        {modo === 'palavras' && (
          <div className="campo">
            <label htmlFor={`${id}-texto`}>A sua pergunta</label>
            <div className="com-unidade">
              <input id={`${id}-texto`} type="search" value={texto} onChange={(evento) => setTexto(evento.target.value)} />
            </div>
          </div>
        )}
        {escolha}
      </div>
      {pergunta && modo === 'comparar' && (
        <p className="busca-resposta">
          A resposta está em <code>{pergunta.arquivo}</code>, no trecho <q>{pergunta.trecho}</q>. O primeiro pedaço certo
          apareceu{' '}
          {METODOS.map((m, n) => (
            <span key={m.id}>
              {n > 0 && (n === METODOS.length - 1 ? ' e ' : ', ')}
              {posicaoPorExtenso(t.posicoes[pergunta.id][m.id], dados.limite_da_fusao)} na busca {m.nome.split(' (')[0].toLowerCase()}
            </span>
          ))}
          .
        </p>
      )}
      <div className={`busca-colunas busca-colunas-${metodos.length}`}>
        {metodos.map((m) => (
          <section key={m.id} aria-label={m.nome}>
            {modo === 'comparar' && (
              <h4 className="busca-metodo">
                <span style={{ background: m.cor }} aria-hidden="true" />
                {m.nome}
              </h4>
            )}
            {listas[m.id].length === 0 ? (
              <p className="ajuda">Nenhum pedaço tem as palavras da pergunta.</p>
            ) : (
              <ol className="pedacos">
                {listas[m.id].slice(0, MOSTRADOS).map((i) => (
                  <li key={i}>
                    <Trecho pedaco={t.pedacos[i]} nota={nota(m.id, i)} certo={certo(i)} corte={modo === 'comparar' ? 150 : 360} curto={modo === 'comparar'} />
                  </li>
                ))}
              </ol>
            )}
          </section>
        ))}
      </div>
    </Figura>
  )
}
