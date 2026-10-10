import { useMemo } from 'react'
import { Figura, type TabelaDeDados } from '#base/Figura.tsx'
import { GraficoLinhas, type Serie } from './components/GraficoLinhas.tsx'
import { Pergunta } from './components/Pergunta.tsx'
import { Simulador } from './components/Simulador.tsx'
import { Topo } from '#base/Topo.tsx'
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
import { ANALISE, FONTES } from './fontes.ts'
import { instante, mesAno, mesAnoDoInstante, numero, pct, reais, reaisComSinal, reaisCurto } from '#base/formato.ts'
import { taxaMensal } from './simulador.ts'

export default function App() {
  const { dados, erro } = useDados()

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

const PRAZOS = [5, 10, 20, 30]
const PRAZO_DO_EMPATE = 20

/** As perguntas do artigo, na ordem em que aparecem; o sumário e o resumo apontam para elas. */
const PERGUNTAS = [
  { id: 'o-que-compra', titulo: 'O que R$ 500 mil compram em Varginha?' },
  { id: 'quanto-rende', titulo: 'Quanto rende o mesmo dinheiro em fundos imobiliários?' },
  { id: 'inflacao', titulo: 'A renda de R$ 5.000 é toda lucro?' },
  { id: 'um-por-cento', titulo: 'Os fundos pagam mesmo 1% ao mês?' },
  { id: 'cota', titulo: 'E o preço da cota?' },
  { id: 'imovel', titulo: 'E o imóvel, valoriza?' },
  { id: 'resultado', titulo: 'Então, quem termina com mais dinheiro?' },
] as const

type IdDaPergunta = (typeof PERGUNTAS)[number]['id']

function pergunta(id: IdDaPergunta) {
  const posicao = PERGUNTAS.findIndex((item) => item.id === id)
  return { id, numero: posicao + 1, titulo: PERGUNTAS[posicao].titulo }
}

/** Link para uma pergunta pelo número: "pergunta 4". */
function Ver({ id }: { id: IdDaPergunta }) {
  // Espaço que não quebra: "pergunta" e o número ficam sempre na mesma linha.
  return <a href={`#${id}`}>pergunta&nbsp;{pergunta(id).numero}</a>
}

function Artigo({ dados }: { dados: Dados }) {
  const { precos, rendimento_fiis: rendimentos, ativos, taxas, hoje } = dados
  const mesDosPrecos = mesAno(precos.datas[precos.datas.length - 1])
  const cidade = hoje[CIDADE_DO_EXEMPLO]

  // Os números do texto saem dos dados, para continuarem certos quando as fontes forem atualizadas.
  const conta = useMemo(() => {
    const p = compraAVista(cidade, DISPONIVEL)
    const mediaDoMercado = rendimentoMedioDoMercado(taxas)
    const umPorCento: Fundos = { rendimentoMes: UM_POR_CENTO, cotaAa: 0 }
    const passado = fundosDoPassado(taxas)
    const cenarios: { nome: string; fundos: Fundos }[] = [
      { nome: '1% ao mês, cota parada', fundos: umPorCento },
      { nome: `Média de hoje (${pct(mediaDoMercado, 2)} ao mês), cota parada`, fundos: { rendimentoMes: mediaDoMercado, cotaAa: 0 } },
      { nome: `Como desde 2011 (${pct(taxas.fii_real_aa, 1)} ao ano acima da inflação)`, fundos: passado },
    ]
    // Em que ano quem compra passa à frente, se os fundos repetirem o passado.
    const anoDaVirada = Array.from({ length: 30 }, (_, i) => i + 1).find((anos) => vantagemEmReais(p, passado, anos) < 0)
    return {
      p,
      mediaDoMercado,
      linhas: cenarios.map(({ nome, fundos }) => ({ nome, valores: PRAZOS.map((anos) => vantagemEmReais(p, fundos, anos)) })),
      empate: rendimentoDoEmpate(p, PRAZO_DO_EMPATE, 0),
      umPorCento10: vantagemEmReais(p, umPorCento, 10),
      umPorCento20: vantagemEmReais(p, umPorCento, PRAZO_DO_EMPATE),
      umPorCentoComImovelSubindo: vantagemEmReais(p, umPorCento, PRAZO_DO_EMPATE, INFLACAO, 0.01),
      passado20: vantagemEmReais(p, passado, PRAZO_DO_EMPATE),
      anoDaVirada,
      realComCotaParada: retornoReal(umPorCento),
    }
  }, [cidade, taxas])

  const { p } = conta
  const renda = DISPONIVEL * UM_POR_CENTO
  // Texto e quadro usam os mesmos valores, em reais inteiros. As parcelas são arredondadas antes das somas,
  // para que os totais batam com a conta que o leitor faz com os números que vê.
  const aluguelDoMes = Math.round(p.aluguel_mensal)
  const reposicao = Math.round(DISPONIVEL * taxaMensal(INFLACAO))
  const sobra = renda - reposicao - aluguelDoMes
  const manutencao = Math.round((p.valor_imovel * p.manutencao_aa) / 12)
  const area = p.valor_imovel / cidade.preco_m2
  const rentabilidade = rentabilidadeDoAluguel(cidade)
  const rentabilidadeSaoPaulo = rentabilidadeDoAluguel(hoje['São Paulo'])
  const vezesOPassado = conta.realComCotaParada / taxas.fii_real_aa

  const brasil = precos.series.Brasil.map((valor) => valor ?? 0)
  const pico = Math.max(...brasil)
  const quedaDesdeOPico = ultimo(precos.series.Brasil) / pico - 1
  const anoDoPico = precos.datas[brasil.indexOf(pico)].slice(0, 4)
  const maiorRendimento = Math.max(...rendimentos.series.FIIs.filter((v) => v !== null))
  const primeiroAnoDosRendimentos = rendimentos.datas[0].slice(0, 4)

  return (
    <main className="artigo" id="inicio">
      <header className="abertura">
        <p className="sobretitulo">Análise de dados · Mercado imobiliário</p>
        <h1>Comprar ou alugar?</h1>
        <p className="subtitulo">
          Com {reaisCurto(DISPONIVEL)} na mão, vale mais comprar um imóvel à vista e morar nele, ou aplicar o dinheiro em
          fundos imobiliários e pagar o aluguel com a renda? A conta, uma pergunta de cada vez.
        </p>
        <p className="assinatura">
          Dados até {mesDosPrecos} · Anúncios de {CIDADE_DO_EXEMPLO} de {mesAno(cidade.mes)}
        </p>
      </header>

      <div className="texto">
        <p>
          Uma ideia aparece com frequência em conversas sobre dinheiro: hoje compensaria mais morar de aluguel e deixar o
          dinheiro rendendo em fundos imobiliários, que pagam perto de 1% ao mês, do que comprar a casa própria. Este
          texto testa essa ideia com um caso concreto: alguém que tem {reaisCurto(DISPONIVEL)} e mora em{' '}
          {CIDADE_DO_EXEMPLO}, no sul de Minas Gerais.
        </p>
        <p>
          A conta é feita em sete perguntas, cada uma apoiada na anterior. No fim de cada resposta, o quadro{' '}
          <em>Fontes e método</em> mostra de onde vêm os números e como eles foram calculados.
        </p>
      </div>

      <nav className="sumario" aria-label="Perguntas do artigo">
        <h2>As perguntas</h2>
        <ol>
          {PERGUNTAS.map((item) => (
            <li key={item.id}>
              <a href={`#${item.id}`}>{item.titulo}</a>
            </li>
          ))}
        </ol>
        <p>
          Depois delas: <a href="#resumo">o resumo</a>, <a href="#limites">o que a conta não mostra</a> e{' '}
          <a href="#simulador">um simulador para fazer a sua conta</a>.
        </p>
      </nav>

      <Pergunta
        {...pergunta('o-que-compra')}
        fontes={[FONTES.anuncios, FONTES.fipezap]}
        analise={[ANALISE.varginha, ANALISE.metodologia]}
        metodo={
          <>
            O preço e o aluguel são a mediana do valor por m² em {cidade.anuncios} anúncios de apartamentos em{' '}
            {CIDADE_DO_EXEMPLO}, coletados em {mesAno(cidade.mes)}. A mediana é o valor do meio da lista, e não se abala
            com anúncios muito caros ou muito baratos. Os custos da compra são estimados em{' '}
            {pct(p.custos_compra_pct)} do preço. O valor de São Paulo vem do Índice FipeZAP. A página usa a conta
            simples (aluguel de um mês vezes 12, dividido pelo preço); os notebooks compõem os doze meses, o que dá
            um valor um pouco maior.
          </>
        }
      >
        <p>
          Comprar um imóvel custa mais do que o preço dele. O imposto de transmissão (ITBI), a escritura e o registro
          levam perto de {pct(p.custos_compra_pct)} do valor. Com {reaisCurto(DISPONIVEL)}, sobram uns{' '}
          {reaisCurto(p.valor_imovel)} para o imóvel em si.
        </p>
        <p>
          Nos anúncios de {CIDADE_DO_EXEMPLO}, o metro quadrado de apartamento sai por {reais(cidade.preco_m2)}. O
          dinheiro compra, então, um apartamento de uns {numero(area)} m². Um apartamento igual a esse aluga por cerca de{' '}
          <strong>{reais(aluguelDoMes)} por mês</strong>.
        </p>
        <p>
          Vale guardar uma medida para o resto do texto: o aluguel de um ano dividido pelo preço do imóvel. Em{' '}
          {CIDADE_DO_EXEMPLO}, ela é de {pct(rentabilidade, 1)}. Quanto maior esse número, mais caro é morar de aluguel
          perto do que custaria comprar. Em São Paulo, por exemplo, é {pct(rentabilidadeSaoPaulo, 1)}.
        </p>
      </Pergunta>

      <Pergunta
        {...pergunta('quanto-rende')}
        fontes={[FONTES.isencao]}
        analise={[ANALISE.aVista]}
        metodo={
          <>
            A renda é {pct(UM_POR_CENTO)} de {reaisCurto(DISPONIVEL)}, o rendimento da pergunta que abre o texto. Se 1% ao
            mês é realista, a <Ver id="um-por-cento" /> responde.
          </>
        }
      >
        <p>
          Um fundo imobiliário, ou FII, junta o dinheiro de muitas pessoas para comprar imóveis, como galpões, escritórios
          e shoppings, ou títulos ligados a imóveis. O aluguel que esses imóveis recebem é repassado todo mês a quem tem
          cotas do fundo. Para pessoa física, essa renda é isenta de imposto de renda.
        </p>
        <p>
          A 1% ao mês, {reaisCurto(DISPONIVEL)} pagam <strong>{reais(renda)} por mês</strong>. É mais que o dobro do
          aluguel do apartamento da pergunta anterior. Se a conta parasse aqui, alugar e investir ganharia com folga:
          depois de pagar o aluguel, sobrariam {reais(renda - aluguelDoMes)} por mês.
        </p>
        <p>
          Só que a conta não para aqui. Faltam três coisas: saber quanto dessa renda é ganho de verdade, se 1% ao mês é
          realista e o que acontece com o imóvel de quem compra.
        </p>
      </Pergunta>

      <Pergunta
        {...pergunta('inflacao')}
        fontes={[FONTES.ipca]}
        analise={[ANALISE.aVista, ANALISE.metodologia]}
        metodo={
          <>
            A perda para a inflação é {reaisCurto(DISPONIVEL)} vezes a inflação de um mês, com {pct(INFLACAO, 1)} ao ano
            (nos últimos 12 meses, o IPCA foi de {pct(taxas.inflacao_12m, 1)}). A manutenção, de{' '}
            {pct(p.manutencao_aa)} do valor do imóvel por ano, cobre reformas, obras do prédio e desgaste. Condomínio e
            IPTU ficam de fora porque quem mora paga os dois, seja dono ou inquilino.
          </>
        }
      >
        <p>
          Não. A inflação corrói o dinheiro aplicado. Se o preço das cotas ficar parado, os {reaisCurto(DISPONIVEL)}{' '}
          continuam aparecendo no extrato, mas compram um pouco menos a cada mês. Com inflação de {pct(INFLACAO, 1)} ao
          ano, essa perda é de uns <strong>{reais(reposicao)} por mês</strong>. Para não ficar mais
          pobre, quem aluga precisa reinvestir essa parte da renda.
        </p>
        <p>
          Com quem compra, o efeito é outro. O preço dos imóveis tende a acompanhar a inflação (a{' '}
          <Ver id="imovel" /> olha isso de perto), então o patrimônio de quem compra não encolhe do mesmo jeito. Em
          troca, o dono paga a manutenção do imóvel, uns {reais(manutencao)} por mês.
        </p>

        <figure className="figura">
          <figcaption className="figura-titulo">
            <strong>O primeiro mês de cada lado</strong>
            <span>Em dinheiro de hoje, já descontada a inflação</span>
          </figcaption>
          <div className="conta">
            <div>
              <h4>Quem aluga e investe</h4>
              <dl>
                <div>
                  <dt>Renda dos fundos, a 1% ao mês</dt>
                  <dd>{reais(renda)}</dd>
                </div>
                <div>
                  <dt>Parte que só repõe a inflação</dt>
                  <dd>−{reais(reposicao)}</dd>
                </div>
                <div>
                  <dt>Aluguel</dt>
                  <dd>−{reais(aluguelDoMes)}</dd>
                </div>
                <div className="total">
                  <dt>Sobra</dt>
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
                  <dt>Manutenção do imóvel</dt>
                  <dd>−{reais(manutencao)}</dd>
                </div>
                <div>
                  <dt>Ganho do imóvel acima da inflação</dt>
                  <dd>{reais(0)}</dd>
                </div>
                <div className="total">
                  <dt>Sobra</dt>
                  <dd>−{reais(manutencao)}</dd>
                </div>
              </dl>
            </div>
          </div>
        </figure>

        <p>
          Somando tudo, quem aluga fica {reais(sobra + manutencao)} por mês à frente de quem compra. Ainda é uma boa
          vantagem, mas ela depende de duas apostas: que os fundos continuem pagando 1% ao mês e que as cotas não percam
          valor. As duas próximas perguntas olham cada uma.
        </p>
      </Pergunta>

      <Pergunta
        {...pergunta('um-por-cento')}
        fontes={[FONTES.cvm]}
        analise={[ANALISE.rendimento, ANALISE.fundos]}
        metodo={
          <>
            Para cada mês, a média do rendimento distribuído pelos fundos negociados em bolsa com pelo menos mil cotistas,
            ponderada pelo patrimônio de cada fundo. O rendimento do informe da CVM é calculado sobre o valor patrimonial
            da cota.
          </>
        }
      >
        <p>
          Todo fundo imobiliário informa à Comissão de Valores Mobiliários (CVM) quanto distribuiu no mês. Na média do
          mercado, nos últimos 12 meses, foram <strong>{pct(conta.mediaDoMercado, 2)} ao mês</strong>. Desde{' '}
          {primeiroAnoDosRendimentos}, nenhum mês passou de {pct(maiorRendimento, 2)}.
        </p>
        <Figura
          titulo="Rendimento distribuído pelos fundos imobiliários"
          subtitulo="Média do mercado, por mês. A linha horizontal marca 1% ao mês."
          fonte="Fonte: CVM, informes mensais dos fundos."
          tabela={tabelaAnual(rendimentos, ['FIIs'], (v) => pct(v, 2))}
        >
          <GraficoLinhas
            {...eixoDoTempo(rendimentos.datas)}
            series={series(rendimentos, ['FIIs'])}
            formatoY={(v) => pct(v, 2)}
            formatoTiqueY={(v) => pct(v, 1)}
            limitesY={[0, 0.012]}
            base={UM_POR_CENTO}
            altura={280}
            descricao={`Rendimento mensal médio distribuído pelos fundos imobiliários desde ${primeiroAnoDosRendimentos}`}
          />
        </Figura>
        <p>
          Esse número é calculado sobre o valor patrimonial da cota: o valor dos imóveis do fundo dividido pelo número
          de cotas. Na bolsa, a cota pode custar menos que isso, e aí o mesmo rendimento vira uma porcentagem maior. É
          por isso que dá para encontrar fundos pagando 1% ao mês. Ou eles pagam mais que a média, ou a cota está barata.
          Cota barata costuma ser sinal de que o mercado vê mais risco naquele fundo.
        </p>
      </Pergunta>

      <Pergunta
        {...pergunta('cota')}
        fontes={[FONTES.ifix, FONTES.cdi, FONTES.ipca, FONTES.fipezap]}
        analise={[ANALISE.fundos]}
        metodo={
          <>
            Retorno total de cada investimento desde dezembro de 2010, com os rendimentos reinvestidos e a inflação
            descontada mês a mês. O imóvel soma a valorização do m² em São Paulo e 70% do aluguel bruto, que é o que sobra
            para o dono depois de vacância, administração e manutenção.
          </>
        }
      >
        <p>
          O rendimento é só metade do que um fundo entrega. A outra metade é o que acontece com o preço da cota. O IFIX,
          índice da bolsa que acompanha os fundos imobiliários, soma as duas coisas.
        </p>
        <p>
          Desde 2011, o IFIX rendeu <strong>{pct(taxas.fii_real_aa, 1)} ao ano acima da inflação</strong>. Os fundos
          pagaram perto de {pct(taxas.fii_rendimento_aa)} ao ano em rendimentos, mas o preço das cotas não acompanhou a
          inflação. No mesmo período, o CDI, que é a referência da renda fixa, rendeu {pct(taxas.cdi_real_aa, 1)} ao ano
          acima da inflação.
        </p>
        <Figura
          titulo="R$ 100 investidos em dezembro de 2010"
          subtitulo="Retorno total, descontada a inflação"
          legenda={legenda(Object.keys(ativos.series))}
          fonte="Fontes: Fipe, B3, Banco Central e IBGE. A linha do imóvel é lisa porque vem de preços de anúncio."
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
          Com 1% ao mês e a cota parada, a carteira renderia {pct(conta.realComCotaParada, 1)} ao ano acima da inflação:{' '}
          {numero(vezesOPassado, 1)} vezes o que os fundos entregaram nos últimos quinze anos.
        </p>
      </Pergunta>

      <Pergunta
        {...pergunta('imovel')}
        fontes={[FONTES.fipezap, FONTES.ipca]}
        analise={[ANALISE.precos]}
        metodo={
          <>
            Preço médio de anúncio do m² de apartamentos, corrigido pelo IPCA até {mesDosPrecos}. O FipeZAP mede preço de
            anúncio, não o preço de fechamento, e não cobre casas. Na conta, o imóvel de {CIDADE_DO_EXEMPLO} acompanha a
            inflação, e o aluguel acompanha o imóvel.
          </>
        }
      >
        <p>
          Do lado de quem compra, a pergunta é se o imóvel sobe mais que a inflação. {CIDADE_DO_EXEMPLO} não tem um
          índice de preços, mas as grandes cidades têm. Nelas, a resposta dos últimos dez anos foi não.
        </p>
        <Figura
          titulo="Preço do m², descontada a inflação"
          subtitulo={`Apartamentos à venda, em reais de ${mesDosPrecos}`}
          legenda={legenda(['Brasil', ...CIDADES])}
          fonte="Fontes: Fipe (Índice FipeZAP) e IBGE (IPCA)."
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
          Na média do Brasil, o metro quadrado subiu forte até {anoDoPico} e, descontada a inflação, ainda está{' '}
          <strong>{pct(Math.abs(quedaDesdeOPico))} abaixo daquele pico</strong>. Por isso a conta deste texto usa um
          imóvel que só acompanha a inflação, sem ganho nem perda. Se ele subir 1% ao ano acima dela, quem compra
          melhora: a vantagem de quem aluga em {PRAZO_DO_EMPATE} anos, com 1% ao mês, cai de{' '}
          {reaisCurto(conta.umPorCento20)} para {reaisCurto(conta.umPorCentoComImovelSubindo)}.
        </p>
      </Pergunta>

      <Pergunta
        {...pergunta('resultado')}
        fontes={[FONTES.anuncios, FONTES.cvm, FONTES.ifix, FONTES.ipca]}
        analise={[ANALISE.simulador, ANALISE.aVista, ANALISE.metodologia]}
        metodo={
          <>
            Uma simulação mês a mês. Custos da compra de {pct(p.custos_compra_pct)}, manutenção de{' '}
            {pct(p.manutencao_aa)} ao ano, aluguel reajustado uma vez por ano, inflação de {pct(INFLACAO, 1)} ao ano,
            corretagem de {pct(p.corretagem_venda_pct)} na venda do imóvel e imposto de {pct(p.ir_ganho_carteira)} sobre o
            ganho com as cotas. A mesma conta está em Python no notebook 6 e em TypeScript no simulador desta página, e
            os testes conferem que as duas dão os mesmos números.
          </>
        }
      >
        <p>
          Agora dá para juntar tudo numa conta mês a mês. As duas pessoas começam com {reaisCurto(DISPONIVEL)} e tiram o
          mesmo valor do salário todo mês. Quem compra não paga aluguel e investe o que economiza nos mesmos fundos.
          Quem aluga deixa a renda dos fundos rendendo. No fim, quem comprou vende o imóvel, pagando a corretagem, e quem
          alugou vende as cotas, pagando imposto sobre o ganho.
        </p>
        <figure className="figura">
          <figcaption className="figura-titulo">
            <strong>Quanto quem aluga termina à frente</strong>
            <span>
              Em milhares de reais de hoje. Números negativos: quem compra termina com mais. O imóvel acompanha a
              inflação.
            </span>
          </figcaption>
          <div className="rolagem-x">
            <table className="quadro">
              <thead>
                <tr>
                  <th>Se os fundos renderem</th>
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
        </figure>
        <p>
          O resultado depende de quanto os fundos rendem. Com 1% ao mês e a cota parada, alugar e investir ganha em todos
          os prazos: em dez anos, quem aluga termina {reaisCurto(conta.umPorCento10)} à frente. Com o rendimento médio de
          hoje, as duas escolhas ficam perto do empate. Em {PRAZO_DO_EMPATE} anos, o empate fica em torno de{' '}
          {pct(conta.empate, 2)} ao mês e a cota parada. Esse é o valor central: a amostra de {CIDADE_DO_EXEMPLO} é
          pequena, e o notebook 6 mostra o empate em {PRAZO_DO_EMPATE} anos indo de cerca de 0,60% ao mês no extremo
          baixo a 1,00% no extremo alto (aluguel de R$ 3.728).
        </p>
        <p>
          Se os fundos repetirem o que fizeram desde 2011, comprar passa à frente
          {conta.anoDaVirada ? ` a partir do ${conta.anoDaVirada}º ano` : ''}, e em {PRAZO_DO_EMPATE} anos termina{' '}
          {reaisCurto(Math.abs(conta.passado20))} na frente.
        </p>
      </Pergunta>

      <section className="secao" id="resumo">
        <h2>Em resumo</h2>
        <p>
          Comprar ou alugar? Com {reaisCurto(DISPONIVEL)} em {CIDADE_DO_EXEMPLO}, a resposta depende de quanto os fundos
          imobiliários vão render de verdade nos próximos anos, depois de descontar a inflação.
        </p>
        <p>
          A renda de 1% ao mês paga o aluguel com folga (<Ver id="quanto-rende" />), mas parte dela só repõe a inflação (
          <Ver id="inflacao" />). Esse 1% fica acima do que os fundos pagam em média (<Ver id="um-por-cento" />), e nos
          últimos quinze anos o preço das cotas não acompanhou a inflação (<Ver id="cota" />). Do outro lado, os imóveis
          das grandes cidades também perderam para a inflação desde {anoDoPico} (<Ver id="imovel" />).
        </p>
        <p>
          Quem acredita em 1% ao mês sem perda nas cotas deve alugar e investir. Quem espera dos fundos o que eles
          entregaram desde 2011 sai melhor comprando o imóvel e morando nele, se pretende ficar mais de{' '}
          {conta.anoDaVirada ? conta.anoDaVirada - 1 : 10} anos. No meio, com o rendimento médio de hoje, a diferença
          entre as duas escolhas é pequena (<Ver id="resultado" />), e outras razões, como a segurança da casa própria ou
          a liberdade de mudar, podem pesar mais.
        </p>
      </section>

      <section className="secao" id="limites">
        <h2>O que esta conta não mostra</h2>
        <ul>
          <li>
            Os preços de {CIDADE_DO_EXEMPLO} vêm de uma amostra pequena de anúncios, com margem de erro grande: no
            notebook 6, o aluguel do exemplo vai de R$ 1.776 a R$ 3.728 no intervalo de 90%, o bastante para mudar o
            resultado. Preço de anúncio também não é o preço pelo qual o imóvel é vendido.
          </li>
          <li>
            Fundos que pagam acima da média costumam ter mais risco. A saída de um inquilino ou uma dívida do fundo pode
            cortar o rendimento de um mês para o outro.
          </li>
          <li>
            O IFIX existe desde 2011, e quinze anos de história contêm um único ciclo do mercado imobiliário. As regras de
            imposto dos fundos também podem mudar.
          </li>
          <li>Ficaram de fora o FGTS, os seguros, os subsídios do Minha Casa Minha Vida e os custos de mudança.</li>
        </ul>
      </section>

      <section className="secao" id="simulador">
        <h2>Faça a sua conta</h2>
        <p>
          O simulador usa a mesma conta da <Ver id="resultado" />. Troque o valor, a cidade, o rendimento dos fundos e o
          que acontece com a cota e com o imóvel. Se quiser comprar um imóvel mais caro, dá para financiar parte dele.
        </p>
        <Simulador dados={dados} />
      </section>

      <footer className="rodape">
        <h2>Sobre esta análise</h2>
        <p>
          Os dados são públicos e a análise inteira, com os notebooks em Python e o código desta página, está no{' '}
          <a href="https://github.com/igor-gregori/iblog/tree/main/posts/comprar-ou-alugar" target="_blank" rel="noreferrer">
            repositório do projeto
          </a>
          . Isto é um estudo, não uma recomendação de investimento.
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
