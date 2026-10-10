import { Figura } from '../components/Figura.tsx'
import { GraficoBarras } from '../components/GraficoBarras.tsx'
import { GraficoLinhas } from '../components/GraficoLinhas.tsx'
import { Afirmacao, Secao } from '../components/Secao.tsx'
import { anualizar, descontar, indiceDescontado, mesesEntre, poderDeCompra, variacao as variacaoNoPeriodo } from '../contas.ts'
import { cor, GRAFITE, NOMES, type Dados } from '../dados.ts'
import { ANALISE, FONTES } from '../fontes.ts'
import { mesAno, mesAnoPorExtenso, numero, pct } from '../formato.ts'
import { desde, eixoDoTempo, tabelaAnual } from '../graficos.ts'
import { INICIO_DA_TESE, type Numeros } from '../numeros.ts'

interface Props {
  dados: Dados
  n: Numeros
}

const REGUAS = ['ipca', 'base_monetaria', 'pib', 'm2']
const TITULOS: Record<string, string> = {
  ipca: 'Descontando os preços',
  base_monetaria: 'Descontando a base monetária',
  pib: 'Descontando o PIB nominal',
  m2: 'Descontando o M2',
}
const COMPRAS: Record<string, string> = {
  ibovespa: 'Ações (Ibovespa)',
  ipca: 'Cesta de consumo (IPCA)',
  dolar: 'Dólares',
  imoveis: 'Imóveis (índice do Banco Central)',
  salario_minimo: 'Salários mínimos',
  pib: 'Fatia do PIB',
  m2: 'Fatia do M2',
  ouro: 'Ouro',
}

export function Regua({ dados, n }: Props) {
  const { niveis } = dados
  const ate = mesAno(dados.ate)
  const meses = mesesEntre(INICIO_DA_TESE, n.fim)
  const aoAno = (serie: string) => anualizar(variacaoNoPeriodo(niveis, serie, INICIO_DA_TESE, n.fim) ?? 0, meses)

  const indices = Object.fromEntries(REGUAS.map((regua) => [regua, indiceDescontado(niveis, 'selic', regua, INICIO_DA_TESE)]))
  const chegada = (regua: string) => indices[regua].valores[indices[regua].valores.length - 1] as number

  // O M2 dividido em três partes que, multiplicadas, dão o total: preços × economia × dinheiro guardado em relação ao PIB.
  const economia = descontar(aoAno('pib'), aoAno('ipca'))
  const guardado = descontar(aoAno('m2'), aoAno('pib'))

  const compras = poderDeCompra(niveis, 'selic', Object.keys(COMPRAS), INICIO_DA_TESE, n.fim)
  const mais = (coisa: string) => pct((compras[coisa] ?? 1) - 1)
  const barras = Object.entries(COMPRAS)
    .map(([coisa, nome]) => ({ nome, valor: compras[coisa] === null ? null : (compras[coisa] as number) - 1, cor: cor('selic') }))
    .toSorted((a, b) => (b.valor ?? 0) - (a.valor ?? 0))

  const moeda = desde(dados.moeda, '2000-01')

  return (
    <Secao
      id="regua"
      numero={2}
      rubrica="A régua"
      titulo="O M2 é a inflação de verdade?"
      fontes={[FONTES.selic, FONTES.ipca, FONTES.moeda, FONTES.pib, FONTES.salarioEImoveis, FONTES.dolar, FONTES.ibovespa, FONTES.ouro]}
      analise={[ANALISE.regua, ANALISE.contasEmPython, ANALISE.metodologia]}
      metodo={
        <>
          Descontar uma régua é dividir o que o investimento rendeu pelo que a régua cresceu, e não subtrair. As taxas
          ao ano são a taxa média de janeiro de 2008 a {mesAnoPorExtenso(dados.ate)}, com juros sobre juros. A parte do M2
          que rende juros é o M2 menos o M1, que soma o papel-moeda e os depósitos em conta-corrente. O crescimento do
          M2 foi separado em três partes que, multiplicadas, dão o total: os preços (IPCA), a economia acima dos preços
          (PIB dividido pelo IPCA) e o M2 em relação ao PIB.
        </>
      }
    >
      <Afirmacao veredito="falso">
        “a inflação real não é expressa por índices de aumento de preços - e sim pelo aumento da base monetária”
      </Afirmacao>
      <p>
        O “negativo” do título depende desta troca. Em vez de descontar do juro a alta dos preços, o texto desconta o
        crescimento do M2. Essa régua tem três problemas.
      </p>
      <p>
        <strong>O M2 não é a base monetária.</strong> A base monetária é o dinheiro que o Banco Central emite: cédulas,
        moedas e as reservas dos bancos. Desde 2008 ela cresceu {pct(aoAno('base_monetaria'), 1)} ao ano, quase o mesmo que os
        preços ({pct(aoAno('ipca'), 1)}), e encolheu de {pct(n.baseSobrePib.antes, 1)} para {pct(n.baseSobrePib.hoje, 1)} do PIB. O M2 é
        outra coisa: soma a esse dinheiro os depósitos e os títulos dos bancos, como poupança, CDBs, LCIs e LCAs.
      </p>
      <p>
        <strong>Quase todo o M2 rende juros.</strong> Hoje, {pct(n.m2QueRendeJuros.hoje)} do M2 são aplicações que pagam juros a
        quem as tem (eram {pct(n.m2QueRendeJuros.antes)} em 2007). Quando o juro de um CDB é creditado, o saldo cresce, e o M2
        cresce junto. Quando alguém faz um depósito novo, também. Dizer que a Selic “perde para o M2” é dizer que o
        total guardado nos bancos cresce mais depressa que uma aplicação sozinha, o que acontece sempre que entra
        dinheiro novo.
      </p>
      <p>
        <strong>O M2 cresceu porque há mais dinheiro guardado.</strong> Em 2007 ele equivalia a {pct(n.m2SobrePib.antes)} do
        PIB; hoje, a {pct(n.m2SobrePib.hoje)}. Dos {pct(aoAno('m2'), 1)} ao ano que cresceu desde 2008,{' '}
        {numero(aoAno('ipca') * 100, 1)} pontos são alta de preços, {numero(economia * 100, 1)} são crescimento da economia acima dos
        preços e {numero(guardado * 100, 1)} são esse aumento do dinheiro guardado em relação ao tamanho da economia.
      </p>
      <Figura
        titulo="O M2 dobrou em relação à economia; o dinheiro do Banco Central, não"
        subtitulo="Saldo de cada agregado como % do PIB dos 12 meses anteriores"
        legenda={[
          { nome: 'M2', cor: cor('m2') },
          { nome: 'Base monetária', cor: GRAFITE },
        ]}
        fonte="Fonte: Banco Central (séries 27810, 1837, 1788 e 4382 do SGS). O M2 de antes de dez/2001 vem da série antiga, ajustada."
        tabela={tabelaAnual(moeda, { m2_pib: 'M2', m1_pib: 'M1', base_pib: 'Base monetária', remunerado: 'Parte do M2 que rende juros' }, (v) => pct(v, 1))}
      >
        <GraficoLinhas
          {...eixoDoTempo(moeda.datas, 4)}
          series={[
            { nome: 'M2', cor: cor('m2'), valores: moeda.series.m2_pib },
            { nome: 'Base monetária', cor: GRAFITE, valores: moeda.series.base_pib },
          ]}
          formatoY={(v) => pct(v, 1)}
          formatoTiqueY={(v) => pct(v)}
          limitesY={[0, 0.7]}
          altura={300}
          descricao="M2 e base monetária como percentual do PIB desde 2000"
        />
      </Figura>

      <p>
        Na prática, a escolha da régua decide tudo. A figura abaixo acompanha a mesma aplicação na Selic, feita em
        janeiro de 2008, medida de quatro jeitos. Por três deles, R$ 100 viraram mais de R$ 100:{' '}
        {numero(chegada('ipca'))} descontando os preços, {numero(chegada('base_monetaria'))} descontando a base monetária e{' '}
        {numero(chegada('pib'))} descontando o PIB nominal, a mais exigente das três, porque inclui o crescimento da economia. Só
        pelo M2 o resultado fica abaixo de 100: {numero(chegada('m2'))}.
      </p>
      <Figura
        titulo="A mesma Selic, quatro réguas"
        subtitulo="R$ 100 aplicados na Selic em janeiro de 2008, descontando cada régua"
        fonte={`Acima de 100, a Selic rendeu mais que a régua. Dados até ${ate}. Fonte: Banco Central.`}
        tabela={{
          colunas: ['Mês', ...REGUAS.map((regua) => NOMES[regua])],
          linhas: indices.ipca.datas
            .map((data, i) => ({ data, i }))
            .filter(({ data }) => data.endsWith('-12') || data === dados.ate)
            .map(({ data, i }) => [mesAno(data), ...REGUAS.map((regua) => numero(indices[regua].valores[i] ?? 0))]),
        }}
      >
        <div className="multiplos">
          {REGUAS.map((regua) => (
            <div key={regua}>
              <h4>{TITULOS[regua]}</h4>
              <GraficoLinhas
                {...eixoDoTempo(indices[regua].datas, 6)}
                series={[{ nome: `Selic ÷ ${NOMES[regua]}`, cor: cor('selic'), valores: indices[regua].valores }]}
                formatoY={(v) => numero(v)}
                base={100}
                limitesY={[0, 250]}
                altura={190}
                descricao={`Cem reais aplicados na Selic em janeiro de 2008, ${TITULOS[regua].toLowerCase()}`}
              />
            </div>
          ))}
        </div>
      </Figura>

      <p>
        Outro jeito de fazer a mesma pergunta: o que esses R$ 100, com os juros, compram hoje em comparação com o que
        compravam em 2008? Compram {mais('ipca')} mais da cesta de consumo do IPCA, {mais('salario_minimo')} mais salários
        mínimos, {mais('imoveis')} mais imóveis, {mais('ibovespa')} mais ações e {mais('dolar')} mais dólares. Só compram menos
        ouro, e uma fatia menor do M2.
      </p>
      <Figura
        titulo="O que a Selic compra"
        subtitulo={`Quanto a mais, ou a menos, R$ 100 aplicados na Selic em jan/2008 compram em ${ate}`}
        fonte="Fontes: Banco Central (Selic, IPCA, salário mínimo, índice IVG-R de imóveis, dólar, PIB e M2), B3 e Banco Mundial. Sem imposto de renda."
      >
        <GraficoBarras grupos={[{ barras }]} formato={(v) => pct(v, 0, true)} descricao="Poder de compra de uma aplicação na Selic desde 2008, medido em oito coisas" />
      </Figura>
      <p>
        O M2 mede quanto dinheiro os brasileiros têm guardado em bancos. Como régua de inflação, não funciona: por ela,
        quem aplicou na Selic ficou mais pobre no mesmo período em que passou a comprar mais de quase tudo.
      </p>
      <p>
        Existe uma leitura mais generosa do argumento. Quem rende menos que o M2 perde participação no total das
        aplicações do país, mesmo comprando mais coisas. Isso é verdade, e é o que as contas do texto medem. Mas perder
        participação não é ter juro negativo.
      </p>
    </Secao>
  )
}
