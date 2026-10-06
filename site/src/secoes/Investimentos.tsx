import { useState } from 'react'
import { Figura, Opcoes } from '../components/Figura.tsx'
import { GraficoBarras } from '../components/GraficoBarras.tsx'
import { GraficoLinhas } from '../components/GraficoLinhas.tsx'
import { Afirmacao, Secao } from '../components/Secao.tsx'
import { comparar, distanciaDoPico, indiceDescontado } from '../contas.ts'
import { ATIVOS, cor, GRAFITE, NOMES, type Dados } from '../dados.ts'
import { mesAno, mesAnoPorExtenso, numero, pct, variacao, vezes } from '../formato.ts'
import { eixoDoTempo } from '../graficos.ts'
import { INICIO_DA_TESE, INICIO_DO_BITCOIN, type Numeros } from '../numeros.ts'

interface Props {
  dados: Dados
  n: Numeros
}

const TRES = ['selic', 'ibovespa', 'ouro']
const REGUAS_DEPOIS = ['m2', 'pib', 'ipca', 'base_monetaria']

export function Investimentos({ dados, n }: Props) {
  const [regua, setRegua] = useState<'ipca' | 'm2'>('ipca')
  const ate = mesAno(dados.ate)
  const ibovespa = n.desde2008('ibovespa', 'ipca')
  const indices = Object.fromEntries(TRES.map((ativo) => [ativo, indiceDescontado(dados.niveis, ativo, regua, INICIO_DA_TESE)]))
  // Seis anos em que o ouro ficou para trás: da abertura de 2013 à abertura de 2019.
  const ouroParado = comparar(dados.niveis, 'ouro', 'selic', '2013-01', '2019-01')

  // As quedas: quanto o preço em reais ficou abaixo do recorde, mês a mês.
  const { grandesDoBitcoin, maiorDoBitcoinDesdeOTexto, maiorDoOuro, bitcoinNaVesperaDoTexto, desdeOPicoAnteriorAoTexto } = n.quedas
  const piorDoBitcoin = Math.min(...grandesDoBitcoin.map((queda) => queda.queda))
  const distancias = {
    bitcoin: distanciaDoPico(dados.niveis, 'bitcoin', INICIO_DO_BITCOIN, n.fim),
    ouro: distanciaDoPico(dados.niveis, 'ouro', INICIO_DO_BITCOIN, n.fim),
  }
  const queda = (valor: number) => pct(Math.abs(valor))
  const desde = INICIO_DO_BITCOIN.slice(0, 4)

  return (
    <Secao id="investimentos" numero={5} rubrica="Bolsa e ouro" titulo="O que foi investimento e o que foi proteção?">
      <Afirmacao veredito="em-parte">“este índice [...] não pode ser considerado investimento”</Afirmacao>
      <p>
        De janeiro de 2008 a {mesAnoPorExtenso(dados.ate)}, o Ibovespa subiu {variacao(ibovespa.variacaoDoAtivo)}. A inflação foi de{' '}
        {variacao(ibovespa.variacaoDaRegua)}. Em mais de {Math.floor(ibovespa.meses / 12)} anos, quem comprou o índice empatou com os preços, e isso já contando
        os dividendos reinvestidos, que o Ibovespa inclui. Nesse ponto o texto acerta, e nem precisa do M2.
      </p>
      <p>
        Mas a data de partida pesa. Janeiro de 2008 fica a poucos meses da maior queda recente da bolsa. Considerando todas as
        janelas de dez anos começadas desde então, o Ibovespa rendeu mais que a inflação em{' '}
        {pct(n.vitoriasDoIbovespaSobreOIpca)} delas.
      </p>
      <Afirmacao veredito="em-parte">“há opções de hedge (como ouro e bitcoin)”</Afirmacao>
      <p>
        O ouro, que o texto trata como proteção e não como investimento, foi o único dos três a ganhar de todas as
        réguas: rendeu {pct(n.desde2008('ouro', 'm2').acimaDaReguaAoAno, 1)} ao ano acima do M2 desde 2008 e{' '}
        {pct(n.desde2008('ouro', 'ipca').acimaDaReguaAoAno, 1)} ao ano acima da inflação.
        {ouroParado &&
          ouroParado.acimaDaRegua < 0 &&
          ` O caminho foi irregular: de 2013 a 2018 o ouro rendeu ${variacao(ouroParado.variacaoDoAtivo)}, e a Selic, ${variacao(ouroParado.variacaoDaRegua)}.`}
        {maiorDoOuro && ` A maior queda dele nesse tempo, do recorde ao fundo, foi de ${queda(maiorDoOuro.queda)}.`}
      </p>
      <Figura
        titulo="R$ 100 aplicados em janeiro de 2008"
        subtitulo={regua === 'ipca' ? 'Descontada a inflação de preços (IPCA)' : 'Descontado o crescimento do M2'}
        legenda={TRES.map((ativo) => ({ nome: NOMES[ativo], cor: cor(ativo) }))}
        controles={
          <Opcoes
            rotulo="Régua"
            opcoes={[
              { valor: 'ipca', nome: 'Descontar preços' },
              { valor: 'm2', nome: 'Descontar M2' },
            ]}
            valor={regua}
            aoMudar={setRegua}
          />
        }
        fonte={`Acima de 100, o investimento rendeu mais que a régua. Dados até ${ate}. Fontes: Banco Central, B3 e Banco Mundial.`}
        tabela={{
          colunas: ['Mês', ...TRES.map((ativo) => NOMES[ativo])],
          linhas: indices.selic.datas
            .map((data, i) => ({ data, i }))
            .filter(({ data }) => data.endsWith('-12') || data === dados.ate)
            .map(({ data, i }) => [mesAno(data), ...TRES.map((ativo) => numero(indices[ativo].valores[i] ?? 0))]),
        }}
      >
        <GraficoLinhas
          {...eixoDoTempo(indices.selic.datas, 2)}
          series={TRES.map((ativo) => ({ nome: NOMES[ativo], cor: cor(ativo), valores: indices[ativo].valores }))}
          formatoY={(v) => numero(v)}
          base={100}
          descricao={`Cem reais aplicados em janeiro de 2008 na Selic, no Ibovespa e no ouro, descontando ${regua === 'ipca' ? 'o IPCA' : 'o M2'}`}
        />
      </Figura>

      <p>
        O bitcoin é outra história: rendeu muito mais que o ouro, e caiu muito mais. Desde {desde}, perdeu mais da metade
        do valor {vezes(grandesDoBitcoin.length)}; na pior, {queda(piorDoBitcoin)}. Quando o texto foi publicado, estava{' '}
        {queda(bitcoinNaVesperaDoTexto)} abaixo do recorde. Subiu {variacao(n.desdeOTexto('bitcoin', 'ipca').variacaoDoAtivo)} desde então
        {maiorDoBitcoinDesdeOTexto &&
          ` e, no caminho, caiu ${queda(maiorDoBitcoinDesdeOTexto.queda)} entre ${mesAnoPorExtenso(maiorDoBitcoinDesdeOTexto.pico)} e ${mesAnoPorExtenso(maiorDoBitcoinDesdeOTexto.fundo)}`}
        .
      </p>
      <p>
        Por isso o carimbo é “em parte”. Uma proteção que perde metade do valor de tempos em tempos só protege quem
        pode esperar a volta, e depende do dia da compra.
        {desdeOPicoAnteriorAoTexto &&
          ` Quem comprou bitcoin no pico de ${mesAnoPorExtenso(desdeOPicoAnteriorAoTexto.pico)} tem hoje ${variacao(Math.abs(desdeOPicoAnteriorAoTexto.variacaoDoAtivo))} ${desdeOPicoAnteriorAoTexto.variacaoDoAtivo >= 0 ? 'a mais' : 'a menos'}, contra uma inflação de ${variacao(desdeOPicoAnteriorAoTexto.variacaoDaRegua)} no período.`}
      </p>
      <Figura
        titulo="Do recorde ao fundo: as quedas do bitcoin e do ouro"
        subtitulo="Preço em reais em relação ao maior valor atingido até aquele mês. Em 0%, está no recorde; em −50%, vale metade do que já valeu"
        legenda={[
          { nome: 'Bitcoin', cor: GRAFITE },
          { nome: 'Ouro', cor: cor('ouro') },
        ]}
        fonte={`Preço do último dia de cada mês no bitcoin e média do mês no ouro: o que cai e volta dentro do mês não aparece. Dados até ${ate}. Fontes: Blockchain.com, Banco Mundial e Banco Central.`}
        tabela={{
          colunas: ['Queda', 'Recorde', 'Fundo', 'Tamanho'],
          linhas: [
            ...grandesDoBitcoin.map((q) => ['Bitcoin', mesAno(q.pico), mesAno(q.fundo), pct(q.queda)]),
            ...(maiorDoOuro ? [['Ouro (a maior)', mesAno(maiorDoOuro.pico), mesAno(maiorDoOuro.fundo), pct(maiorDoOuro.queda)]] : []),
          ],
        }}
      >
        <GraficoLinhas
          {...eixoDoTempo(distancias.bitcoin.datas, 2)}
          series={[
            { nome: 'Ouro', cor: cor('ouro'), valores: distancias.ouro.valores },
            { nome: 'Bitcoin', cor: GRAFITE, valores: distancias.bitcoin.valores },
          ]}
          preenchimento={{ serie: 'Bitcoin', cor: GRAFITE }}
          formatoY={(v) => pct(v)}
          base={0}
          limitesY={[-1, 0]}
          altura={300}
          descricao={`Quanto o bitcoin e o ouro estiveram abaixo do seu recorde em reais, mês a mês, desde ${desde}`}
        />
      </Figura>
    </Secao>
  )
}

export function Depois({ dados, n }: Props) {
  const ate = mesAno(dados.ate)
  const publicado = mesAno(dados.texto.publicado_em)
  const selic = n.desdeOTexto('selic', 'ipca')
  const contraM2 = n.desdeOTexto('selic', 'm2')
  const rendeu = (ativo: string) => n.desdeOTexto(ativo, 'ipca').variacaoDoAtivo
  const cresceu = (regua: string) => n.desdeOTexto('selic', regua).variacaoDaRegua
  const tombo = n.quedas.maiorDoBitcoinDesdeOTexto

  const barras = (series: string[], valor: (serie: string) => number) =>
    series.map((serie) => ({ nome: NOMES[serie], valor: valor(serie), cor: cor(serie) })).toSorted((a, b) => b.valor - a.valor)

  // O Brasil no último ano completo do mapa de juros reais.
  const { paises } = dados
  const penultimo = paises.anos.length - 2
  const maiorJuro = paises.paises.reduce((maior, pais) => ((paises.juro_real[pais][penultimo] ?? -1) > (paises.juro_real[maior][penultimo] ?? -1) ? pais : maior))

  return (
    <Secao id="depois" numero={6} rubrica="Depois do texto" titulo="A previsão se confirmou?">
      <Afirmacao veredito="falso">
        “volta de juro real positivo no legacy é uma impossibilidade política e física - até o fim das moedas
        fiduciárias”
      </Afirmacao>
      <p>
        Esta é a única previsão do texto que já dá para conferir. De {publicado} a {ate}, a Selic rendeu{' '}
        {variacao(selic.variacaoDoAtivo)} e a inflação foi de {variacao(selic.variacaoDaRegua)}: um juro real de{' '}
        {pct(selic.acimaDaReguaAoAno, 1)} ao ano. Nos últimos 12 meses, a Selic rendeu {pct(n.selic12m, 1)} contra uma inflação de{' '}
        {pct(n.ipca12m, 1)}.
        {maiorJuro === 'Brasil' && ` Em ${paises.anos[penultimo]}, o juro real brasileiro foi o mais alto entre os ${paises.paises.length} países do mapa da seção 4.`}
      </p>
      <p>
        Até pela régua do texto a história mudou. Nesse período o M2 cresceu {variacao(contraM2.variacaoDaRegua)}, praticamente o
        mesmo que a Selic e o Ibovespa ({variacao(rendeu('ibovespa'))}).
      </p>
      <p>
        As proteções que o texto recomenda renderam mais que tudo: o ouro subiu {variacao(rendeu('ouro'))} em reais e o
        bitcoin, {variacao(rendeu('bitcoin'))}. O dólar {rendeu('dolar') < 0 ? 'caiu' : 'subiu'} {variacao(Math.abs(rendeu('dolar')))}.
        {tombo &&
          ` Não foi em linha reta: entre ${mesAnoPorExtenso(tombo.pico)} e ${mesAnoPorExtenso(tombo.fundo)}, o bitcoin caiu ${pct(Math.abs(tombo.queda))} (seção 5).`}
      </p>
      <Figura
        titulo="Desde que o texto foi publicado"
        subtitulo={`Variação de ${publicado} a ${ate}`}
        fonte="Fontes: Banco Central, B3, Banco Mundial (ouro) e Blockchain.com (bitcoin). Ouro e bitcoin convertidos para reais."
      >
        <GraficoBarras
          grupos={[
            { titulo: 'Investimentos e proteções', barras: barras(ATIVOS, rendeu) },
            { titulo: 'Réguas', barras: barras(REGUAS_DEPOIS, cresceu) },
          ]}
          formato={(v) => variacao(v, true)}
          descricao="Variação de cada investimento e de cada régua desde a publicação do texto"
        />
      </Figura>
    </Secao>
  )
}
