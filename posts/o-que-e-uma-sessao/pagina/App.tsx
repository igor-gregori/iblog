import { useMemo } from 'react'
import { Codigo } from '#base/Codigo.tsx'
import { ComoFoiFeito } from '#base/ComoFoiFeito.tsx'
import { Figura } from '#base/Figura.tsx'
import { FontesEMetodo } from '#base/FontesEMetodo.tsx'
import { dolares, numero, pct, tokens } from '#base/formato.ts'
import { GraficoLinhas } from '#base/GraficoLinhas.tsx'
import { partes } from '#base/Partes.tsx'
import { Topo } from '#base/Topo.tsx'
import { useJson } from '#base/useJson.ts'
import { Pilha } from './components/Pilha.tsx'
import { Simulador } from './components/Simulador.tsx'
import { CORES, preco, urlDosDados, type Dados } from './dados.ts'
import { ANALISE, FONTES } from './fontes.ts'
import { tiqueDolares } from './formato.ts'
import { chamadaDaPausa, chamadas, comPrazoCurto, contexto, custoAcumulado, custoReal, soma } from './sessao.ts'
import { numerosDaTarefa } from './tarefa.ts'

/** As partes do artigo, na ordem em que aparecem; o sumário aponta para elas. */
const PARTES = [
  { id: 'sem-memoria', titulo: 'O modelo não lembra de nada' },
  { id: 'curva', titulo: 'Cada chamada paga a conversa inteira' },
  { id: 'cache', titulo: 'O cache de prompt achata a curva' },
  { id: 'sessao-real', titulo: 'Uma sessão de verdade' },
  { id: 'na-pratica', titulo: 'O que isso muda no dia a dia' },
] as const

const { Parte, Ver } = partes(PARTES)

/** 1.25 → "1,25"; 0.1 → "0,1"; 2 → "2" */
const MULTIPLICADOR = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 })

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

/** "2026-10-21" → "21 de outubro de 2026" */
function diaPorExtenso(data: string) {
  const [ano, mes, dia] = data.split('-').map(Number)
  return `${dia} de ${MESES[mes - 1]} de ${ano}`
}

/** O modelo da simulação antes de o leitor escolher: o médio da Anthropic, comum em agentes de código. */
const MODELO_INICIAL = 'claude-sonnet-5-5'

// O corpo do pedido da segunda chamada do laço, no formato da API de mensagens da Anthropic, resumido.
const PEDIDO = `{
  "model": "claude-sonnet-5-5",
  "max_tokens": 8000,
  "tools": [
    { "name": "rodar_comando", "description": "...", "input_schema": { ... } },
    { "name": "ler_arquivo", "description": "...", "input_schema": { ... } }
  ],
  "system": "Você é um agente de código. ... (e o CLAUDE.md do projeto)",
  "messages": [
    { "role": "user", "content": "O teste de calcularFrete está falhando. Corrija." },
    { "role": "assistant", "content": [
      { "type": "tool_use", "id": "toolu_01", "name": "rodar_comando",
        "input": { "comando": "npm test" } }
    ] },
    { "role": "user", "content": [
      { "type": "tool_result", "tool_use_id": "toolu_01",
        "content": "FAIL src/frete.test.ts › esperava 15, recebeu 12" }
    ] }
  ]
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
  const padrao = dados.sessao_padrao

  // Os números do texto saem dos dados, para continuarem certos quando os preços ou a sessão mudarem.
  const conta = useMemo(() => {
    const tarefa = numerosDaTarefa()

    // A sessão simulada, sem cache: o tamanho de cada chamada e o total que o modelo lê.
    const lista = chamadas(padrao, false)
    const entradas = lista.map((c) => c.entrada)
    const lidosAteAqui = acumular(entradas)
    const metade = chamadas({ ...padrao, chamadas: padrao.chamadas / 2 }, false)

    // A mesma sessão no modelo inicial, com e sem cache, e com a pausa no meio.
    const inicial = preco(dados, MODELO_INICIAL)
    const fim = (valores: number[]) => valores[valores.length - 1]
    const semCache = fim(custoAcumulado(inicial, padrao, false))
    const comCache = fim(custoAcumulado(inicial, padrao))
    const comPausa = fim(custoAcumulado(inicial, { ...padrao, pausa: chamadaDaPausa(padrao.chamadas) }))
    const razoes = dados.precos.map((p) => fim(custoAcumulado(p, padrao, false)) / fim(custoAcumulado(p, padrao)))

    // As regras de cada fornecedor, a partir dos preços.
    const fornecedores = [...new Set(dados.precos.map((p) => p.fornecedor))].map((nome) => {
      const doFornecedor = dados.precos.filter((p) => p.fornecedor === nome)
      const leitura = doFornecedor.map((p) => p.entrada_cache / p.entrada)
      return {
        nome,
        gravacao: doFornecedor[0].gravacao_cache / doFornecedor[0].entrada,
        prazo: doFornecedor[0].prazo_cache,
        longa: doFornecedor[0].gravacao_cache_longa === null ? null : doFornecedor[0].gravacao_cache_longa / doFornecedor[0].entrada,
        prazoLongo: doFornecedor[0].prazo_cache_longo,
        leituraMin: Math.min(...leitura),
        leituraMax: Math.max(...leitura),
      }
    })

    // A sessão real.
    const real = dados.sessao_real.chamadas
    const modeloReal = preco(dados, dados.sessao_real.modelo)
    const contextos = real.map(contexto)
    const custos = real.map((c) => custoReal(modeloReal, c))
    const custosSemCache = real.map((c) => custoReal(modeloReal, c, false))
    const custosPrazoCurto = comPrazoCurto(real, dados.sessao_real.prazo_curto).map((c) => custoReal(modeloReal, c))
    const gravados = real.map((c) => c.gravados_5m + c.gravados_1h)
    const maior = real.reduce((a, b) => (contexto(b) > contexto(a) ? b : a))
    // A chamada que mais gravou no cache: a que veio depois de uma pausa maior que o prazo.
    const fria = real.reduce((a, b) => (b.gravados_1h > a.gravados_1h ? b : a))
    const iFria = real.indexOf(fria)
    const compactada = real.find((c) => c.compactou)!
    const iCompactada = real.indexOf(compactada)
    const totalReal = soma(custos)
    const prazoLongo = modeloReal.prazo_cache_longo!
    const pausas = real.filter((c, i) => i > 0 && c.minuto - real[i - 1].minuto > dados.sessao_real.prazo_curto)
    const pausasDentroDoPrazo = pausas.filter((c) => {
      const i = real.indexOf(c)
      return c.minuto - real[i - 1].minuto <= prazoLongo
    })

    return {
      tarefa,
      entradas,
      lidosAteAqui,
      primeira: entradas[0],
      ultima: fim(entradas),
      totalLido: fim(lidosAteAqui),
      conversaFinal: fim(entradas) + padrao.saida,
      metadeLido: soma(metade.map((c) => c.entrada)),
      inicial,
      semCache,
      comCache,
      comPausa,
      razaoMin: Math.min(...razoes),
      razaoMax: Math.max(...razoes),
      fornecedores,
      real,
      modeloReal,
      contextos,
      gravados,
      maior,
      fria,
      pausaDaFria: fria.minuto - real[iFria - 1].minuto,
      custoDaFria: custos[iFria],
      custoTipico: mediana(custos),
      compactada,
      antesDaCompactacao: contextos[iCompactada - 1],
      depoisDaCompactacao: contextos[iCompactada],
      totalContexto: soma(contextos),
      totalLidos: soma(real.map((c) => c.lidos)),
      comecoNaPrimeira: real[0].lidos,
      contextoNaPrimeira: contextos[0],
      duracao: real[real.length - 1].minuto,
      totalReal,
      totalSemCache: soma(custosSemCache),
      totalPrazoCurto: soma(custosPrazoCurto),
      saidaReal: soma(real.map((c) => c.saida)) * (modeloReal.saida / 1e6),
      acumuladoReal: acumular(custos),
      acumuladoSemCache: acumular(custosSemCache),
      acumuladoPrazoCurto: acumular(custosPrazoCurto),
      prazoLongo,
      pausas: pausas.length,
      pausasDentroDoPrazo: pausasDentroDoPrazo.length,
      // Uma chamada no fim da sessão longa, contra uma no começo de uma sessão nova: só a leitura do cache.
      leituraNoFim: (maior.lidos * modeloReal.entrada_cache) / 1e6,
      leituraNoComeco: (contextos[0] * modeloReal.entrada_cache) / 1e6,
    }
  }, [dados, padrao])

  const anthropic = conta.fornecedores.find((f) => f.nome === 'Anthropic')!
  const openai = conta.fornecedores.find((f) => f.nome === 'OpenAI')!
  const vezesCurto = (valor: number) => `${MULTIPLICADOR.format(valor)}×`
  const tiquesReais = [1, 50, 100, 150, 200].filter((t) => t <= conta.real.length)
  const formatoChamadaReal = (n: number) => `Chamada ${n}, minuto ${numero(conta.real[n - 1].minuto)}`

  return (
    <main className="artigo" id="inicio">
      <header className="abertura">
        <p className="sobretitulo">IA para quem já programa · 4</p>
        <h1>O que é uma sessão, e por que ela fica mais cara a cada passo?</h1>
        <p className="subtitulo">
          O modelo não lembra de nada: a cada passo, o agente manda a conversa inteira de novo. Por que o custo de uma
          sessão cresce em curva, como o cache de prompt achata essa curva e quanto custou uma sessão real de{' '}
          {numero(conta.real.length)} chamadas.
        </p>
        <p className="assinatura">Igor Gregori · Preços conferidos em {consultadoEm}</p>
      </header>

      <div className="texto">
        <p>
          O <a href="/modelo-agente-harness/">primeiro post</a> da série mostrou o laço do agente: o harness chama o
          modelo, executa a ferramenta que ele pediu e chama de novo, até a tarefa acabar. O{' '}
          <a href="/quanto-custa-um-token/">anterior</a> mostrou quanto custa cada token. Este junta os dois: o que é uma
          sessão, por que cada passo do laço custa mais que o anterior e o que o cache faz com essa conta.
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

      <Parte id="sem-memoria">
        <p>
          Entre uma chamada e outra, nada muda dentro do modelo. Os pesos são os mesmos do fim do treino (o assunto do{' '}
          <a href="/como-um-modelo-e-treinado/">segundo post</a>), e a API não guarda a conversa. Na API de mensagens da
          Anthropic não existe identificador de conversa: cada pedido traz, em <code>messages</code>, tudo o que já foi
          dito. É assim o pedido da segunda chamada do laço, resumido:
        </p>
        <Codigo rotulo="Corpo do pedido da chamada 2">{PEDIDO}</Codigo>
        <p>
          A <em>sessão</em>, então, é do harness. É ele quem guarda o histórico e o remonta a cada chamada: as
          ferramentas, as instruções, o seu pedido, cada pedido de ferramenta do modelo e cada resultado. O Claude Code,
          por exemplo, grava cada sessão num arquivo no seu computador, e é desse arquivo que ele remonta a conversa
          quando você retoma uma sessão.
        </p>
        <Pilha cache={false} />
        <p>
          Nas {conta.tarefa.chamadas} chamadas da tarefa, o pedido foi de {numero(conta.tarefa.primeira)} para{' '}
          {numero(conta.tarefa.ultima)} tokens. Somadas, elas mandaram ao modelo{' '}
          <strong>{numero(conta.tarefa.lidos)} tokens de entrada</strong>, embora a conversa inteira, no fim, tenha{' '}
          {numero(conta.tarefa.novos)}. A maior parte é o começo fixo ({numero(conta.tarefa.comeco)} tokens de
          ferramentas e instruções), que vai em toda chamada.
        </p>
        <p>
          OpenAI e Google oferecem guardar a conversa no servidor: você manda só a mensagem nova e o identificador da
          resposta anterior. Isso muda quem carrega o histórico, não o que o modelo lê. A própria OpenAI avisa que, mesmo
          assim, todos os tokens de entrada anteriores são cobrados como entrada.
        </p>
        <FontesEMetodo
          fontes={[FONTES.anthropicCache, FONTES.openaiEstado]}
          analise={[ANALISE.pilha]}
          metodo={
            <>
              O pedido segue o formato da API de mensagens da Anthropic, resumido. Os tamanhos dos blocos são
              ilustrativos: o começo fixo tem o tamanho do começo da sessão simulada da <Ver id="curva" />, e os outros
              blocos, o de pedidos e resultados de ferramenta típicos. A sessão real da <Ver id="sessao-real" /> mostra os
              números medidos.
            </>
          }
        />
      </Parte>

      <Parte id="curva">
        <p>
          Numa tarefa de cinco chamadas, isso não pesa. Uma sessão de trabalho de verdade tem dezenas ou centenas. Para
          ver o que acontece, imagine uma sessão de {padrao.chamadas} chamadas, com um começo fixo de{' '}
          {numero(padrao.comeco)} tokens e, em cada chamada, {numero(padrao.novos)} tokens novos (o pedido, a saída de um
          comando, um arquivo lido) e {numero(padrao.saida)} de resposta, que também ficam no histórico.
        </p>
        <Figura
          titulo="A conversa cresce em linha reta; o que o modelo lê, em curva"
          subtitulo={`Uma sessão de ${padrao.chamadas} chamadas, sem cache.`}
          legenda={[
            { nome: 'Tamanho do pedido de cada chamada', cor: 'var(--serie-2)' },
            { nome: 'Entrada somada até a chamada', cor: 'var(--serie-1)' },
          ]}
          fonte={`Começo fixo de ${numero(padrao.comeco)} tokens; ${numero(padrao.novos)} tokens novos e ${numero(padrao.saida)} de resposta por chamada.`}
          tabela={{
            colunas: ['Chamada', 'Tamanho do pedido', 'Entrada somada'],
            linhas: conta.entradas.map((e, i) => [String(i + 1), numero(e), numero(conta.lidosAteAqui[i])]),
          }}
        >
          <GraficoLinhas
            x={conta.entradas.map((_, i) => i + 1)}
            series={[
              { nome: 'Tamanho do pedido de cada chamada', cor: 'var(--serie-2)', valores: conta.entradas },
              { nome: 'Entrada somada até a chamada', cor: 'var(--serie-1)', valores: conta.lidosAteAqui },
            ]}
            formatoX={(n) => `Chamada ${n}`}
            formatoY={tokens}
            tiquesX={[1, 10, 20, 30, 40]}
            formatoTiqueX={(n) => numero(n)}
            limitesY={[0, conta.totalLido]}
            rotuloX="Chamada"
            altura={300}
            descricao={`O pedido vai de ${numero(conta.primeira)} a ${numero(conta.ultima)} tokens; a entrada somada chega a ${tokens(conta.totalLido)}`}
          />
        </Figura>
        <p>
          O pedido cresce um pouco a cada chamada: de {numero(conta.primeira)} tokens na primeira para{' '}
          {numero(conta.ultima)} na última. Mas cada chamada paga o pedido inteiro, e a soma cresce com o{' '}
          <strong>quadrado</strong> do número de chamadas. No fim, a conversa tem {tokens(conta.conversaFinal)} tokens, e o
          modelo leu <strong>{tokens(conta.totalLido)}</strong> de entrada para chegar até ali:{' '}
          {numero(conta.totalLido / conta.conversaFinal)} vezes mais. Dobrar a sessão, de {padrao.chamadas / 2} para{' '}
          {padrao.chamadas} chamadas, multiplica a entrada por {numero(conta.totalLido / conta.metadeLido, 1)}, e não por 4,
          porque o começo fixo, igual em toda chamada, soma em linha reta.
        </p>
        <FontesEMetodo
          fontes={[FONTES.anthropicCache]}
          analise={[ANALISE.sessao, ANALISE.sessaoPagina]}
          metodo={
            <>
              A chamada <var>n</var> manda o começo fixo, os tokens novos e as respostas de todas as chamadas anteriores,
              mais os tokens novos dela. A sessão é simulada, com tamanhos fixos por chamada, para a conta ficar à vista;
              a <Ver id="sessao-real" /> mostra uma sessão medida.
            </>
          }
        />
      </Parte>

      <Parte id="cache">
        <p>
          Se cada chamada começa igual à anterior, o fornecedor não precisa processar esse começo de novo. O{' '}
          <em>cache de prompt</em> guarda as contas que o modelo já fez sobre o começo de um pedido e as reaproveita
          quando o pedido seguinte começa com exatamente os mesmos tokens. A parte lida do cache sai bem mais barata que
          a entrada normal. Gravar no cache, em compensação, pode custar mais que a entrada normal.
        </p>
        <Pilha cache />
        <p>
          A partir da segunda chamada, quase todo o pedido vem do cache. Só o que é novo (a resposta anterior e o
          resultado da ferramenta) é gravado. A curva da parte anterior continua lá, mas a maior parte dela passa a ser
          cobrada pelo preço do cache. Mexa nos números e escolha o modelo:
        </p>
        <Simulador precos={dados.precos} padrao={padrao} modeloInicial={MODELO_INICIAL} />
        <p>
          Na sessão padrão, no {conta.inicial.nome}, as {padrao.chamadas} chamadas custam {dolares(conta.semCache)} sem
          cache e <strong>{dolares(conta.comCache)} com cache</strong>, {numero(conta.semCache / conta.comCache, 1)} vezes
          menos. Nos {dados.precos.length} modelos, o cache deixa a sessão de {numero(conta.razaoMin, 1)} a{' '}
          {numero(conta.razaoMax, 1)} vezes mais barata. Uma pausa no meio, maior que o prazo do cache, faz a chamada
          seguinte gravar tudo de novo: a mesma sessão sobe para {dolares(conta.comPausa)}.
        </p>
        <p>
          Cada fornecedor faz o cache de um jeito. Na Anthropic, você marca no pedido até onde guardar, ou liga o cache
          automático com um campo só, a partir de 512 tokens nos modelos atuais. Na OpenAI, o cache é automático, a
          partir de 1.024 tokens, e desde o GPT-5.6 também dá para marcar até onde guardar. No Google, é automático, a
          partir de 4.096 tokens no Gemini 4 Argon e no 3.8 Flash (o mínimo do Flash-Lite não é informado), e o Google
          avisa que não garante o acerto. O preço também muda:
        </p>
        <div className="rolagem-x">
          <table className="quadro regras-cache">
            <caption className="ajuda">Em relação ao preço normal de entrada, nas páginas dos fornecedores em {consultadoEm}.</caption>
            <thead>
              <tr>
                <th>Fornecedor</th>
                <th>Gravar</th>
                <th>Gravar no prazo longo</th>
                <th>Ler</th>
              </tr>
            </thead>
            <tbody>
              {conta.fornecedores.map((f) => (
                <tr key={f.nome}>
                  <th>
                    <span className="regras-marca" style={{ background: CORES[f.nome] }} aria-hidden="true" />
                    {f.nome}
                  </th>
                  <td>
                    {vezesCurto(f.gravacao)}
                    {f.prazo === null ? (
                      <>
                        <small>sem cobrança extra</small>
                        <small>prazo não informado</small>
                      </>
                    ) : (
                      <small>prazo de {prazoPorExtenso(f.prazo)}</small>
                    )}
                  </td>
                  <td>
                    {f.longa === null ? '—' : vezesCurto(f.longa)}
                    {f.prazoLongo !== null && <small>prazo de {prazoPorExtenso(f.prazoLongo)}</small>}
                  </td>
                  <td>
                    {f.leituraMin === f.leituraMax ? vezesCurto(f.leituraMin) : `${vezesCurto(f.leituraMin)} a ${vezesCurto(f.leituraMax)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Na Anthropic e na OpenAI, gravar custa {vezesCurto(anthropic.gravacao)} a entrada no prazo padrão (
          {numero(anthropic.prazo!)} e {numero(openai.prazo!)} minutos), e o prazo longo custa mais. Na Anthropic, cada
          leitura renova o prazo, então uma sessão ativa mantém o cache quente. Nos três, o que se reaproveita é o
          trecho inicial do pedido que é idêntico, token por token, a um pedido recente; numa conversa, esse trecho é
          quase todo o pedido anterior e cresce a cada chamada. Na Anthropic, a ordem é ferramentas, instruções e
          mensagens: mudar uma ferramenta invalida o cache inteiro.
        </p>
        <FontesEMetodo
          fontes={[FONTES.anthropicCache, FONTES.anthropic, FONTES.openaiCache, FONTES.openai, FONTES.googleCache, FONTES.google]}
          analise={[ANALISE.sessao, ANALISE.sessaoPagina, ANALISE.precos]}
          metodo={
            <>
              Com o cache, cada chamada lê do cache o pedido da chamada anterior e grava o que é novo; a primeira, e a
              primeira depois da pausa, gravam o pedido inteiro. A gravação usa o prazo padrão de cada fornecedor. O Google
              não cobra a gravação, então ela entra pelo preço normal de entrada. Ficam de fora o tamanho mínimo para
              entrar no cache (o começo fixo da simulação passa do mínimo que cada fornecedor informa) e as faixas mais caras para
              pedidos longos: a simulação fica abaixo de 100 mil tokens por chamada.
            </>
          }
        />
      </Parte>

      <Parte id="sessao-real">
        <p>
          Os números até aqui são de uma sessão simulada. Esta parte usa uma de verdade: a sessão do Claude Code de 18 de
          outubro de 2026 em que o design desta página foi escolhido. Foram {numero(conta.real.length)} chamadas ao{' '}
          {conta.modeloReal.nome} ao longo de {numero(conta.duracao / 60, 0)} horas. O registro da sessão traz, para cada
          chamada, os tokens que a API cobrou: fora do cache, gravados, lidos e de saída.
        </p>
        <Figura
          titulo="O tamanho de cada chamada da sessão real"
          subtitulo={`Tokens que cada uma das ${numero(conta.real.length)} chamadas mandou ao modelo, e quantos deles foram gravados no cache.`}
          legenda={[
            { nome: 'Pedido inteiro', cor: 'var(--serie-1)' },
            { nome: 'Gravado no cache', cor: 'var(--serie-2)' },
          ]}
          fonte={`Registro de uma sessão do Claude Code com o ${conta.modeloReal.nome}, em ${diaPorExtenso('2026-10-18')}. Só os números de cada chamada saíram do registro.`}
          tabela={{
            colunas: ['Chamada', 'Minuto', 'Pedido inteiro', 'Lido do cache', 'Gravado no cache', 'Saída'],
            linhas: conta.real.map((c, i) => [
              String(c.chamada),
              numero(c.minuto, 1),
              numero(conta.contextos[i]),
              numero(c.lidos),
              numero(conta.gravados[i]),
              numero(c.saida),
            ]),
          }}
        >
          <GraficoLinhas
            x={conta.real.map((c) => c.chamada)}
            series={[
              { nome: 'Pedido inteiro', cor: 'var(--serie-1)', valores: conta.contextos },
              { nome: 'Gravado no cache', cor: 'var(--serie-2)', valores: conta.gravados },
            ]}
            formatoX={formatoChamadaReal}
            formatoY={tokens}
            tiquesX={tiquesReais}
            formatoTiqueX={(n) => numero(n)}
            limitesY={[0, Math.ceil(contexto(conta.maior) / 1e5) * 1e5]}
            rotuloX="Chamada"
            altura={300}
            descricao={`O pedido cresce de ${tokens(conta.contextoNaPrimeira)} a ${tokens(contexto(conta.maior))} tokens e cai para ${tokens(conta.depoisDaCompactacao)} depois da compactação; a gravação dá um salto na chamada ${conta.fria.chamada}`}
          />
        </Figura>
        <p>Três coisas aparecem no gráfico.</p>
        <ul>
          <li>
            <strong>A curva da <Ver id="curva" />, de verdade.</strong> O pedido começa com {tokens(conta.contextoNaPrimeira)} tokens
            e chega a {tokens(contexto(conta.maior))} na chamada {conta.maior.chamada}. Já na primeira chamada,{' '}
            {tokens(conta.comecoNaPrimeira)} vieram do cache: o começo do pedido (as ferramentas e as instruções do Claude
            Code) era igual ao de sessões anteriores.
          </li>
          <li>
            <strong>Uma pausa que esfriou o cache.</strong> O Claude Code grava no cache com o prazo de{' '}
            {prazoPorExtenso(conta.prazoLongo)}. Antes da chamada {conta.fria.chamada}, a sessão ficou{' '}
            {numero(conta.pausaDaFria)} minutos parada, o cache venceu e a chamada gravou {tokens(conta.fria.gravados_1h)}{' '}
            tokens de novo. Só ela custou {dolares(conta.custoDaFria)}, {pct(conta.custoDaFria / conta.totalReal)} da
            sessão inteira.
          </li>
          <li>
            <strong>Uma compactação.</strong> Antes da chamada {conta.compactada.chamada}, o Claude Code resumiu a
            conversa, e o pedido caiu de {tokens(conta.antesDaCompactacao)} para {tokens(conta.depoisDaCompactacao)} tokens.
            O que o resumo deixa de fora é o assunto do próximo post.
          </li>
        </ul>
        <Figura
          titulo="Quanto a sessão real custou"
          subtitulo={`Custo acumulado das ${numero(conta.real.length)} chamadas, pelos preços públicos do ${conta.modeloReal.nome}.`}
          legenda={[
            { nome: 'Sem cache', cor: 'var(--serie-3)' },
            { nome: `Com cache de ${dados.sessao_real.prazo_curto} min`, cor: 'var(--serie-2)' },
            { nome: `Como foi (cache de ${prazoPorExtenso(conta.prazoLongo)})`, cor: 'var(--serie-1)' },
          ]}
          fonte="Preços da API em dólares, como se a sessão fosse cobrada por token. Com o cache de 5 minutos, cada chamada que veio depois de uma pausa maior grava de novo tudo o que leria."
          tabela={{
            colunas: ['Chamada', 'Como foi', `Cache de ${dados.sessao_real.prazo_curto} min`, 'Sem cache'],
            linhas: conta.real.map((c, i) => [
              String(c.chamada),
              dolares(conta.acumuladoReal[i]),
              dolares(conta.acumuladoPrazoCurto[i]),
              dolares(conta.acumuladoSemCache[i]),
            ]),
          }}
        >
          <GraficoLinhas
            x={conta.real.map((c) => c.chamada)}
            series={[
              { nome: 'Sem cache', cor: 'var(--serie-3)', valores: conta.acumuladoSemCache },
              { nome: `Com cache de ${dados.sessao_real.prazo_curto} min`, cor: 'var(--serie-2)', valores: conta.acumuladoPrazoCurto },
              { nome: `Como foi (cache de ${prazoPorExtenso(conta.prazoLongo)})`, cor: 'var(--serie-1)', valores: conta.acumuladoReal },
            ]}
            formatoX={formatoChamadaReal}
            formatoY={dolares}
            formatoTiqueY={tiqueDolares(conta.totalSemCache)}
            tiquesX={tiquesReais}
            formatoTiqueX={(n) => numero(n)}
            limitesY={[0, Math.ceil(conta.totalSemCache / 50) * 50]}
            rotuloX="Chamada"
            altura={300}
            descricao={`A sessão real custou ${dolares(conta.totalReal)}; com cache de ${dados.sessao_real.prazo_curto} minutos, ${dolares(conta.totalPrazoCurto)}; sem cache, ${dolares(conta.totalSemCache)}`}
          />
        </Figura>
        <p>
          Das {tokens(conta.totalContexto)} de tokens que a sessão mandou ao modelo,{' '}
          {pct(conta.totalLidos / conta.totalContexto, 1)} vieram do cache. Pelos preços da API, ela custou{' '}
          <strong>{dolares(conta.totalReal)}</strong>; sem cache, teria custado {dolares(conta.totalSemCache)},{' '}
          {numero(conta.totalSemCache / conta.totalReal, 1)} vezes mais. A saída, que o cache não barateia, ficou em{' '}
          {dolares(conta.saidaReal)}.
        </p>
        <p>
          O prazo de {prazoPorExtenso(conta.prazoLongo)} também se pagou. Gravar nele custa mais que no de{' '}
          {dados.sessao_real.prazo_curto} minutos, mas a sessão teve {conta.pausasDentroDoPrazo} pausas entre{' '}
          {dados.sessao_real.prazo_curto} e {numero(conta.prazoLongo)} minutos. Com
          o cache de {dados.sessao_real.prazo_curto} minutos, cada uma delas faria a chamada seguinte gravar tudo de novo, e
          a sessão sairia por {dolares(conta.totalPrazoCurto)}, {pct(conta.totalPrazoCurto / conta.totalReal - 1)} a mais.
        </p>
        <FontesEMetodo
          fontes={[FONTES.claudeCode, FONTES.anthropic, FONTES.anthropicCache]}
          analise={[ANALISE.registro, ANALISE.sessao, ANALISE.sessaoPagina]}
          metodo={
            <>
              O Claude Code grava cada sessão num arquivo, com o uso de tokens que a API devolveu em cada resposta. Do
              registro saíram só os números de cada chamada da conversa principal (sem os subagentes) e os minutos desde o
              início; nenhum texto da conversa. O custo usa os preços públicos do {conta.modeloReal.nome}, com a gravação no
              prazo de {prazoPorExtenso(conta.prazoLongo)}, que é o que o registro mostra. Quem usa o Claude Code por
              assinatura não paga por token; o custo aqui é o que a mesma sessão custaria pela API. Na conta com o
              cache de {dados.sessao_real.prazo_curto} minutos, toda gravação passa para o preço desse prazo, mais barato
              ({vezesCurto(conta.modeloReal.gravacao_cache / conta.modeloReal.entrada)} a entrada, em vez de{' '}
              {vezesCurto(conta.modeloReal.gravacao_cache_longa! / conta.modeloReal.entrada)}): a diferença vem só das
              chamadas que, depois de uma pausa maior, gravam de novo tudo o que leriam. A conta também grava de novo o
              começo fixo depois das duas pausas mais longas, que na sessão real continuou no cache; isso pesa pouco
              contra o prazo curto.
            </>
          }
        />
      </Parte>

      <Parte id="na-pratica">
        <p>Com a conta na mão, o que muda no uso de um agente:</p>
        <ul>
          <li>
            <strong>Tarefa nova, sessão nova.</strong> Tudo o que está no histórico é pago em toda chamada, mesmo que não
            tenha mais nada a ver com o que você está fazendo. No fim da sessão real, só ler o cache custava{' '}
            {dolares(conta.leituraNoFim)} por chamada; no começo de uma sessão nova, {dolares(conta.leituraNoComeco)}.
            Limpar o histórico (no Claude Code, <code>/clear</code>) entre tarefas sem relação é a economia mais simples.
          </li>
          <li>
            <strong>Pausas longas esfriam o cache.</strong> Voltar do almoço para a mesma sessão faz a primeira chamada
            gravar o histórico inteiro de novo. Na sessão real, a chamada {conta.fria.chamada} custou o mesmo que{' '}
            {numero(conta.custoDaFria / conta.custoTipico)} chamadas típicas da mesma sessão.
          </li>
          <li>
            <strong>Não mexa no começo no meio da sessão.</strong> Mudar a definição das ferramentas (ligar um servidor
            MCP, por exemplo) ou as instruções invalida o cache de tudo o que vem depois. Trocar de modelo também: o cache
            guarda contas feitas por um modelo, e o outro começa do zero.
          </li>
          <li>
            <strong>O que entra no histórico fica nele.</strong> Um log de 10 mil tokens lido no começo da sessão é pago
            em todas as chamadas seguintes, no preço do cache. Peça saídas curtas às ferramentas: filtre o log, leia o
            trecho do arquivo, rode só o teste que importa.
          </li>
        </ul>
      </Parte>

      <section className="secao" id="resumo">
        <h2>Em resumo</h2>
        <ul>
          <li>
            <strong>O modelo não guarda estado.</strong> A sessão é do harness, que remonta o histórico e o manda inteiro
            em cada chamada.
          </li>
          <li>
            <strong>O custo cresce em curva:</strong> cada chamada paga a conversa inteira, e a entrada somada cresce com o
            quadrado do número de chamadas.
          </li>
          <li>
            <strong>O cache achata a curva</strong> quando o começo do pedido se repete. Na sessão real, a conta caiu{' '}
            {numero(conta.totalSemCache / conta.totalReal, 1)} vezes; uma pausa longa ou uma mudança no começo jogam esse
            ganho fora.
          </li>
        </ul>
        <p>
          O próximo post da série olha o outro limite da mesma conversa que cresce: a janela de contexto, o que o resumo
          automático descarta e por que o agente esquece coisas no meio da tarefa.
        </p>
      </section>

      <footer className="rodape">
        <h2>Sobre os dados</h2>
        <p>
          Os preços foram conferidos nas páginas oficiais em {consultadoEm} e mudam com frequência. A sessão real e a
          conta estão no{' '}
          <a href="https://github.com/igor-gregori/iblog/tree/main/posts/o-que-e-uma-sessao" target="_blank" rel="noreferrer">
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

function mediana(valores: number[]) {
  const ordenados = valores.toSorted((a, b) => a - b)
  const meio = Math.floor(ordenados.length / 2)
  return ordenados.length % 2 ? ordenados[meio] : (ordenados[meio - 1] + ordenados[meio]) / 2
}

function acumular(valores: number[]) {
  let total = 0
  return valores.map((valor) => (total += valor))
}

/** 60 → "1 hora"; 720 → "12 horas"; 30 → "30 minutos" */
function prazoPorExtenso(minutos: number) {
  if (minutos < 60) return `${numero(minutos)} minutos`
  const horas = minutos / 60
  return horas === 1 ? '1 hora' : `${numero(horas)} horas`
}
