import { Codigo } from '#base/Codigo.tsx'
import { ComoFoiFeito } from '#base/ComoFoiFeito.tsx'
import { Figura } from '#base/Figura.tsx'
import { FontesEMetodo } from '#base/FontesEMetodo.tsx'
import { numero, pct } from '#base/formato.ts'
import { GraficoBarras } from '#base/GraficoBarras.tsx'
import { LinkDoGlossario } from '#base/LinkDoGlossario.tsx'
import { partes } from '#base/Partes.tsx'
import { Topo } from '#base/Topo.tsx'
import { useJson } from '#base/useJson.ts'
import { resumo, tipo, urlDosDados, type Dados, type IdDaTarefa, type IdDaVariante, type TipoDeRegra } from './dados.ts'
import { ANALISE, FONTES } from './fontes.ts'

/** As partes do artigo, na ordem em que aparecem; o sumário aponta para elas. */
const PARTES = [
  { id: 'o-que-e', titulo: 'O que é spec-driven development' },
  { id: 'experimento', titulo: 'O experimento' },
  { id: 'de-primeira', titulo: 'Quem acerta de primeira' },
  { id: 'onde-chuta', titulo: 'Onde o agente chuta' },
  { id: 'custo', titulo: 'Quanto custa' },
  { id: 'plano', titulo: 'E o plano antes?' },
  { id: 'quando', titulo: 'Quando compensa' },
] as const

const { Parte, Ver } = partes(PARTES)

const CORES: Record<IdDaVariante, string> = { A: 'var(--serie-1)', B: 'var(--serie-2)', C: 'var(--serie-3)' }

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

/** "2026-11-07" → "7 de novembro de 2026" */
function diaPorExtenso(data: string) {
  const [ano, mes, dia] = data.slice(0, 10).split('-').map(Number)
  return `${dia} de ${MESES[mes - 1]} de ${ano}`
}

/** Dólares com duas casas: US$ 0,56. */
const usd = (valor: number) => `US$ ${numero(valor, 2)}`

/** "um campo `cupom` opcional" → texto com o trecho entre crases em <code>. */
function comCodigo(texto: string) {
  return texto.split('`').map((trecho, i) => (i % 2 === 1 ? <code key={i}>{trecho}</code> : trecho))
}

/** O tipo de regra, em uma ou duas palavras, para a tabela das regras. */
const TIPO_CURTO: Record<TipoDeRegra, string> = { silencio: 'silêncio', escolha: 'em aberto', contrato: 'contrato' }

/** 0.42 → "42%", sem sinal; para "x% mais caro" e "x% mais barato". */
const diferenca = (valor: number) => pct(Math.abs(valor))

const EARS = `WHEN a user submits valid registration data
THE SYSTEM SHALL create a new user account`

// Trechos da primeira entrega de um pedido solto do cupom (dados/execucoes/m-cupom-A-1.entrega.diff).
const CODIGO_DO_PEDIDO_SOLTO = `/** A data de hoje (AAAA-MM-DD) no horário de Brasília, para comparar com \`validoAte\`. */
export function hojeEmBrasilia(agora: Date): string {
  return agora.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

export function calcularDesconto(cupom: Cupom, subtotal: Centavos): Centavos {
  const desconto =
    cupom.tipo === 'percentual' ? Math.floor((subtotal * cupom.valor) / 100) : cupom.valor
  return Math.min(desconto, subtotal)
}`

const MENSAGEM_DE_CORRECAO = `Testei aqui e estes casos falharam:

- a mesma Idempotency-Key devolve a mesma devolução, sem repetir nada

\`\`\`
Expected values to be strictly equal:

201 !== 200
\`\`\`

Pode corrigir?`

const EXEMPLOS: Record<TipoDeRegra, string> = {
  silencio: 'O prazo de 7 dias para devolver, o uso único do cupom por cliente, a promoção que não acumula com o cupom, a Idempotency-Key',
  escolha: 'A validade do cupom em UTC ou no horário de Brasília, a busca que ignora acentos, o preço promocional na faixa de preço',
  contrato: 'Quais campos a resposta traz (a página e o tamanho dela, os itens de uma devolução), 400 ou 422 para um dado inválido',
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
  const conferidaEm = diaPorExtenso(dados.documentacao_conferida_em)
  const consultadoEm = diaPorExtenso(dados.precos_consultados_em)
  const r = (tarefa: IdDaTarefa, variante: IdDaVariante) => resumo(dados, tarefa, variante)
  const nomeDaVariante = (id: IdDaVariante) => dados.variantes.find((v) => v.id === id)!.nome
  const [pequena, media, grande] = dados.tarefas
  const cupom = media
  const n = dados.total.execucoes
  const repeticoes = r('p-paginacao', 'A').execucoes

  // Os números do texto saem dos dados, para continuarem certos se as execuções forem refeitas.
  const soma = (variantes: IdDaVariante[], valor: (x: ReturnType<typeof r>) => number) =>
    dados.tarefas.reduce((total, t) => total + variantes.reduce((s, v) => s + valor(r(t.id, v)), 0), 0)
  const prontasC = soma(['C'], (x) => x.prontas_na_entrega)
  const prontasAB = soma(['A', 'B'], (x) => x.prontas_na_entrega)
  const prontasNoFim = soma(['A', 'B', 'C'], (x) => x.prontas_no_fim)
  const execucoesC = soma(['C'], (x) => x.execucoes)
  const execucoesAB = soma(['A', 'B'], (x) => x.execucoes)
  const correcoesAB = dados.resumo.filter((x) => x.variante !== 'C').flatMap((x) => x.correcoes)
  const regrasAB = dados.resumo.filter((x) => x.variante !== 'C').map((x) => x.regras_na_entrega)
  const obviosAB = dados.resumo.filter((x) => x.variante !== 'C').map((x) => x.obvios_na_entrega)
  const vezesMaior = dados.tarefas.map((t) => t.palavras_spec / t.palavras_pedido)
  const silencio = tipo(dados, 'silencio')
  const escolha = tipo(dados, 'escolha')
  const contrato = tipo(dados, 'contrato')
  const taxa = (t: typeof silencio) => t.falhas_ab / t.chances_ab
  const regrasSemFalha = dados.regras.filter((x) => x.falhas.A + x.falhas.B === 0).length
  const custoBsobreA = dados.tarefas.map((t) => r(t.id, 'B').custo / r(t.id, 'A').custo - 1)
  const custoCsobreA = dados.tarefas.map((t) => r(t.id, 'C').custo / r(t.id, 'A').custo - 1)
  const entregaCsobreA = dados.tarefas.map((t) => r(t.id, 'C').custo_entrega / r(t.id, 'A').custo_entrega - 1)
  const regrasB = dados.tarefas.map((t) => r(t.id, 'B').regras_na_entrega)
  const regrasA = dados.tarefas.map((t) => r(t.id, 'A').regras_na_entrega)
  const devolucaoNoPrimeiroLote = dados.primeiro_lote.filter((x) => x.tarefa === 'g-devolucao')
  const minutosC = dados.resumo.filter((x) => x.variante === 'C').map((x) => x.minutos)
  const minutosAB = dados.resumo.filter((x) => x.variante !== 'C').map((x) => x.minutos)
  const iso = dados.isolamento

  return (
    <main className="artigo" id="inicio">
      <header className="abertura">
        <p className="sobretitulo">IA para quem já programa · 10</p>
        <h1>Escrever a especificação antes do código compensa?</h1>
        <p className="subtitulo">
          A mesma API ganhou três funcionalidades, pedidas de três jeitos ao Claude Code, em {n} execuções com testes que
          o agente nunca viu. Só a especificação acertou de primeira. O que ela evita não é o erro do agente: é a decisão
          que ninguém tomou.
        </p>
        <p className="assinatura">Igor Gregori · Medido em {diaPorExtenso(dados.periodo.fim)}</p>
      </header>

      <div className="texto">
        <p>
          <q>Spec-driven development</q> virou a palavra da vez entre quem programa com agentes. O Kiro, da AWS, e o Spec
          Kit, do GitHub, pedem uma especificação antes de deixar o agente escrever código. A promessa é que o agente erra
          menos quando sabe exatamente o que fazer. O custo é escrever a especificação.
        </p>
        <p>
          Quase tudo o que se diz sobre isso é opinião. Este post mede: três tarefas comuns de backend numa API em TypeScript, cada
          uma pedida de três jeitos, {repeticoes} vezes cada, com testes escondidos que dizem se a tarefa ficou pronta.
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
          A ideia é antiga: decidir o que o código precisa fazer antes de escrever o código. O que mudou é quem escreve o
          código. Com um agente, a especificação é o que você entrega a ele no lugar de um pedido de duas linhas.
        </p>
        <p>As duas ferramentas mais conhecidas organizam isso parecido:</p>
        <ul>
          <li>
            <strong>Kiro.</strong> Cada funcionalidade vira três arquivos: <code>requirements.md</code> (os requisitos,
            com critérios de aceitação), <code>design.md</code> (a arquitetura) e <code>tasks.md</code> (os passos). O
            agente escreve cada um a partir do seu pedido, e você revisa e confirma antes da fase seguinte. Os requisitos
            usam uma notação chamada EARS:
          </li>
        </ul>
        <Codigo rotulo="requirements.md (exemplo da documentação do Kiro)">{EARS}</Codigo>
        <ul>
          <li>
            <strong>Spec Kit.</strong> Uma sequência de comandos: <code>/speckit-specify</code> descreve o que construir e
            por quê, <code>/speckit-plan</code> decide como (a stack, a arquitetura), <code>/speckit-tasks</code> quebra
            em tarefas e <code>/speckit-implement</code> executa. O blog do GitHub chama a especificação de{' '}
            <q>um contrato de como o código deve se comportar</q>.
          </li>
        </ul>
        <p>
          Vale separar duas coisas que costumam vir juntas. Um <strong>plano</strong> diz <em>como</em> fazer: que
          arquivos mudar, em que ordem. Quem escreve é o agente, depois de ler o código. É o que faz o{' '}
          <strong>modo de plano</strong> do Claude Code: o agente lê, propõe um plano e não edita nada até você aprovar.
          Uma <strong>especificação</strong> diz <em>o que</em> precisa valer: as regras, os casos de borda, o formato da
          resposta. Parte disso só quem conhece o negócio sabe.
        </p>
        <p>
          Nas duas ferramentas, o agente escreve o rascunho e você revisa. Este post não testa as ferramentas: testa o
          conteúdo. A pergunta é se vale a pena chegar ao agente com as regras já decididas.
        </p>
        <FontesEMetodo
          fontes={[FONTES.kiro, FONTES.kiroFuncionalidade, FONTES.specKit, FONTES.specKitBlog, FONTES.modoDePlano]}
          analise={[]}
          metodo={
            <>
              Documentação conferida em {conferidaEm}. O Kiro também tem um fluxo que começa pelo desenho e uma{' '}
              <q>Quick Spec</q>, que gera os três arquivos sem parar para revisão. Os nomes dos comandos do Spec Kit são os
              do README atual; o post de lançamento, de 2025, usava <code>/specify</code>, <code>/plan</code> e{' '}
              <code>/tasks</code>.
            </>
          }
        />
      </Parte>

      <Parte id="experimento">
        <p>
          O projeto é a API de uma loja pequena, escrita para o experimento: produtos, clientes e pedidos, em TypeScript,
          com Node 24, Fastify e SQLite. São umas mil linhas, 20 testes e um <code>CLAUDE.md</code> curto com as
          convenções do projeto (dinheiro em centavos, a hora sempre do relógio do app, erros com código). Nele, três
          tarefas, de tamanhos diferentes:
        </p>
        <div className="rolagem-x">
          <table className="quadro quadro-texto">
            <thead>
              <tr>
                <th>Tarefa</th>
                <th>Tamanho</th>
                <th>O que pede</th>
              </tr>
            </thead>
            <tbody>
              {dados.tarefas.map((t) => (
                <tr key={t.id}>
                  <th>{t.nome}</th>
                  <td>
                    <span className="selo">{t.tamanho}</span>
                  </td>
                  <td>
                    {comCodigo(t.pedido)} <small>(A solução de referência tem {numero(t.linhas_referencia)} linhas.)</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>Cada tarefa foi pedida de três jeitos:</p>
        <ul>
          <li>
            <strong>A, pedido solto:</strong> só o texto da tabela, de {numero(pequena.palavras_pedido)} a{' '}
            {numero(Math.max(...dados.tarefas.map((t) => t.palavras_pedido)))} palavras, como um dev pediria.
          </li>
          <li>
            <strong>B, plano antes:</strong> o mesmo texto, com o agente no modo de plano. Quando o plano fica pronto, a
            mensagem seguinte é <q>O plano está aprovado. Pode implementar.</q>
          </li>
          <li>
            <strong>C, especificação:</strong> o mesmo texto e, depois dele, uma especificação com requisitos,
            critérios de aceitação, desenho e passos, de {numero(Math.min(...vezesMaior), 0)} a{' '}
            {numero(Math.max(...vezesMaior), 0)} vezes mais longa que o pedido.
          </li>
        </ul>
        <p>Um trecho da especificação do cupom, a parte que diz como o desconto é calculado:</p>
        <Codigo rotulo="kit/tarefas/m-cupom/spec.md (trecho)">{dados.trecho_da_spec}</Codigo>
        <p>
          O pedido solto do cupom não fala de promoção. A especificação fala. É aí que os testes entram. Cada tarefa tem
          testes de aceitação que o agente nunca vê, em dois grupos:
        </p>
        <ul>
          <li>
            <strong>Os óbvios</strong>, o que qualquer dev deduziria do pedido: o cupom de 10% tira 10%; o cupom vencido é
            recusado.
          </li>
          <li>
            <strong>As regras</strong>, que só a especificação conta: o cupom não vale para item em promoção; cada
            cliente usa cada cupom uma vez.
          </li>
        </ul>
        <p>
          Cada execução começa de uma cópia limpa do projeto. O Claude Code roda sem interface, com o{' '}
          {dados.modelo.nome} em esforço médio, até dizer que terminou. Aí rodam os testes escondidos. Se algum falhou, o
          agente recebe o nome do teste e a mensagem de erro, como um dev reportando um bug, e tem até duas chances de
          corrigir:
        </p>
        <Codigo rotulo="a mensagem de correção (um exemplo)">{MENSAGEM_DE_CORRECAO}</Codigo>
        <p>
          São três tarefas, três jeitos e {repeticoes} repetições de cada, porque o modelo não responde igual duas vezes:{' '}
          {n} execuções, entre 6 e 7 de novembro de 2026.
        </p>
        <FontesEMetodo
          fontes={[FONTES.execucoes]}
          analise={[ANALISE.projeto, ANALISE.tarefas, ANALISE.kit, ANALISE.plano]}
          metodo={
            <>
              Cada execução roda numa cópia do projeto fora deste repositório, para o agente não ler os{' '}
              <code>CLAUDE.md</code> do blog, com o Claude Code {iso.versoes.join(', ')}, sem servidores MCP, sem busca
              na web e com uma lista de comandos liberados; nas {n} execuções, {numero(iso.negacoes)} comandos fora da
              lista foram negados e o agente seguiu por outro caminho. Os testes escondidos ficam na cópia só enquanto
              rodam. Antes de medir, cada teste foi conferido: falha no projeto original e passa com uma solução de
              referência. A especificação e os testes foram escritos juntos, pelo mesmo autor (o Claude, com a revisão do
              Igor): a especificação cobre exatamente o que os testes cobram.
            </>
          }
        />
      </Parte>

      <Parte id="de-primeira">
        <p>
          A primeira entrega é o que o agente devolve quando diz <q>pronto</q>. Nas {execucoesC} execuções com
          especificação, ela passou em todos os testes escondidos {prontasC} vezes. Nas {execucoesAB} sem especificação,
          com ou sem plano, {prontasAB === 0 ? 'nenhuma vez' : `${prontasAB} vezes`}.
        </p>
        <Figura
          titulo="Regras certas na primeira entrega"
          subtitulo={`Parte dos testes do grupo "regras" que passou, em média de ${repeticoes} execuções`}
          legenda={dados.variantes.map((v) => ({ nome: v.nome, cor: CORES[v.id] }))}
          fonte={`Fonte: ${n} execuções do Claude Code com o ${dados.modelo.nome}, de 6 a 7 de novembro de 2026. Ao lado de cada barra, quantas das ${repeticoes} execuções ficaram prontas já na entrega.`}
          tabela={{
            colunas: ['Tarefa', 'Jeito', 'Óbvios', 'Regras', 'Prontas na entrega', 'Prontas no fim'],
            linhas: dados.resumo.map((x) => [
              dados.tarefas.find((t) => t.id === x.tarefa)!.nome,
              nomeDaVariante(x.variante),
              pct(x.obvios_na_entrega),
              pct(x.regras_na_entrega),
              `${x.prontas_na_entrega} de ${x.execucoes}`,
              `${x.prontas_no_fim} de ${x.execucoes}`,
            ]),
          }}
        >
          <GraficoBarras
            descricao="Parte das regras certas na primeira entrega, por tarefa e jeito de pedir"
            formato={(valor) => pct(valor)}
            grupos={dados.tarefas.map((t) => ({
              titulo: `${t.nome} (${t.testes_regras} regras)`,
              barras: dados.variantes.map((v) => {
                const x = r(t.id, v.id)
                return {
                  nome: v.nome,
                  valor: x.regras_na_entrega,
                  cor: CORES[v.id],
                  nota: `${x.prontas_na_entrega}/${x.execucoes} prontas`,
                }
              }),
            }))}
          />
        </Figura>
        <p>
          Os testes óbvios quase não separam os três jeitos: sem especificação, o agente acertou de{' '}
          {pct(Math.min(...obviosAB))} a {pct(Math.max(...obviosAB))} deles. A diferença está toda nas regras. Sem
          especificação, o agente acertou de {pct(Math.min(...regrasAB))} a {pct(Math.max(...regrasAB))} delas; com
          especificação, todas.
        </p>
        <p>
          Isso não quer dizer que o agente sem especificação trabalhou mal. Depois das correções, as {prontasNoFim}{' '}
          execuções terminaram com todos os testes passando. Sem especificação, cada uma precisou de{' '}
          {Math.min(...correcoesAB)} ou {Math.max(...correcoesAB)} rodadas de <q>testei e isto falhou</q>. A{' '}
          <Ver id="onde-chuta" /> mostra o que falhou.
        </p>
        <FontesEMetodo
          fontes={[FONTES.execucoes]}
          analise={[ANALISE.kit, ANALISE.exportar]}
          metodo={
            <>
              Uma tarefa está pronta quando passam todos os testes escondidos, óbvios e regras. Os {pequena.testes_obvios}{' '}
              a {grande.testes_obvios} óbvios e os {pequena.testes_regras} a {cupom.testes_regras} de regras de cada
              tarefa estão em <code>kit/tarefas/&lt;tarefa&gt;/testes/</code>. Nenhuma execução quebrou os 20 testes que o
              projeto já tinha, e todas terminaram com o <code>tsc</code> e o lint passando.
            </>
          }
        />
      </Parte>

      <Parte id="onde-chuta">
        <p>
          Das {dados.regras.length} regras, {regrasSemFalha} passaram em todas as entregas sem especificação. O agente
          acertou sozinho que a faixa de preço vale sobre o preço promocional, que o desconto se arredonda para baixo, que
          devoluções parciais se somam. As outras ele errou, e não ao acaso. Separando as regras pelo tipo de decisão que
          cada uma cobra:
        </p>
        <div className="rolagem-x">
          <table className="quadro quadro-texto">
            <thead>
              <tr>
                <th>A regra…</th>
                <th>Sem especificação, errou</th>
                <th>Exemplos</th>
              </tr>
            </thead>
            <tbody>
              {[silencio, escolha, contrato].map((t) => (
                <tr key={t.id}>
                  <th>{t.nome}</th>
                  <td>
                    <span className="selo">{pct(taxa(t))}</span> <small>({t.falhas_ab} de {t.chances_ab})</small>
                  </td>
                  <td>{EXEMPLOS[t.id]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          <strong>Quando o pedido não fala do assunto, o agente não inventa a regra.</strong> Nenhuma entrega sem
          especificação criou um prazo para devolução, um limite de um uso do cupom por cliente ou o cabeçalho{' '}
          <code>Idempotency-Key</code>. Faz sentido: não há como deduzir do pedido que a loja aceita devoluções por 7
          dias e não por 30. Esse tipo de regra falhou em {pct(taxa(silencio))} das chances.
        </p>
        <p>
          <strong>Quando o pedido deixa em aberto, o agente escolhe algo razoável</strong>, e muitas vezes a mesma coisa
          que a especificação: esse tipo falhou em {pct(taxa(escolha))} das chances. Quando escolhe diferente, a escolha
          dele não está errada. As seis entregas do cupom sem especificação contaram a validade no horário de Brasília; a
          especificação dizia UTC. Num projeto em português, Brasília é até a aposta mais natural. Só não era a
          combinada. A mesma entrega aplicou o desconto sobre o subtotal inteiro, com os itens em promoção junto:
        </p>
        <Codigo rotulo="src/cupons/repositorio.ts, numa entrega sem especificação (trecho)">{CODIGO_DO_PEDIDO_SOLTO}</Codigo>
        <p>
          <strong>Os detalhes do contrato</strong> falharam em {pct(taxa(contrato))} das chances: faltavam os campos{' '}
          <code>pagina</code> e <code>porPagina</code> na resposta da listagem, sobrava um <code>precoUnitario</code> nos
          itens da devolução. Em dois testes, a especificação foi contra o próprio projeto: pedia 400 para{' '}
          <code>precoMin</code> maior que <code>precoMax</code> e para uma porcentagem acima de 100, e o{' '}
          <code>CLAUDE.md</code> do projeto diz que regra de negócio responde 422. Na maioria das entregas sem
          especificação, o agente seguiu o <code>CLAUDE.md</code>.
        </p>
        <p>
          Nenhum desses erros é o agente programando mal. São decisões que ninguém tomou. Sem a especificação, o agente
          decidiu por você; com ela, decidiu quem escreveu a especificação.
        </p>
        <details className="dados">
          <summary>Ver as {dados.regras.length} regras, uma por uma</summary>
          <div className="rolagem-x">
            <table className="quadro quadro-texto">
              <thead>
                <tr>
                  <th>Regra (o nome do teste)</th>
                  <th>Tipo</th>
                  <th>Falhou na entrega (A, B, C)</th>
                </tr>
              </thead>
              <tbody>
                {dados.regras.map((x) => (
                  <tr key={`${x.tarefa}-${x.nome}`}>
                    <th>{x.nome}</th>
                    <td>
                      <span className="selo">{TIPO_CURTO[x.tipo]}</span>
                    </td>
                    <td>
                      {dados.variantes.map((v) => `${v.id} ${x.falhas[v.id]}/${r(x.tarefa, v.id).execucoes}`).join(' · ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
        <FontesEMetodo
          fontes={[FONTES.execucoes, FONTES.diffDoCupom]}
          analise={[ANALISE.regras, ANALISE.exportar]}
          metodo={
            <>
              A classificação de cada regra é um julgamento, feito uma vez, lendo o pedido de cada tarefa. As chances
              contam cada regra em cada entrega sem especificação ({execucoesAB} entregas). Uma regra do cupom (<q>um
              pedido recusado não gasta o uso do cupom</q>) passa sem especificação por um motivo bobo: sem a regra de uso
              único, não há uso para gastar. A especificação não errou nenhuma regra em nenhuma entrega.
            </>
          }
        />
      </Parte>

      <Parte id="custo">
        <p>
          A especificação tem um preço na própria execução: o agente lê mais, escreve mais testes e confere mais coisas.
          Só a entrega, com especificação, custou de {diferenca(Math.min(...entregaCsobreA))} a{' '}
          {diferenca(Math.max(...entregaCsobreA))} mais que a do pedido solto. Mas não teve correção nenhuma. Somando a
          entrega e as correções:
        </p>
        <Figura
          titulo="Custo de uma execução, até a tarefa ficar pronta"
          subtitulo={`Média de ${repeticoes} execuções, em dólares, a preço de API do ${dados.modelo.nome}`}
          legenda={dados.variantes.map((v) => ({ nome: v.nome, cor: CORES[v.id] }))}
          fonte={`Fonte: os registros das ${n} sessões do Claude Code, com os preços conferidos em ${consultadoEm}. Ao lado de cada nome, a entrega mais as correções.`}
          tabela={{
            colunas: ['Tarefa', 'Jeito', 'Entrega', 'Correções', 'Total', 'Menor e maior', 'Minutos'],
            linhas: dados.resumo.map((x) => [
              dados.tarefas.find((t) => t.id === x.tarefa)!.nome,
              nomeDaVariante(x.variante),
              usd(x.custo_entrega),
              usd(x.custo_correcoes),
              usd(x.custo),
              `${usd(x.custo_minimo)} a ${usd(x.custo_maximo)}`,
              numero(x.minutos, 1),
            ]),
          }}
        >
          <GraficoBarras
            descricao="Custo médio de uma execução por tarefa e jeito de pedir, em dólares"
            formato={usd}
            grupos={dados.tarefas.map((t) => ({
              titulo: t.nome,
              barras: dados.variantes.map((v) => {
                const x = r(t.id, v.id)
                return {
                  nome: v.nome,
                  valor: x.custo,
                  cor: CORES[v.id],
                  nota: x.custo_correcoes > 0 ? `${numero(x.custo_entrega, 2)} + ${numero(x.custo_correcoes, 2)}` : 'sem correções',
                }
              }),
            }))}
          />
        </Figura>
        <p>
          Na tarefa pequena, empatou com o pedido solto: {usd(r('p-paginacao', 'C').custo)} contra{' '}
          {usd(r('p-paginacao', 'A').custo)}. Na média, saiu {diferenca(custoCsobreA[1])} mais barata, e na grande, {diferenca(custoCsobreA[2])}. Quanto
          maior a tarefa, mais regras ela tem, mais o agente erra sem elas e mais as correções pesam. O tempo de execução
          seguiu o mesmo desenho: com especificação, de {numero(Math.min(...minutosC), 1)} a{' '}
          {numero(Math.max(...minutosC), 1)} minutos por tarefa, em média; sem, até {numero(Math.max(...minutosAB), 1)}.
        </p>
        <p>
          Em valores absolutos, é pouco: o experimento inteiro, as {n} execuções, custaria {usd(dados.total.custo)} a preço
          de API. Rodou na assinatura do Claude Code, onde o que se gasta é limite de uso. O que pesa de verdade é outra
          coisa, que a conta não pega: <Ver id="quando" />.
        </p>
        <FontesEMetodo
          fontes={[FONTES.execucoes, FONTES.anthropicPrecos]}
          analise={[ANALISE.kit, ANALISE.precos]}
          metodo={
            <>
              Os tokens de cada resposta do modelo vêm do registro da sessão do Claude Code, separados por etapa (a
              entrega, que no jeito B inclui o plano, e cada correção). O custo usa os preços de API do{' '}
              {dados.modelo.nome} (US$ {numero(dados.preco.entrada, 0)} por milhão de tokens de entrada, US${' '}
              {numero(dados.preco.saida, 0)} de saída, US$ {numero(dados.preco.entrada_cache, 2)} de leitura no cache) e
              cobra a gravação no cache pelo prazo de 1 hora, que é o que o Claude Code usa na assinatura. A conta bate,
              centavo por centavo, com a que o próprio Claude Code informa no fim de cada sessão.
            </>
          }
        />
      </Parte>

      <Parte id="plano">
        <p>
          O jeito B, com o modo de plano, foi o pior dos três. Acertou praticamente as mesmas regras que o pedido solto
          (de {pct(Math.min(...regrasB))} a {pct(Math.max(...regrasB))}, contra {pct(Math.min(...regrasA))} a{' '}
          {pct(Math.max(...regrasA))}) e custou de {diferenca(Math.min(...custoBsobreA))} a{' '}
          {diferenca(Math.max(...custoBsobreA))} mais, porque ler o projeto e escrever o plano também gasta tokens.
        </p>
        <p>
          O motivo aparece no próprio plano. Quem escreve o plano é o agente, a partir do mesmo pedido de duas linhas, com
          as mesmas suposições. Os três planos do cupom falam da promoção, e falam igual: <q>o mínimo é comparado com o
          subtotal, que já usa o preço promocional dos produtos</q>. Nenhum disse que item em promoção fica fora do
          cupom. O plano deixou a suposição escrita, à vista. Mas foi aprovado sem ninguém ler, e um plano aprovado sem
          leitura não acrescenta informação nenhuma.
        </p>
        <p>
          Essa é a limitação do experimento, e também a lição. Na vida real, ler o plano é exatamente o momento de dizer{' '}
          <q>não, item em promoção não leva cupom</q>. Quando você corrige o plano, ele começa a virar uma especificação.
          O modo de plano é útil como revisão; sem revisão, é o pedido solto mais caro.
        </p>
        <FontesEMetodo
          fontes={[FONTES.diffDoPlano, FONTES.modoDePlano]}
          analise={[ANALISE.kit]}
          metodo={
            <>
              Sem interface, o modo de plano funciona como no terminal: o agente lê o projeto, escreve o plano e para,
              sem editar nada. A aprovação é uma segunda mensagem na mesma sessão. O custo da entrega de B inclui o plano.
            </>
          }
        />
      </Parte>

      <Parte id="quando">
        <p>
          A conta das partes anteriores tem um buraco: ela não mede quem escreveu a especificação. Aqui, fui eu, com o
          Claude, e cada uma tem de {numero(pequena.palavras_spec)} a {numero(cupom.palavras_spec)} palavras. Na vida
          real, é o dev que decide as regras, e esse é o custo que a especificação troca pelas correções. As correções
          também têm um custo que não aparece nos tokens: alguém precisa testar, perceber o erro e explicar. No
          experimento, os testes já estavam escritos. Fora dele, a regra esquecida pode aparecer em produção.
        </p>
        <p>Com isso, dá para tirar uma regra prática:</p>
        <ul>
          <li>
            <strong>Escreva as regras quando só você as conhece.</strong> Dinheiro, prazos, estados, o que acontece quando
            a mesma chamada chega duas vezes. Foi nesse tipo que o agente errou {pct(taxa(silencio))} das vezes.
          </li>
          <li>
            <strong>Para o óbvio, o pedido basta.</strong> Os testes óbvios passaram em quase todas as entregas, com ou sem
            especificação.
          </li>
          <li>
            <strong>Diga o formato quando alguém depende dele.</strong> Os campos da resposta e os códigos HTTP são
            contrato com quem consome a API; o agente não tem como adivinhar o que o cliente espera.
          </li>
          <li>
            <strong>Não precisa ser um documento formal.</strong> O experimento não separou as partes da especificação,
            mas tudo o que os testes cobravam estava nas regras e nos critérios de aceitação, não no desenho. Uma lista
            curta de <q>tem que valer</q> no pedido já é uma especificação.
          </li>
          <li>
            <strong>Se usar o modo de plano, leia o plano.</strong> Aprovar sem ler é pagar mais pelo mesmo resultado.
          </li>
        </ul>
        <p>
          A especificação não deixa o agente mais inteligente. Ela muda quem decide. E quanto maior a tarefa, mais
          decisões ela tem, e mais caro sai deixá-las para o agente.
        </p>
        <FontesEMetodo
          fontes={[FONTES.execucoes]}
          analise={[ANALISE.tarefas, ANALISE.regras]}
          metodo={
            <>
              As palavras contam o <code>spec.md</code> e o <code>pedido.md</code> de cada tarefa. O tempo de escrever as
              especificações não foi medido: elas foram escritas pelo Claude numa sessão com o Igor, junto com os testes,
              e revisadas por ele antes das execuções.
            </>
          }
        />
      </Parte>

      <section className="secao" id="resumo">
        <h2>Em resumo</h2>
        <ul>
          <li>
            <strong>Só a especificação acertou de primeira:</strong> {prontasC} de {execucoesC} execuções prontas na
            entrega, contra {prontasAB} de {execucoesAB} sem ela.
          </li>
          <li>
            <strong>O que separa os jeitos são as regras de negócio</strong>, não o óbvio. Sem especificação, o agente não
            inventa a regra que o pedido não menciona ({pct(taxa(silencio))} de erro) e escolhe outra coisa razoável
            quando o pedido deixa em aberto.
          </li>
          <li>
            <strong>No custo, empata na tarefa pequena e ganha na grande</strong> ({diferenca(custoCsobreA[2])} mais
            barata), porque dispensa as correções.
          </li>
          <li>
            <strong>Plano aprovado sem ler não ajuda:</strong> errou o mesmo que o pedido solto e custou mais.
          </li>
          <li>
            <strong>O custo que fica de fora é escrever as regras.</strong> Vale quando só você as conhece.
          </li>
        </ul>
      </section>

      <footer className="rodape">
        <h2>Sobre os dados</h2>
        <p>
          As {n} execuções rodaram entre 6 e 7 de novembro de 2026, com o {dados.modelo.nome} em esforço médio, no Claude
          Code {iso.versoes.join(', ')}. São um modelo, um projeto e {repeticoes} repetições por combinação: os números
          mostram uma tendência clara, não uma lei. A documentação foi conferida em {conferidaEm} e os preços, em{' '}
          {consultadoEm}.
        </p>
        <p>
          Os jeitos A e B rodaram duas vezes. Na primeira, a mensagem de correção levava só a primeira linha do erro, quase
          sempre <q>Expected values to be strictly equal:</q>, sem o esperado e o obtido. Com ela, na tarefa grande,
          nenhuma execução sem especificação ficou pronta no fim ({devolucaoNoPrimeiroLote.map((x) => `${nomeDaVariante(x.variante).toLowerCase()}: ${x.prontas_no_fim} de 3`).join('; ')}).
          A mensagem foi corrigida, A e B rodaram de novo, e é esse segundo lote que está no post. As especificações nunca
          receberam correção, então não foram refeitas. O primeiro lote também está no repositório.
        </p>
        <p>
          O projeto, as tarefas, os testes escondidos, o código que o agente escreveu em cada execução e a análise estão
          no{' '}
          <a href="https://github.com/igor-gregori/iblog/tree/main/posts/especificacao-antes-do-codigo" target="_blank" rel="noreferrer">
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
