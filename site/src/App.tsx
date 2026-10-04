import { useMemo, type ReactNode } from 'react'
import { Cabecalho } from './components/Cabecalho.tsx'
import { Figura, type TabelaDeDados } from './components/Figura.tsx'
import { GraficoLinhas, type Serie } from './components/GraficoLinhas.tsx'
import { Simulador } from './components/Simulador.tsx'
import {
  CIDADE_DO_EXEMPLO,
  DISPONIVEL,
  INFLACAO,
  UM_POR_CENTO,
  compraAVista,
  fundosDoPassado,
  rendimentoDoEmpate,
  rendimentoMedioDoMercado,
  rentabilidadeDoAluguel,
  retornoReal,
  vantagemEmReais,
  type Fundos,
} from './conta.ts'
import { CIDADES, CORES, ultimo, useDados, type Dados, type Tabela } from './dados.ts'
import { instante, mesAno, mesAnoDoInstante, numero, pct, reais, reaisComSinal, reaisCurto } from './formato.ts'
import { taxaMensal } from './simulador.ts'

export default function App() {
  const { dados, erro } = useDados()

  return (
    <>
      <Cabecalho />
      {dados ? (
        <Pagina dados={dados} />
      ) : (
        <main className="pagina">
          <p className="aviso">{erro ? `Não foi possível carregar os dados (${erro}).` : 'Carregando os dados…'}</p>
        </main>
      )}
    </>
  )
}

interface SecaoProps {
  numero: number
  /** O assunto da seção em uma ou duas palavras; fica na margem, ao lado do número. */
  rubrica: string
  titulo: string
  children: ReactNode
  /** Conteúdo que ocupa a largura toda da página, abaixo do texto. */
  largo?: ReactNode
}

function Secao({ numero, rubrica, titulo, children, largo }: SecaoProps) {
  return (
    <section className="secao">
      <p className="rubrica">
        <span>{numero}</span>
        {rubrica}
      </p>
      <div className="corpo">
        <h2>{titulo}</h2>
        {children}
      </div>
      {largo && <div className="largo">{largo}</div>}
    </section>
  )
}

const PRAZOS = [5, 10, 20, 30]
const PRAZO_DO_EMPATE = 20

function Pagina({ dados }: { dados: Dados }) {
  const { precos, rendimento_fiis: rendimentos, ativos, taxas, hoje } = dados
  const mesDosPrecos = mesAno(precos.datas[precos.datas.length - 1])
  const cidade = hoje[CIDADE_DO_EXEMPLO]

  // Os números do texto saem dos dados, para continuarem certos quando as fontes forem atualizadas.
  const conta = useMemo(() => {
    const p = compraAVista(cidade, DISPONIVEL)
    const mediaDoMercado = rendimentoMedioDoMercado(taxas)
    const cenarios: { nome: string; fundos: Fundos }[] = [
      { nome: '1% ao mês, cota parada', fundos: { rendimentoMes: UM_POR_CENTO, cotaAa: 0 } },
      {
        nome: `Média dos FIIs hoje (${pct(mediaDoMercado, 2)} ao mês), cota parada`,
        fundos: { rendimentoMes: mediaDoMercado, cotaAa: 0 },
      },
      { nome: `Como desde 2011 (${pct(taxas.fii_real_aa, 1)} ao ano acima da inflação)`, fundos: fundosDoPassado(taxas) },
    ]
    const otimista = { rendimentoMes: UM_POR_CENTO, cotaAa: INFLACAO }
    return {
      p,
      mediaDoMercado,
      linhas: cenarios.map(({ nome, fundos }) => ({ nome, valores: PRAZOS.map((anos) => vantagemEmReais(p, fundos, anos)) })),
      empate: rendimentoDoEmpate(p, PRAZO_DO_EMPATE, 0),
      umPorCento10: vantagemEmReais(p, cenarios[0].fundos, 10),
      umPorCento20: vantagemEmReais(p, cenarios[0].fundos, PRAZO_DO_EMPATE),
      umPorCentoComImovelSubindo: vantagemEmReais(p, cenarios[0].fundos, PRAZO_DO_EMPATE, INFLACAO, 0.01),
      passado20: vantagemEmReais(p, cenarios[2].fundos, PRAZO_DO_EMPATE),
      realOtimista: retornoReal(otimista),
      realComCotaParada: retornoReal(cenarios[0].fundos),
    }
  }, [cidade, taxas])

  const { p } = conta
  const renda = DISPONIVEL * UM_POR_CENTO
  const reposicao = DISPONIVEL * taxaMensal(INFLACAO)
  const sobra = renda - reposicao - p.aluguel_mensal
  const manutencao = (p.valor_imovel * p.manutencao_aa) / 12
  const area = p.valor_imovel / cidade.preco_m2
  const rentabilidade = rentabilidadeDoAluguel(cidade)
  const realDoEmpate = retornoReal({ rendimentoMes: conta.empate, cotaAa: 0 })
  const quem = (vantagem: number) => (vantagem >= 0 ? 'quem aluga' : 'quem compra')

  const brasil = precos.series.Brasil.map((valor) => valor ?? 0)
  const pico = Math.max(...brasil)
  const quedaDesdeOPico = ultimo(precos.series.Brasil) / pico - 1
  const anoDoPico = precos.datas[brasil.indexOf(pico)].slice(0, 4)
  const rendimentoFiis = rendimentos.series.FIIs.filter((v) => v !== null)
  const maiorRendimento = Math.max(...rendimentoFiis)
  const primeiroAnoDosRendimentos = rendimentos.datas[0].slice(0, 4)

  return (
    <main className="pagina">
      <header className="manchete">
        <p className="chapeu">Mercado imobiliário brasileiro</p>
        <h1>Comprar ou alugar?</h1>
        <p className="linha-fina">
          Com {reaisCurto(DISPONIVEL)} na mão, vale mais comprar um imóvel à vista e morar nele, ou aplicar o dinheiro em
          fundos imobiliários que rendem 1% ao mês e pagar o aluguel com essa renda?
        </p>
        <p className="assinatura">
          Exemplo: {CIDADE_DO_EXEMPLO} (MG), anúncios de {mesAno(cidade.mes)} · Séries até {mesDosPrecos} · Fontes: Fipe,
          B3, Banco Central, IBGE, CVM e Tesouro Nacional
        </p>
      </header>

      <div className="abertura">
        <div className="resposta">
          <h2>A resposta curta</h2>
          <p>Depende de quanto os fundos rendem de verdade, depois de descontar a inflação.</p>
          <ul>
            <li>
              <strong>Se o 1% ao mês continuar e a cota não cair, alugar e investir ganha com folga.</strong> Em{' '}
              {CIDADE_DO_EXEMPLO}, {quem(conta.umPorCento10)} termina dez anos com{' '}
              {reaisCurto(Math.abs(conta.umPorCento10))} a mais, em dinheiro de hoje.
            </li>
            <li>
              <strong>Parte do 1% é só inflação.</strong> Dos {reais(renda)} que a carteira paga por mês, uns{' '}
              {reais(Math.round(reposicao / 10) * 10)} apenas repõem o que a inflação tira dos {reaisCurto(DISPONIVEL)} se a
              cota ficar parada.
            </li>
            <li>
              <strong>A conta empata perto do que os fundos pagam hoje.</strong> Em {PRAZO_DO_EMPATE} anos, as duas
              escolhas empatam com {pct(conta.empate, 2)} ao mês. Nos últimos 12 meses, os fundos distribuíram em média{' '}
              {pct(conta.mediaDoMercado, 2)} ao mês.
            </li>
            <li>
              <strong>
                Se os fundos repetirem o que fizeram desde 2011, {conta.passado20 < 0 ? 'comprar ganha' : 'alugar ainda ganha'}.
              </strong>{' '}
              Em {PRAZO_DO_EMPATE} anos, {quem(conta.passado20)} termina com {reaisCurto(Math.abs(conta.passado20))} a mais.
            </li>
          </ul>
        </div>

        <aside className="numeros">
          <h2>Em números</h2>
          <dl className="indicadores">
            <div>
              <dt>Renda de {reaisCurto(DISPONIVEL)} a 1% ao mês</dt>
              <dd>{reais(renda)}</dd>
              <small>por mês, isenta de imposto de renda</small>
            </div>
            <div>
              <dt>Aluguel de um imóvel igual em {CIDADE_DO_EXEMPLO}</dt>
              <dd>{reais(Math.round(p.aluguel_mensal / 10) * 10)}</dd>
              <small>
                por mês, por um imóvel de {reaisCurto(p.valor_imovel)} ({numero(area)} m²)
              </small>
            </div>
            <div>
              <dt>Rendimento que empata em {PRAZO_DO_EMPATE} anos</dt>
              <dd>{pct(conta.empate, 2)}</dd>
              <small>ao mês, com a cota parada</small>
            </div>
            <div>
              <dt>Retorno real dos FIIs</dt>
              <dd>{pct(taxas.fii_real_aa, 1)}</dd>
              <small>ao ano desde 2011, somando rendimento e cota</small>
            </div>
          </dl>
        </aside>
      </div>

      <Secao numero={1} rubrica="O mês" titulo="A renda paga o aluguel, mas parte dela é inflação">
        <p>
          Com {reaisCurto(DISPONIVEL)}, dá para comprar à vista um imóvel de {reaisCurto(p.valor_imovel)} em{' '}
          {CIDADE_DO_EXEMPLO}: o resto vai para ITBI, escritura e registro. Pelos anúncios da cidade, um imóvel igual
          aluga por {reais(Math.round(p.aluguel_mensal / 10) * 10)} por mês. Aplicado a 1% ao mês, o mesmo dinheiro rende{' '}
          {reais(renda)}, mais que o dobro do aluguel.
        </p>
        <p>
          Só que a inflação corrói o dinheiro aplicado. Se o preço da cota ficar parado, os {reaisCurto(DISPONIVEL)} valem
          menos a cada mês, e quem quer manter o patrimônio precisa reinvestir parte da renda. Quem compra não tem esse
          problema se o imóvel acompanhar a inflação, mas paga a manutenção.
        </p>
        <figure className="figura">
          <div className="figura-topo">
            <div>
              <h3>O primeiro mês de cada lado</h3>
              <p>
                Em {CIDADE_DO_EXEMPLO}, com {reaisCurto(DISPONIVEL)}, inflação de {pct(INFLACAO, 1)} ao ano e o imóvel
                acompanhando a inflação
              </p>
            </div>
          </div>
          <div className="conta">
            <div>
              <h4>Quem aluga e investe</h4>
              <dl>
                <div>
                  <dt>Renda dos fundos, a 1% ao mês</dt>
                  <dd>{reais(renda)}</dd>
                </div>
                <div>
                  <dt>Parte que só repõe a inflação, com a cota parada</dt>
                  <dd>−{reais(reposicao)}</dd>
                </div>
                <div>
                  <dt>Aluguel</dt>
                  <dd>−{reais(p.aluguel_mensal)}</dd>
                </div>
                <div className="total">
                  <dt>Resultado do mês</dt>
                  <dd>{reaisComSinal(sobra)}</dd>
                </div>
              </dl>
            </div>
            <div>
              <h4>Quem compra à vista</h4>
              <dl>
                <div>
                  <dt>Aluguel</dt>
                  <dd>{reais(0)}</dd>
                </div>
                <div>
                  <dt>Manutenção, {pct(p.manutencao_aa)} do imóvel por ano</dt>
                  <dd>−{reais(manutencao)}</dd>
                </div>
                <div>
                  <dt>Valorização acima da inflação</dt>
                  <dd>{reais(0)}</dd>
                </div>
                <div className="total">
                  <dt>Resultado do mês</dt>
                  <dd>−{reais(manutencao)}</dd>
                </div>
              </dl>
            </div>
          </div>
          <figcaption>
            Em dinheiro de hoje: nos dois lados, o patrimônio inicial continua valendo o mesmo depois de descontada a
            inflação. Imóvel e aluguel: mediana de {cidade.anuncios} anúncios de {CIDADE_DO_EXEMPLO} em{' '}
            {mesAno(cidade.mes)}.
          </figcaption>
        </figure>
        <p>
          No primeiro mês, quem aluga fica {reais(sobra + manutencao)} à frente. Mas essa conta depende de duas apostas: que
          a carteira continue pagando 1% ao mês e que a cota não perca valor. As próximas seções olham cada uma.
        </p>
      </Secao>

      <Secao numero={2} rubrica="Fundos" titulo="O 1% ao mês se sustenta?">
        <p>
          Os fundos imobiliários informam à CVM quanto distribuem todo mês. Nos últimos 12 meses, a média foi de{' '}
          {pct(conta.mediaDoMercado, 2)} ao mês, e desde {primeiroAnoDosRendimentos} nenhum mês passou de{' '}
          {pct(maiorRendimento, 2)}. Essa conta é feita sobre o valor patrimonial da cota. Na bolsa, quando a cota está
          abaixo do valor patrimonial, o mesmo rendimento vira uma porcentagem maior. Ou seja: um fundo que paga 1% ao mês
          paga mais que a média, ou tem a cota barata, o que em geral quer dizer que o mercado vê mais risco nele.
        </p>
        <Figura
          titulo="Rendimento distribuído pelos FIIs"
          subtitulo="Média do mercado, por mês, sobre o valor patrimonial. A linha marca 1% ao mês."
          fonte="Fonte: CVM (informes mensais dos fundos negociados em bolsa com pelo menos mil cotistas, ponderados pelo patrimônio)."
          tabela={tabelaAnual(rendimentos, ['FIIs'], (v) => pct(v, 2))}
        >
          <GraficoLinhas
            {...eixoDoTempo(rendimentos.datas)}
            series={series(rendimentos, ['FIIs'])}
            formatoY={(v) => pct(v, 2)}
            formatoTiqueY={(v) => pct(v, 1)}
            limitesY={[0, 0.012]}
            base={UM_POR_CENTO}
            descricao={`Rendimento mensal médio distribuído pelos fundos imobiliários desde ${primeiroAnoDosRendimentos}`}
          />
        </Figura>
        <p>
          O rendimento é só metade da conta. A outra metade é o preço da cota. O IFIX, índice que soma rendimento e cota,
          rendeu {pct(taxas.fii_real_aa, 1)} ao ano acima da inflação desde 2011, menos que o CDI (
          {pct(taxas.cdi_real_aa, 1)}). Os fundos pagaram perto de {pct(taxas.fii_rendimento_aa)} ao ano, mas a cota não
          acompanhou a inflação.
        </p>
        <Figura
          titulo="R$ 100 investidos em dezembro de 2010"
          subtitulo="Retorno total, em valores reais"
          legenda={legenda(Object.keys(ativos.series))}
          fonte="Fontes: Fipe, B3, Banco Central e IBGE. Imóvel: valorização do m² mais 70% do aluguel bruto. A linha do imóvel é lisa porque vem de preços de anúncio."
          tabela={tabelaAnual(ativos, Object.keys(ativos.series), (v) => numero(v))}
        >
          <GraficoLinhas
            {...eixoDoTempo(ativos.datas)}
            series={series(ativos, Object.keys(ativos.series))}
            formatoY={(v) => numero(v)}
            base={100}
            descricao="Valor real de 100 reais investidos em dezembro de 2010 em um imóvel em São Paulo, no IFIX e no CDI"
          />
        </Figura>
        <p>
          Com 1% ao mês e a cota parada, a carteira rende {pct(conta.realComCotaParada, 1)} ao ano acima da inflação. Para
          empatar com a compra em {PRAZO_DO_EMPATE} anos, bastam {pct(realDoEmpate, 1)}, ou {pct(conta.empate, 2)} ao mês com a
          cota parada. Se além do 1% a cota ainda acompanhasse a inflação, o retorno real chegaria a{' '}
          {pct(conta.realOtimista, 1)} ao ano, mais de quatro vezes o que os fundos entregaram desde 2011.
        </p>
      </Secao>

      <Secao numero={3} rubrica="Imóvel" titulo="O imóvel valorizou menos do que parece">
        <p>
          Do lado de quem compra, o que conta é o imóvel subir mais que a inflação. Nas capitais com série longa, foi o
          contrário: em reais de hoje, o m² subiu forte até {anoDoPico} e ainda está {pct(Math.abs(quedaDesdeOPico))} abaixo
          do pico na média do Brasil.
        </p>
        <Figura
          titulo="Preço real do m²"
          subtitulo={`Apartamentos à venda, em R$ de ${mesDosPrecos} por m²`}
          legenda={legenda(['Brasil', ...CIDADES])}
          fonte="Fontes: Fipe (Índice FipeZAP, preços de anúncio) e IBGE (IPCA)."
          tabela={tabelaAnual(precos, ['Brasil', ...CIDADES], (v) => numero(v))}
        >
          <GraficoLinhas
            {...eixoDoTempo(precos.datas)}
            series={series(precos, ['Brasil', ...CIDADES])}
            formatoY={(v) => numero(v)}
            limitesY={[0, 22000]}
            descricao="Preço real do metro quadrado no Brasil, em São Paulo, no Rio de Janeiro e em Belo Horizonte desde 2008"
          />
        </Figura>
        <p>
          {CIDADE_DO_EXEMPLO} não tem índice de preços. Nos anúncios, o m² sai por {reais(cidade.preco_m2)} e o aluguel de
          um ano equivale a {pct(rentabilidade, 1)} do preço, menos que em São Paulo (
          {pct(rentabilidadeDoAluguel(hoje['São Paulo']), 1)}). Aluguel barato em relação ao preço favorece quem aluga. Se
          o imóvel subir 1% ao ano acima da inflação, a vantagem de quem aluga com 1% ao mês em {PRAZO_DO_EMPATE} anos cai
          de {reaisCurto(conta.umPorCento20)} para {reaisCurto(conta.umPorCentoComImovelSubindo)}.
        </p>
      </Secao>

      <Secao numero={4} rubrica="Resultado" titulo="Quem termina na frente">
        <p>
          A conta completa, mês a mês: quem compra não paga aluguel e investe o que economiza nos mesmos fundos; quem aluga
          reinveste a renda que sobra. No fim, o imóvel é vendido com corretagem e as cotas pagam imposto sobre o ganho.
          Com 1% ao mês e a cota parada, alugar e investir ganha em todos os prazos. Com o que os fundos entregaram desde
          2011, comprar passa à frente com o tempo.
        </p>
        <figure className="figura">
          <div className="figura-topo">
            <div>
              <h3>Vantagem de quem aluga e investe</h3>
              <p>
                Em {CIDADE_DO_EXEMPLO}, com {reaisCurto(DISPONIVEL)}, em milhares de reais de hoje. Negativo: quem compra
                termina com mais.
              </p>
            </div>
          </div>
          <div className="rolagem-x">
            <table className="quadro">
              <thead>
                <tr>
                  <th>Os fundos rendem</th>
                  {PRAZOS.map((anos) => (
                    <th key={anos}>{anos} anos</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {conta.linhas.map((linha) => (
                  <tr key={linha.nome}>
                    <th>{linha.nome}</th>
                    {linha.valores.map((valor, i) => (
                      <td key={PRAZOS[i]} className={valor >= 0 ? 'a-favor-do-aluguel' : 'a-favor-da-compra'}>
                        {milharesComSinal(valor)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <figcaption>
            Imóvel e aluguel acompanham a inflação de {pct(INFLACAO, 1)} ao ano. Custos da compra de{' '}
            {pct(p.custos_compra_pct)}, manutenção de {pct(p.manutencao_aa)} ao ano, corretagem de{' '}
            {pct(p.corretagem_venda_pct)} na venda e imposto de {pct(p.ir_ganho_carteira)} sobre o ganho com as cotas.
          </figcaption>
        </figure>
      </Secao>

      <Secao numero={5} rubrica="Simulador" titulo="Faça a sua conta" largo={<Simulador dados={dados} />}>
        <p>
          Troque a cidade, o valor, o rendimento dos fundos e o que acontece com a cota. Se quiser comprar um imóvel mais
          caro, dá para financiar parte dele. O mapa mostra, para cada combinação de rendimento e valorização do imóvel, de
          que lado fica a vantagem.
        </p>
      </Secao>

      <section className="notas">
        <div>
          <h2>Como a conta é feita</h2>
          <ul>
            <li>
              <strong>Quem compra</strong> paga o imóvel à vista, os custos da compra (ITBI, escritura e registro) e a
              manutenção.
            </li>
            <li>
              <strong>Quem aluga</strong> aplica todo o dinheiro em fundos imobiliários e paga o aluguel de um imóvel igual,
              reajustado uma vez por ano.
            </li>
            <li>
              <strong>As duas gastam o mesmo todo mês.</strong> Quem compra não paga aluguel e investe a diferença nos
              mesmos fundos. Dá no mesmo que a renda dos fundos pagar o aluguel de quem aluga.
            </li>
            <li>
              <strong>No fim</strong>, o imóvel entra com {pct(p.corretagem_venda_pct)} de corretagem descontada e a
              carteira, com {pct(p.ir_ganho_carteira)} de imposto sobre o ganho de capital. Os rendimentos dos fundos são
              isentos.
            </li>
            <li>Condomínio e IPTU ficam de fora: no Brasil, quem mora paga os dois, seja dono ou inquilino.</li>
          </ul>
        </div>

        <div>
          <h2>O que esta análise não vê</h2>
          <ul>
            <li>
              {CIDADE_DO_EXEMPLO} não tem índice de preços: os valores vêm de uma amostra de {cidade.anuncios} anúncios e têm
              margem de erro grande. Preço de anúncio também não é o preço de fechamento.
            </li>
            <li>
              Fundos que pagam acima da média costumam ter mais risco. Um inquilino que sai ou uma dívida do fundo pode
              cortar o rendimento de um mês para o outro.
            </li>
            <li>
              O IFIX só existe desde 2011, e quinze anos contêm um único ciclo imobiliário. As regras de imposto dos fundos
              também podem mudar.
            </li>
            <li>Ficaram de fora os seguros, o FGTS, os subsídios do Minha Casa Minha Vida e os custos de mudança.</li>
            <li>
              A segurança de ter casa própria e a liberdade de se mudar não entram na conta, e para muita gente pesam mais
              que o dinheiro.
            </li>
          </ul>
        </div>
      </section>

      <footer className="rodape">
        Dados: Fipe (Índice FipeZAP), B3 (IFIX), Banco Central (SGS), IBGE (IPCA), CVM (informes mensais dos FIIs),
        Tesouro Nacional e anúncios de imóveis em {CIDADE_DO_EXEMPLO}. Isto é um estudo, não uma recomendação de
        investimento.
      </footer>
    </main>
  )
}

/** 293000 → "+293"; −141000 → "−141" */
function milharesComSinal(valor: number): string {
  const milhares = Math.round(valor / 1000)
  return milhares > 0 ? `+${numero(milhares)}` : numero(milhares)
}

function legenda(nomes: readonly string[]) {
  return nomes.map((nome) => ({ nome, cor: CORES[nome] }))
}

function series(tabela: Tabela, nomes: readonly string[]): Serie[] {
  return nomes.map((nome) => ({ nome, cor: CORES[nome], valores: tabela.series[nome], contexto: nome === 'Brasil' }))
}

/** As propriedades do eixo horizontal de um gráfico mensal: uma marca a cada dois anos. */
function eixoDoTempo(datas: string[]) {
  const primeiroAno = Number(datas[0].slice(0, 4))
  const ultimoAno = Number(datas[datas.length - 1].slice(0, 4))
  const anosPares = Array.from({ length: ultimoAno - primeiroAno + 2 }, (_, i) => primeiroAno + i).filter((ano) => ano % 2 === 0)
  return {
    x: datas.map(instante),
    formatoX: mesAnoDoInstante,
    tiquesX: anosPares.map((ano) => Date.UTC(ano, 0, 1)),
    formatoTiqueX: (ms: number) => String(new Date(ms).getUTCFullYear()),
  }
}

/** Uma linha por ano, com o primeiro mês disponível de cada ano. */
function tabelaAnual(tabela: Tabela, nomes: readonly string[], formato: (valor: number) => string, cabecalho = 'Mês'): TabelaDeDados {
  const linhas: string[][] = []
  let anoAnterior = ''
  tabela.datas.forEach((data, i) => {
    const ano = data.slice(0, 4)
    if (ano === anoAnterior) return
    anoAnterior = ano
    linhas.push([
      mesAno(data),
      ...nomes.map((nome) => {
        const valor = tabela.series[nome][i]
        return valor === null ? '–' : formato(valor)
      }),
    ])
  })
  return { colunas: [cabecalho, ...nomes], linhas }
}
