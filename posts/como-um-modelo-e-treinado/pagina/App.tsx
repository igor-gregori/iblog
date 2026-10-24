import { Codigo } from '#base/Codigo.tsx'
import { ComoFoiFeito } from '#base/ComoFoiFeito.tsx'
import { LinkDoGlossario } from '#base/LinkDoGlossario.tsx'
import { partes } from '#base/Partes.tsx'
import { Topo } from '#base/Topo.tsx'
import { Brinquedo } from './components/Brinquedo.tsx'

/** As partes do artigo, na ordem em que aparecem; o sumário aponta para elas. */
const PARTES = [
  { id: 'pesos', titulo: 'O que o treino produz: uma lista enorme de números' },
  { id: 'pre-treino', titulo: 'Pré-treino: prever o próximo token em quase tudo' },
  { id: 'ajuste-fino', titulo: 'Ajuste fino: de autocompletar a assistente' },
  { id: 'reforco', titulo: 'Aprendizado por reforço: aprender com nota' },
  { id: 'na-pratica', titulo: 'O que isso explica no dia a dia' },
] as const

const { Parte, Ver } = partes(PARTES)

const FONTES = [
  {
    nome: 'Deep Dive into LLMs like ChatGPT (Andrej Karpathy, 2025)',
    detalhe: 'as três etapas do treino, explicadas em vídeo do começo ao fim',
    url: 'https://www.youtube.com/watch?v=7xTGNNLPyMI',
  },
  {
    nome: 'Training language models to follow instructions with human feedback (OpenAI, 2022)',
    detalhe: 'o InstructGPT: ajuste fino e aprendizado por reforço com preferências de pessoas',
    url: 'https://arxiv.org/abs/2203.02155',
  },
  {
    nome: 'Constitutional AI (Anthropic, 2022)',
    detalhe: 'comparações feitas por um modelo, guiado por uma lista de princípios',
    url: 'https://arxiv.org/abs/2212.08073',
  },
  {
    nome: 'DeepSeek-R1 (DeepSeek, 2025)',
    detalhe: 'o raciocínio aprendido só com reforço e recompensas verificáveis',
    url: 'https://arxiv.org/abs/2501.12948',
  },
  {
    nome: 'Monitoring Reasoning Models for Misbehavior (OpenAI, 2025)',
    detalhe: 'reward hacking em tarefas de código feitas por agentes',
    url: 'https://arxiv.org/abs/2503.11926',
  },
  {
    nome: 'Towards Understanding Sycophancy in Language Models (Anthropic, 2023)',
    detalhe: 'a bajulação nos assistentes e a relação dela com as preferências de pessoas',
    url: 'https://arxiv.org/abs/2310.13548',
  },
]

const EXEMPLO_DE_AJUSTE = `{
  "mensagens": [
    { "papel": "sistema", "conteudo": "Você é um assistente de programação." },
    { "papel": "usuario", "conteudo": "Como leio o JSON do corpo da requisição no Express?" },
    { "papel": "assistente", "conteudo": "Registre o middleware express.json() e leia req.body: ..." }
  ]
}`

const RECOMPENSA = `// Uma tarefa: um repositório, um pedido e testes que o modelo não vê.
async function recompensa(tarefa: Tarefa, modelo: Agente): Promise<number> {
  const repo = await tarefa.clonarRepositorio()
  await modelo.trabalhar(repo, tarefa.pedido) // o laço do agente, com ferramentas
  const resultado = await rodarTestes(repo, tarefa.testesOcultos)
  return resultado.falharam === 0 ? 1 : 0
}`

const EXPLICACOES = [
  {
    caso: 'Escreve Express e React com segurança e tropeça na biblioteca nova',
    etapa: 'Pré-treino',
    oQueFazer: 'Ponha a documentação ou exemplos da biblioteca no contexto, ou deixe o agente buscar.',
  },
  {
    caso: 'Usa uma API que mudou na versão que você instalou',
    etapa: 'Pré-treino',
    oQueFazer: 'Escreva as versões no CLAUDE.md e peça para ele conferir o package.json antes.',
  },
  {
    caso: 'Inventa uma função que parece real',
    etapa: 'Pré-treino',
    oQueFazer: 'Dê um jeito de conferir: checar os tipos, rodar os testes, ler o código em node_modules.',
  },
  {
    caso: 'Escreve no estilo mais comum, não no do seu projeto',
    etapa: 'Pré-treino',
    oQueFazer: 'Aponte um arquivo do projeto como exemplo e escreva as convenções no CLAUDE.md.',
  },
  {
    caso: 'Segue instruções e pede ferramentas no formato certo',
    etapa: 'Ajuste fino',
    oQueFazer: 'Nada: é essa etapa que faz o resto funcionar.',
  },
  {
    caso: 'Concorda com você rápido demais',
    etapa: 'Reforço',
    oQueFazer: 'Peça críticas e alternativas antes da solução; desconfie de “ótima ideia”.',
  },
  {
    caso: 'Muda o teste para ele passar',
    etapa: 'Reforço',
    oQueFazer: 'Diga no CLAUDE.md que teste não se mexe sem pedir, e leia o diff dos testes.',
  },
]

export default function App() {
  return (
    <>
      <Topo />
      <main className="artigo" id="inicio">
        <header className="abertura">
          <p className="sobretitulo">IA para quem já programa · 2</p>
          <h1>Como um modelo é treinado?</h1>
          <p className="subtitulo">
            Por que ele conhece o Express melhor que a biblioteca lançada mês passado, por que inventa funções que parecem
            certas e por que ficou tão bom justamente em código. As três etapas do treino, em linguagem de dev.
          </p>
          <p className="assinatura">Igor Gregori · Outubro de 2026</p>
        </header>

        <div className="texto">
          <p>
            No <a href="/modelo-agente-harness/">post anterior</a>, o modelo apareceu como uma função: entra texto, sai
            texto. Este post abre a função. Não para ensinar a treinar um modelo, que só as grandes empresas conseguem
            pagar, mas porque muitos comportamentos estranhos de um agente de código vêm de uma etapa do treino, e saber
            qual ajuda a contornar.
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

        <Parte id="pesos">
          <p>
            Um modelo é uma função com bilhões de parâmetros, os <em>pesos</em>. A arquitetura, o código da função, é
            parecida entre os modelos e cabe em algumas centenas de linhas. O que faz um modelo saber programar são os
            valores dos pesos, e o treino é o processo que encontra esses valores.
          </p>
          <p>O jeito de encontrar é sempre o mesmo, e lembra um teste que roda bilhões de vezes:</p>
          <ul>
            <li>o modelo recebe um trecho de texto e prevê o próximo token;</li>
            <li>a previsão é comparada com o token que veio de verdade, e a diferença é o erro;</li>
            <li>
              cada peso é ajustado um pouquinho na direção que diminui esse erro (a conta que diz a direção se chama{' '}
              <em>gradiente</em>);
            </li>
            <li>e tudo se repete com o trecho seguinte, por trilhões de tokens.</li>
          </ul>
          <p>
            Depois do treino, os pesos são congelados. É esse arquivo de pesos que roda quando você chama a API, e por
            isso o modelo não aprende com o uso: nada numa chamada muda os pesos. Também não existe, lá dentro, um banco
            de dados com os textos lidos. O que fica é uma espécie de estatística comprimida do que o modelo leu: o que
            costuma vir depois do quê.
          </p>
        </Parte>

        <Parte id="pre-treino">
          <p>
            A primeira etapa, e de longe a mais cara, é o pré-treino. O modelo lê uma quantidade enorme de texto: páginas
            da web, livros, artigos científicos e muito código público, como os repositórios abertos do GitHub. A tarefa é
            uma só, prever o próximo token. O próprio texto traz a resposta certa (o token seguinte), então ninguém
            precisa rotular nada.
          </p>
          <p>
            Para prever bem o próximo token de um código, o modelo precisa captar, de algum jeito, a sintaxe da
            linguagem, as APIs mais usadas e os padrões de quem escreve. Ninguém ensina essas coisas diretamente; elas
            aparecem porque ajudam a prever.
          </p>
          <p>
            Dá para sentir isso num modelo de brinquedo. O de baixo não tem pesos: ele só conta, num texto de treino com
            código de servidor, qual token veio depois de cada par de tokens. Troque o texto de treino e veja a previsão
            mudar.
          </p>
          <Brinquedo />
          <p>Três coisas do mundo real aparecem nesse brinquedo.</p>
          <ul>
            <li>
              <strong>A data de corte.</strong> Até o corte, a velox não existe para o modelo: depois de{' '}
              <code>app.</code>, ele nunca vai sugerir <code>rota</code>. Um modelo de verdade também só sabe o que estava
              no texto de treino, que foi coletado até uma data.
            </li>
            <li>
              <strong>A popularidade pesa.</strong> Com um exemplo da velox, <code>rota</code> aparece, mas com pouca
              chance contra <code>get</code>, que o texto mostra várias vezes. Com dez exemplos, vira a mais provável. Por
              isso o modelo escreve Express e React com segurança e tropeça na biblioteca que tem pouco código público.
            </li>
            <li>
              <strong>Provável não é o mesmo que certo.</strong> O brinquedo prevê o que costuma vir depois, sem saber se a
              função existe. Um modelo grande faz o mesmo em outra escala: quando ele inventa um método que parece real, é
              porque aquele nome é provável naquele lugar.
            </li>
          </ul>
          <p>
            Um modelo de verdade olha o contexto inteiro, não só os dois últimos tokens, e não guarda contagens: os pesos
            generalizam, e ele consegue escrever código que nunca viu. Mas o objetivo do treino é o mesmo do brinquedo.
          </p>
          <p>
            O resultado do pré-treino é um <em>modelo base</em>. Ele completa texto muito bem, mas não conversa: se você
            escreve uma pergunta, ele pode continuar com mais perguntas, como se estivesse completando a lista de um
            fórum.
          </p>
        </Parte>

        <Parte id="ajuste-fino">
          <p>
            A segunda etapa ensina o modelo base a se comportar como assistente. O treino continua sendo prever o próximo
            token, mas o texto agora é escolhido a dedo: conversas de exemplo, com um pedido e uma boa resposta, escritas
            por pessoas contratadas para isso e, cada vez mais, geradas por outros modelos e revisadas. O volume é bem
            menor que o do pré-treino. O nome técnico é <em>ajuste fino supervisionado</em>.
          </p>
          <p>Um exemplo de treino se parece com isto:</p>
          <Codigo rotulo="Um exemplo de ajuste fino (ilustrativo)">{EXEMPLO_DE_AJUSTE}</Codigo>
          <p>
            Antes de entrar no treino, a conversa vira um texto só, com marcadores especiais separando os papéis, e o
            modelo aprende a prever a parte do assistente. É daí que vêm os papéis de sistema, usuário e assistente que
            aparecem em toda API de modelo. É nessa etapa também, e na seguinte, que o modelo aprende o formato de pedido
            de ferramenta do post anterior: os exemplos incluem respostas que pedem uma ferramenta e mensagens com o
            resultado.
          </p>
        </Parte>

        <Parte id="reforco">
          <p>
            O ajuste fino ensina a imitar boas respostas. A terceira etapa ensina a buscar respostas melhores. Em vez de
            um texto pronto para copiar, o modelo gera várias respostas, cada uma recebe uma nota, e os pesos são
            ajustados para tornar mais prováveis as respostas de nota alta. É o <em>aprendizado por reforço</em>, e a nota
            pode vir de dois lugares.
          </p>
          <p>
            <strong>De preferências.</strong> Pessoas comparam duas respostas e dizem qual é melhor. Com muitas dessas
            comparações, treina-se um segundo modelo que dá a nota sozinho, e o modelo principal é otimizado para agradar
            esse avaliador. É o RLHF, aprendizado por reforço com retorno humano, a técnica por trás do InstructGPT, o
            antecessor do ChatGPT. A Anthropic usa uma variação em que parte das comparações é feita por um modelo, guiado
            por uma lista de princípios escrita em texto, a <q>constituição</q>.
          </p>
          <p>
            <strong>De uma verificação automática.</strong> Em matemática e em código, dá para conferir a resposta sem
            perguntar a ninguém: o resultado bate, o código compila, os testes passam. Para um dev, a recompensa é só uma
            função:
          </p>
          <Codigo rotulo="Uma recompensa verificável, simplificada">{RECOMPENSA}</Codigo>
          <p>
            Repare que o modelo trabalha dentro de um laço de agente, o mesmo do post anterior: lê arquivos, roda comandos
            e só recebe a nota no fim. Treinar assim, em muitas tarefas, é um dos motivos de os modelos terem melhorado
            tanto em código e em tarefas de agente. É também de onde vem o raciocínio: o DeepSeek-R1 mostrou que,
            recompensando só a resposta certa, o modelo aprende sozinho a escrever um raciocínio longo antes de responder,
            conferindo o próprio trabalho e mudando de estratégia.
          </p>
          <p>
            A nota tem efeitos colaterais. Se a verificação tem um buraco, o modelo aprende a explorar o buraco. A OpenAI
            descreveu modelos que, em tarefas de código, achavam jeitos de fazer a verificação passar sem resolver o
            problema; o nome disso é <em>reward hacking</em>. No dia a dia, aparece como o agente que muda o teste em vez
            do código. Com as preferências, o efeito é outro: pessoas tendem a preferir respostas que concordam com elas,
            e os modelos aprendem a bajular. Um estudo da Anthropic encontrou esse viés em cinco assistentes da época.
          </p>
        </Parte>

        <Parte id="na-pratica">
          <p>Cada etapa deixa marcas que aparecem no trabalho com um agente de código, e cada marca tem um contorno:</p>
          <div className="rolagem-x">
            <table className="quadro quadro-texto">
              <thead>
                <tr>
                  <th>O que acontece</th>
                  <th>Etapa</th>
                  <th>O que fazer</th>
                </tr>
              </thead>
              <tbody>
                {EXPLICACOES.map((linha) => (
                  <tr key={linha.caso}>
                    <th>{linha.caso}</th>
                    <td>
                      <span className="selo">{linha.etapa}</span>
                    </td>
                    <td>{linha.oQueFazer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Quase tudo o que dá para fazer está do lado de fora do modelo: no contexto, nas ferramentas e nas regras do
            harness. É o mesmo ponto da tabela de culpas do post anterior, visto de outro ângulo. A <Ver id="pre-treino" />{' '}
            explica a maior parte das linhas, e não por acaso: é a etapa que decide o que o modelo sabe.
          </p>
        </Parte>

        <section className="secao" id="resumo">
          <h2>Em resumo</h2>
          <ul>
            <li>
              <strong>Pré-treino:</strong> prever o próximo token em muito texto. Dá o conhecimento, a data de corte e a
              preferência pelo que é popular.
            </li>
            <li>
              <strong>Ajuste fino:</strong> conversas de exemplo. Dá o jeito de assistente e o formato dos pedidos de
              ferramenta.
            </li>
            <li>
              <strong>Reforço:</strong> notas, de pessoas ou de verificações. Dá o raciocínio e a habilidade em tarefas que
              dá para conferir, e também a bajulação e a tentação de mexer no teste.
            </li>
          </ul>
          <p>Os próximos posts voltam para o lado de fora do modelo: a sessão, o token e o contexto.</p>
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
          <LinkDoGlossario />
          <ComoFoiFeito />
        </footer>
      </main>
    </>
  )
}
