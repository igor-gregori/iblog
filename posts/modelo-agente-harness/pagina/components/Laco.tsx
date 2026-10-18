import { useState, type ReactNode } from 'react'

type Quem = 'Você' | 'Harness' | 'Modelo'

interface Passo {
  quem: Quem
  texto: ReactNode
  /** O que o passo acrescenta ao histórico que vai para o modelo. */
  entra?: string[]
  /** O passo termina com uma chamada ao modelo. */
  chama?: boolean
}

// Uma tarefa pequena, do começo ao fim. Os blocos do histórico são os que um harness de código manda de verdade;
// os nomes das ferramentas são simplificados.
const PASSOS: Passo[] = [
  {
    quem: 'Você',
    texto: (
      <>
        Você digita: <q>O teste de calcularFrete está falhando. Corrija.</q>
      </>
    ),
  },
  {
    quem: 'Harness',
    texto: (
      <>
        Monta o primeiro pedido: as instruções dele, o <code>CLAUDE.md</code> do projeto, a descrição das ferramentas
        que o modelo pode pedir e a sua mensagem. Manda tudo para a API do modelo.
      </>
    ),
    entra: ['Instruções do harness', 'CLAUDE.md do projeto', 'Descrição de 4 ferramentas', 'Seu pedido'],
    chama: true,
  },
  {
    quem: 'Modelo',
    texto: (
      <>
        Não roda nada: só escreve. A resposta é um pedido estruturado, <code>rodar_comando(&apos;npm test&apos;)</code>,
        e termina avisando que parou porque quer usar uma ferramenta.
      </>
    ),
    entra: ['Modelo pede: npm test'],
  },
  {
    quem: 'Harness',
    texto: (
      <>
        Confere a permissão (<code>npm test</code> está liberado), roda o comando na sua máquina e guarda a saída: um
        teste falhou, esperava 15 e recebeu 12. Chama o modelo de novo, com <strong>todo</strong> o histórico.
      </>
    ),
    entra: ['Saída: 1 teste falhando'],
    chama: true,
  },
  {
    quem: 'Modelo',
    texto: (
      <>
        Pede para ler o código: <code>ler_arquivo(&apos;src/frete.ts&apos;)</code>.
      </>
    ),
    entra: ['Modelo pede: ler src/frete.ts'],
  },
  {
    quem: 'Harness',
    texto: <>Lê o arquivo, junta o conteúdo ao histórico e chama o modelo outra vez.</>,
    entra: ['Conteúdo de src/frete.ts'],
    chama: true,
  },
  {
    quem: 'Modelo',
    texto: (
      <>
        Acha o erro: a faixa de peso usa <code>&gt;</code> onde deveria usar <code>&gt;=</code>. Pede{' '}
        <code>editar_arquivo</code> com a troca.
      </>
    ),
    entra: ['Modelo pede: editar src/frete.ts'],
  },
  {
    quem: 'Harness',
    texto: (
      <>
        Editar arquivo não está liberado, então <strong>pergunta a você</strong>. Você aprova. O harness aplica a
        edição e chama o modelo.
      </>
    ),
    entra: ['Resultado: arquivo editado'],
    chama: true,
  },
  {
    quem: 'Modelo',
    texto: <>Quer conferir o próprio trabalho: pede <code>npm test</code> de novo.</>,
    entra: ['Modelo pede: npm test'],
  },
  {
    quem: 'Harness',
    texto: <>Roda os testes. Todos passam. Junta a saída e chama o modelo.</>,
    entra: ['Saída: todos os testes passando'],
    chama: true,
  },
  {
    quem: 'Modelo',
    texto: (
      <>
        Responde só com texto, sem pedir ferramenta: <q>A faixa de peso usava &gt; em vez de &gt;=. Corrigi e os
        testes passam.</q>
      </>
    ),
    entra: ['Resposta final'],
  },
  {
    quem: 'Harness',
    texto: (
      <>
        Sem pedido de ferramenta, o laço acaba e a resposta aparece na sua tela. Foram cinco chamadas ao modelo, e
        cada uma levou o histórico inteiro até ali.
      </>
    ),
  },
]

/** O laço do agente, um passo de cada vez, com o histórico que o modelo recebe. */
export function Laco() {
  const [atual, setAtual] = useState(0)
  const passo = PASSOS[atual]
  const ate = PASSOS.slice(0, atual + 1)
  const historico = ate.flatMap((p, i) => (p.entra ?? []).map((nome) => ({ nome, novo: i === atual })))
  const chamadas = ate.filter((p) => p.chama).length
  const ultimo = atual === PASSOS.length - 1

  return (
    <figure className="laco largo">
      <div className="laco-passo">
        <p className="laco-contagem">
          Passo {atual + 1} de {PASSOS.length}
        </p>
        <div aria-live="polite">
          <p className="laco-quem" data-quem={passo.quem}>
            {passo.quem}
          </p>
          <p className="laco-texto">{passo.texto}</p>
        </div>
        <div className="atalhos laco-botoes">
          <button type="button" onClick={() => setAtual(atual - 1)} disabled={atual === 0}>
            ← Anterior
          </button>
          <button type="button" onClick={() => setAtual(ultimo ? 0 : atual + 1)}>
            {ultimo ? 'Recomeçar' : 'Próximo →'}
          </button>
        </div>
      </div>

      <div className="laco-historico">
        <h3>O histórico que o modelo recebe</h3>
        <p className="laco-chamadas">
          Chamadas ao modelo até aqui: <strong>{chamadas}</strong>
        </p>
        {historico.length ? (
          <ol>
            {historico.map((bloco, i) => (
              <li key={i} className={bloco.novo ? 'novo' : undefined}>
                {bloco.nome}
              </li>
            ))}
          </ol>
        ) : (
          <p className="laco-vazio">Vazio. O modelo ainda não recebeu nada.</p>
        )}
      </div>

      <figcaption>
        Uma tarefa pequena num agente de código. Os nomes das ferramentas estão simplificados; os de verdade variam de
        um harness para outro.
      </figcaption>
    </figure>
  )
}
