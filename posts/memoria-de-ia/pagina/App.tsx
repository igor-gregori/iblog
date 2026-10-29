import { useMemo } from 'react'
import { Codigo } from '#base/Codigo.tsx'
import { ComoFoiFeito } from '#base/ComoFoiFeito.tsx'
import { FontesEMetodo } from '#base/FontesEMetodo.tsx'
import { dolares, numero, pct, vezes } from '#base/formato.ts'
import { LinkDoGlossario } from '#base/LinkDoGlossario.tsx'
import { partes } from '#base/Partes.tsx'
import { MILHAO } from '#base/precos.ts'
import { Topo } from '#base/Topo.tsx'
import { useJson } from '#base/useJson.ts'
import { Calculadora, DIAS } from './components/Calculadora.tsx'
import { Crescimento } from './components/Crescimento.tsx'
import { MemoriaNaSessao } from './components/MemoriaNaSessao.tsx'
import { custoDaMemoria, custoDoPedido, custoMensal, custoMensalSemCache } from './conta.ts'
import { emTokensDoClaude, preco, urlDosDados, type Dados } from './dados.ts'
import { ANALISE, FONTES } from './fontes.ts'

/** As partes do artigo, na ordem em que aparecem; o sumário aponta para elas. */
const PARTES = [
  { id: 'nao-aprende', titulo: 'O modelo não aprende com você' },
  { id: 'tres-jeitos', titulo: 'Três jeitos de lembrar' },
  { id: 'quem-escreve', titulo: 'Quem escreve: você ou o agente' },
  { id: 'custo', titulo: 'Lembrar custa, a cada chamada' },
  { id: 'cresce', titulo: 'A memória que só cresce' },
  { id: 'na-pratica', titulo: 'O que fazer com isso' },
] as const

const { Parte, Ver } = partes(PARTES)

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

/** "2026-10-22" → "22 de outubro de 2026" */
function diaPorExtenso(data: string) {
  const [ano, mes, dia] = data.split('-').map(Number)
  return `${dia} de ${MESES[mes - 1]} de ${ano}`
}

/** "2026-10-03" → "3 de outubro" */
function diaEMes(data: string) {
  const [, mes, dia] = data.split('-').map(Number)
  return `${dia} de ${MESES[mes - 1]}`
}

/** 1.6279 → "1,63" */
const DUAS_CASAS = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })

/** Arredonda para o passo da régua da calculadora. */
const naRegua = (valor: number, passo: number) => Math.max(passo, Math.round(valor / passo) * passo)

const CODIGO_MEMORIA = `// A "memória" de um assistente: um arquivo que volta para o pedido a cada chamada
import { appendFile, readFile } from 'node:fs/promises'

async function responder(conversa: Mensagem[]) {
  const memoria = await readFile('MEMORIA.md', 'utf8')
  return modelo.responder({
    system: \`\${instrucoes}\\n\\nO que você sabe deste usuário e deste projeto:\\n\${memoria}\`,
    messages: conversa,
  })
}

// Lembrar de algo novo é escrever no arquivo. O modelo só "sabe" na próxima chamada,
// quando o texto volta no pedido.
async function lembrar(fato: string) {
  await appendFile('MEMORIA.md', \`- \${fato}\\n\`)
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
  const conferidaEm = diaPorExtenso(dados.documentacao_conferida_em)
  const { pedidos, cargas, automatica, historico, calibracao } = dados
  const emTokens = (texto: number) => emTokensDoClaude(dados, texto)

  // Os números do texto saem dos dados, para continuarem certos quando a medição ou os preços mudarem.
  const conta = useMemo(() => {
    const modelo = preco(dados, dados.modelo_da_sessao)
    const soma = (valor: (p: (typeof pedidos)[number]) => number) => pedidos.reduce((total, p) => total + valor(p), 0)
    const memoria = soma((p) => p.memoria)
    const lida = soma((p) => p.memoria_lida)
    const pico = pedidos.reduce((a, b) => (b.memoria > a.memoria ? b : a))
    const dias = new Set(pedidos.map((p) => p.dia)).size
    const regravacoes = pedidos.filter((p) => p.memoria_lida < p.memoria).length
    const primeiro = historico[0]
    const ultimo = historico[historico.length - 1]
    const raiz = emTokensDoClaude(dados, ultimo.raiz_texto)
    // O ponto de partida da calculadora: o CLAUDE.md da raiz e o ritmo da sessão, nos passos das réguas.
    const porDia = {
      tokens: naRegua(raiz, 500),
      chamadas: naRegua(pedidos.length / dias, 5),
      gravacoes: Math.max(1, Math.round(regravacoes / dias)),
    }
    return {
      modelo,
      memoria,
      contexto: soma((p) => p.contexto),
      antigas: memoria - soma((p) => p.memoria_atual),
      lida,
      gravada: memoria - lida,
      pico,
      dias,
      regravacoes,
      custo: soma((p) => custoDoPedido(modelo, p)),
      custoMemoria: soma((p) => custoDaMemoria(modelo, p)),
      semCache: (memoria * modelo.entrada) / MILHAO,
      raizNaSessao: cargas.filter((c) => c.arquivo === 'CLAUDE.md'),
      retomadas: cargas.filter((c) => c.motivo === 'retomada').length,
      daPasta: cargas.filter((c) => c.motivo === 'pasta'),
      primeiro,
      ultimo,
      raiz,
      posts: emTokensDoClaude(dados, ultimo.posts_texto),
      custoLida: (lida * modelo.entrada_cache) / MILHAO,
      porDia,
      mes: custoMensal(modelo, porDia.tokens, porDia.chamadas, porDia.gravacoes, DIAS),
      mesSemCache: custoMensalSemCache(modelo, porDia.tokens, porDia.chamadas, DIAS),
    }
  }, [dados, pedidos, cargas, historico])

  const tipos = automatica.por_tipo
  const primeira = pedidos[0]

  return (
    <main className="artigo" id="inicio">
      <header className="abertura">
        <p className="sobretitulo">IA para quem já programa · 8</p>
        <h1>O que é a memória de uma IA, e onde ela fica?</h1>
        <p className="subtitulo">
          O modelo não aprende com você: o que parece memória é texto que volta para o pedido. Os três jeitos de fazer
          isso, quem escreve a memória, quanto ela custa numa sessão real de {numero(pedidos.length)} chamadas e o que
          acontece quando ela só cresce.
        </p>
        <p className="assinatura">Igor Gregori · Documentação conferida em {conferidaEm}</p>
      </header>

      <div className="texto">
        <p>
          O ChatGPT lembra que você prefere respostas curtas. O Claude Code abre um projeto e já sabe que os testes rodam
          com <code>npm test</code>. Parece que o modelo aprendeu alguma coisa com você. Não aprendeu: alguém guardou um
          texto e o pôs de volta no pedido. Este post mostra onde esse texto fica, quem o escreve e quanto ele custa, com
          os arquivos de memória deste blog e uma sessão real do Claude Code.
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

      <Parte id="nao-aprende">
        <p>
          Dois posts desta série já disseram o essencial. O <a href="/como-um-modelo-e-treinado/#pesos">post 2</a>: os
          pesos do modelo, os números que definem o que ele faz, ficam congelados depois do treino, e usar o modelo não muda
          nenhum deles. O <a href="/o-que-e-uma-sessao/#sem-memoria">post 4</a>: a API não guarda nada de uma chamada para
          a outra, e por isso cada chamada leva a conversa inteira.
        </p>
        <p>
          Então a memória de qualquer produto de IA é sempre a mesma coisa: um texto guardado fora do modelo, que o
          programa em volta dele, o <a href="/modelo-agente-harness/">harness</a>, põe de volta no pedido. Em código, a
          versão mais simples cabe em poucas linhas:
        </p>
        <Codigo rotulo="memoria.ts">{CODIGO_MEMORIA}</Codigo>
        <p>Daí saem quatro consequências que valem para todas as memórias deste post:</p>
        <ul>
          <li>
            <strong>Ela custa tokens em toda chamada em que entra</strong>, como qualquer outra parte do pedido.
          </li>
          <li>
            <strong>Ela ocupa a <a href="/janela-de-contexto/">janela de contexto</a></strong> e disputa a atenção do
            modelo com o resto.
          </li>
          <li>
            <strong>O modelo não sabe se ela ainda é verdade.</strong> Ele lê o que está escrito, sem saber quando foi
            escrito nem se mudou.
          </li>
          <li>
            <strong>Dá para ler e corrigir</strong>, porque é texto. Muda o texto, muda a <q>memória</q>.
          </li>
        </ul>
        <FontesEMetodo
          fontes={[FONTES.claudeCodeMemoria, FONTES.ferramentaDeMemoria]}
          analise={[]}
          metodo={
            <>
              O código é ilustrativo: <code>modelo.responder</code> é a chamada à API do fornecedor, como no{' '}
              <a href="/rag-sem-misterio/">post sobre RAG</a>. A documentação do Claude Code diz que o CLAUDE.md vai ao
              modelo como uma mensagem de usuário logo depois do prompt de sistema, e não dentro dele; o efeito é o mesmo:
              texto no pedido.
            </>
          }
        />
      </Parte>

      <Parte id="tres-jeitos">
        <p>
          Os produtos variam no nome, mas só existem três jeitos de pôr a memória de volta no pedido. O que muda entre
          eles é quando o texto entra:
        </p>
        <div className="rolagem-x">
          <table className="quadro quadro-texto">
            <thead>
              <tr>
                <th>Jeito</th>
                <th>Quando entra</th>
                <th>Exemplos</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>Um arquivo lido no começo</th>
                <td>Em toda sessão</td>
                <td>
                  O <code>CLAUDE.md</code> ou o <code>AGENTS.md</code> do projeto; o índice da memória automática do Claude
                  Code
                </td>
              </tr>
              <tr>
                <th>Um resumo</th>
                <td>Quando a conversa cresce</td>
                <td>
                  A <a href="/janela-de-contexto/#compactacao">compactação</a> do post 5; a memória antiga dos apps do
                  Claude, uma síntese das conversas refeita a cada 24 horas
                </td>
              </tr>
              <tr>
                <th>Uma busca</th>
                <td>Quando o modelo pede</td>
                <td>
                  A busca nas conversas antigas dos apps do Claude; a ferramenta de memória da API da Anthropic; as notas
                  da memória automática, que o agente lê quando acha que precisa
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          <strong>O arquivo lido no começo</strong> entra inteiro, antes da sua primeira mensagem, e é garantido: o
          modelo sempre o vê. Em troca, ele é pago em toda chamada, precise ou não. É o jeito do <code>CLAUDE.md</code>, e é o que este post mede na{' '}
          <Ver id="custo" />.
        </p>
        <p>
          <strong>O resumo</strong> cabe em pouco espaço, mas alguém escolhe o que fica, e o detalhe que não entrou
          some. O <a href="/janela-de-contexto/#compactacao">post 5</a> mostrou a compactação jogando fora quase toda a
          conversa. A documentação dos apps do Claude diz que a memória deles deixou de ser um resumo das conversas: agora
          ele guarda tópicos à medida que você conversa, e a síntese diária ficou só para algumas organizações.
        </p>
        <p>
          <strong>A busca</strong> é uma ferramenta que o modelo chama. Só gasta tokens quando é usada, mas depende de o modelo lembrar de buscar e de a busca
          achar, os mesmos problemas do <a href="/rag-sem-misterio/">RAG do post 7</a>. A documentação dos apps do Claude
          diz isso com todas as letras: a busca nas conversas antigas <q>usa RAG e aparece como chamada de ferramenta</q>.
          E na ferramenta de memória da API, o modelo pede para ver, criar, editar, renomear e apagar arquivos numa pasta{' '}
          <code>/memories</code>, e o seu programa executa. A memória mora inteira na sua aplicação; a API acrescenta ao
          prompt de sistema o aviso para o modelo olhar essa pasta antes de qualquer coisa.
        </p>
        <FontesEMetodo
          fontes={[FONTES.claudeCodeMemoria, FONTES.claudeMemoria, FONTES.ferramentaDeMemoria, FONTES.claudeCodeContexto]}
          analise={[]}
          metodo={
            <>
              A classificação em três jeitos é deste post; os exemplos vêm da documentação de cada produto, conferida em{' '}
              {conferidaEm}. A síntese a cada 24 horas aparece na documentação dos apps do Claude como a experiência antiga,
              que <q>um pequeno número</q> de organizações dos planos Team e Enterprise ainda usa. A busca nas conversas
              antigas é dos planos pagos.
            </>
          }
        />
      </Parte>

      <Parte id="quem-escreve">
        <p>A outra diferença entre as memórias é quem escreve o texto.</p>
        <h3>Você escreve: o CLAUDE.md</h3>
        <p>
          O <code>CLAUDE.md</code> é um arquivo comum, escrito por você (ou pelo agente, quando você pede) e guardado no
          projeto. O Claude Code lê vários, do mais geral ao mais específico, e junta todos no pedido: o da organização,
          o seu (<code>~/.claude/CLAUDE.md</code>, para todos os projetos), o do projeto e o local (
          <code>CLAUDE.local.md</code>, fora do git). Os de subpastas não entram no começo: cada um entra quando o agente
          lê, escreve ou edita um arquivo daquela pasta. Um repositório feito para outros agentes, com um{' '}
          <code>AGENTS.md</code>, também serve: o Claude Code o lê quando não há <code>CLAUDE.md</code>.
        </p>
        <p>
          Um <code>CLAUDE.md</code> pode importar outros arquivos com <code>@caminho</code>, até quatro níveis. Organiza,
          mas não economiza: o arquivo importado entra junto com o que o importou.
        </p>
        <h3>O agente escreve: a memória automática</h3>
        <p>
          Com a memória automática, ligada por padrão nas sessões locais do Claude Code, o próprio agente decide o que
          vale guardar. Ele grava um arquivo por memória numa pasta da sua máquina (
          <code>~/.claude/projects/&lt;projeto&gt;/memory/</code>), com um tipo: o que sabe de você (<code>user</code>), as
          correções e preferências que você deu (<code>feedback</code>), o andamento do projeto (<code>project</code>) e
          onde achar as coisas (<code>reference</code>). Um índice, o <code>MEMORY.md</code>, entra no começo de toda
          conversa, até 200 linhas ou 25 KB. Cada memória só entra quando o agente decide lê-la.
        </p>
        <p>
          Na máquina do Igor, {numero(automatica.com_pasta)} das {numero(automatica.projetos)} pastas de projeto do Claude
          Code têm a pasta de memória, e {numero(automatica.com_memorias)} têm alguma memória:{' '}
          {numero(automatica.memorias)} ao todo, escritas pelo agente. São {numero(tipos.feedback ?? 0)} do tipo{' '}
          <code>feedback</code>, {numero(tipos.project ?? 0)} de <code>project</code>, {numero(tipos.reference ?? 0)} de{' '}
          <code>reference</code> e {numero(tipos.user ?? 0)} de <code>user</code>. O índice maior tem{' '}
          {numero(automatica.indice_maior)} bytes, umas poucas linhas, e a memória típica,{' '}
          {numero(automatica.memoria_mediana)} bytes.
        </p>
        <p>
          Neste blog, {automatica.deste_blog === 0 ? 'nenhuma' : numero(automatica.deste_blog)}. O{' '}
          <code>MEMORY.md</code> existe e está vazio, porque o <code>CLAUDE.md</code> da raiz pede outra coisa: cada
          decisão do Igor vai, com data, para o <code>CLAUDE.md</code> do post. A diferença é onde o texto mora. O{' '}
          <code>CLAUDE.md</code> está no git: passa pelo pull request junto com o código, o Igor lê antes de aprovar e ele
          vale em qualquer máquina. A memória automática fica só nesta máquina, e ninguém revisa o que o agente anotou.
        </p>
        <h3>Nos apps de chat</h3>
        <p>
          Nos apps do Claude, a memória fica ligada por padrão nos planos individuais. Ele guarda tópicos enquanto você
          conversa, sozinho ou quando você pede (<q>lembre disso</q>), e cada projeto tem a sua memória. Dá para ler,
          editar e apagar cada tópico nas configurações. O ChatGPT tem dois tipos: as memórias salvas, guardadas à parte
          das conversas, e a referência ao histórico, que usa o que há nas conversas antigas.
        </p>
        <p>
          Os dois avisam a mesma coisa: apagar uma conversa não apaga a memória tirada dela. A memória é outro texto, em
          outro lugar.
        </p>
        <FontesEMetodo
          fontes={[FONTES.claudeCodeMemoria, FONTES.claudeMemoria, FONTES.chatgptMemoria, FONTES.automatica]}
          analise={[ANALISE.automatica]}
          metodo={
            <>
              A contagem foi feita em {diaPorExtenso(automatica.conferido_em)} nas pastas{' '}
              <code>~/.claude/projects/*/memory/</code> da máquina do Igor: o tipo de cada memória vem do cabeçalho do
              arquivo, e o tamanho é em bytes. Ficaram de fora os nomes e os textos, que falam de outros projetos. A página
              de ajuda da OpenAI recusou a leitura automática; o que o texto diz do ChatGPT vem dos trechos dela que a busca
              mostra.
            </>
          }
        />
      </Parte>

      <Parte id="custo">
        <p>
          Quanto custa o arquivo lido no começo? Dá para medir numa sessão real: a do Claude Code em que os posts 4 a 7
          desta série foram feitos, de 21 a 25 de outubro de 2026, com {numero(pedidos.length)} chamadas ao{' '}
          {conta.modelo.nome}. O registro da sessão mostra cada vez que um <code>CLAUDE.md</code> entrou no pedido, e a
          API diz o tamanho exato de cada pedido.
        </p>
        <MemoriaNaSessao pedidos={pedidos} cargas={cargas} />
        <p>
          Na primeira chamada, o <code>CLAUDE.md</code> da raiz tinha {numero(primeira.memoria)} tokens, {pct(primeira.memoria / primeira.contexto)}{' '}
          do pedido. Com a conversa crescendo, a parte dele cai, mas ele continua lá em todas as chamadas. Somando a
          sessão, os <code>CLAUDE.md</code> foram {numero(conta.memoria / 1e6, 2)} milhões de tokens, {pct(conta.memoria / conta.contexto, 1)}{' '}
          de tudo o que foi enviado.
        </p>
        <p>
          O pico, na chamada {numero(conta.pico.chamada)}, tinha {numero(conta.pico.memoria)} tokens de memória, mas só{' '}
          {numero(conta.pico.memoria_atual)} eram a versão em vigor de cada arquivo. O resto eram cópias antigas. O Igor
          voltou à sessão {vezes(conta.retomadas)} depois de o{' '}
          <code>CLAUDE.md</code> mudar, e a cada vez o Claude Code mandou o arquivo de novo, inteiro, avisando que a versão
          nova substitui a antiga. Só que a antiga não sai: o pedido só cresce no fim, para o{' '}
          <a href="/o-que-e-uma-sessao/#cache">cache</a> continuar valendo, e o modelo lê as duas. O mesmo aconteceu com o{' '}
          <code>CLAUDE.md</code> de um post, que entrou de novo depois de editado. Só a compactação limpou. Ao todo, as
          cópias antigas foram {pct(conta.antigas / conta.memoria)} da memória da sessão.
        </p>
        <p>
          Em dinheiro, pouco, por causa do cache. A memória custou {dolares(conta.custoMemoria)} dos {dolares(conta.custo)}{' '}
          da sessão ({pct(conta.custoMemoria / conta.custo, 1)}). Quase toda ela, {pct(conta.lida / conta.memoria)}, foi lida
          do cache, a {dolares(conta.modelo.entrada_cache)} por milhão de tokens. O resto foi gravado de novo em{' '}
          {numero(conta.regravacoes)} chamadas, as que vieram depois de uma pausa maior que o prazo do cache ou da
          compactação. Gravar custa {numero(conta.modelo.gravacao_cache_longa! / conta.modelo.entrada_cache)} vezes o preço
          da leitura: os {numero(conta.gravada / 1000)} mil tokens gravados custaram{' '}
          {dolares(conta.custoMemoria - conta.custoLida)}, e os {numero(conta.lida / 1e6, 2)} milhões lidos,{' '}
          {dolares(conta.custoLida)}. Sem cache, a mesma memória custaria {dolares(conta.semCache)}.
        </p>
        <p>
          Para a sua memória, mude o tamanho e o ritmo. Os valores iniciais são os da sessão: o <code>CLAUDE.md</code> da
          raiz deste blog, {numero(conta.porDia.chamadas)} chamadas e {numero(conta.porDia.gravacoes)} gravações no cache por
          dia.
        </p>
        <Calculadora
          precos={dados.precos}
          inicial={conta.porDia}
        />
        <p>
          No {conta.modelo.nome}, um <code>CLAUDE.md</code> do tamanho do deste blog (uns {numero(conta.porDia.tokens)}{' '}
          tokens) custa {dolares(conta.mes)} por mês com cache, e {dolares(conta.mesSemCache)} sem. O custo que mais pesa não está na fatura: é o espaço e a
          atenção que a memória tira do resto do pedido, e o que acontece quando ela fica velha.
        </p>
        <FontesEMetodo
          fontes={[FONTES.sessao, FONTES.cargas, FONTES.anthropicPrecos, FONTES.openaiPrecos, FONTES.googlePrecos]}
          analise={[ANALISE.sessao, ANALISE.calibracao, ANALISE.leitura, ANALISE.contagem, ANALISE.conta, ANALISE.precos]}
          metodo={
            <>
              O tamanho de cada pedido e o uso do cache são os que a API cobrou. O tamanho de cada <code>CLAUDE.md</code> é
              estimado: o texto é contado com o tokenizador do <a href="/quanto-custa-um-token/">post 3</a> e convertido em
              tokens do Claude por um fator medido na própria sessão ({DUAS_CASAS.format(calibracao.fator)} tokens do Claude
              por token do outro, numa reta que explica {pct(calibracao.r2)} do crescimento de {numero(calibracao.trechos)}{' '}
              pedidos sem imagem). Uma cópia fica em todos os pedidos seguintes até a compactação. Ela conta como lida do
              cache quando o pedido leu do cache até depois do lugar em que ela entrou; senão, como gravada, pelo preço da
              gravação daquela chamada (na sessão, toda gravação foi no prazo de 1 hora). Preços em dólares por milhão de
              tokens, conferidos em {consultadoEm}. Na calculadora, o mês tem {DIAS} dias de trabalho, e a gravação usa o
              prazo longo do cache, onde existe. Do registro saíram só os números.
            </>
          }
        />
      </Parte>

      <Parte id="cresce">
        <p>
          Memória escrita à mão tem um defeito previsível: cada decisão vira uma linha, e quase nenhuma sai. O{' '}
          <code>CLAUDE.md</code> da raiz deste blog nasceu em {diaEMes(conta.primeiro.data)} com{' '}
          {numero(conta.primeiro.raiz_linhas)} linhas e chegou ao fim do post 7, em {diaEMes(conta.ultimo.data)}, com{' '}
          {numero(conta.ultimo.raiz_linhas)}: de {numero(emTokens(conta.primeiro.raiz_texto))} para{' '}
          {numero(conta.raiz)} tokens, {DUAS_CASAS.format(conta.raiz / emTokens(conta.primeiro.raiz_texto))} vezes o tamanho, em{' '}
          {numero((Date.parse(conta.ultimo.data) - Date.parse(conta.primeiro.data)) / 864e5)} dias.
        </p>
        <Crescimento historico={historico} emTokens={emTokens} />
        <p>
          A divisão entre a raiz e os posts é o que segura a conta. Os {numero(conta.ultimo.posts)}{' '}
          <code>CLAUDE.md</code> dos posts somam {numero(conta.posts)} tokens,{' '}
          {DUAS_CASAS.format(conta.posts / conta.raiz)} vezes o da raiz, mas cada um só entra quando o agente mexe na pasta
          daquele post. Na sessão real, com quatro posts escritos, entraram {vezes(conta.daPasta.length)}. A documentação do Claude Code recomenda menos de 200 linhas
          por arquivo, porque <q>arquivos mais longos consomem mais contexto e reduzem a aderência</q>. O da raiz está em{' '}
          {numero(conta.ultimo.raiz_linhas)}.
        </p>
        <p>
          O tamanho é o problema menor. O maior é o que fica velho. Ao escrever este post, o <code>CLAUDE.md</code> da raiz
          tinha duas frases que já não eram verdade: dizia que a pasta do projeto era <code>/home/igor/iblog</code>, que
          não existe mais, e que <q>os dois</q> posts existentes já estavam publicados, quando eram nove. O agente lê
          as duas como verdade. Antes de cada <code>CLAUDE.md</code>, o Claude Code põe um aviso que diz, em inglês, que
          aquelas instruções substituem qualquer comportamento padrão e devem ser seguidas exatamente como estão escritas.
          As duas frases foram corrigidas junto com este post.
        </p>
        <p>
          É por isso que memória errada é pior que nenhuma. Sem memória, o agente pergunta ou procura. Com uma memória
          velha, ele age com segurança na direção errada.
        </p>
        <FontesEMetodo
          fontes={[FONTES.historico, FONTES.claudeCodeMemoria, FONTES.cargas]}
          analise={[ANALISE.historico, ANALISE.calibracao, ANALISE.contagem]}
          metodo={
            <>
              Para cada dia em que algum <code>CLAUDE.md</code> mudou, o último commit do dia, até o merge do post 7 na{' '}
              <code>main</code>. Antes de {diaEMes('2026-10-10')}, o arquivo era o do repositório do primeiro post, que virou
              este. Os tokens são do tokenizador do post 3, convertidos pelo fator da sessão real (
              {DUAS_CASAS.format(calibracao.fator)}). O aviso antes do <code>CLAUDE.md</code> está no registro da sessão real,
              no texto que o Claude Code mandou à API.
            </>
          }
        />
      </Parte>

      <Parte id="na-pratica">
        <p>Com o que a medição mostrou, o que ajuda a memória a servir e a custar pouco:</p>
        <ul>
          <li>
            <strong>Trate a memória como código.</strong> No git, revisada no pull request, com data em cada decisão. A
            data mostra o que pode ter ficado velho.
          </li>
          <li>
            <strong>A raiz fica curta; o resto vai para a pasta.</strong> O que só vale para uma parte do projeto vai para
            o <code>CLAUDE.md</code> daquela pasta, que só entra quando o agente mexe nela. Neste blog, os dos posts somam{' '}
            {numero(conta.posts)} tokens, e cada pedido leva só o do post em que o agente está mexendo.
          </li>
          <li>
            <strong>Apague o que deixou de valer.</strong> Uma frase errada custa os mesmos tokens que uma certa, e engana.
          </li>
          <li>
            <strong>Mudou o CLAUDE.md no meio de uma sessão longa?</strong> A versão antiga continua no pedido. Para uma
            mudança que importa, comece uma sessão nova (<code>/clear</code>) ou compacte, e o agente só vê a nova.
          </li>
          <li>
            <strong>Leia a memória automática.</strong> No Claude Code, <code>/memory</code> mostra os arquivos e liga ou
            desliga a memória automática. O que for regra do time vai para o <code>CLAUDE.md</code>, que todos veem.
          </li>
          <li>
            <strong>Nos apps de chat, olhe o que está salvo.</strong> Nos do Claude, a memória fica em Configurações e
            pode ser desligada numa conversa só; no ChatGPT, em Configurações, Personalização, Memória. Apagar a conversa não
            apaga a memória tirada dela.
          </li>
        </ul>
        <FontesEMetodo
          fontes={[FONTES.claudeCodeMemoria, FONTES.claudeMemoria, FONTES.chatgptMemoria]}
          analise={[ANALISE.sessao, ANALISE.historico]}
          metodo={
            <>
              As recomendações juntam a medição deste post e a documentação do Claude Code, dos apps do Claude e do ChatGPT,
              conferida em {conferidaEm}. Os caminhos das configurações dos apps mudam com as versões.
            </>
          }
        />
      </Parte>

      <section className="secao" id="resumo">
        <h2>Em resumo</h2>
        <ul>
          <li>
            <strong>O modelo não aprende com você.</strong> Memória é texto guardado fora dele que volta para o pedido.
          </li>
          <li>
            <strong>São três jeitos:</strong> um arquivo lido no começo, um resumo ou uma busca por ferramenta. O arquivo é
            garantido e pago em toda chamada; a busca só custa quando usada, mas pode não achar.
          </li>
          <li>
            <strong>Quem escreve importa:</strong> o <code>CLAUDE.md</code> está no git e é revisado; a memória automática
            fica na máquina, escrita pelo agente.
          </li>
          <li>
            <strong>Com cache, custa pouco:</strong> na sessão real, {pct(conta.custoMemoria / conta.custo, 1)} do custo.
            Mas ocupa espaço, e {pct(conta.antigas / conta.memoria)} da memória eram cópias antigas do mesmo arquivo.
          </li>
          <li>
            <strong>Memória velha engana:</strong> o agente segue o que está escrito, sem saber que mudou.
          </li>
        </ul>
      </section>

      <footer className="rodape">
        <h2>Sobre os dados</h2>
        <p>
          A documentação foi conferida em {conferidaEm} e os preços, em {consultadoEm}. A medição da sessão real, o
          histórico dos <code>CLAUDE.md</code> e as contas estão no{' '}
          <a href="https://github.com/igor-gregori/iblog/tree/main/posts/memoria-de-ia" target="_blank" rel="noreferrer">
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
