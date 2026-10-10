import { Calculadora } from '../components/Calculadora.tsx'
import { Secao } from '../components/Secao.tsx'
import { anualizar, descontar } from '../contas.ts'
import type { Dados } from '../dados.ts'
import { ANALISE, FONTES } from '../fontes.ts'
import { pct } from '#base/formato.ts'
import type { Numeros } from '../numeros.ts'

interface Props {
  dados: Dados
  n: Numeros
}

const IMPOSTO_DE_RENDA = 0.15 // alíquota da renda fixa para aplicações de mais de dois anos

export function FacaASuaConta({ dados }: { dados: Dados }) {
  return (
    <Secao
      id="calculadora"
      numero={8}
      rubrica="Calculadora"
      titulo="Faça a sua conta"
      fontes={[FONTES.selic, FONTES.ibovespa, FONTES.ouro, FONTES.dolar, FONTES.bitcoin, FONTES.ipca, FONTES.pib, FONTES.moeda]}
      analise={[ANALISE.contasDaPagina, ANALISE.contasEmPython, ANALISE.comparacao, ANALISE.metodologia]}
      metodo={
        <>
          A calculadora parte da mesma tabela do resto da página, com o valor de cada série no fim de cada mês. O
          resultado é o que o investimento rendeu dividido pelo que a régua cresceu, do primeiro dia do mês inicial ao
          último dia do mês final. A conta existe duas vezes, em Python e em TypeScript, e os testes conferem que as
          duas dão os mesmos números.
        </>
      }
    >
      <p>
        O texto escolhe alguns períodos. Aqui dá para testar qualquer um: escolha o investimento, a régua e as datas. O
        mapa mostra de uma vez todos os períodos de janeiro a janeiro. Em azul, o investimento rendeu mais que a régua;
        em vermelho, menos.
      </p>
      <Calculadora dados={dados} />
    </Secao>
  )
}

export function Notas({ dados, n }: Props) {
  const selic = n.desde2008('selic', 'ipca')
  // Imposto de renda cobrado de uma vez, no resgate, sobre todo o rendimento nominal.
  const liquido = descontar(selic.variacaoDoAtivo * (1 - IMPOSTO_DE_RENDA), selic.variacaoDaRegua)

  return (
    <>
      <section className="notas">
        <div>
          <h2>Como a conta é feita</h2>
          <ul>
            <li>
              <strong>Os períodos seguem a convenção do texto.</strong> “De jan/2008 a jan/2018” vai do primeiro dia de
              janeiro de 2008 ao último de dezembro de 2017.
            </li>
            <li>
              <strong>Descontar uma régua é dividir, não subtrair.</strong> Uma aplicação que rendeu 21% enquanto a
              régua subiu 10% ficou 10% acima dela.
            </li>
            <li>
              <strong>A Selic</strong> é a taxa acumulada, sem imposto nem custos. O Ibovespa já inclui os dividendos
              reinvestidos.
            </li>
            <li>
              <strong>O ouro</strong> é a média do mês em Londres, em dólares, convertida pelo dólar médio do mês. O
              texto usou cotações de um dia, e por isso os números do ouro são os que mais diferem.
            </li>
            <li>
              <strong>O M1 e o M2</strong> de antes de dezembro de 2001 vêm da série antiga do Banco Central, ajustada
              ao nível da nova.
            </li>
            <li>
              <strong>O juro real dos outros países</strong> é o juro básico do mês descontada a inflação dos 12 meses
              anteriores.
            </li>
          </ul>
        </div>

        <div>
          <h2>O que esta análise não vê</h2>
          <ul>
            <li>
              <strong>Imposto de renda.</strong> Com {pct(IMPOSTO_DE_RENDA)} sobre o rendimento no resgate, o ganho da Selic
              acima da inflação desde 2008 cai de {pct(selic.acimaDaReguaAoAno, 1)} para {pct(anualizar(liquido, selic.meses), 1)} ao ano.
              Continua positivo.
            </li>
            <li>
              <strong>A inflação de cada um.</strong> O IPCA mede uma cesta média. Quem gasta mais com aluguel, escola ou
              plano de saúde pode ter tido uma inflação maior.
            </li>
            <li>
              <strong>As causas da queda da natalidade.</strong> O texto as atribui a mudanças de costumes e a políticas
              públicas. Essas explicações não são testáveis com as séries usadas aqui; a checagem cobre só os números
              de população.
            </li>
            <li>
              <strong>O futuro.</strong> O juro real voltou a ser alto no Brasil, mas nada garante que continue. Ouro e
              bitcoin subiram muito desde {dados.texto.publicado_em.slice(0, 4)}, com quedas fortes no caminho.
            </li>
            <li>
              <strong>A intenção do autor.</strong> “Falso” aqui quer dizer que a afirmação não resiste aos dados, não
              que alguém mentiu. Os números do texto podem ser refeitos por qualquer pessoa, e quase todos conferem.
            </li>
          </ul>
        </div>
      </section>

      <footer className="rodape">
        Dados: Banco Central (SGS), B3 (Ibovespa), IBGE (Registro Civil e projeções de população), Tesouro Nacional,
        Federal Reserve (H.6 e H.15), BIS (juros e preços por país), Banco Central Europeu (taxa de depósito), Banco
        Mundial (ouro, PIB e população), Blockchain.com (bitcoin) e a base aberta do S&P 500 de Robert Shiller. Texto analisado: “O Juro é negativo após 2008”, de Renato Amoedo (Trezoitão). Isto
        é um estudo, não uma recomendação de investimento.
      </footer>
    </>
  )
}
