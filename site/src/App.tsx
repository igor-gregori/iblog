import { useState, type ReactNode } from 'react'
import { Cabecalho } from './components/Cabecalho.tsx'
import { Figura, Opcoes, type TabelaDeDados } from './components/Figura.tsx'
import { GraficoLinhas, type Serie } from './components/GraficoLinhas.tsx'
import { Simulador } from './components/Simulador.tsx'
import { CIDADES, CORES, ultimo, useDados, type Dados, type Tabela } from './dados.ts'
import { instante, mesAno, mesAnoDoInstante, numero, pct } from './formato.ts'
import { useTema } from './hooks/useTema.ts'

export default function App() {
  const tema = useTema()
  const { dados, erro } = useDados()

  return (
    <>
      <Cabecalho tema={tema.tema} aoAlternarTema={tema.alternar} />
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

function Pagina({ dados }: { dados: Dados }) {
  const [horizonte, setHorizonte] = useState<'5' | '10'>('5')
  const [cidade, setCidade] = useState<string>('São Paulo')

  const { precos, rentabilidade, ativos, monte_carlo: futuro, taxas } = dados
  const mesDosPrecos = mesAno(precos.datas[precos.datas.length - 1])

  // Os números do texto saem dos dados, para continuarem certos quando as fontes forem atualizadas.
  const brasil = precos.series.Brasil.map((valor) => valor ?? 0)
  const pico = Math.max(...brasil)
  const quedaDesdeOPico = ultimo(precos.series.Brasil) / pico - 1
  const anoDoPico = precos.datas[brasil.indexOf(pico)].slice(0, 4)
  const altaNominal = ultimo(precos.nominal_brasil) / (precos.nominal_brasil[0] ?? 1) - 1
  const quedaNoRio = ultimo(precos.series['Rio de Janeiro']) / Math.max(...precos.series['Rio de Janeiro'].map((v) => v ?? 0)) - 1
  const aluguelHoje = ultimo(rentabilidade.series.Brasil)
  const aluguelMinimo = Math.min(...rentabilidade.series.Brasil.filter((v) => v !== null))
  const anoDoMinimo = rentabilidade.datas[rentabilidade.series.Brasil.indexOf(aluguelMinimo)].slice(0, 4)
  const viradaEmSaoPaulo = futuro.anos[futuro.chance['São Paulo'].findIndex((chance, i) => i > 0 && chance < 0.5)]
  const chanceEm = (nome: string, anos: number) => futuro.chance[nome][futuro.anos.indexOf(anos)]
  const backtest = dados.backtest[horizonte]
  const venceu = (nome: string) => {
    const janelas = backtest.series[nome].filter((v) => v !== null)
    return janelas.filter((v) => v > 0).length / janelas.length
  }
  const faixas = futuro.faixas[cidade]

  return (
    <main className="pagina">
      <header className="manchete">
        <p className="chapeu">Mercado imobiliário brasileiro</p>
        <h1>Comprar ou alugar?</h1>
        <p className="linha-fina">
          Muita gente diz que hoje compensa mais morar de aluguel e investir em fundos imobiliários do que comprar um
          imóvel. Este projeto testa essa ideia com quinze anos de dados públicos de preços, aluguéis, juros e fundos.
        </p>
        <p className="assinatura">
          Dados até {mesDosPrecos} · Fontes: Fipe, B3, Banco Central, IBGE, CVM e Tesouro Nacional
        </p>
      </header>

      <div className="abertura">
        <div className="resposta">
          <h2>A resposta curta</h2>
          <p>Depende de quanto tempo você fica no imóvel e do que faz com a diferença.</p>
          <ul>
            <li>
              <strong>Até uns cinco anos, alugar e investir tende a ganhar.</strong> Comprar e depois vender custa
              perto de 11% do valor do imóvel.
            </li>
            <li>
              <strong>Em prazos longos, com os aluguéis de hoje, comprar tende a ganhar</strong>, se os fundos
              imobiliários renderem o que renderam desde 2011.
            </li>
            <li>
              <strong>O que decide é o retorno da carteira.</strong> Ela precisa render uns 4% ao ano acima da inflação
              para empatar. O IFIX entregou {pct(taxas.fii_real_aa, 1)}; o Tesouro IPCA+ paga hoje{' '}
              {pct(taxas.tesouro_ipca_aa, 1)}.
            </li>
            <li>
              <strong>Sem investir a diferença todo mês, comprar ganha.</strong>
            </li>
          </ul>
        </div>

        <aside className="numeros">
          <h2>Em números</h2>
          <dl className="indicadores">
            <div>
              <dt>Preço real do m² no Brasil</dt>
              <dd>{pct(quedaDesdeOPico)}</dd>
              <small>em relação ao pico de {anoDoPico}, descontada a inflação</small>
            </div>
            <div>
              <dt>Rentabilidade do aluguel</dt>
              <dd>{pct(aluguelHoje, 1)}</dd>
              <small>
                ao ano, bruta. Era {pct(aluguelMinimo, 1)} em {anoDoMinimo}
              </small>
            </div>
            <div>
              <dt>Retorno real dos FIIs</dt>
              <dd>{pct(taxas.fii_real_aa, 1)}</dd>
              <small>ao ano desde 2011. O CDI rendeu {pct(taxas.cdi_real_aa, 1)}</small>
            </div>
            <div>
              <dt>Ponto de virada em São Paulo</dt>
              <dd>{numero(viradaEmSaoPaulo)} anos</dd>
              <small>a partir daí, comprar é o resultado mais provável</small>
            </div>
          </dl>
        </aside>
      </div>

      <Secao numero={1} rubrica="Preços" titulo="O imóvel valorizou menos do que parece">
        <p>
          Desde 2008, o preço anunciado do m² no Brasil subiu {pct(altaNominal)}. Só que a inflação comeu a maior parte
          disso. Em reais de hoje, os preços subiram forte até {anoDoPico}, caíram por oito anos e ainda estão{' '}
          {pct(Math.abs(quedaDesdeOPico))} abaixo do pico. No Rio de Janeiro, a perda real chega a{' '}
          {pct(Math.abs(quedaNoRio))}.
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
      </Secao>

      <Secao numero={2} rubrica="Aluguel" titulo="O aluguel ficou caro em relação ao preço">
        <p>
          A rentabilidade do aluguel é o aluguel de um ano dividido pelo preço do imóvel. De 2022 para cá os aluguéis
          dispararam e os preços de venda mal acompanharam a inflação, e a taxa voltou ao nível mais alto em mais de dez
          anos. Para quem aluga, isso pesa: quanto maior a taxa, menos sobra para investir. Mesmo assim, o aluguel bruto
          rende hoje menos que o Tesouro IPCA+, o título público que paga inflação mais juros.
        </p>
        <Figura
          titulo="Rentabilidade do aluguel e juro real"
          subtitulo="Aluguel anual ÷ preço de venda (taxa bruta) e taxa do Tesouro IPCA+, ao ano"
          legenda={legenda([...CIDADES, 'Tesouro IPCA+'])}
          fonte="Fontes: Fipe (Índice FipeZAP) e Tesouro Nacional. Belo Horizonte só tem série de aluguel desde dez/2015."
          tabela={tabelaAnual(rentabilidade, [...CIDADES, 'Tesouro IPCA+'], (v) => pct(v, 1))}
        >
          <GraficoLinhas
            {...eixoDoTempo(rentabilidade.datas)}
            series={series(rentabilidade, [...CIDADES, 'Tesouro IPCA+'])}
            formatoY={(v) => pct(v, 1)}
            formatoTiqueY={(v) => pct(v)}
            limitesY={[0, 0.1]}
            descricao="Rentabilidade do aluguel em São Paulo, no Rio de Janeiro e em Belo Horizonte, e taxa do Tesouro IPCA+, desde 2008"
          />
        </Figura>
      </Secao>

      <Secao numero={3} rubrica="Investimentos" titulo="Os fundos imobiliários renderam menos que o CDI">
        <p>
          R$ 100 aplicados em dezembro de 2010, já descontada a inflação. O IFIX, índice dos fundos imobiliários,
          terminou atrás do CDI e de um apartamento alugado em São Paulo. Os fundos distribuem bons rendimentos (perto
          de {pct(taxas.fii_rendimento_aa)} ao ano, isentos de imposto de renda), mas o preço das cotas ficou
          praticamente parado, e o sobe e desce é muito maior.
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
      </Secao>

      <Secao numero={4} rubrica="O passado" titulo="O que teria acontecido">
        <p>
          Duas pessoas com o mesmo dinheiro e o mesmo gasto mensal. Uma dá entrada e financia; a outra aluga um imóvel
          igual e investe em fundos imobiliários a entrada e a diferença de cada mês. O gráfico mostra quem terminou
          com mais patrimônio, para cada mês em que a decisão poderia ter sido tomada. Em janelas de {horizonte} anos,
          alugar e investir venceu em {pct(venceu('São Paulo'))} das vezes em São Paulo, {pct(venceu('Rio de Janeiro'))}{' '}
          no Rio e {pct(venceu('Belo Horizonte'))} em Belo Horizonte. O que mais pesou foi a queda real dos imóveis
          depois de 2014, e não o desempenho dos fundos.
        </p>
        <Figura
          titulo={`Vantagem do aluguel depois de ${horizonte} anos`}
          subtitulo="Patrimônio de quem alugou menos o de quem comprou, em % do valor do imóvel, pelo mês da decisão"
          legenda={legenda([...CIDADES])}
          controles={
            <Opcoes
              rotulo="Horizonte"
              opcoes={[
                { valor: '5', nome: '5 anos' },
                { valor: '10', nome: '10 anos' },
              ]}
              valor={horizonte}
              aoMudar={setHorizonte}
            />
          }
          fonte="Acima de zero, alugar e investir ganhou. Fontes: Fipe, B3, Banco Central, IBGE e CVM."
          tabela={tabelaAnual(backtest, [...CIDADES], (v) => pct(v, 0, true), 'Decisão em')}
        >
          <GraficoLinhas
            {...eixoDoTempo(backtest.datas)}
            series={series(backtest, [...CIDADES])}
            formatoY={(v) => pct(v, 0, true)}
            base={0}
            rotuloX="mês em que a decisão foi tomada"
            descricao={`Vantagem do aluguel depois de ${horizonte} anos, por mês da decisão, nas três cidades`}
          />
        </Figura>
      </Secao>

      <Secao numero={5} rubrica="O futuro" titulo="E para quem decide hoje">
        <p>
          O ponto de partida mudou: os aluguéis estão caros e o financiamento custa em média{' '}
          {pct(taxas.juros_financiamento_aa, 1)} ao ano. A simulação parte dos preços de hoje e sorteia 10 mil futuros
          de 30 anos, montados com pedaços da história de cada cidade desde 2011. Em São Paulo, a chance de quem aluga
          terminar na frente é de {pct(chanceEm('São Paulo', 5))} em cinco anos, {pct(chanceEm('São Paulo', 10))} em
          dez e {pct(chanceEm('São Paulo', 20))} em vinte.
        </p>
        <Figura
          titulo="Chance de alugar e investir ganhar"
          subtitulo="Proporção dos futuros sorteados em que quem aluga termina com mais patrimônio"
          legenda={legenda([...CIDADES])}
          fonte="Os futuros reaproveitam o que aconteceu de 2011 a 2026 (em Belo Horizonte, desde 2016). Um regime diferente desse não está representado."
          tabela={{
            colunas: ['Anos', ...CIDADES],
            linhas: futuro.anos
              .map((anos, i) => ({ anos, i }))
              .filter(({ anos }) => anos > 0 && anos % 5 === 0)
              .map(({ anos, i }) => [numero(anos), ...CIDADES.map((nome) => pct(futuro.chance[nome][i]))]),
          }}
        >
          <GraficoLinhas
            x={futuro.anos.slice(4)}
            series={CIDADES.map((nome) => ({ nome, cor: CORES[nome], valores: futuro.chance[nome].slice(4) }))}
            formatoX={(anos) => `${numero(anos, anos % 1 === 0 ? 0 : 2)} anos`}
            formatoY={(v) => pct(v)}
            tiquesX={[5, 10, 15, 20, 25, 30]}
            formatoTiqueX={(anos) => numero(anos)}
            base={0.5}
            limitesY={[0, 1]}
            rotuloX="anos depois da decisão"
            descricao="Chance de alugar e investir ganhar, por tempo de permanência, nas três cidades"
          />
        </Figura>

        <p>
          A mediana esconde uma dispersão grande. Em metade dos futuros o resultado fica dentro da faixa escura; em 90%,
          dentro da clara.
        </p>
        <Figura
          titulo={`${cidade}: a vantagem do aluguel ao longo do tempo`}
          subtitulo="Em % do valor do imóvel, em 10 mil futuros sorteados"
          legenda={[
            { nome: 'Mediana', cor: CORES[cidade] },
            { nome: '50% dos futuros', cor: CORES[cidade], marca: 'area', opacidade: 0.35 },
            { nome: '90% dos futuros', cor: CORES[cidade], marca: 'area', opacidade: 0.15 },
          ]}
          controles={
            <Opcoes
              rotulo="Cidade"
              opcoes={CIDADES.map((nome) => ({ valor: nome, nome }))}
              valor={cidade}
              aoMudar={setCidade}
            />
          }
          fonte="Acima de zero, alugar e investir em FIIs ganha. Condições iniciais de hoje."
          tabela={{
            colunas: ['Anos', '5% piores', 'Mediana', '5% melhores'],
            linhas: futuro.anos
              .map((anos, i) => ({ anos, i }))
              .filter(({ anos }) => anos % 5 === 0)
              .map(({ anos, i }) => [
                numero(anos),
                pct(faixas.p05[i], 0, true),
                pct(faixas.p50[i], 0, true),
                pct(faixas.p95[i], 0, true),
              ]),
          }}
        >
          <GraficoLinhas
            x={futuro.anos}
            series={[{ nome: 'Mediana', cor: CORES[cidade], valores: faixas.p50 }]}
            faixas={[
              { nome: '90% dos futuros', cor: CORES[cidade], opacidade: 0.12, inferior: faixas.p05, superior: faixas.p95 },
              { nome: '50% dos futuros', cor: CORES[cidade], opacidade: 0.22, inferior: faixas.p25, superior: faixas.p75 },
            ]}
            formatoX={(anos) => `${numero(anos, anos % 1 === 0 ? 0 : 2)} anos`}
            formatoY={(v) => pct(v, 0, true)}
            tiquesX={[0, 5, 10, 15, 20, 25, 30]}
            formatoTiqueX={(anos) => numero(anos)}
            base={0}
            rotuloX="anos depois da decisão"
            descricao={`Mediana e faixas da vantagem do aluguel em ${cidade} ao longo de 30 anos`}
          />
        </Figura>
      </Secao>

      <Secao numero={6} rubrica="Simulador" titulo="Faça a sua conta" largo={<Simulador dados={dados} />}>
        <p>
          A história não se repete do mesmo jeito, então o simulador deixa você escolher o futuro: quanto o imóvel
          valoriza e quanto a carteira rende, sempre acima da inflação. O mapa mostra, para todas as combinações, de
          que lado fica a vantagem.
        </p>
      </Secao>

      <section className="notas">
        <div>
          <h2>Como a conta é feita</h2>
          <ul>
            <li>
              <strong>Quem compra</strong> paga entrada, custos da compra (ITBI, escritura e registro), parcela do
              financiamento e manutenção do imóvel.
            </li>
            <li>
              <strong>Quem aluga</strong> investe o valor da entrada e dos custos, e paga o aluguel, reajustado uma vez
              por ano.
            </li>
            <li>
              <strong>As duas gastam o mesmo todo mês</strong>: quem gastou menos investe a diferença. No começo é quem
              aluga; perto do fim do financiamento, quem comprou.
            </li>
            <li>
              <strong>No fim</strong>, o imóvel entra com 6% de corretagem descontada e a carteira, com 20% de imposto
              sobre o ganho de capital.
            </li>
            <li>Condomínio e IPTU ficam de fora: no Brasil, quem mora paga os dois, seja dono ou inquilino.</li>
          </ul>
        </div>

        <div>
          <h2>O que esta análise não vê</h2>
          <ul>
            <li>
              O FipeZAP mede <strong>preço de anúncio</strong> de <strong>apartamentos prontos</strong>. Não é o preço
              de fechamento e não cobre casas.
            </li>
            <li>
              O IFIX só existe desde 2011, e quinze anos contêm um único ciclo imobiliário. As simulações não inventam o
              que essa história não tem.
            </li>
            <li>
              Ficaram de fora os seguros do financiamento, o FGTS, os subsídios do Minha Casa Minha Vida e os custos de
              mudança.
            </li>
            <li>
              Varginha não tem índice de preços: os valores vêm de uma amostra pequena de anúncios e têm margem de erro
              grande.
            </li>
            <li>
              A segurança de ter casa própria e a liberdade de se mudar não entram na conta, e para muita gente pesam
              mais que o dinheiro.
            </li>
          </ul>
        </div>
      </section>

      <footer className="rodape">
        Dados: Fipe (Índice FipeZAP), B3 (IFIX), Banco Central (SGS), IBGE (IPCA), CVM (informes mensais dos FIIs) e
        Tesouro Nacional. Isto é um estudo, não uma recomendação de investimento.
      </footer>
    </main>
  )
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
