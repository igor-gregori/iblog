import { Figura } from '../components/Figura.tsx'
import { GraficoLinhas } from '../components/GraficoLinhas.tsx'
import { EscalaDeCores, MapaDeCalor } from '../components/MapaDeCalor.tsx'
import { Afirmacao, Secao } from '../components/Secao.tsx'
import { cor, GRAFITE, noMes, type Dados } from '../dados.ts'
import { instante, lista, mesAno, mesAnoPorExtenso, numero, pct, variacao } from '../formato.ts'
import { eixoDoTempo } from '../graficos.ts'

interface Props {
  dados: Dados
}

const MUDANCA_DO_M1 = '2020-05'
const SATURACAO = 0.06
// A taxa que o Banco Central Europeu paga pelos depósitos dos bancos ficou abaixo de zero neste intervalo.
// Ela não está na base do BIS, que registra para a zona do euro a taxa das operações principais (parou em zero).
// Conferido no ECB Data Portal, série FM.D.U2.EUR.4F.KR.DFR.LEV, em 05/10/2026.
const DEPOSITO_NEGATIVO_NO_BCE = { de: '2014-06', ate: '2022-07' }

export function Mundo({ dados }: Props) {
  const { paises, eua } = dados
  const entre = paises.negativos['2009 a 2021']
  const depois = paises.negativos['2023 em diante']
  const fracao = (periodo: Record<string, number | null>, pais: string) => pct(periodo[pais] ?? 0)
  const [, decada, pandemia] = eua.periodos
  const nominais = Object.entries(paises.nominal_negativo).toSorted(([, a], [, b]) => b.meses - a.meses)

  return (
    <Secao id="mundo" numero={4} rubrica="No mundo" titulo="E fora do Brasil?">
      <Afirmacao veredito="verdade" rotulo="Verdade nos países ricos">
        “essa situação de juro negativo não é excepcional - até em termos nominais (e não apenas reais)”
      </Afirmacao>
      <p>
        Aqui o texto tem razão, e sem precisar trocar de régua. Depois da crise de 2008, os bancos centrais dos países
        ricos levaram o juro a zero e, em alguns casos, abaixo de zero. De 2009 a 2021, o juro básico ficou abaixo da
        inflação em {fracao(entre, 'Estados Unidos')} dos meses nos Estados Unidos, {fracao(entre, 'Zona do euro')} na zona do euro
        e {fracao(entre, 'Reino Unido')} no Reino Unido. No Brasil, em {fracao(entre, 'Brasil')}.
      </p>
      <Figura
        titulo="Onde o juro ficou abaixo da inflação"
        subtitulo="Juro básico de cada país descontada a inflação dos 12 meses anteriores, média de cada ano"
        fonte={`As cores saturam em ±${pct(SATURACAO)} ao ano. Em branco, os anos em que o banco central não tinha uma taxa básica (o Japão, por exemplo, mirou a quantidade de dinheiro em vez do juro). Fonte: BIS (juro básico e preços ao consumidor de cada país).`}
        tabela={{
          colunas: ['País', ...paises.anos.filter((ano) => ano % 2 === 0).map(String)],
          linhas: paises.paises.map((pais) => [
            pais,
            ...paises.anos
              .map((ano, j) => ({ ano, valor: paises.juro_real[pais][j] }))
              .filter(({ ano }) => ano % 2 === 0)
              .map(({ valor }) => (valor === null ? '–' : pct(valor, 1, true))),
          ]),
        }}
      >
        <MapaDeCalor
          linhas={paises.paises}
          colunas={paises.anos.map(String)}
          valores={paises.paises.map((pais) => paises.juro_real[pais])}
          limite={SATURACAO}
          formato={(v) => `${pct(v, 1, true)} ao ano`}
          nomeDaCelula={(i, j) => `${paises.paises[i]} em ${paises.anos[j]}`}
          destaques={['Brasil']}
          passoDasColunas={4}
          descricao="Juro real médio de dezessete países em cada ano desde 2000"
        />
        <EscalaDeCores negativo="juro abaixo da inflação" positivo="juro acima da inflação" />
      </Figura>
      <p>
        A faixa vermelha de 2009 a 2021 nos países ricos é o juro negativo de que tanto se falou. A linha do Brasil é
        quase toda azul. A partir de 2022, com a volta da inflação e a alta dos juros, o vermelho recua: nos Estados
        Unidos, o juro ficou abaixo da inflação em {fracao(depois, 'Estados Unidos')} dos meses desde 2023. No Japão, em {fracao(depois, 'Japão')}.
      </p>
      <p>
        Juro abaixo de zero mesmo, sem descontar a inflação, foi bem mais raro. Dos {paises.paises.length} países do mapa,
        só {nominais.length} tiveram a taxa básica negativa: {lista(nominais.map(([pais, n]) => `${pais} (${n.meses} meses)`))}. Na
        zona do euro, negativa foi a taxa que o banco central paga pelos depósitos dos bancos, de{' '}
        {mesAnoPorExtenso(DEPOSITO_NEGATIVO_NO_BCE.de)} a {mesAnoPorExtenso(DEPOSITO_NEGATIVO_NO_BCE.ate)}; a taxa básica parou em zero. Quando diz
        que isso não é excepcional “até em termos nominais”, o texto vai além dos dados: existiu e durou anos, mas em
        poucos lugares.
      </p>

      <Afirmacao veredito="falso">“jan/2018 até jan/2022: SP500 40,5% XAU 18,5% M1SL 415,5%”</Afirmacao>
      <p>
        O número que fecha a comparação com os Estados Unidos, porém, está errado. O texto diz que o dinheiro em
        circulação no país, o M1, cresceu 415% de 2018 a 2022, muito mais que a bolsa. Esse salto não é emissão de
        moeda. Em maio de 2020, o Federal Reserve mudou a definição do M1 e passou a incluir nele as contas de poupança,
        que antes só entravam no M2. De um mês para o outro, o M1 foi de US$ {numero(noMes(eua.dinheiro, 'm1', '2020-04'), 1)}{' '}
        trilhões para US$ {numero(noMes(eua.dinheiro, 'm1', MUDANCA_DO_M1), 1)} trilhões.
      </p>
      <Figura
        titulo="O salto do M1 americano é uma mudança de definição"
        subtitulo="Dinheiro em circulação nos Estados Unidos, em US$ trilhões"
        legenda={[
          { nome: 'M1', cor: GRAFITE },
          { nome: 'M2', cor: cor('m2') },
        ]}
        fonte="Fonte: Federal Reserve (H.6, séries com ajuste sazonal)."
        tabela={{
          colunas: ['Período', 'S&P 500 (preço)', 'S&P 500 com dividendos', 'Ouro', 'M1', 'M2', 'Base monetária', 'Papel-moeda', 'Preços (CPI)'],
          linhas: eua.periodos.map((p) => [
            `${mesAno(p.inicio)} a ${mesAno(p.fim)}`,
            ...[p.sp500, p.sp500_total, p.ouro, p.m1, p.m2, p.base_monetaria, p.papel_moeda, p.cpi].map((valor) => variacao(valor)),
          ]),
        }}
      >
        <GraficoLinhas
          {...eixoDoTempo(eua.dinheiro.datas, 1)}
          series={[
            { nome: 'M1', cor: GRAFITE, valores: eua.dinheiro.series.m1 },
            { nome: 'M2', cor: cor('m2'), valores: eua.dinheiro.series.m2 },
          ]}
          marcas={[{ x: instante(MUDANCA_DO_M1), rotulo: 'mai/2020: poupança passa a contar no M1' }]}
          formatoY={(v) => numero(v, 1)}
          formatoTiqueY={(v) => numero(v)}
          limitesY={[0, 25]}
          altura={300}
          descricao="M1 e M2 dos Estados Unidos de 2017 em diante, com o salto do M1 em maio de 2020"
        />
      </Figura>
      <p>
        O M2, que já contava essas contas, cresceu {variacao(pandemia.m2)} no mesmo período. O papel-moeda em circulação,
        que é o dinheiro no sentido mais literal, cresceu {variacao(pandemia.papel_moeda)}. A base monetária, que soma ao
        papel-moeda as reservas dos bancos no Federal Reserve, {variacao(pandemia.base_monetaria)}. Já o S&P 500 subiu{' '}
        {variacao(pandemia.sp500)}, ou {variacao(pandemia.sp500_total)} com dividendos, e não os 40,5% do texto. Com os números certos, a
        bolsa americana rendeu mais que qualquer uma dessas medidas de dinheiro de 2018 a 2022.
      </p>
      <p>
        Na década anterior a história é outra, e ela favorece o texto. De 2008 a 2018, a base monetária americana
        multiplicou por {numero(1 + decada.base_monetaria, 1)}, com as compras de títulos do Federal Reserve, bem mais que a
        bolsa ({variacao(decada.sp500_total)} com dividendos). Lá, ao contrário do Brasil, a emissão do banco central depois
        de 2008 foi enorme. A ressalva é que {pct(decada.reservas_no_aumento_da_base)} desse aumento foram reservas que os
        bancos mantêm no próprio Federal Reserve; o M2, que é o dinheiro que chega a pessoas e empresas, cresceu{' '}
        {variacao(decada.m2)}. A tabela do gráfico traz os três períodos refeitos.
      </p>
    </Secao>
  )
}
