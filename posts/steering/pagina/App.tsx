import { Codigo } from '#base/Codigo.tsx'
import { ComoFoiFeito } from '#base/ComoFoiFeito.tsx'
import { LinkDoGlossario } from '#base/LinkDoGlossario.tsx'
import { partes } from '#base/Partes.tsx'
import { Topo } from '#base/Topo.tsx'

/** As partes do artigo, na ordem em que aparecem; o sumário aponta para elas. */
const PARTES = [
  { id: 'no-meio', titulo: 'Corrigir o agente enquanto ele trabalha' },
  { id: 'arquivos', titulo: 'Os arquivos de regras do Kiro' },
  { id: 'dentro', titulo: 'Mexer dentro do modelo' },
  { id: 'qual-deles', titulo: 'Como saber de qual estão falando' },
] as const

const { Parte } = partes(PARTES)

const FONTES = [
  {
    nome: 'Como o Claude Code funciona',
    detalhe: 'a seção "Interrupt and steer": parar com Esc ou corrigir sem parar',
    url: 'https://code.claude.com/docs/en/how-claude-code-works',
  },
  {
    nome: 'Modo interativo do Claude Code',
    detalhe: 'a fila de mensagens e quando o agente lê cada uma',
    url: 'https://code.claude.com/docs/en/interactive-mode',
  },
  {
    nome: 'Codex CLI',
    detalhe: 'a documentação oficial usa o verbo: "Steer the active turn"',
    url: 'https://learn.chatgpt.com/docs/codex/cli',
  },
  {
    nome: 'Changelog do Cursor CLI',
    detalhe: 'a entrada "Steer a running turn, then interrupt"',
    url: 'https://cursor.com/docs/cli/changelog',
  },
  {
    nome: 'Model steering no Gemini CLI',
    detalhe: 'o recurso experimental e como ele entrega a dica ao modelo',
    url: 'https://geminicli.com/docs/cli/model-steering/',
  },
  {
    nome: 'Steering no Kiro',
    detalhe: 'onde ficam os arquivos e os quatro modos de inclusão',
    url: 'https://kiro.dev/docs/steering/',
  },
  {
    nome: 'Steering Llama 2 via Contrastive Activation Addition (Panickssery e outros, 2023)',
    detalhe: 'como calcular um vetor de steering e somá-lo às ativações',
    url: 'https://arxiv.org/abs/2312.06681',
  },
  {
    nome: 'Golden Gate Claude (Anthropic, 2024)',
    detalhe: 'a demonstração em que uma característica interna do modelo foi aumentada',
    url: 'https://www.anthropic.com/research/golden-gate-claude',
  },
]

const FILA = `while (true) {
  const resposta = await modelo.responder({ instrucoes, ferramentas, historico })
  historico.push({ papel: 'assistente', conteudo: resposta.conteudo })

  const pedidos = resposta.conteudo.filter((bloco) => bloco.tipo === 'ferramenta')
  if (pedidos.length === 0) break

  historico.push({ papel: 'usuario', conteudo: await executar(pedidos) })
  historico.push(...fila.retirar()) // a sua correção entra aqui
}`

const REGRA_DO_KIRO = `---
inclusion: fileMatch
fileMatchPattern: "components/**/*.tsx"
---

Componentes usam função, nunca classe.`

const SENTIDOS = [
  {
    nome: 'Correção no meio da tarefa',
    onde: 'Uma mensagem nova no histórico',
    quem: 'Quem usa o agente, no Claude Code, Codex, Cursor e Gemini CLI',
  },
  {
    nome: 'Arquivo de regras',
    onde: 'Um texto que entra no pedido',
    quem: 'Quem mantém o projeto, no Kiro',
  },
  {
    nome: 'Steering de ativações',
    onde: 'Os números dentro do modelo, enquanto ele responde',
    quem: 'Pesquisa, em geral com modelos de pesos abertos',
  },
]

export default function App() {
  return (
    <>
      <Topo />
      <main className="artigo" id="inicio">
        <header className="abertura">
          <p className="sobretitulo">IA para quem já programa · 9</p>
          <h1>Steering: o que essa palavra quer dizer, afinal?</h1>
          <p className="subtitulo">
            Ela aparece no changelog de um agente, na documentação de um editor e em artigos de pesquisa, e não é a
            mesma coisa nos três.
          </p>
          <p className="assinatura">Igor Gregori · Outubro de 2026</p>
        </header>

        <div className="texto">
          <p>
            <em>Steering</em> é direcionar, como quem segura o volante. Em IA, a palavra tem três usos. Dois mudam o
            texto que o modelo recebe. O terceiro muda a conta que acontece dentro dele, e é aí que está a diferença
            que importa.
          </p>
        </div>

        <nav className="sumario" aria-label="Partes do artigo">
          <h2>As partes</h2>
          <ol>
            {PARTES.map((parte) => (
              <li key={parte.id}>
                <a href={`#${parte.id}`}>{parte.titulo}</a>
              </li>
            ))}
          </ol>
          <p>
            Depois delas: <a href="#resumo">o resumo</a> e <a href="#fontes">as fontes</a>.
          </p>
        </nav>

        <Parte id="no-meio">
          <p>
            É o sentido mais comum nos agentes de código. O agente está trabalhando, você vê que ele foi pelo caminho
            errado e escreve uma correção sem esperar ele terminar. O modelo não muda de rumo sozinho: a sua mensagem só
            precisa chegar a ele, e ele só lê alguma coisa quando recebe um pedido novo.
          </p>
          <p>
            No <a href="/modelo-agente-harness/#agente">laço do agente</a>, isso é uma linha a mais. O harness guarda a mensagem numa fila e
            a acrescenta ao histórico antes da próxima chamada:
          </p>
          <Codigo rotulo="O laço do post 1, com a fila">{FILA}</Codigo>
          <p>O que muda de uma ferramenta para outra é o momento em que a mensagem entra e o nome que ela recebe:</p>
          <ul>
            <li>
              <strong>Claude Code:</strong> o guia tem uma seção chamada <q>Interrupt and steer</q>. Enter põe a mensagem
              na fila, e ela é lida quando as ferramentas em execução terminam, ainda no mesmo turno. Esc para na hora.
            </li>
            <li>
              <strong>Codex CLI:</strong> a documentação usa o verbo, <q>steer the active turn</q>.
            </li>
            <li>
              <strong>Cursor CLI:</strong> Enter manda a mensagem para a execução em andamento num ponto seguro. Um
              segundo Enter interrompe.
            </li>
            <li>
              <strong>Gemini CLI:</strong> <q>model steering</q> é um recurso experimental, desligado por padrão. O que
              você digita vira uma dica entregue no começo do próximo turno.
            </li>
          </ul>
          <p>
            Corrigir não apaga nada. A tentativa errada continua no histórico, ocupando contexto, e a sua mensagem só se
            soma a ela. Por isso, quando o agente já avançou muito pelo caminho errado, voltar a um ponto anterior ou
            começar de novo pode sair melhor do que corrigir.
          </p>
        </Parte>

        <Parte id="arquivos">
          <p>
            No Kiro, o editor de agentes da AWS, <em>steering</em> é outra coisa: arquivos Markdown com as regras do
            projeto, na pasta <code>.kiro/steering/</code>. É a mesma ideia do <code>CLAUDE.md</code>: texto que volta
            para o pedido, como o <a href="/memoria-de-ia/">post sobre memória</a> mostra.
          </p>
          <p>A diferença é que cada arquivo diz, no início, quando deve entrar:</p>
          <Codigo rotulo=".kiro/steering/componentes.md">{REGRA_DO_KIRO}</Codigo>
          <p>
            São quatro modos: <code>always</code> (sempre, o padrão), <code>fileMatch</code> (quando o trabalho envolve
            arquivos que combinam com o padrão), <code>manual</code> (quando você cita o arquivo no chat) e{' '}
            <code>auto</code> (quando o pedido combina com a descrição do arquivo).
          </p>
          <p>
            A palavra é nova, o mecanismo não. E, como todo texto no pedido, a regra orienta o modelo, mas não garante
            que ele vá obedecer.
          </p>
        </Parte>

        <Parte id="dentro">
          <p>
            Na pesquisa de interpretabilidade, a área que tenta entender o que acontece dentro de um modelo,{' '}
            <em>steering</em> não tem a ver com texto. Enquanto o modelo gera a resposta, cada token passa por camadas de
            números, as <em>ativações</em>. O steering muda esses números no meio da conta.
          </p>
          <p>
            Um dos métodos conhecidos é a Contrastive Activation Addition, de 2023, testada no Llama 2 Chat. Ela funciona
            em dois passos:
          </p>
          <ol>
            <li>
              <strong>Calcular o vetor.</strong> Junte pares de exemplos, um com um comportamento e outro sem ele, e tire
              a média da diferença entre as ativações de cada par.
            </li>
            <li>
              <strong>Somar o vetor.</strong> Na hora de responder, some esse vetor às ativações em cada token depois do
              pedido. Um coeficiente positivo ou negativo aumenta ou reduz o comportamento.
            </li>
          </ol>
          <p>
            O exemplo mais famoso é o Golden Gate Claude, de maio de 2024. A Anthropic mapeou no Claude 3 Sonnet uma
            característica interna ligada à ponte Golden Gate e aumentou a força dela. O modelo passou a puxar quase
            todo assunto para a ponte. O pedido era o de sempre, e nenhuma instrução mandava falar dela. A demonstração
            ficou no ar por 24 horas.
          </p>
          <p>
            Você não faz isso de um agente de código. É preciso acesso às ativações durante a execução, o que na prática
            quer dizer rodar um modelo de pesos abertos. Por uma API comum, você só manda texto.
          </p>
        </Parte>

        <Parte id="qual-deles">
          <p>A pergunta que resolve a confusão é: o que está sendo mudado?</p>
          <div className="rolagem-x">
            <table className="quadro quadro-texto">
              <thead>
                <tr>
                  <th>O sentido</th>
                  <th>Onde atua</th>
                  <th>Quem usa</th>
                </tr>
              </thead>
              <tbody>
                {SENTIDOS.map((linha) => (
                  <tr key={linha.nome}>
                    <th>{linha.nome}</th>
                    <td>{linha.onde}</td>
                    <td>{linha.quem}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Se alguém promete <q>steering</q> numa ferramenta de código, quase certamente é um dos dois primeiros, e aí
            vale o que já vale para qualquer texto no pedido: ajuda, ocupa contexto e não dá garantia. Um artigo sobre
            steering, por outro lado, provavelmente fala do terceiro.
          </p>
        </Parte>

        <section className="secao" id="resumo">
          <h2>Em resumo</h2>
          <ul>
            <li>
              <strong>Nos agentes de código:</strong> steering é corrigir o agente enquanto ele trabalha. A correção é uma
              mensagem a mais no histórico.
            </li>
            <li>
              <strong>No Kiro:</strong> são arquivos de regras, como o <code>CLAUDE.md</code>, com um modo que diz quando
              entram.
            </li>
            <li>
              <strong>Na pesquisa:</strong> é somar um vetor às ativações, mudando a conta do modelo, sem mudar o texto do
              pedido.
            </li>
          </ul>
        </section>

        <footer className="rodape" id="fontes">
          <h2>Para ir mais fundo</h2>
          <p>As fontes deste texto, todas abertas, conferidas em 31 de outubro de 2026.</p>
          <ul>
            {FONTES.map((fonte) => (
              <li key={fonte.url}>
                <a href={fonte.url} target="_blank" rel="noreferrer">
                  {fonte.nome}
                </a>
                : {fonte.detalhe}
              </li>
            ))}
          </ul>
          <LinkDoGlossario />
          <ComoFoiFeito />
        </footer>
      </main>
    </>
  )
}
