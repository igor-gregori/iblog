import { Codigo } from '#base/Codigo.tsx'
import { ComoFoiFeito } from '#base/ComoFoiFeito.tsx'
import { partes } from '#base/Partes.tsx'
import { Topo } from '#base/Topo.tsx'
import { Laco } from './components/Laco.tsx'

/** As partes do artigo, na ordem em que aparecem; o sumário aponta para elas. */
const PARTES = [
  { id: 'modelo', titulo: 'O modelo: uma função que só devolve texto' },
  { id: 'harness', titulo: 'O harness: o programa em volta do modelo' },
  { id: 'agente', titulo: 'O agente: o modelo num laço' },
  { id: 'culpa', titulo: 'Quando dá errado, de quem é a culpa?' },
  { id: 'na-pratica', titulo: 'O que isso muda no dia a dia' },
] as const

const { Parte, Ver } = partes(PARTES)

const FONTES = [
  {
    nome: 'Como o Claude Code funciona',
    detalhe: 'a documentação do Claude Code: o laço do agente e o termo harness',
    url: 'https://code.claude.com/docs/en/how-claude-code-works',
  },
  {
    nome: 'Building effective agents (Anthropic, 2024)',
    detalhe: 'a definição de agente e os padrões mais simples que funcionam',
    url: 'https://www.anthropic.com/engineering/building-effective-agents',
  },
  {
    nome: 'Uso de ferramentas na API da Anthropic',
    detalhe: 'o formato dos pedidos de ferramenta e dos resultados',
    url: 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview',
  },
  {
    nome: 'Terminal-Bench',
    detalhe: 'ranking de agentes em tarefas de terminal, com cada resultado por par de modelo e agente',
    url: 'https://www.tbench.ai/',
  },
]

const RESPOSTA_COM_FERRAMENTA = `{
  "stop_reason": "tool_use",
  "content": [
    { "type": "text", "text": "Vou rodar os testes para ver o erro." },
    {
      "type": "tool_use",
      "id": "toolu_01",
      "name": "rodar_comando",
      "input": { "comando": "npm test" }
    }
  ]
}`

const LACO = `const historico: Mensagem[] = [{ papel: 'usuario', conteudo: pedido }]

while (true) {
  const resposta = await modelo.responder({ instrucoes, ferramentas, historico })
  historico.push({ papel: 'assistente', conteudo: resposta.conteudo })

  const pedidos = resposta.conteudo.filter((bloco) => bloco.tipo === 'ferramenta')
  if (pedidos.length === 0) break // respondeu só com texto: acabou

  const resultados = []
  for (const p of pedidos) {
    const permitido = await permissoes.conferir(p) // pode perguntar a você
    const saida = permitido ? await executar(p) : 'O usuário não permitiu.'
    resultados.push({ tipo: 'resultado', id: p.id, saida })
  }
  historico.push({ papel: 'usuario', conteudo: resultados })
}`

const CULPAS = [
  {
    caso: 'Inventou uma função que não existe na biblioteca',
    quem: 'Modelo',
    porque:
      'Previu um código plausível. O harness ajuda quando dá ao modelo um jeito de conferir: checar os tipos, rodar os testes, ler o código da biblioteca.',
  },
  {
    caso: 'Não conhece a versão nova de um framework',
    quem: 'Modelo',
    porque: 'O que ele sabe parou na data de corte do treino. O harness compensa se deixar o modelo buscar a documentação.',
  },
  {
    caso: 'Rodou um comando destrutivo sem perguntar',
    quem: 'Harness',
    porque: 'O modelo só pediu. Quem deixou rodar foram as permissões, que são configuração do harness (e às vezes sua).',
  },
  {
    caso: 'Esqueceu algo combinado uma hora antes',
    quem: 'Harness',
    porque: 'A conversa ficou grande demais e foi resumida. Quem resume, e escolhe o que guardar, é o harness.',
  },
  {
    caso: 'Ignorou uma regra do CLAUDE.md',
    quem: 'Os dois',
    porque:
      'O harness pode não ter carregado o arquivo, ou ele ficou perdido num contexto enorme; o modelo pode só não ter seguido. Confira primeiro se o arquivo foi carregado.',
  },
  {
    caso: 'Leu quarenta arquivos para mudar uma linha',
    quem: 'Os dois',
    porque: 'Quem decidiu ler foi o modelo. Quais ferramentas de busca ele tinha, e como estavam descritas, é do harness.',
  },
  {
    caso: 'A mesma pergunta deu duas respostas diferentes',
    quem: 'Modelo',
    porque: 'A geração tem uma parte de sorteio: entre os próximos tokens prováveis, o modelo escolhe um.',
  },
]

export default function App() {
  return (
    <>
      <Topo />
      <main className="artigo" id="inicio">
        <header className="abertura">
          <p className="sobretitulo">IA para quem já programa · 1</p>
          <h1>Modelo, agente e harness: quem faz o quê?</h1>
          <p className="subtitulo">
            Quando um agente de código apaga o arquivo errado, quem errou: o modelo ou a ferramenta? Separar as três
            peças explica quase tudo o que um agente faz de bom e de ruim.
          </p>
          <p className="assinatura">Igor Gregori · Outubro de 2026</p>
        </header>

        <div className="texto">
          <p>
            Claude Code, Cursor, Codex, Copilot: quem usa essas ferramentas no dia a dia costuma falar delas como uma
            coisa só, <q>a IA</q>. Mas cada uma é a soma de três peças, e as dúvidas práticas (por que ele ignorou o meu
            CLAUDE.md? por que gastou tanto? por que rodou aquele comando?) só têm resposta quando se sabe qual peça fez
            o quê.
          </p>
          <p>
            Este é o primeiro post de uma série para quem já programa e quer usar IA para trabalhar melhor. Ele monta o
            vocabulário que os outros vão usar: o modelo, o harness e o agente.
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

        <Parte id="modelo">
          <p>
            O modelo, como o Claude ou o GPT, é uma rede neural treinada para uma tarefa só: dado um texto, prever o
            pedaço seguinte. Esse pedaço se chama <em>token</em>: uma palavra curta, parte de uma palavra ou um sinal.
            Para escrever uma resposta, o modelo prevê um token, junta ao texto, prevê o próximo, e assim até decidir
            parar.
          </p>
          <p>
            Para quem é de backend, ajuda pensar nele como uma função pura atrás de uma API HTTP: entra texto, sai
            texto. Ela não tem estado nem efeito colateral.
          </p>
          <ul>
            <li>
              <strong>Não lembra de nada.</strong> Cada chamada começa do zero. Se a conversa parece contínua, é porque
              alguém reenvia a conversa inteira a cada mensagem.
            </li>
            <li>
              <strong>Não lê arquivos nem roda comandos.</strong> Não tem acesso ao seu disco, ao terminal ou à
              internet.
            </li>
            <li>
              <strong>Não muda com o uso.</strong> O que o modelo sabe foi fixado no treino, que tem uma data de corte.
              Usar não ensina nada a ele.
            </li>
          </ul>
          <p>
            Isso não quer dizer que o modelo seja a parte simples. É dele o trabalho difícil: entender o pedido e o
            código e decidir o próximo passo. Mas tudo o que envolve o mundo fora do texto é feito por outra peça.
          </p>
        </Parte>

        <Parte id="harness">
          <p>
            <em>Harness</em>, em inglês, é o arreio: a estrutura que prende o cavalo e leva a força dele para algum
            lugar. Num agente de código, é o programa que você instala e que chama o modelo. A documentação do Claude
            Code usa o termo assim: o Claude Code é a camada em volta do modelo, que fornece as ferramentas e cuida do
            contexto que o modelo vê.
          </p>
          <p>O harness faz tudo o que o modelo não faz:</p>
          <ul>
            <li>
              <strong>Monta o pedido.</strong> Junta as instruções dele, o seu <code>CLAUDE.md</code> ou{' '}
              <code>AGENTS.md</code>, a descrição das ferramentas, o histórico e a sua mensagem, e manda para a API.
            </li>
            <li>
              <strong>Executa as ferramentas.</strong> Lê e edita arquivos, roda comandos, busca no código, abre uma
              página. É ele quem tem acesso à sua máquina.
            </li>
            <li>
              <strong>Decide o que pode.</strong> As permissões são dele: o que roda direto, o que precisa da sua
              aprovação, o que é proibido.
            </li>
            <li>
              <strong>Cuida do contexto.</strong> Quando a conversa fica grande demais para o modelo, é o harness que
              resume ou descarta partes dela.
            </li>
            <li>
              <strong>Guarda a sessão.</strong> Salva o histórico para você retomar depois, mostra o progresso e registra
              o custo.
            </li>
          </ul>
          <p>
            Claude Code, Cursor, Codex CLI, o modo agente do Copilot, Aider e Cline são harnesses. Vários deixam você
            escolher o modelo, e o mesmo modelo pode rodar dentro de todos eles.
          </p>
          <p>
            Se o modelo só escreve, como ele <q>usa</q> uma ferramenta? Escrevendo um pedido num formato combinado. Em
            cada chamada, o harness descreve as ferramentas disponíveis: o nome, para que servem e os parâmetros, num
            JSON Schema. Quando o modelo quer usar uma, a resposta vem assim:
          </p>
          <Codigo rotulo="Resposta da API (resumida)">{RESPOSTA_COM_FERRAMENTA}</Codigo>
          <p>
            Esse é o formato da API da Anthropic, um pouco resumido; os outros fornecedores usam formatos parecidos. O
            modelo parou de escrever e devolveu um pedido. Quem decide se o comando roda, e o roda, é o harness. O
            resultado volta para o modelo na chamada seguinte, como uma mensagem nova.
          </p>
        </Parte>

        <Parte id="agente">
          <p>
            Agente é o nome do conjunto funcionando: o modelo chamado várias vezes seguidas, com ferramentas, até a
            tarefa acabar. A definição da Anthropic é curta: agentes costumam ser apenas modelos que usam ferramentas,
            guiados pelo retorno do ambiente, num laço.
          </p>
          <p>Sem os detalhes, o laço de um agente de código cabe em poucas linhas de TypeScript:</p>
          <Codigo rotulo="O laço do agente, simplificado">{LACO}</Codigo>
          <p>
            O modelo decide o que fazer, o harness faz e devolve o resultado, e o laço só para quando o modelo responde
            sem pedir nada. Um harness de verdade acrescenta muita coisa em volta (resumo do contexto, subagentes,
            interrupção, ganchos antes e depois de cada ferramenta), mas o centro é esse.
          </p>
          <p>
            Veja o laço numa tarefa pequena. Avance os passos e acompanhe, no quadro do histórico, o que o modelo recebe
            a cada chamada.
          </p>
          <Laco />
          <p>
            Duas coisas aparecem aqui e voltam várias vezes nesta série. A primeira: <strong>o histórico só cresce</strong>.
            A quinta chamada leva tudo o que as quatro anteriores levaram, e mais um pouco. É por isso que uma sessão
            longa custa mais a cada mensagem e que o contexto enche. A segunda:{' '}
            <strong>o modelo nunca tocou na sua máquina</strong>. Cada efeito real passou pelo harness, inclusive a
            pergunta que ele fez a você.
          </p>
        </Parte>

        <Parte id="culpa">
          <p>
            Saber qual peça fez o quê troca a pergunta <q>a IA errou?</q> por <q>o que falhou?</q>. Alguns casos comuns:
          </p>
          <div className="rolagem-x">
            <table className="quadro quadro-texto">
              <thead>
                <tr>
                  <th>O que aconteceu</th>
                  <th>Quem</th>
                  <th>Por quê</th>
                </tr>
              </thead>
              <tbody>
                {CULPAS.map((linha) => (
                  <tr key={linha.caso}>
                    <th>{linha.caso}</th>
                    <td>
                      <span className="selo">{linha.quem}</span>
                    </td>
                    <td>{linha.porque}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Repare que o modelo aparece sozinho nos erros de conhecimento e de sorteio, e o harness aparece sozinho nos
            erros de efeito e de memória. Os casos mais irritantes do dia a dia, como a regra ignorada e a leitura sem
            fim, costumam ser dos dois.
          </p>
        </Parte>

        <Parte id="na-pratica">
          <p>
            <strong>O mesmo modelo rende diferente em harnesses diferentes.</strong> As instruções, as ferramentas e o
            jeito de cuidar do contexto mudam o resultado. Por isso rankings de agentes como o Terminal-Bench listam cada
            resultado como um par, modelo e agente. Quando alguém disser que <q>a ferramenta X é melhor</q>, vale
            perguntar se é o modelo ou o harness.
          </p>
          <p>
            <strong>Quase tudo o que você controla é do harness.</strong> O modelo você só escolhe. O resto você
            configura: o que entra no contexto (o <code>CLAUDE.md</code>, os arquivos que cita), quais ferramentas o
            modelo tem (servidores MCP, skills), o que roda sem perguntar e o que acontece antes e depois de cada passo
            (os hooks). Boa parte desta série é sobre essas escolhas, e se elas compensam.
          </p>
          <p>
            <strong>Trocar de modelo e trocar de ferramenta são decisões diferentes.</strong> Um modelo mais forte acerta
            mais o próximo passo; um harness melhor dá a ele o contexto e as ferramentas certas. Às vezes o problema é
            um, às vezes o outro, e a tabela da <Ver id="culpa" /> ajuda a saber qual.
          </p>
        </Parte>

        <section className="secao" id="resumo">
          <h2>Em resumo</h2>
          <ul>
            <li>
              <strong>Modelo:</strong> a função que recebe texto e devolve texto. Não tem memória e não alcança a sua
              máquina.
            </li>
            <li>
              <strong>Harness:</strong> o programa em volta. Monta o contexto, executa as ferramentas, aplica as
              permissões e guarda a sessão.
            </li>
            <li>
              <strong>Agente:</strong> o modelo e o harness num laço, até o modelo responder sem pedir ferramenta.
            </li>
          </ul>
          <p>
            Os próximos posts partem daqui: o que é uma sessão, quanto custa um token e por que o contexto enche.
          </p>
        </section>

        <footer className="rodape" id="fontes">
          <h2>Para ir mais fundo</h2>
          <p>As fontes deste texto, todas abertas.</p>
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
          <ComoFoiFeito />
        </footer>
      </main>
    </>
  )
}
