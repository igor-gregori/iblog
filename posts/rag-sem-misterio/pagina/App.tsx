import { useMemo } from 'react'
import { Codigo } from '#base/Codigo.tsx'
import { ComoFoiFeito } from '#base/ComoFoiFeito.tsx'
import { FontesEMetodo } from '#base/FontesEMetodo.tsx'
import { dolares, numero, pct } from '#base/formato.ts'
import { LinkDoGlossario } from '#base/LinkDoGlossario.tsx'
import { partes } from '#base/Partes.tsx'
import { Topo } from '#base/Topo.tsx'
import { useJson } from '#base/useJson.ts'
import { Acertos } from './components/Acertos.tsx'
import { Busca } from './components/Busca.tsx'
import { Custo } from './components/Custo.tsx'
import { Divisao } from './components/Divisao.tsx'
import { Lugar } from './components/Lugar.tsx'
import { Vetores } from './components/Vetores.tsx'
import { custoDaPergunta, PERGUNTAS_NA_CONTA } from './conta.ts'
import { acertos, longe, tamanho, urlDosDados, type Dados } from './dados.ts'
import { ANALISE, FONTES } from './fontes.ts'

/** As partes do artigo, na ordem em que aparecem; o sumário aponta para elas. */
const PARTES = [
  { id: 'o-que-e', titulo: 'Buscar antes de perguntar' },
  { id: 'quem-faz', titulo: 'Quem monta: você ou a ferramenta?' },
  { id: 'pedacos', titulo: 'Dividir em pedaços' },
  { id: 'palavras', titulo: 'Buscar por palavras' },
  { id: 'significado', titulo: 'Buscar por significado' },
  { id: 'hibrida', titulo: 'As duas juntas' },
  { id: 'sem-rag', titulo: 'Quando não precisa de RAG' },
  { id: 'nomes', titulo: 'Nomes que se deixam achar' },
  { id: 'na-pratica', titulo: 'O que fazer com isso' },
] as const

const { Parte, Ver } = partes(PARTES)

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

/** "2026-10-22" → "22 de outubro de 2026" */
function diaPorExtenso(data: string) {
  const [ano, mes, dia] = data.split('-').map(Number)
  return `${dia} de ${MESES[mes - 1]} de ${ano}`
}

/** O modelo das contas de custo do texto e o primeiro da figura. */
const MODELO = 'claude-sonnet-5-5'

/** Quantos pedaços contam como "a resposta veio" no texto, e a partir de onde a busca "errou feio". */
const NO_PEDIDO = 3
const LONGE = 10

const CODIGO_RAG = `async function responder(pergunta: string) {
  // R, de retrieval: buscar os pedaços que parecem responder
  const pedacos = buscar(pergunta, 5)
  const documentos = pedacos
    .map((p) => \`<documento fonte="\${p.arquivo}">\\n\${p.texto}\\n</documento>\`)
    .join('\\n')
  // G, de generation: o modelo escreve a resposta a partir deles
  const instrucao = 'Responda só com base nos documentos e diga de qual veio a resposta.'
  return modelo.responder(\`\${instrucao}\\n\\n\${documentos}\\n\\nPergunta: \${pergunta}\`)
}`

const CODIGO_FERRAMENTA = `// A busca como ferramenta: o modelo decide quando buscar e o que procurar
const ferramentas = [
  {
    name: 'buscar_documentos',
    description: 'Busca trechos nos documentos do projeto.',
    input_schema: {
      type: 'object',
      properties: { consulta: { type: 'string', description: 'o que procurar' } },
      required: ['consulta'],
    },
  },
]
// Quando a resposta pede buscar_documentos, o seu programa roda buscar(consulta, 5),
// devolve os pedaços como resultado da ferramenta e chama o modelo de novo.`

const CODIGO_NOMES = `// Difícil de achar: um grep por "frete" não encontra nada
// src/utils.ts
export function calc(p: Pedido, t: number) { /* ... */ }

// Fácil: o nome do arquivo e o da função dizem o que é
// src/frete/calcular-frete.ts
export function calcularFrete(pedido: Pedido, tabela: TabelaDeFrete) { /* ... */ }`

const CODIGO_DIVIDIR = `// Versão resumida de pagina/pedacos.ts: um pedaço nunca atravessa um título
function dividir(arquivo: string, texto: string, maximo: number, contar: (t: string) => number) {
  const pedacos: Pedaco[] = []
  let atual: string[] = []
  let tokens = 0
  let lugar: string[] = []
  const fechar = () => {
    if (atual.length) pedacos.push({ arquivo, titulos: lugar, texto: atual.join('\\n'), tokens })
    atual = []
    tokens = 0
  }
  // blocos(): cada parágrafo, item de lista ou trecho de código, com os títulos acima dele
  for (const [titulos, bloco] of blocos(texto)) {
    if (titulos.join() !== lugar.join()) {
      fechar()
      lugar = titulos
    }
    const n = contar(bloco)
    if (atual.length && tokens + n > maximo) fechar()
    atual.push(bloco)
    tokens += n
  }
  fechar()
  return pedacos
}`

const CODIGO_BM25 = `// k1 limita o peso de uma palavra repetida; b desconta o tamanho do pedaço
const K1 = 1.2
const B = 0.75

function nota(pergunta: string[], pedaco: Map<string, number>, tamanho: number) {
  let total = 0
  for (const palavra of new Set(pergunta)) {
    const vezes = pedaco.get(palavra) ?? 0
    if (!vezes) continue
    // rara no corpus vale mais: em quantos dos n pedaços a palavra aparece
    const em = frequencia.get(palavra)!
    const raridade = Math.log(1 + (n - em + 0.5) / (em + 0.5))
    total += (raridade * vezes * (K1 + 1)) / (vezes + K1 * (1 - B + (B * tamanho) / media))
  }
  return total
}`

const CODIGO_EMBEDDINGS = `// Um embedding por texto, pela API de um fornecedor (aqui, a Voyage AI)
const resposta = await fetch('https://ai.mongodb.com/v1/embeddings', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: \`Bearer \${process.env.VOYAGE_API_KEY}\`,
  },
  body: JSON.stringify({ model: 'voyage-4', input: textos, input_type: 'document' }),
})
const vetores: number[][] = (await resposta.json()).data.map((d) => d.embedding)

// Perto em significado = vetores apontando para o mesmo lado
function cosseno(a: number[], b: number[]) {
  let produto = 0, normaA = 0, normaB = 0
  for (let i = 0; i < a.length; i++) {
    produto += a[i] * b[i]
    normaA += a[i] * a[i]
    normaB += b[i] * b[i]
  }
  return produto / (Math.sqrt(normaA) * Math.sqrt(normaB))
}`

const CODIGO_FUSAO = `// Reciprocal rank fusion: cada lista dá 1 / (60 + posição) aos seus primeiros
function fusao(listas: number[][], limite = 50): number[] {
  const notas = new Map<number, number>()
  for (const lista of listas) {
    lista.slice(0, limite).forEach((pedaco, i) => {
      notas.set(pedaco, (notas.get(pedaco) ?? 0) + 1 / (60 + i + 1))
    })
  }
  return [...notas.keys()].sort((p, q) => notas.get(q)! - notas.get(p)! || p - q)
}`

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
  const consultadoEm = diaPorExtenso(dados.precos_consultados_em)

  // Os números do texto saem dos dados, para continuarem certos quando o corpus, as perguntas ou os preços mudarem.
  const conta = useMemo(() => {
    const t = tamanho(dados, dados.tamanho_padrao)
    const corpus = dados.documentos.reduce((soma, d) => soma + d.tokens, 0)
    const total = (tipo?: 'mesmas' | 'outras') => dados.perguntas.filter((p) => !tipo || p.tipo === tipo).length
    const a = (metodo: 'palavras' | 'significado' | 'hibrida', tipo?: 'mesmas' | 'outras') => acertos(dados, t, metodo, NO_PEDIDO, tipo)
    const modelo = dados.precos.find((p) => p.modelo === MODELO)!
    const custo = custoDaPergunta(modelo, corpus, dados.tokens_da_busca)
    const menorJanela = Math.min(...dados.precos.map((p) => p.janela))
    // A mesma conta de acertos, com a busca vendo só o texto do pedaço.
    const semLugar = (metodo: 'palavras' | 'significado', k: number) =>
      dados.perguntas.filter((p) => (dados.sem_lugar[p.id][metodo] ?? Infinity) <= k).length
    const longeEm = (metodo: 'palavras' | 'significado' | 'hibrida') => dados.tamanhos.map((x) => longe(dados, x, metodo, LONGE))
    return {
      t,
      corpus,
      total,
      a,
      modelo,
      custo,
      menorJanela,
      longe: { palavras: longeEm('palavras'), significado: longeEm('significado'), hibrida: longeEm('hibrida') },
      lugar: {
        comPalavras: a('palavras'),
        semPalavras: semLugar('palavras', NO_PEDIDO),
        comSignificado: a('significado'),
        semSignificado: semLugar('significado', NO_PEDIDO),
        comSignificado1: acertos(dados, t, 'significado', 1),
        semSignificado1: semLugar('significado', 1),
      },
      // Os cossenos dos pedaços mais parecidos com a pergunta que a figura dos vetores mostra primeiro.
      exemplo: t.significado.renomear.map(([, c]) => c),
      ferramentas: Object.values(dados.sessao.ferramentas).reduce((x, y) => x + y, 0),
      leituras: dados.sessao.ferramentas.Read ?? 0,
    }
  }, [dados])

  const { t, corpus, total, a, modelo, custo } = conta
  const sessao = dados.sessao
  const pedacosDe = (maximo: number) => tamanho(dados, maximo).pedacos.length
  const intervalo = (valores: number[]) => {
    const menor = Math.min(...valores)
    const maior = Math.max(...valores)
    return menor === maior ? numero(menor) : `${numero(menor)} a ${numero(maior)}`
  }

  return (
    <main className="artigo" id="inicio">
      <header className="abertura">
        <p className="sobretitulo">IA para quem já programa · 7</p>
        <h1>O que é RAG, e quando você não precisa dele?</h1>
        <p className="subtitulo">
          Buscar os trechos certos e pôr no pedido: dividir em pedaços, buscar por palavras, por significado e pelas duas,
          medido com {total()} perguntas nos documentos deste blog. E por que os agentes de código preferem o{' '}
          <code>grep</code>.
        </p>
        <p className="assinatura">Igor Gregori · Preços conferidos em {consultadoEm}</p>
      </header>

      <div className="texto">
        <p>
          O <a href="/como-um-modelo-e-treinado/">modelo</a> só sabe o que estava no treino e o que vem no pedido. Os
          documentos da sua empresa, o código do seu projeto e a versão nova de uma biblioteca não estavam no treino.
          Para o modelo responder sobre eles, alguém precisa pôr o trecho certo no pedido. RAG é o nome de um jeito de
          fazer isso, e este post monta um, em TypeScript, para medir cada passo.
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

      <Parte id="o-que-e">
        <p>
          RAG quer dizer <em>retrieval-augmented generation</em>, geração aumentada por busca. O nome vem de um artigo de
          2020, mas a ideia cabe numa função: antes de chamar o modelo, o programa busca os trechos que parecem responder a
          pergunta e os põe no pedido, junto com a pergunta.
        </p>
        <Codigo rotulo="rag.ts">{CODIGO_RAG}</Codigo>
        <p>
          Quem busca é o programa, não o modelo. É a divisão do <a href="/modelo-agente-harness/">primeiro post</a>: o
          modelo só lê e escreve; o resto, inclusive a busca, é decisão de quem monta o pedido. Se a busca traz o trecho
          errado, o modelo responde com confiança a partir do trecho errado.
        </p>
        <p>
          Para medir, este post usa os documentos do próprio blog: o <code>CLAUDE.md</code> e o <code>README.md</code> da
          raiz e de cada post e o plano da série, {numero(dados.documentos.length)} arquivos em Markdown com{' '}
          {numero(corpus)} tokens. E {total()} perguntas de teste, cada uma com o trecho que a responde. Metade usa as
          mesmas palavras do trecho (<q>{dados.perguntas.find((p) => p.tipo === 'mesmas')!.pergunta}</q>); a outra metade
          pergunta com outras palavras (<q>{dados.perguntas.find((p) => p.id === 'renomear')!.pergunta}</q>, quando o
          texto diz <q>{dados.perguntas.find((p) => p.id === 'renomear')!.trecho}</q>).
        </p>
        <FontesEMetodo
          fontes={[FONTES.rag, FONTES.contextualRetrieval]}
          analise={[ANALISE.corpus, ANALISE.perguntas]}
          metodo={
            <>
              Os documentos foram copiados do repositório em 24 de outubro de 2026, para os números não mudarem quando eles
              mudarem. As perguntas foram escritas para este post, cada uma com um trecho que aparece no arquivo da
              resposta. É uma medição pequena, para ver o mecanismo, não um teste de qualidade dos métodos.
            </>
          }
        />
      </Parte>

      <Parte id="quem-faz">
        <p>
          Depende de onde você está. Nas ferramentas prontas, quem decide é o harness, e às vezes ele monta um RAG sem
          você ver:
        </p>
        <ul>
          <li>
            <strong>Nos projetos do Claude</strong> (nos planos pagos), enquanto os arquivos do projeto cabem na janela, eles
            vão inteiros no pedido. Quando se aproximam do limite, o Claude liga sozinho o modo RAG: o modelo passa a ter
            uma ferramenta de busca nos arquivos do projeto, e a capacidade cresce até dez vezes. Se os arquivos
            diminuem, ele volta a pôr tudo no pedido.
          </li>
          <li>
            <strong>Nos agentes de código</strong>, como o Claude Code e o Cursor, não há RAG do código: o agente procura
            com <code>grep</code> e lê os arquivos, como mostra a <Ver id="sem-rag" />.
          </li>
        </ul>
        <p>
          Quem escreve o próprio produto em cima da API não ganha nada disso: o modelo só lê o que vem no pedido, e
          buscar é trabalho do seu código. Há dois caminhos:
        </p>
        <ul>
          <li>
            <strong>Montar</strong>, como este post faz: dividir, indexar, buscar e pôr no pedido. Dá controle sobre cada
            passo, e é o que o resto do post mostra.
          </li>
          <li>
            <strong>Usar um RAG pronto do fornecedor.</strong> A OpenAI tem o <em>file search</em>: você sobe os arquivos e
            ela busca por significado e por palavras, como uma ferramenta que roda do lado dela. O Google tem o{' '}
            <em>File Search</em> da API do Gemini, que divide, gera os embeddings e indexa sozinho; você paga a indexação, e
            guardar é grátis. A Anthropic não tem banco de vetores nem modelo de embeddings, mas a API recebe o resultado
            da sua busca como <em>search results</em> e cita a fonte de cada trecho na resposta.
          </li>
        </ul>
        <p>
          A outra escolha é quando buscar. A função da <Ver id="o-que-e" /> busca antes de toda pergunta. A alternativa é
          dar a busca ao modelo como ferramenta, e ele decide se precisa buscar e o que procurar, no laço de agente do{' '}
          <a href="/modelo-agente-harness/#agente">primeiro post</a>. É o que os projetos do Claude fazem quando ligam o modo
          RAG.
        </p>
        <Codigo rotulo="ferramenta.ts">{CODIGO_FERRAMENTA}</Codigo>
        <FontesEMetodo
          fontes={[FONTES.claudeProjetos, FONTES.openaiFileSearch, FONTES.geminiFileSearch, FONTES.anthropicResultados, FONTES.claudeCode, FONTES.cursorBusca]}
          analise={[ANALISE.busca]}
          metodo={
            <>
              O que cada ferramenta faz vem da documentação dela, conferida em 25 de outubro de 2026. A Anthropic não diz em
              que tamanho exato os projetos do Claude passam para o modo RAG, só que é quando os arquivos se aproximam do
              limite da janela. O formato da ferramenta no exemplo é o da API da Anthropic.
            </>
          }
        />
      </Parte>

      <Parte id="pedacos">
        <p>
          O primeiro passo é dividir os documentos em pedaços (<em>chunks</em>). A busca devolve pedaços, não documentos:
          um documento inteiro pode ser grande demais para o pedido, e o trecho que responde se perde no meio dele.
        </p>
        <p>
          O jeito mais simples é cortar a cada tantos tokens, mas aí o corte cai no meio de uma frase ou separa um título
          do que vem embaixo. Aqui o corte respeita o Markdown: um pedaço nunca atravessa um título, e os parágrafos, os
          itens de lista e os trechos de código ficam inteiros enquanto couberem. Cada pedaço leva junto o nome do arquivo
          e os títulos acima dele, porque <q>só quando ele pede</q> não quer dizer nada sem saber que é sobre o deploy.
        </p>
        <Codigo rotulo="pedacos.ts">{CODIGO_DIVIDIR}</Codigo>
        <Divisao dados={dados} />
        <p>
          O tamanho é uma troca. Pedaço pequeno é preciso, mas pode deixar de fora o contexto da resposta; pedaço grande
          leva o contexto, mas mistura assuntos e ocupa mais do pedido. Nestes documentos, as seções são curtas: de 400
          para 800 tokens, o número de pedaços cai pouco (de {numero(pedacosDe(400))} para {numero(pedacosDe(800))}),
          porque quase todo pedaço já é uma seção inteira.
        </p>
        <FontesEMetodo
          fontes={[FONTES.contextualRetrieval]}
          analise={[ANALISE.pedacos, ANALISE.pedacosTs]}
          metodo={
            <>
              Tokens contados com o o200k_base, o tokenizador do <a href="/quanto-custa-um-token/">post sobre tokens</a>.
              Um bloco maior que o máximo é quebrado em frases, e uma frase maior que o máximo fica inteira: por isso alguns
              pedaços passam do limite. A Anthropic propõe ir além do nome do arquivo e dos títulos: pedir a um modelo que
              escreva, para cada pedaço, uma frase situando-o no documento.
            </>
          }
        />
      </Parte>

      <Parte id="palavras">
        <p>
          A busca mais antiga é por palavras. O BM25, a conta que os buscadores usam há décadas, dá uma nota a cada pedaço:
          sobe quando ele tem as palavras da pergunta, sobe mais quando a palavra é rara no corpus e desconta pedaços
          longos, que têm muitas palavras por acaso.
        </p>
        <Codigo rotulo="busca.ts">{CODIGO_BM25}</Codigo>
        <p>
          Antes de comparar, as palavras passam por uma limpeza: sem acento, em minúsculas, sem as palavras mais comuns do
          português (<q>de</q>, <q>que</q>, <q>para</q>) e sem o plural em s. A busca abaixo roda nesta página, com o
          código acima. Escreva o que quiser:
        </p>
        <Busca dados={dados} modo="palavras" inicial="worker" />
        <p>
          Com os pedaços de até {numero(t.tamanho)} tokens, a busca por palavras pôs a resposta entre os {NO_PEDIDO}{' '}
          primeiros em {a('palavras', 'mesmas')} das {total('mesmas')} perguntas com as palavras do texto. Nas perguntas
          com outras palavras, foram {a('palavras', 'outras')} de {total('outras')}. Ela é exata e barata, e acha nomes
          próprios, códigos de erro e nomes de função, mas não sabe que <q>diretório</q> e <q>pasta</q> são a mesma coisa.
        </p>
        <FontesEMetodo
          fontes={[FONTES.bm25]}
          analise={[ANALISE.busca, ANALISE.buscaTs, ANALISE.perguntas]}
          metodo={
            <>
              BM25 com os parâmetros de costume (k1 = 1,2 e b = 0,75), sobre o texto do pedaço e o lugar dele. A conta é
              feita em Python, que é a referência, e repetida em TypeScript nesta página; os testes do repositório
              conferem que as duas dão as mesmas notas. A resposta conta como achada quando um dos {NO_PEDIDO} primeiros
              pedaços tem o trecho que responde a pergunta.
            </>
          }
        />
      </Parte>

      <Parte id="significado">
        <p>
          A outra busca compara significados. Um modelo de <em>embeddings</em> transforma cada texto num vetor, uma lista
          de números (aqui, 1.024), de um jeito que textos com sentido parecido dão vetores que apontam para o mesmo lado.
          A busca transforma a pergunta num vetor e procura os pedaços com o maior cosseno, o que mede esse ângulo.
        </p>
        <Codigo rotulo="embeddings.ts">{CODIGO_EMBEDDINGS}</Codigo>
        <p>
          Os vetores dos pedaços são calculados uma vez e guardados, num banco de vetores ou numa coluna do banco que você
          já tem; a cada pergunta, só a pergunta vira vetor. A Anthropic não tem modelo de embeddings e indica o da Voyage
          AI; aqui foi usado um modelo aberto, o {dados.modelo_de_embeddings.split('/')[1]}, rodando na máquina, sem API.
        </p>
        <p>
          Um vetor de 1.024 números não dá para desenhar, mas dá para
          espremer em dois e ver o que o modelo achou de cada pedaço. Ninguém disse a ele de que assunto cada pedaço
          trata, e mesmo assim os dois posts de economia ficam cada um no seu canto, longe das regras do blog e da série
          de IA:
        </p>
        <Vetores dados={dados} inicial="renomear" />
        <p>
          A régua embaixo do mapa é o que a busca usa de verdade: o cosseno de cada pedaço com a pergunta, e os maiores
          vão para o pedido. Os valores ficam apertados (na pergunta do exemplo, os {conta.exemplo.length} mais parecidos vão
          de {numero(Math.min(...conta.exemplo), 3)} a {numero(Math.max(...conta.exemplo), 3)}), e o que importa é a
          ordem. Escolha uma pergunta em que a busca por significado erra, como a da <q>FRED</q>, para ver o pedaço certo
          longe dos primeiros.
        </p>
        <p>
          Nas perguntas com outras palavras, a busca por significado pôs a resposta entre os {NO_PEDIDO} primeiros em{' '}
          {a('significado', 'outras')} de {total('outras')}, contra {a('palavras', 'outras')} da busca por palavras. Mas
          nas perguntas com as palavras do texto ela fez {a('significado', 'mesmas')}, contra {a('palavras', 'mesmas')}:
          o significado de <q>FRED</q> ou de <q>16 px</q> não diz muito, e o vetor do pedaço inteiro dilui o detalhe.
        </p>
        <FontesEMetodo
          fontes={[FONTES.e5, FONTES.e5Modelo, FONTES.fastembed, FONTES.anthropicEmbeddings]}
          analise={[ANALISE.embeddings, ANALISE.similaridades, ANALISE.mapa]}
          metodo={
            <>
              Os embeddings foram calculados com o {dados.modelo_de_embeddings} pelo FastEmbed, com os prefixos que o modelo
              pede (<q>query:</q> na pergunta e <q>passage:</q> no pedaço), e normalizados para tamanho 1. Ficam guardados os
              {' '}{dados.limite_da_fusao} pedaços mais parecidos de cada pergunta, em cada tamanho. O exemplo de código usa a
              API da Voyage AI como está na documentação da Anthropic; a medição não a usou.
            </>
          }
        />
      </Parte>

      <Parte id="hibrida">
        <p>
          Cada busca acerta onde a outra erra, como mostraram a <Ver id="palavras" /> e a <Ver id="significado" />, e daí vem a busca híbrida: rodar as duas e juntar as listas. As notas não se
          comparam (uma nota de BM25 de 12 e um cosseno de 0,8 não estão na mesma escala), então a junção mais usada olha só
          a posição: cada lista dá a cada pedaço 1 / (60 + posição), e os pontos se somam.
        </p>
        <Codigo rotulo="busca.ts">{CODIGO_FUSAO}</Codigo>
        <Busca dados={dados} modo="comparar" inicial="financiamento" />
        <Acertos dados={dados} />
        <p>
          O resultado aqui não é o do livro. Entre os {NO_PEDIDO} primeiros, a híbrida acertou {a('hibrida')} das {total()}{' '}
          perguntas, contra {a('palavras')} da busca por palavras e {a('significado')} da por significado: não foi a melhor
          em nenhum dos dois tipos de pergunta. O que ela fez foi nunca errar feio mais que as outras. Contando as perguntas em que a
          resposta nem apareceu entre os {LONGE} primeiros, foram {intervalo(conta.longe.hibrida)} na híbrida,{' '}
          {intervalo(conta.longe.significado)} na busca por significado e {intervalo(conta.longe.palavras)} na busca por
          palavras, conforme o tamanho do pedaço.
        </p>
        <p>
          Como não dá para saber de antemão com que palavras o usuário vai perguntar, é essa proteção que conta. Numa base
          maior e com mais perguntas, a Anthropic mediu o mesmo efeito de forma mais clara: juntar BM25 e embeddings (com o
          contexto escrito por um modelo em cada pedaço) cortou em 49% as falhas de busca entre os 20 primeiros pedaços, e
          um passo a mais, que reordena os candidatos com outro modelo, levou o corte a 67%.
        </p>
        <FontesEMetodo
          fontes={[FONTES.rrf, FONTES.contextualRetrieval]}
          analise={[ANALISE.busca, ANALISE.buscaTs, ANALISE.similaridades, ANALISE.perguntas]}
          metodo={
            <>
              Reciprocal rank fusion com a constante 60, a do artigo que a propôs, sobre os {dados.limite_da_fusao}{' '}
              primeiros de cada lista; a busca por palavras só lista pedaços com alguma palavra da pergunta. As duas buscas
              têm o mesmo peso. Com {total()} perguntas, uma ou duas de diferença entre os métodos é ruído; a medição da
              Anthropic usa outras bases e conta as falhas entre os 20 primeiros.
            </>
          }
        />
      </Parte>

      <Parte id="sem-rag">
        <p>
          Tudo isso existe para pôr no pedido só uma parte dos documentos. Mas os {numero(dados.documentos.length)}{' '}
          documentos deste blog somam {numero(corpus)} tokens, {pct(corpus / conta.menorJanela, 1)} da menor janela da{' '}
          <a href="/janela-de-contexto/#janela">tabela do post 5</a>. Cabem inteiros no pedido, e aí não há busca para errar. A
          própria Anthropic diz que, abaixo de 200 mil tokens (umas 500 páginas), dá para pôr a base inteira no pedido e
          pular o RAG.
        </p>
        <p>
          O custo é a outra pergunta. Com tudo no pedido, cada pergunta paga os {numero(corpus)} tokens; com a busca, paga
          os {numero(dados.pedacos_no_pedido)} pedaços que ela trouxe, {numero(dados.tokens_da_busca)} tokens em média. O{' '}
          <a href="/o-que-e-uma-sessao/#cache">cache de prompt</a> muda a conta, porque os documentos são o mesmo começo
          em toda pergunta: no {modelo.nome}, {numero(PERGUNTAS_NA_CONTA)} perguntas custam{' '}
          {dolares(custo.tudoSemCache! * PERGUNTAS_NA_CONTA)} com tudo fora do cache,{' '}
          {dolares(custo.tudoComCache! * PERGUNTAS_NA_CONTA)} com os documentos lidos do cache e{' '}
          {dolares(custo.rag * PERGUNTAS_NA_CONTA)} com a busca.{' '}
          {custo.tudoComCache! <= custo.rag
            ? 'Com o cache, pôr tudo no pedido sai até mais barato que buscar.'
            : `Com o cache, pôr tudo no pedido sai só ${pct(custo.tudoComCache! / custo.rag - 1)} mais caro que buscar.`}{' '}
          {custo.saida * modelo.saida > corpus * modelo.entrada_cache &&
            'A resposta, que é a mesma nos dois jeitos, pesa mais na conta que os documentos lidos do cache.'}
        </p>
        <Custo precos={dados.precos} corpus={corpus} pedacos={dados.tokens_da_busca} inicial={MODELO} />
        <p>
          A conta só vira de verdade quando os documentos crescem: com milhões de tokens, nada cabe na janela, e buscar é a
          única saída. Entre os dois extremos, lembre do <a href="/janela-de-contexto/#caber">post 5</a>: caber não é o
          mesmo que ser bem usado, e um pedido enorme também piora a resposta.
        </p>
        <h3>E o código?</h3>
        <p>
          Para código, os agentes têm uma terceira opção: deixar o modelo buscar. O Claude Code não tem índice de
          embeddings; ele tem ferramentas para procurar arquivos por nome e texto por expressão regular, e o modelo decide o
          que procurar, lê o resultado e procura de novo. Segundo o resumo da entrevista do Pragmatic Engineer com Boris
          Cherny, que criou o Claude Code, o time testou bancos de vetores locais e outros índices, e o <code>glob</code> e o{' '}
          <code>grep</code> comandados pelo modelo ganharam: índices ficam desatualizados e complicam as permissões.
        </p>
        <p>
          Na sessão real dos <a href="/o-que-e-uma-sessao/">posts 4</a> e <a href="/janela-de-contexto/">5</a>, foram{' '}
          {numero(conta.ferramentas)} pedidos de ferramenta em {numero(sessao.chamadas)} chamadas. Dos{' '}
          {numero(sessao.comandos)} comandos de terminal, {numero(sessao.comandos_com_busca)} usaram <code>grep</code>,{' '}
          <code>find</code> ou <code>ls</code> para procurar, e o agente leu arquivos inteiros com a ferramenta de leitura{' '}
          {numero(conta.leituras)} vezes. Nenhuma busca por embeddings: não havia.
        </p>
        <p>
          O Cursor chegou a ir pelo outro caminho. Em novembro de 2025, publicou que o agente dele acertava em média 12,5%
          mais nas perguntas sobre o código com a busca por significado junto com o <code>grep</code> (de 6,5% a 23,5%,
          conforme o modelo). Em 2026, montou um índice local para o agente buscar por expressão regular, e a documentação
          atual diz que o Cursor não guarda embeddings do código para busca: o agente usa esse <code>grep</code> rápido e
          um subagente que explora o projeto. Os dois agentes chegaram ao mesmo lugar.
        </p>
        <FontesEMetodo
          fontes={[FONTES.contextualRetrieval, FONTES.claudeCode, FONTES.pragmatic, FONTES.cursor, FONTES.cursorRegex, FONTES.cursorBusca, FONTES.sessao]}
          analise={[ANALISE.custo, ANALISE.precos, ANALISE.contagem, ANALISE.leitura]}
          metodo={
            <>
              Preços em dólares por milhão de tokens, conferidos em {consultadoEm}. Cada pergunta leva {numero(custo.extra)}{' '}
              tokens de instruções e pergunta e recebe {numero(custo.saida)} de resposta; com o cache, só os documentos são
              lidos dele, e a gravação no cache fica de fora (ela acontece quando o cache expira). Onde há faixa de contexto
              longo, o pedido inteiro paga o preço dela. Na sessão real, um comando conta como busca quando chama{' '}
              <code>grep</code>, <code>rg</code>, <code>find</code> ou <code>ls</code>; do registro saíram só os números. O
              relato sobre o Claude Code é o resumo de uma entrevista, não uma medição publicada; o número do Cursor é de
              uma avaliação interna da empresa, de 2025, e a documentação dele foi conferida em 25 de outubro de 2026.
            </>
          }
        />
      </Parte>

      <Parte id="nomes">
        <p>
          Tudo o que este post mediu depende de uma coisa que não é técnica: os nomes. A busca por palavras só acha o que
          tem a palavra procurada. A busca por significado usa o nome do arquivo e os títulos para saber de que um pedaço
          trata. E o agente de código só acha o que um <code>grep</code> alcança.
        </p>
        <p>
          Dá para medir isso nos documentos do blog: basta tirar de cada pedaço o arquivo e os títulos e buscar de novo.
        </p>
        <Lugar dados={dados} />
        <p>
          Sem o lugar, a busca por significado pôs a resposta entre os {NO_PEDIDO} primeiros em {conta.lugar.semSignificado}{' '}
          das {total()} perguntas, contra {conta.lugar.comSignificado} com ele; em primeiro lugar, foram{' '}
          {conta.lugar.semSignificado1} contra {conta.lugar.comSignificado1}. Um item solto de uma lista diz pouco ao
          modelo; com <q>CLAUDE.md › O design</q> na frente, ele sabe de que o item trata. Na busca por palavras, a
          diferença foi pequena ({conta.lugar.semPalavras} contra {conta.lugar.comPalavras}), porque as palavras da
          resposta, em geral, já estão no texto.
        </p>
        <p>
          No código, vale o mesmo para o agente. Ele procura pelo nome, e o que tem nome genérico não aparece:
        </p>
        <Codigo rotulo="nomes.ts">{CODIGO_NOMES}</Codigo>
        <p>
          A divisão dos arquivos pesa tanto quanto o nome. O agente costuma ler o arquivo inteiro que achou: na sessão real,
          foram {numero(conta.leituras)} leituras. Um arquivo por assunto faz cada leitura trazer só o que interessa; um
          arquivo de três mil linhas com tudo entra inteiro na <a href="/janela-de-contexto/">janela de contexto</a> a cada
          vez. Títulos de seção que dizem o assunto ajudam a busca nos documentos e quem lê. E um <code>CLAUDE.md</code>{' '}
          que diz onde fica cada coisa poupa a procura: neste blog, ele diz que cada post mora em{' '}
          <code>posts/&lt;slug&gt;/</code> e que a conta em Python de um post se repete em TypeScript na página, e os
          nomes fazem o resto (<code>analise/pedacos.py</code> e <code>pagina/pedacos.ts</code> fazem a mesma divisão).
        </p>
        <FontesEMetodo
          fontes={[FONTES.contextualRetrieval, FONTES.claudeCode, FONTES.sessao]}
          analise={[ANALISE.semLugar, ANALISE.similaridades, ANALISE.busca, ANALISE.perguntas, ANALISE.contagem]}
          metodo={
            <>
              Os mesmos {numero(t.pedacos.length)} pedaços de até {numero(t.tamanho)} tokens, as mesmas perguntas e o mesmo
              modelo de embeddings; muda só o texto que a busca vê de cada pedaço: o lugar e o texto, ou só o texto. O
              exemplo de código é ilustrativo.
            </>
          }
        />
      </Parte>

      <Parte id="na-pratica">
        <p>Antes de montar um RAG, as perguntas que decidem:</p>
        <ul>
          <li>
            <strong>Cabe na janela?</strong> Se os documentos somam algumas dezenas de milhares de tokens, ponha tudo no
            pedido, com o cache. É menos código e nenhuma busca para errar.
          </li>
          <li>
            <strong>É código?</strong> Deixe o agente procurar com as ferramentas dele, e invista no que faz a busca dar
            certo: nomes de arquivo e de função que dizem o que a coisa é, um assunto por arquivo e um{' '}
            <code>CLAUDE.md</code> que diz onde fica cada parte.
          </li>
          <li>
            <strong>Não cabe, ou são muitas perguntas por dia numa base grande?</strong> Aí é RAG. Comece pela busca por
            palavras, que já vem pronta em muitos bancos (o SQLite e o Elasticsearch têm BM25), e acrescente embeddings
            quando as perguntas vierem com outras palavras. Junte as duas pela posição.
          </li>
          <li>
            <strong>Corte respeitando o texto</strong> e ponha em cada pedaço de onde ele veio: o arquivo, os títulos, uma
            frase de contexto. Nesta medição, só isso levou a busca por significado de {conta.lugar.semSignificado} para{' '}
            {conta.lugar.comSignificado} acertos em {total()}.
          </li>
          <li>
            <strong>Meça antes de mexer.</strong> Umas 30 perguntas com o trecho da resposta, como as deste post, já mostram
            se trocar o tamanho do pedaço ou o modelo de embeddings ajudou. Sem isso, cada mudança é palpite.
          </li>
        </ul>
        <FontesEMetodo
          fontes={[FONTES.contextualRetrieval, FONTES.claudeCode, FONTES.cursorBusca]}
          analise={[ANALISE.perguntas, ANALISE.busca, ANALISE.semLugar]}
          metodo={
            <>
              As recomendações juntam a medição deste post, o artigo da Anthropic sobre busca com contexto e a
              documentação do Claude Code.
            </>
          }
        />
      </Parte>

      <section className="secao" id="resumo">
        <h2>Em resumo</h2>
        <ul>
          <li>
            <strong>RAG é buscar antes de perguntar:</strong> o programa acha os trechos e os põe no pedido; o modelo só
            lê.
          </li>
          <li>
            <strong>A busca por palavras</strong> acha o termo exato; <strong>a por significado</strong>, a pergunta feita
            com outras palavras. Nestes documentos, cada uma ganhou num tipo de pergunta.
          </li>
          <li>
            <strong>A híbrida</strong> não foi a melhor em média, mas nunca errou feio mais que as outras.
          </li>
          <li>
            <strong>Os nomes decidem a busca:</strong> sem o arquivo e os títulos no pedaço, a busca por significado acertou{' '}
            {conta.lugar.semSignificado} em vez de {conta.lugar.comSignificado} das {total()} perguntas; no código, o agente
            só acha o que o nome deixa achar.
          </li>
          <li>
            <strong>Muitas vezes não precisa:</strong> se cabe na janela, ponha tudo, com cache; se é código, deixe o agente
            usar o <code>grep</code>.
          </li>
        </ul>
      </section>

      <footer className="rodape">
        <h2>Sobre os dados</h2>
        <p>
          Os documentos são uma cópia dos do blog em 24 de outubro de 2026; os preços foram conferidos em {consultadoEm}. A
          divisão, as buscas, os embeddings e as perguntas estão no{' '}
          <a href="https://github.com/igor-gregori/iblog/tree/main/posts/rag-sem-misterio" target="_blank" rel="noreferrer">
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
