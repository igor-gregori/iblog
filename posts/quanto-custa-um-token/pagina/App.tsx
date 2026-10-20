import { useMemo, useState } from 'react'
import { ComoFoiFeito } from '#base/ComoFoiFeito.tsx'
import { Figura } from '#base/Figura.tsx'
import { FontesEMetodo } from '#base/FontesEMetodo.tsx'
import { GraficoBarras } from '#base/GraficoBarras.tsx'
import { numero, pct } from '#base/formato.ts'
import { partes } from '#base/Partes.tsx'
import { Topo } from '#base/Topo.tsx'
import { useJson } from '#base/useJson.ts'
import { CENARIOS, dolares } from './cenarios.ts'
import { Calculadora } from './components/Calculadora.tsx'
import { Tokenizador } from './components/Tokenizador.tsx'
import { custo } from './custos.ts'
import { amostra, CORES, urlDosDados, type Dados } from './dados.ts'
import { ANALISE, FONTES } from './fontes.ts'

/** As partes do artigo, na ordem em que aparecem; o sumário aponta para elas. */
const PARTES = [
  { id: 'pedaco', titulo: 'Um token é um pedaço de texto' },
  { id: 'formato', titulo: 'O mesmo conteúdo, contas diferentes' },
  { id: 'compactar', titulo: 'Então por que não compactar sempre?' },
  { id: 'fatura', titulo: 'Entrada, saída, raciocínio e cache' },
  { id: 'calculadora', titulo: 'Quanto custa um pedido em cada modelo' },
  { id: 'economia', titulo: 'Onde está a economia' },
] as const

const { Parte, Ver } = partes(PARTES)

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

/** "2026-10-18" → "18 de outubro de 2026" */
function diaPorExtenso(data: string) {
  const [ano, mes, dia] = data.split('-').map(Number)
  return `${dia} de ${MESES[mes - 1]} de ${ano}`
}

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

function Artigo({ dados }: { dados: Dados }) {
  const [tokensDoTexto, setTokensDoTexto] = useState<number | null>(null)
  const { precos } = dados
  const consultadoEm = diaPorExtenso(dados.precos_consultados_em)

  // Os números do texto saem dos dados, para continuarem certos quando as amostras ou os preços mudarem.
  const conta = useMemo(() => {
    const pt = amostra(dados, 'texto-pt')
    const en = amostra(dados, 'texto-en')
    const indentado = amostra(dados, 'json-indentado')
    const compacto = amostra(dados, 'json-compacto')
    const codigo = amostra(dados, 'codigo')
    const saidaSobreEntrada = precos.map((p) => p.saida / p.entrada)
    const cacheSobreEntrada = precos.map((p) => p.entrada_cache / p.entrada)
    const agente = CENARIOS.agente
    const noAgente = precos
      .map((preco) => ({ preco, valor: custo(preco, agente.entrada, agente.saida, agente.fracaoEmCache) * 1000 }))
      .sort((a, b) => a.valor - b.valor)
    const opus = precos.find((p) => p.modelo === 'claude-opus-5-5')!
    const sonnet = precos.find((p) => p.modelo === 'claude-sonnet-5-5')!
    const tokensDoRecuo = indentado.tokens - compacto.tokens
    return {
      pt,
      en,
      codigo,
      ptSobreEn: pt.tokens / en.tokens - 1,
      indentadoSobreCompacto: indentado.tokens / compacto.tokens - 1,
      indentado,
      compacto,
      porToken: (a: { caracteres: number; tokens: number }) => a.caracteres / a.tokens,
      saidaMin: Math.min(...saidaSobreEntrada),
      saidaMax: Math.max(...saidaSobreEntrada),
      cacheMin: Math.min(...cacheSobreEntrada),
      cacheMax: Math.max(...cacheSobreEntrada),
      maisBarato: noAgente[0],
      maisCaro: noAgente[noAgente.length - 1],
      opusComCache: custo(opus, agente.entrada, agente.saida, agente.fracaoEmCache) * 1000,
      opusSemCache: custo(opus, agente.entrada, agente.saida, 0) * 1000,
      sonnet,
      tokensDoRecuo,
      recuoForaDoCache: custo(sonnet, tokensDoRecuo * 1_000_000, 0),
      recuoNoCache: custo(sonnet, tokensDoRecuo * 1_000_000, 0, 1),
    }
  }, [dados, precos])

  const grupos = [
    { titulo: 'Texto', ids: ['texto-pt', 'texto-en'] as const },
    { titulo: 'Dados', ids: ['json-indentado', 'json-compacto'] as const },
    { titulo: 'Código', ids: ['codigo'] as const },
  ]

  return (
    <main className="artigo" id="inicio">
      <header className="abertura">
        <p className="sobretitulo">IA para quem já programa · 3</p>
        <h1>O que é um token, e quanto ele custa?</h1>
        <p className="subtitulo">
          Toda conta de IA é cobrada em tokens. O que é um token, por que o mesmo conteúdo pode custar{' '}
          {pct(conta.indentadoSobreCompacto)} a mais só pela forma e quanto sai um pedido em cada modelo, com os preços
          públicos de {MESES[Number(dados.precos_consultados_em.slice(5, 7)) - 1]} de {dados.precos_consultados_em.slice(0, 4)}.
        </p>
        <p className="assinatura">Igor Gregori · Preços conferidos em {consultadoEm}</p>
      </header>

      <div className="texto">
        <p>
          Quem usa um agente de código todo dia acaba olhando a fatura, ou o limite do plano, e encontrando a mesma
          unidade em todo lugar: o token. Os dois posts anteriores, sobre{' '}
          <a href="/modelo-agente-harness/">modelo, agente e harness</a> e sobre{' '}
          <a href="/como-um-modelo-e-treinado/">como um modelo é treinado</a>, mostraram que o modelo lê e escreve tokens.
          Este mostra o que é um token na prática, o que faz um texto gastar mais tokens que outro e como isso vira
          dinheiro.
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

      <Parte id="pedaco">
        <p>
          O modelo não lê letras nem palavras: lê tokens. Antes de chegar a ele, o texto passa por um{' '}
          <em>tokenizador</em>, que o quebra em pedaços tirados de um vocabulário fixo. No tokenizador usado neste post, o{' '}
          <code>{dados.codificacao}</code>, o vocabulário tem cerca de 200 mil pedaços (daí o nome).
        </p>
        <p>
          O vocabulário é montado a partir de muito texto: o que aparece muito vira um pedaço só, e o que é raro fica
          quebrado em pedaços menores. Em <q>const usuarios = await prisma.usuario.findMany()</q>, quase cada palavra é um
          token, com o espaço da frente junto. Já <q>Função</q> vira <code>Fun</code> + <code>ção</code>, e{' '}
          <q>assíncrona</q> vira quatro pedaços. Espaços, quebras de linha e recuo também contam.
        </p>
        <Tokenizador amostras={dados.amostras} aoContar={setTokensDoTexto} />
        <p>
          Cada fornecedor tem o seu tokenizador, e o mesmo texto dá números diferentes em cada um. A própria Anthropic
          avisa que o tokenizador dos modelos Claude mais novos (do 4.7 em diante) produz cerca de 30% mais tokens que o
          anterior para o mesmo texto. Por isso as contagens deste post servem para comparar textos e formatos entre si;
          a conta exata de um modelo só sai do fornecedor dele, que costuma ter um endpoint para contar tokens antes de
          mandar o pedido.
        </p>
        <FontesEMetodo
          fontes={[FONTES.tiktoken, FONTES.gptTokenizer, FONTES.anthropic]}
          analise={[ANALISE.tokens, ANALISE.tokensPagina]}
          metodo={
            <>
              A página conta os tokens no navegador com o gpt-tokenizer, que implementa o {dados.codificacao}, o
              tokenizador que a biblioteca tiktoken, da OpenAI, associa ao GPT-4o e à família GPT-5. A análise em Python
              conta com o próprio tiktoken, e os testes do projeto conferem que os dois dão os mesmos tokens e os mesmos
              pedaços. Um caractere partido entre dois tokens, como um emoji, aparece numa caixa só, com a contagem dos
              dois.
            </>
          }
        />
      </Parte>

      <Parte id="formato">
        <p>
          O mesmo conteúdo pode custar mais ou menos tokens dependendo de como é escrito. Para medir, o post usa cinco
          amostras: um parágrafo sobre cancelar um pedido, em português e em inglês; um pedido de exemplo em JSON, com e
          sem recuo; e a função TypeScript que faz o cancelamento.
        </p>
        <Figura
          titulo="Tokens de cada amostra"
          subtitulo="O mesmo conteúdo em formas diferentes. Quanto menor, mais barato."
          fonte={`Tokenizador ${dados.codificacao}. As amostras estão na pasta do post, no repositório.`}
          tabela={{
            colunas: ['Amostra', 'Caracteres', 'Tokens', 'Caracteres por token'],
            linhas: dados.amostras.map((a) => [a.nome, numero(a.caracteres), numero(a.tokens), numero(conta.porToken(a), 1)]),
          }}
        >
          <div className="amostras-barras">
            <GraficoBarras
              grupos={grupos.map((grupo) => ({
                titulo: grupo.titulo,
                barras: grupo.ids.map((id) => {
                  const a = amostra(dados, id)
                  return { nome: a.nome, valor: a.tokens, cor: 'var(--serie-1)', nota: `${numero(a.caracteres)} caracteres` }
                }),
              }))}
              formato={(valor) => numero(valor)}
              descricao={dados.amostras.map((a) => `${a.nome}: ${a.tokens} tokens`).join('; ')}
            />
          </div>
        </Figura>
        <p>
          O parágrafo em português dá {conta.pt.tokens} tokens; o mesmo parágrafo em inglês, {conta.en.tokens}. São{' '}
          {pct(conta.ptSobreEn)} a mais em português, com um número parecido de caracteres. Neste tokenizador, escrever
          o pedido em português custa pouco a mais.
        </p>
        <p>
          A forma pesa mesmo é nos dados. O pedido em JSON com o recuo de dois espaços, o que o{' '}
          <code>JSON.stringify(pedido, null, 2)</code> produz, gasta <strong>{pct(conta.indentadoSobreCompacto)} mais
          tokens</strong> que o mesmo pedido compacto. Cada quebra de linha e cada recuo vira token e não diz nada novo ao
          modelo. Código fica no meio do caminho: {numero(conta.porToken(conta.codigo), 1)} caracteres por token, contra{' '}
          {numero(conta.porToken(conta.pt), 1)} no texto em português e {numero(conta.porToken(conta.compacto), 1)} no
          JSON compacto.
        </p>
        <FontesEMetodo
          fontes={[FONTES.tiktoken]}
          analise={[ANALISE.amostrasPy, ANALISE.amostras]}
          metodo={
            <>
              As amostras foram escritas para este post. As duas formas do JSON saem do mesmo arquivo, com recuo de dois
              espaços e sem nenhum espaço, como as duas saídas do JSON.stringify. Os caracteres são contados como o
              leitor os vê (um acento ou um emoji conta um).
            </>
          }
        />
      </Parte>

      <Parte id="compactar">
        <p>
          Quase sempre, compacte. É o que o <code>JSON.stringify</code> faz sem argumentos, e é como muitas APIs já
          respondem. Mas a pergunta merece uma resposta mais cuidadosa, por três motivos.
        </p>
        <ul>
          <li>
            <strong>A economia é real, mas pequena perto do resto.</strong> No pedido de exemplo, o recuo custa{' '}
            {numero(conta.tokensDoRecuo)} tokens. Mandar esse objeto um milhão de vezes como entrada do{' '}
            {conta.sonnet.nome} custa {dolares(conta.recuoForaDoCache)} a mais; se ele estiver no cache,{' '}
            {dolares(conta.recuoNoCache)}. Tirar do objeto os campos que o modelo não precisa pode economizar mais que
            tirar os espaços, e a escolha do modelo, como mostra a <Ver id="calculadora" />, pesa muito mais que os dois.
          </li>
          <li>
            <strong>Arquivo do projeto é para gente.</strong> O agente lê os arquivos do repositório como eles são.
            Compactar o <code>package.json</code> ou um JSON de configuração para gastar menos tokens deixa o arquivo
            ilegível e os diffs inúteis para quem mantém o código. O lugar de compactar é o que o seu código monta para
            mandar ao modelo, não o que fica no repositório.
          </li>
          <li>
            <strong>Você também lê.</strong> Prompts, logs e resultados de ferramenta são o que você abre para descobrir
            por que o agente fez o que fez. Nada impede de mandar compacto para o modelo e gravar formatado no log.
          </li>
        </ul>
        <p>
          A regra prática: compacte o que o seu código gera só para o modelo (o resultado de uma ferramenta, o contexto
          que você monta) e deixe legível o que pessoas também leem e mantêm.
        </p>
        <FontesEMetodo
          fontes={[FONTES.tiktoken, FONTES.anthropic]}
          analise={[ANALISE.amostrasPy, ANALISE.custos]}
          metodo={
            <>
              Os tokens do recuo são a diferença entre as duas formas do JSON da <Ver id="formato" />. O custo de um
              milhão de envios usa o preço de entrada do {conta.sonnet.nome}, fora do cache e no cache.
            </>
          }
        />
      </Parte>

      <Parte id="fatura">
        <p>
          A fatura separa o que você manda, a <em>entrada</em>, do que o modelo escreve, a <em>saída</em>. Nos{' '}
          {precos.length} modelos da tabela abaixo, o token de saída custa de {numero(conta.saidaMin, 0)} a{' '}
          {numero(conta.saidaMax, 1)} vezes o de entrada. Escrever é a parte cara.
        </p>
        <p>
          O <em>raciocínio</em>, quando o modelo pensa antes de responder, é cobrado como saída nos três fornecedores,
          mesmo quando você não vê o texto dele. Um modelo que pensa muito numa tarefa simples gasta saída à toa.
        </p>
        <p>
          O <em>cache</em> vai no sentido contrário. Quando o começo de um pedido é igual ao de um pedido recente, o
          fornecedor reaproveita o que já processou e cobra essa parte da entrada bem mais barato: de{' '}
          {pct(conta.cacheMin, 1)} a {pct(conta.cacheMax)} do preço normal, conforme o modelo. É o que torna viável um
          agente que reenvia o histórico inteiro a cada passo, como o laço do{' '}
          <a href="/modelo-agente-harness/">primeiro post</a>.
        </p>
        <div className="rolagem-x">
          <table className="quadro precos">
            <caption className="ajuda">Dólares por milhão de tokens, nas páginas de preço dos fornecedores em {consultadoEm}.</caption>
            <thead>
              <tr>
                <th>Modelo</th>
                <th>Entrada</th>
                <th>Entrada no cache</th>
                <th>Saída</th>
              </tr>
            </thead>
            <tbody>
              {precos.map((preco) => (
                <tr key={preco.modelo}>
                  <th>
                    <span className="precos-marca" style={{ background: CORES[preco.fornecedor] }} aria-hidden="true" />
                    {preco.nome}
                    {preco.observacao && <small>{preco.observacao}</small>}
                  </th>
                  <td>US$ {numero(preco.entrada, 2)}</td>
                  <td>US$ {numero(preco.entrada_cache, preco.entrada_cache < 0.1 ? 3 : 2)}</td>
                  <td>US$ {numero(preco.saida, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <FontesEMetodo
          fontes={[FONTES.anthropic, FONTES.openai, FONTES.google, FONTES.anthropicRaciocinio, FONTES.openaiRaciocinio]}
          analise={[ANALISE.precos]}
          metodo={
            <>
              Preços da API de cada fornecedor, no modo padrão, para os modelos atuais de cada linha (o maior, o médio e
              o menor), transcritos à mão em {consultadoEm}. Ficam de fora o custo de gravar no cache, o modo em lote e
              as faixas mais caras para pedidos muito longos. Os preços do Gemini 4 Argon e do Gemini 3.8 Flash são
              promocionais e dobram nas datas indicadas.
            </>
          }
        />
      </Parte>

      <Parte id="calculadora">
        <p>
          Escolha um pedido típico ou monte o seu. O gráfico mostra quanto custam mil pedidos iguais em cada modelo. Se
          quiser, use como entrada os tokens do texto que você escreveu na <Ver id="pedaco" />.
        </p>
        <Calculadora precos={precos} tokensDoTexto={tokensDoTexto} />
        <p>
          No passo de agente ({numero(CENARIOS.agente.entrada)} tokens de entrada, {pct(CENARIOS.agente.fracaoEmCache)}{' '}
          no cache e {numero(CENARIOS.agente.saida)} de saída), mil pedidos vão de {dolares(conta.maisBarato.valor)} no{' '}
          {conta.maisBarato.preco.nome} a {dolares(conta.maisCaro.valor)} no {conta.maisCaro.preco.nome}:{' '}
          <strong>{numero(conta.maisCaro.valor / conta.maisBarato.valor)} vezes</strong> mais. O cache pesa quase tanto
          quanto o modelo: sem ele, os mesmos mil passos no Claude Opus 5.5 custariam {dolares(conta.opusSemCache)} em
          vez de {dolares(conta.opusComCache)}.
        </p>
        <p>
          Preço não é tudo: um modelo mais barato que erra e refaz a tarefa sai mais caro no fim. Para comparar os
          modelos também em qualidade, velocidade e quantos tokens cada um gasta para responder, o{' '}
          <a href={FONTES.artificialAnalysis.url} target="_blank" rel="noreferrer">
            Artificial Analysis
          </a>{' '}
          mantém avaliações independentes e atualizadas, com os preços de cada fornecedor.
        </p>
        <FontesEMetodo
          fontes={[FONTES.anthropic, FONTES.openai, FONTES.google, FONTES.artificialAnalysis]}
          analise={[ANALISE.custos, ANALISE.precos]}
          metodo={
            <>
              Para cada pedido, a entrada fora do cache é cobrada pelo preço de entrada, a parte no cache pelo preço de
              cache e a saída pelo preço de saída. A conta não sabe quantos tokens cada modelo usaria para o mesmo texto:
              ela usa os mesmos números para todos, o que basta para comparar preços, mas não prevê a fatura exata.
            </>
          }
        />
      </Parte>

      <Parte id="economia">
        <p>Com a conta na mão, as economias que valem mais, na ordem:</p>
        <ul>
          <li>
            <strong>Fazer o cache acontecer.</strong> O que se repete (instruções, descrição das ferramentas, arquivos de
            contexto) vai no começo do pedido, sempre igual. Uma data ou um identificador no meio das instruções muda o
            começo do pedido e joga o cache fora.
          </li>
          <li>
            <strong>Escolher o modelo pela tarefa.</strong> A diferença entre o mais barato e o mais caro passa de{' '}
            {numero(conta.maisCaro.valor / conta.maisBarato.valor)} vezes. Classificar, extrair e resumir raramente
            precisam do maior.
          </li>
          <li>
            <strong>Cuidar da saída.</strong> Ela custa várias vezes a entrada: peça respostas no tamanho certo e ajuste
            quanto o modelo raciocina em tarefas simples.
          </li>
          <li>
            <strong>Mandar dados compactos.</strong> JSON sem recuo e só os campos que importam, principalmente no
            resultado das ferramentas de um agente.
          </li>
        </ul>
      </Parte>

      <section className="secao" id="resumo">
        <h2>Em resumo</h2>
        <ul>
          <li>
            <strong>Token</strong> é um pedaço de texto de um vocabulário fixo; cada fornecedor tem o seu, e as contagens
            mudam de um para outro.
          </li>
          <li>
            <strong>A forma pesa:</strong> o JSON com recuo gastou {pct(conta.indentadoSobreCompacto)} mais tokens que o
            compacto; o português, {pct(conta.ptSobreEn)} mais que o inglês.
          </li>
          <li>
            <strong>A fatura</strong> cobra entrada, saída (com o raciocínio) e cache. A saída é a parte cara; o cache, a
            economia maior.
          </li>
        </ul>
        <p>O próximo post da série volta ao laço do agente: o que é uma sessão e por que ela fica mais cara a cada passo.</p>
      </section>

      <footer className="rodape">
        <h2>Sobre os dados</h2>
        <p>
          Os preços foram conferidos nas páginas oficiais em {consultadoEm} e mudam com frequência. As amostras, a
          contagem e a conta estão no{' '}
          <a href="https://github.com/igor-gregori/iblog/tree/main/posts/quanto-custa-um-token" target="_blank" rel="noreferrer">
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
        <ComoFoiFeito />
      </footer>
    </main>
  )
}
