import { useMemo } from 'react'
import { ComoFoiFeito } from '#base/ComoFoiFeito.tsx'
import { LinkDoGlossario } from '#base/LinkDoGlossario.tsx'
import { FontesEMetodo } from '#base/FontesEMetodo.tsx'
import { dolares, numero, pct, tokens } from '#base/formato.ts'
import { partes } from '#base/Partes.tsx'
import { custoComFaixas } from '#base/precos.ts'
import { Topo } from '#base/Topo.tsx'
import { useJson } from '#base/useJson.ts'
import { Calculadora } from './components/Calculadora.tsx'
import { Janela } from './components/Janela.tsx'
import { CORES, janelaPorExtenso, preco, SAIDA, urlDosDados, type Categoria, type Composicao, type Dados } from './dados.ts'
import { ANALISE, FONTES } from './fontes.ts'

/** As partes do artigo, na ordem em que aparecem; o sumário aponta para elas. */
const PARTES = [
  { id: 'janela', titulo: 'Um limite por chamada' },
  { id: 'o-que-enche', titulo: 'O que enche a janela' },
  { id: 'caber', titulo: 'Caber não é o mesmo que usar bem' },
  { id: 'custo', titulo: 'Contexto longo também custa' },
  { id: 'compactacao', titulo: 'Quando a janela enche' },
  { id: 'na-pratica', titulo: 'O que fazer com isso' },
] as const

const { Parte, Ver } = partes(PARTES)

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

/** "2026-10-22" → "22 de outubro de 2026" */
function diaPorExtenso(data: string) {
  const [ano, mes, dia] = data.split('-').map(Number)
  return `${dia} de ${MESES[mes - 1]} de ${ano}`
}

/** 1.25 → "1,25"; 2 → "2" */
const MULTIPLICADOR = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })

/** O tamanho do contexto na calculadora antes de o leitor mexer: acima das duas faixas longas. */
const CONTEXTO_INICIAL = 300_000

export default function App() {
  const { dados, erro } = useJson<Dados>(urlDosDados)
  return (
    <>
      <Topo />
      {dados ? (
        <Artigo dados={dados} />
      ) : (
        <main className="artigo">
          <p className="aviso">{erro ? `Não foi possível carregar os dados (${erro}).` : 'Carregando os dados…'}</p>
        </main>
      )}
    </>
  )
}

/** Tudo o que entrou de um tipo ao longo da sessão: a soma das subidas, chamada a chamada (a compactação zera). */
function entrouNaSessao(composicao: Composicao[], categoria: Categoria) {
  return composicao.reduce((total, c, i) => total + (i > 0 ? Math.max(0, c[categoria] - composicao[i - 1][categoria]) : c[categoria]), 0)
}

function Artigo({ dados }: { dados: Dados }) {
  const consultadoEm = diaPorExtenso(dados.precos_consultados_em)
  const { calibracao, composicao } = dados

  // Os números do texto saem dos dados, para continuarem certos quando a sessão ou os preços mudarem.
  const conta = useMemo(() => {
    const modelo = preco(dados, dados.modelo_da_sessao)
    const maisCheia = composicao.reduce((a, b) => (b.contexto > a.contexto ? b : a))
    const depois = composicao.find((c, i) => i > 0 && c.contexto < composicao[i - 1].contexto)!
    const parte = (categoria: Categoria) => maisCheia[categoria] / maisCheia.contexto
    const janelas = dados.precos.map((p) => p.janela)
    const haiku = dados.precos.find((p) => p.modelo === 'claude-haiku-5-5')!
    const astra = dados.precos.find((p) => p.modelo === 'gpt-6-astra')!
    return {
      modelo,
      maisCheia,
      depois,
      ultima: composicao[composicao.length - 1],
      parte,
      raciocinio: 1 - calibracao.saida_visivel / calibracao.saida_total,
      porImagem: entrouNaSessao(composicao, 'imagens') / calibracao.imagens,
      porComando: entrouNaSessao(composicao, 'comandos') / calibracao.comandos,
      primeira: composicao[0].contexto,
      descartado: 1 - calibracao.compactacao_resumo / calibracao.compactacao_antes,
      janelaMin: Math.min(...janelas),
      janelaMax: Math.max(...janelas),
      haiku,
      astra,
      // Uma chamada com 900 mil tokens no modelo da sessão, lidos do cache e fora dele.
      grandeComCache: custoComFaixas(modelo, 900_000, SAIDA, 1),
      grandeSemCache: custoComFaixas(modelo, 900_000, SAIDA, 0),
      haikuAntes: custoComFaixas(haiku, haiku.limite_curto!, SAIDA, 0),
      haikuDepois: custoComFaixas(haiku, haiku.limite_curto! + 1, SAIDA, 0),
    }
  }, [dados, composicao, calibracao])

  const vezes = (a: number, b: number | null) => (b === null ? '' : `${MULTIPLICADOR.format(b / a)}×`)

  return (
    <main className="artigo" id="inicio">
      <header className="abertura">
        <p className="sobretitulo">IA para quem já programa · 5</p>
        <h1>O que é a janela de contexto, e por que o agente esquece no meio da tarefa?</h1>
        <p className="subtitulo">
          Os modelos de ponta aceitam cerca de 1 milhão de tokens por chamada. O que enche essa janela numa sessão real,
          por que caber não é o mesmo que ser bem usado, quanto custa um contexto longo e o que a compactação joga fora.
        </p>
        <p className="assinatura">Igor Gregori · Janelas e preços conferidos em {consultadoEm}</p>
      </header>

      <div className="texto">
        <p>
          O <a href="/o-que-e-uma-sessao/">post anterior</a> mostrou que o modelo não lembra de nada: a cada chamada, o
          agente manda a conversa inteira de novo, e ela só cresce. Este post olha o limite dessa conversa, a{' '}
          <em>janela de contexto</em>, e o que acontece perto dele, com os números da mesma sessão real.
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
          Depois delas: <a href="#resumo">o resumo</a>.
        </p>
      </nav>

      <Parte id="janela">
        <p>
          A janela de contexto é o tamanho máximo de uma chamada. Conta tudo o que vai no pedido (as instruções, as
          ferramentas, a conversa inteira, as imagens) e também o que o modelo escreve na resposta, com o raciocínio. O
          que não cabe nela não chega ao modelo.
        </p>
        <p>
          Nos {dados.precos.length} modelos do <a href="/quanto-custa-um-token/">post sobre tokens</a>, a janela vai de{' '}
          {janelaPorExtenso(conta.janelaMin)} a {janelaPorExtenso(conta.janelaMax)} de tokens. É muito: a sessão real deste post, oito horas
          de trabalho com um agente de código, chegou a {pct(conta.maisCheia.contexto / conta.modelo.janela)} da janela
          do {conta.modelo.nome}.
        </p>
        <div className="rolagem-x">
          <table className="quadro janelas">
            <caption className="ajuda">Nas páginas dos fornecedores em {consultadoEm}.</caption>
            <thead>
              <tr>
                <th>Modelo</th>
                <th>Janela</th>
                <th>Saída máxima</th>
                <th>Preço acima de um tamanho</th>
              </tr>
            </thead>
            <tbody>
              {dados.precos.map((p) => (
                <tr key={p.modelo}>
                  <th>
                    <span className="janelas-marca" style={{ background: CORES[p.fornecedor] }} aria-hidden="true" />
                    {p.nome}
                  </th>
                  <td>{numero(p.janela)}</td>
                  <td>{numero(p.saida_maxima)}</td>
                  <td>
                    {p.limite_curto === null ? (
                      'não muda'
                    ) : (
                      <>
                        acima de {tokens(p.limite_curto)}
                        <small>
                          entrada {vezes(p.entrada, p.entrada_longa)}, saída {vezes(p.saida, p.saida_longa)}
                        </small>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Por que existe um limite? Na arquitetura dos modelos atuais, o Transformer, cada token do contexto é comparado
          com todos os outros: com <var>n</var> tokens, são <var>n</var>² pares. Dobrar o contexto quadruplica essa conta,
          e o fornecedor ainda guarda na memória o que o modelo calculou para cada token (é isso que o{' '}
          <a href="/o-que-e-uma-sessao/#cache">cache de prompt</a> reaproveita). A janela é até onde o fornecedor se
          dispõe a levar essa conta.
        </p>
        <FontesEMetodo
          fontes={[FONTES.anthropicJanela, FONTES.anthropicModelos, FONTES.openaiModelos, FONTES.googleModelos, FONTES.transformer]}
          analise={[ANALISE.precos]}
          metodo={
            <>
              Janela e saída máxima transcritas das páginas de modelos de cada fornecedor em {consultadoEm}. A OpenAI dá a
              janela arredondada (1,05 milhão). No Gemini 4 Argon, a saída pode passar de 65.536 tokens num modo próprio
              para respostas longas, que fica de fora.
            </>
          }
        />
      </Parte>

      <Parte id="o-que-enche">
        <p>
          A sessão é a mesma do post anterior: a do Claude Code, em 18 de outubro de 2026, em que o design desta página foi
          escolhido. Desta vez, além do tamanho de cada pedido, o registro mostra do que ele era feito. Arraste para ver a
          janela enchendo, chamada a chamada:
        </p>
        <Janela composicao={composicao} janela={conta.modelo.janela} nomeDoModelo={conta.modelo.nome} />
        <p>
          Na chamada mais cheia, a {conta.maisCheia.chamada}, o pedido tinha {tokens(conta.maisCheia.contexto)} tokens:
        </p>
        <ul>
          <li>
            <strong>{pct(conta.parte('modelo'))} eram respostas do próprio modelo.</strong> Cada resposta fica no
            histórico, e isso inclui o conteúdo de cada arquivo que ele escreveu e o raciocínio, que você não vê mas que
            continua na conversa nos modelos novos da Anthropic. Pela estimativa, {pct(conta.raciocinio)} da saída da
            sessão foi raciocínio.
          </li>
          <li>
            <strong>{pct(conta.parte('comandos'))} eram saídas de comandos.</strong> Foram {numero(calibracao.comandos)}{' '}
            comandos no terminal, com {numero(conta.porComando)} tokens de saída em média.
          </li>
          <li>
            <strong>{pct(conta.parte('imagens'))} eram capturas de tela</strong> das páginas que estavam sendo desenhadas:{' '}
            {numero(calibracao.imagens)} imagens, com {numero(conta.porImagem)} tokens cada uma em média, mais de{' '}
            {numero(Math.floor(conta.porImagem / conta.porComando))} vezes a saída de um comando.
          </li>
          <li>
            <strong>{pct(conta.parte('instrucoes'))} eram instruções, ferramentas e CLAUDE.md.</strong> A primeira
            chamada já tinha {tokens(conta.primeira)} tokens antes de qualquer trabalho.
          </li>
          <li>
            <strong>As mensagens do Igor eram {pct(conta.parte('outros'), 1)}</strong>, junto com o pouco que sobra.
          </li>
        </ul>
        <p>
          Quem enche a janela é o trabalho do agente, não a conversa com você: o que ele lê, o que roda e o que escreve.
        </p>
        <FontesEMetodo
          fontes={[FONTES.sessao, FONTES.anthropicJanela]}
          analise={[ANALISE.composicao, ANALISE.calibracao, ANALISE.leitura]}
          metodo={
            <>
              O tamanho de cada pedido e o de cada resposta são os que a API cobrou. O que entrou de novo entre duas
              chamadas também tem tamanho exato, e é dividido pelo texto de cada parte, contado com o tokenizador do post
              sobre tokens e convertido em tokens do Claude por um fator medido na própria sessão (
              {MULTIPLICADOR.format(calibracao.fator)} tokens do Claude por token do outro, numa reta que explica{' '}
              {pct(calibracao.r2)} do tamanho de {numero(calibracao.trechos)} trechos sem imagem). O resto é das imagens
              ou dos lembretes do Claude Code. O raciocínio não fica no registro: a parte dele é a saída cobrada menos a
              parte visível, estimada do mesmo jeito. Do registro saíram só os números.
            </>
          }
        />
      </Parte>

      <Parte id="caber">
        <p>
          Uma janela de 1 milhão de tokens não quer dizer que o modelo use bem 1 milhão de tokens. A documentação da
          Anthropic avisa: à medida que o número de tokens cresce, a precisão e a capacidade de lembrar caem, o que ela
          chama de <em>context rot</em>, o contexto apodrecendo. A explicação que ela dá é a dos pares da{' '}
          <Ver id="janela" />: o modelo tem um orçamento de atenção, e cada token novo gasta um pouco dele.
        </p>
        <p>As pesquisas que mediram isso:</p>
        <div className="rolagem-x">
          <table className="quadro quadro-texto">
            <thead>
              <tr>
                <th>Estudo</th>
                <th>O que mediu</th>
                <th>O que encontrou</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>Lost in the Middle (2023)</th>
                <td>Perguntas sobre 10 a 30 documentos, com a resposta em posições diferentes</td>
                <td>
                  O acerto é maior com a resposta no começo ou no fim. No pior caso, com 20 ou 30 documentos, o GPT-3.5-Turbo
                  acertou menos do que sem documento nenhum (56,1%).
                </td>
              </tr>
              <tr>
                <th>RULER (2024)</th>
                <td>13 tarefas em 17 modelos de contexto longo</td>
                <td>
                  Só metade manteve um desempenho satisfatório com 32 mil tokens; quase todos caíram abaixo do patamar antes
                  do tamanho que anunciavam.
                </td>
              </tr>
              <tr>
                <th>NoLiMa (2025)</th>
                <td>Achar a informação quando a pergunta não repete as palavras dela, em 13 modelos de 128 mil tokens ou mais</td>
                <td>Com 32 mil tokens, 11 caíram abaixo da metade do que acertavam em textos curtos; o GPT-4o foi de 99,3% para 69,7%.</td>
              </tr>
              <tr>
                <th>Context Rot (Chroma, 2025)</th>
                <td>18 modelos, entre eles o GPT-4.1, o Claude 4 e o Gemini 2.5</td>
                <td>
                  A qualidade cai com o tamanho, de forma desigual. Numa conversa longa, todos acertaram bem mais vendo só o
                  trecho relevante (cerca de 300 tokens) do que a conversa inteira (cerca de 113 mil).
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          São modelos de 2023 a 2025, e os de hoje aguentam bem mais. Mas o efeito continua na documentação atual, e num
          agente ele aparece de jeitos conhecidos: a instrução dada lá no começo que deixa de ser seguida, o erro já
          corrigido que volta, a versão antiga de um arquivo, que também está no histórico, confundida com a nova. Um
          contexto menor e mais limpo ajuda o modelo, não só a fatura.
        </p>
        <FontesEMetodo
          fontes={[FONTES.anthropicJanela, FONTES.engenhariaDeContexto, FONTES.lostInTheMiddle, FONTES.ruler, FONTES.nolima, FONTES.contextRot]}
          analise={[ANALISE.composicao]}
          metodo={
            <>
              Os números são os de cada estudo, nas versões publicadas no arXiv e no relatório da Chroma, que é um relatório
              técnico de empresa, sem revisão por pares. Cada estudo mede tarefas e modelos diferentes, e por isso os
              resultados não se comparam entre si.
            </>
          }
        />
      </Parte>

      <Parte id="custo">
        <p>
          O <a href="/o-que-e-uma-sessao/">post anterior</a> mostrou que cada chamada paga o pedido inteiro. Perto do
          limite da janela, isso pesa: uma chamada com 900 mil tokens no {conta.modelo.nome} custa{' '}
          {dolares(conta.grandeComCache)} lida do cache e {dolares(conta.grandeSemCache)} fora dele. O cache barateia, mas
          não libera espaço: o que está no cache continua ocupando a janela.
        </p>
        <p>
          E dois fornecedores cobram mais acima de um tamanho, pelo pedido inteiro. No {conta.haiku.nome}, passar de{' '}
          {tokens(conta.haiku.limite_curto!)} tokens multiplica todos os preços por{' '}
          {MULTIPLICADOR.format(conta.haiku.entrada_longa! / conta.haiku.entrada)}: uma chamada de{' '}
          {numero(conta.haiku.limite_curto!)} tokens custa {dolares(conta.haikuAntes)}, e uma de{' '}
          {numero(conta.haiku.limite_curto! + 1)}, {dolares(conta.haikuDepois)}. Nos modelos GPT-6, acima de{' '}
          {tokens(conta.astra.limite_curto!)} tokens de entrada, a entrada passa a custar{' '}
          {MULTIPLICADOR.format(conta.astra.entrada_longa! / conta.astra.entrada)} vezes o preço normal, e a saída,{' '}
          {MULTIPLICADOR.format(conta.astra.saida_longa! / conta.astra.saida)} vez.
        </p>
        <Calculadora precos={dados.precos} inicial={CONTEXTO_INICIAL} />
        <FontesEMetodo
          fontes={[FONTES.anthropicPrecos, FONTES.anthropicJanela, FONTES.openaiPrecos, FONTES.googlePrecos]}
          analise={[ANALISE.custo, ANALISE.precos]}
          metodo={
            <>
              Preços em dólares por milhão de tokens, conferidos em {consultadoEm}. A Anthropic diz que, no{' '}
              {conta.haiku.nome}, o pedido inteiro paga mais quando passa do limite, contando o que vem do cache; a OpenAI
              só dá o limite, e a conta faz o mesmo. Nos modelos do Google, as páginas não mostram preço diferente para
              pedidos longos. A saída é de {numero(SAIDA)} tokens em todas as chamadas.
            </>
          }
        />
      </Parte>

      <Parte id="compactacao">
        <p>
          Quando a conversa se aproxima do limite, o Claude Code <em>compacta</em>: primeiro apaga saídas antigas de
          ferramentas e, se não basta, resume a conversa e continua a partir do resumo. O ponto em que isso acontece
          depende do modelo e da configuração. Também dá para pedir, com <code>/compact</code>, e dizer o que manter: por
          exemplo, <code>/compact mantenha as decisões de design</code>.
        </p>
        <p>
          Na sessão real, o Igor pediu a compactação logo depois da chamada mais cheia. A conversa tinha{' '}
          {numero(calibracao.compactacao_antes)} tokens e virou um resumo de {numero(calibracao.compactacao_resumo)}:{' '}
          <strong>{pct(conta.descartado, 1)} a menos</strong>. A chamada seguinte, a {conta.depois.chamada}, tinha{' '}
          {tokens(conta.depois.contexto)} tokens: as instruções, as ferramentas, o CLAUDE.md e o resumo. Arraste a janela
          da <Ver id="o-que-enche" /> até ela para ver.
        </p>
        <p>
          O que volta depois do resumo, segundo a documentação do Claude Code: as instruções do sistema, o CLAUDE.md da
          raiz e a memória automática, relidos do disco, e até cinco dos arquivos que o agente leu ou editou, os mais
          recentes primeiro. O resto fica no resumo, e a própria documentação avisa que{' '}
          <q>instruções detalhadas do começo da conversa podem se perder</q>. É aí que o agente esquece: a decisão tomada
          na conversa, e não escrita num arquivo, vira uma linha do resumo, ou nem isso.
        </p>
        <p>
          Quem escreve um agente com a API tem as mesmas ferramentas do lado do servidor: a Anthropic oferece compactação
          automática (em beta) e a limpeza de resultados antigos de ferramentas quando o contexto passa de um tamanho.
        </p>
        <FontesEMetodo
          fontes={[FONTES.claudeCodeContexto, FONTES.claudeCodeCustos, FONTES.anthropicJanela, FONTES.engenhariaDeContexto]}
          analise={[ANALISE.calibracao, ANALISE.leitura]}
          metodo={
            <>
              O tamanho antes e depois da compactação é o que o Claude Code registrou na marca de compactação do registro
              da sessão ({calibracao.compactacao_gatilho === 'manual' ? 'pedida com /compact' : 'automática'}). O que
              volta depois do resumo está na tabela <q>What survives compaction</q> da documentação do Claude Code.
            </>
          }
        />
      </Parte>

      <Parte id="na-pratica">
        <p>Com o que a sessão mostrou, o que ajuda a janela durar mais e a ser bem usada:</p>
        <ul>
          <li>
            <strong>Uma tarefa por sessão.</strong> Ao trocar de assunto, <code>/clear</code> começa do zero e não custa
            nada; o histórico velho ocupa espaço e atrapalha a tarefa nova.
          </li>
          <li>
            <strong>Compacte antes, e com foco.</strong> Compactar num ponto de pausa, dizendo o que manter, é melhor que
            deixar o resumo automático escolher no meio de uma tarefa. Uma seção <q>Compact Instructions</q> no CLAUDE.md
            faz isso de forma permanente.
          </li>
          <li>
            <strong>O que importa vai para um arquivo.</strong> O CLAUDE.md volta inteiro depois da compactação; a
            conversa, não. É por isso que este blog registra as decisões do Igor, com data, no CLAUDE.md de cada post.
          </li>
          <li>
            <strong>Peça saídas curtas.</strong> Filtrar o log, rodar só o teste que importa e ler o trecho do arquivo, não
            o arquivo inteiro. As saídas de comandos foram {pct(conta.parte('comandos'))} da sessão real.
          </li>
          <li>
            <strong>Imagem só quando precisa.</strong> Cada captura de tela ocupou, em média, {numero(conta.porImagem)}{' '}
            tokens, que ficaram na conversa até a compactação.
          </li>
          <li>
            <strong>Pesquisa grande vai para um subagente.</strong> Ele trabalha na própria janela e devolve só um resumo,
            em geral de mil a dois mil tokens, segundo a Anthropic.
          </li>
          <li>
            <strong>Olhe o que está ocupando.</strong> No Claude Code, <code>/context</code> mostra a janela por categoria,
            como o gráfico da <Ver id="o-que-enche" />.
          </li>
        </ul>
        <FontesEMetodo
          fontes={[FONTES.claudeCodeCustos, FONTES.claudeCodeContexto, FONTES.engenhariaDeContexto]}
          analise={[ANALISE.composicao]}
          metodo={
            <>
              As recomendações vêm da documentação do Claude Code e do artigo da Anthropic sobre engenharia de contexto; os
              números, da sessão real da <Ver id="o-que-enche" />.
            </>
          }
        />
      </Parte>

      <section className="secao" id="resumo">
        <h2>Em resumo</h2>
        <ul>
          <li>
            <strong>A janela</strong> é o tamanho máximo de uma chamada, com a resposta; nos modelos de ponta, cerca de 1
            milhão de tokens.
          </li>
          <li>
            <strong>Quem enche é o trabalho do agente:</strong> na sessão real, as respostas do modelo, as saídas de
            comandos e as capturas de tela foram{' '}
            {pct(conta.parte('modelo') + conta.parte('comandos') + conta.parte('imagens'))} do pedido mais cheio.
          </li>
          <li>
            <strong>Caber não é usar bem:</strong> a qualidade cai com o tamanho bem antes do limite.
          </li>
          <li>
            <strong>A compactação troca a conversa por um resumo,</strong> e o que não estava escrito num arquivo pode
            ficar de fora.
          </li>
        </ul>
        <p>
          Os próximos posts da série saem da explicação e vão para as medições: o que cada ferramenta ou técnica que
          promete economizar tokens faz, de verdade, com essa janela.
        </p>
      </section>

      <footer className="rodape">
        <h2>Sobre os dados</h2>
        <p>
          As janelas e os preços foram conferidos nas páginas oficiais em {consultadoEm}. A medição da sessão real e as
          contas estão no{' '}
          <a href="https://github.com/igor-gregori/iblog/tree/main/posts/janela-de-contexto" target="_blank" rel="noreferrer">
            repositório do projeto
          </a>
          .
        </p>
        <ul>
          {Object.values(FONTES).map((fonte) => (
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
  )
}
