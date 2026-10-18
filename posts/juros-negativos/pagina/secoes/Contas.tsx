import { Figura, type TabelaDeDados } from '#base/Figura.tsx'
import { GraficoBarras, type GrupoDeBarras } from '#base/GraficoBarras.tsx'
import { Afirmacao, Secao } from '../components/Secao.tsx'
import { variacao as variacaoNoPeriodo } from '../contas.ts'
import { cor, NOMES, type Dados } from '../dados.ts'
import { ANALISE, FONTES } from '../fontes.ts'
import { mesAno, numero, pct, variacao } from '#base/formato.ts'
import { erroRelativo, TOLERANCIA_DAS_CONTAS, type Numeros } from '../numeros.ts'

interface Props {
  dados: Dados
  n: Numeros
}

const PERIODOS = [
  ['1998-01', '2008-01'],
  ['2008-01', '2018-01'],
]
const SERIES = ['selic', 'ibovespa', 'ouro', 'm2', 'ipca']
const NOMES_DOS_EUA: Record<string, string> = { sp500: 'S&P 500', ouro: 'Ouro (US$)', m1: 'M1 (EUA)' }

export function Contas({ dados, n }: Props) {
  const grupos: GrupoDeBarras[] = PERIODOS.map(([inicio, fim]) => ({
    titulo: `De ${mesAno(inicio)} a ${mesAno(fim)}`,
    barras: SERIES.map((serie) => ({ nome: NOMES[serie], valor: variacaoNoPeriodo(dados.niveis, serie, inicio, fim), cor: cor(serie) })),
  }))

  const { economia } = dados.demografia
  const em = (ano: number) => economia.anos.indexOf(ano)
  const crescimento = (valores: number[]) => valores[em(2022)] / valores[em(2010)] - 1

  const ibovespa = dados.afirmacoes.find((a) => a.serie === 'ibovespa' && a.inicio === '2008-01' && a.fim === '2018-01')
  const tabela: TabelaDeDados = {
    colunas: ['Período', 'Série', 'No texto', 'Refeito', 'Diferença'],
    linhas: dados.afirmacoes.map((a) => {
      const erro = erroRelativo(a.citada, a.calculada)
      const nome = a.pais === 'Brasil' ? NOMES[a.serie] : NOMES_DOS_EUA[a.serie]
      return [`${mesAno(a.inicio)} a ${mesAno(a.fim)}`, nome, variacao(a.citada), variacao(a.calculada), Math.abs(erro) <= TOLERANCIA_DAS_CONTAS ? 'bate' : pct(erro, 0, true)]
    }),
  }

  return (
    <Secao
      id="contas"
      numero={1}
      rubrica="As contas"
      titulo="Os números do texto conferem?"
      fontes={[FONTES.selic, FONTES.ibovespa, FONTES.ouro, FONTES.dolar, FONTES.moeda, FONTES.ipca, FONTES.dinheiroDosEua, FONTES.sp500, FONTES.pibDoBancoMundial]}
      analise={[ANALISE.contas, ANALISE.citados, ANALISE.contasEmPython, ANALISE.demografia, ANALISE.metodologia]}
      metodo={
        <>
          Cada um dos {n.citados} números citados foi refeito com a série oficial, no mesmo período, e comparado com o
          do texto. A diferença é medida no valor final: se o texto diz que R$ 100 viraram R$ 220 e a conta refeita dá
          R$ 215, a diferença é de 2%. Até {pct(TOLERANCIA_DAS_CONTAS)}, conta como “bate”. Os períodos seguem a convenção do
          texto: “de jan/2008 a jan/2018” vai do primeiro dia de janeiro de 2008 ao último de dezembro de 2017. Os dois
          números do PIB, em dólares e descontada a inflação, são do Banco Mundial.
        </>
      }
    >
      <Afirmacao veredito="verdade" rotulo="A conta confere">
        “IBOV e Selic não compensam inflação (M2) desde 2008”
      </Afirmacao>
      <p>
        O texto compara, em vários períodos, quanto renderam a Selic, o Ibovespa e o ouro com quanto cresceu o M2: a
        soma do dinheiro em circulação com os depósitos e títulos emitidos pelos bancos. A ideia é que quem rende menos
        que o M2 fica com uma fatia menor de todo o dinheiro do país.
      </p>
      <p>
        Este projeto refez os {n.citados} números citados, com dados do Banco Central, da B3, do Federal Reserve e do
        Banco Mundial. {n.citadosQueBatem} batem com diferença menor que {pct(TOLERANCIA_DAS_CONTAS)}, e os de Selic e CDI batem na
        vírgula. Entre os que não batem, o mais visível parece erro de digitação: o Ibovespa de 2008 a 2018 aparece como{' '}
        {ibovespa && pct(ibovespa.citada, 1)}, e o número certo é {ibovespa && pct(ibovespa.calculada, 1)}. Nenhuma correção
        muda o resultado das comparações feitas para o Brasil.
      </p>
      <Figura
        titulo="Antes e depois de 2008"
        subtitulo="Quanto cada investimento rendeu e quanto cada régua cresceu, nos dois períodos de dez anos do texto"
        fonte="Números refeitos por este projeto. Fontes: Banco Central (Selic, M2 e IPCA), B3 (Ibovespa) e Banco Mundial (ouro)."
        tabela={tabela}
      >
        <GraficoBarras grupos={grupos} formato={(v) => pct(v)} descricao="Variação da Selic, do Ibovespa, do ouro, do M2 e do IPCA de 1998 a 2008 e de 2008 a 2018" />
      </Figura>
      <p>
        O gráfico mostra o argumento central, já com os números refeitos. De 1998 a 2008, os três investimentos renderam
        mais do que o M2 cresceu. De 2008 a 2018, nenhum. Até aqui, o texto está certo.
      </p>
      <p>
        Repare na última barra de cada grupo. A inflação de preços ficou bem abaixo do M2 nos dois períodos, e a Selic
        ganhou dela com folga nos dois. A conclusão do texto depende inteiramente de qual das duas réguas é a certa.
      </p>

      <Afirmacao veredito="em-parte" rotulo="Verdade só em dólares">
        “Gráfico do banco mundial mostra como o PIB é menor 2022 que em 2010 no Brasil”
      </Afirmacao>
      <p>
        Um número de passagem, que o texto usa para falar em destruição de riqueza. Em dólares correntes ele está
        certo: o PIB foi de US$ {numero(economia.pib_dolares[em(2010)] / 1000, 2)} trilhões em 2010 e de US${' '}
        {numero(economia.pib_dolares[em(2022)] / 1000, 2)} trilhão em 2022. A queda é do câmbio, não da produção. Em reais,
        descontada a inflação, a economia cresceu {pct(crescimento(economia.pib_real), 1)} entre os dois anos, e a renda por pessoa,{' '}
        {pct(crescimento(economia.pib_real_por_pessoa), 1)}. Foi uma década fraca, não uma queda.
      </p>
    </Secao>
  )
}
