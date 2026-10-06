import { useState } from 'react'
import { Figura, Opcoes } from '../components/Figura.tsx'
import { GraficoLinhas } from '../components/GraficoLinhas.tsx'
import { Piramide } from '../components/Piramide.tsx'
import { Afirmacao, Secao } from '../components/Secao.tsx'
import { CONTEXTO, cor, GRAFITE, NOMES, type Dados } from '../dados.ts'
import { mesAno, milhoes, numero, pct } from '../formato.ts'
import { eixoDoTempo, eixoDosAnos, tabelaAnual } from '../graficos.ts'
import { ultimoMultiplo, type Numeros } from '../numeros.ts'

interface Props {
  dados: Dados
  n: Numeros
}

const ATIVOS = ['selic', 'ibovespa', 'ouro']
const REPOSICAO = 2.1 // filhos por mulher para a população se manter
const ANO_DE_REFERENCIA = '2025'

export function Aposentadoria({ dados, n }: Props) {
  const [inicio, setInicio] = useState('2008-01')
  const [ano, setAno] = useState(ANO_DE_REFERENCIA)

  const { fecundidade, nascimentos, piramide, dependencia_idosos: dependencia, populacao } = dados.demografia
  const poupar = dados.poupar[inicio]
  const anosParaDobrar = Math.log(2) / Math.log(1 + n.tesouroHoje)

  const filhos = fecundidade.series.Brasil
  const abaixoDesde = fecundidade.anos[filhos.findIndex((valor) => valor !== null && valor < REPOSICAO)]
  const ultimosFilhos = filhos.findLast((valor) => valor !== null) as number
  const quedaDosNascimentos = 1 - nascimentos.valores[nascimentos.valores.length - 1] / nascimentos.valores[0]
  const pico = populacao.anos[populacao.valores.indexOf(Math.max(...populacao.valores))]
  const idosos = (quando: number) => dependencia.series.Brasil[dependencia.anos.indexOf(quando)] as number
  const maiorFaixa = Math.max(...Object.values(piramide.anos).flatMap((sexos) => [...sexos.homens, ...sexos.mulheres]))
  const anosDaPiramide = Object.keys(piramide.anos)

  return (
    <Secao id="aposentadoria" numero={7} rubrica="Aposentadoria" titulo="Guardar dinheiro ficou inviável?">
      <Afirmacao veredito="falso">“não é viável fazer capitalização para garantir renda no fim da vida”</Afirmacao>
      <p>
        Capitalização é guardar dinheiro e viver do que ele rende. Para testar, a conta é a de alguém que aplica o mesmo
        valor todo mês, corrigido pela inflação. Quem fez isso na Selic desde janeiro de 2008 tem hoje{' '}
        {numero(ultimoMultiplo(dados, '2008-01'), 2)} vez o que guardou, já descontada a inflação. Quem começou em 1995 tem{' '}
        {numero(ultimoMultiplo(dados, '1995-01'), 2)} vezes.
      </p>
      <p>
        Para quem começa agora, o Tesouro IPCA+ paga {pct(n.tesouroHoje, 1)} ao ano acima da inflação. A essa taxa, o dinheiro
        dobra de valor real em cerca de {numero(anosParaDobrar)} anos.
      </p>
      <Figura
        titulo="Quem guardou o mesmo valor todo mês"
        subtitulo="Saldo dividido pelo total guardado, descontada a inflação. Acima de 1, o dinheiro rendeu mais que os preços"
        legenda={ATIVOS.map((ativo) => ({ nome: NOMES[ativo], cor: cor(ativo) }))}
        controles={
          <Opcoes
            rotulo="Começo"
            opcoes={Object.keys(dados.poupar).map((mes) => ({ valor: mes, nome: `Desde ${mes.slice(0, 4)}` }))}
            valor={inicio}
            aoMudar={setInicio}
          />
        }
        fonte="Um aporte no começo de cada mês, corrigido pelo IPCA. Sem imposto de renda nem custos. Fontes: Banco Central, B3 e Banco Mundial."
        tabela={tabelaAnual(poupar, Object.fromEntries(ATIVOS.map((ativo) => [ativo, NOMES[ativo]])), (v) => numero(v, 2))}
      >
        <GraficoLinhas
          {...eixoDoTempo(poupar.datas, inicio === '1995-01' ? 4 : 2)}
          series={ATIVOS.map((ativo) => ({ nome: NOMES[ativo], cor: cor(ativo), valores: poupar.series[ativo] }))}
          formatoY={(v) => `${numero(v, 2)}×`}
          formatoTiqueY={(v) => `${numero(v, 1)}×`}
          base={1}
          descricao={`Saldo real dividido pelo total guardado por quem aplicou todo mês desde ${mesAno(inicio)} na Selic, no Ibovespa e no ouro`}
        />
      </Figura>

      <Afirmacao veredito="verdade">“a taxa de fecundidade caiu abaixo do nível de reposição em 2003”</Afirmacao>
      <p>
        A segunda metade do texto trata de população, e os números conferem. A brasileira tem em média{' '}
        {numero(ultimosFilhos, 2)} filho. Desde {abaixoDesde}, esse número está abaixo dos {numero(REPOSICAO, 1)} necessários para repor a
        população. Os cartórios registraram {milhoes(nascimentos.valores[nascimentos.valores.length - 1], 2)} de nascimentos em{' '}
        {nascimentos.anos[nascimentos.anos.length - 1]}, {pct(quedaDosNascimentos)} menos que em {nascimentos.anos[0]}. Pela projeção da
        ONU, a população começa a diminuir depois de {pico}.
      </p>
      <div className="lado-a-lado">
        <Figura
          titulo="Filhos por mulher"
          subtitulo="Taxa de fecundidade total. A linha marca 2,1, o nível de reposição"
          legenda={[
            { nome: 'Brasil', cor: GRAFITE },
            { nome: 'Mundo', cor: CONTEXTO },
          ]}
          fonte="Fonte: Banco Mundial (estimativas da ONU)."
          tabela={{
            colunas: ['Ano', ...Object.keys(fecundidade.series)],
            linhas: fecundidade.anos
              .map((quando, i) => ({ quando, i }))
              .filter(({ quando, i }) => quando % 5 === 0 || i === fecundidade.anos.length - 1)
              .map(({ quando, i }) => [String(quando), ...Object.values(fecundidade.series).map((valores) => (valores[i] === null ? '–' : numero(valores[i] as number, 2)))]),
          }}
        >
          <GraficoLinhas
            {...eixoDosAnos(fecundidade.anos)}
            series={[
              { nome: 'Mundo', cor: CONTEXTO, valores: fecundidade.series.Mundo, nomeNoRotulo: true },
              { nome: 'Brasil', cor: GRAFITE, valores: fecundidade.series.Brasil, nomeNoRotulo: true },
            ]}
            formatoY={(v) => numero(v, 2)}
            formatoTiqueY={(v) => numero(v)}
            base={REPOSICAO}
            limitesY={[0, 5]}
            altura={260}
            descricao="Filhos por mulher no Brasil e no mundo desde 1970, com a linha da reposição em 2,1"
          />
        </Figura>
        <Figura
          titulo="Nascimentos registrados no Brasil"
          subtitulo="Nascidos vivos registrados em cartório no ano, em milhões"
          fonte="Fonte: IBGE (Estatísticas do Registro Civil, tabela 2609)."
          tabela={{ colunas: ['Ano', 'Nascimentos'], linhas: nascimentos.anos.map((quando, i) => [String(quando), numero(nascimentos.valores[i])]) }}
        >
          <GraficoLinhas
            {...eixoDosAnos(nascimentos.anos, 5)}
            series={[{ nome: 'Nascimentos', cor: GRAFITE, valores: nascimentos.valores.map((valor) => valor / 1e6) }]}
            formatoY={(v) => numero(v, 2)}
            formatoTiqueY={(v) => numero(v)}
            limitesY={[0, 4]}
            altura={260}
            descricao="Nascimentos registrados por ano no Brasil desde 2003"
          />
        </Figura>
      </div>
      <p>
        Em 2000 havia {numero(idosos(2000))} pessoas de 65 anos ou mais para cada 100 em idade de trabalhar. Hoje são{' '}
        {numero(idosos(Number(ANO_DE_REFERENCIA)))}; em 2050 serão {numero(idosos(2050))}. Um sistema em que os trabalhadores de hoje pagam os
        aposentados de hoje, como o do INSS, fica mais pesado a cada ano. Essa parte do diagnóstico se sustenta.
      </p>
      <Figura
        titulo={`A população brasileira por idade em ${ano}`}
        subtitulo={ano === ANO_DE_REFERENCIA ? 'Milhões de pessoas em cada faixa de idade' : `Milhões de pessoas em cada faixa de idade. O traço marca ${ANO_DE_REFERENCIA}`}
        legenda={
          ano === ANO_DE_REFERENCIA
            ? undefined
            : [
                { nome: ano, cor: 'var(--barra-neutra)', marca: 'area' },
                { nome: ANO_DE_REFERENCIA, cor: 'var(--tinta)', marca: 'traco' },
              ]
        }
        controles={<Opcoes rotulo="Ano" opcoes={anosDaPiramide.map((valor) => ({ valor, nome: valor }))} valor={ano} aoMudar={setAno} />}
        fonte="2050 é projeção. Fonte: Banco Mundial (estimativas e projeções de população da ONU)."
        tabela={{
          colunas: ['Idade', ...anosDaPiramide.flatMap((quando) => [`Homens ${quando}`, `Mulheres ${quando}`])],
          linhas: piramide.faixas
            .map((faixa, i) => [faixa, ...anosDaPiramide.flatMap((quando) => [numero(piramide.anos[quando].homens[i]), numero(piramide.anos[quando].mulheres[i])])])
            .toReversed(),
        }}
      >
        <Piramide
          faixas={piramide.faixas}
          populacao={piramide.anos[ano]}
          referencia={ano === ANO_DE_REFERENCIA ? undefined : piramide.anos[ANO_DE_REFERENCIA]}
          maximo={maiorFaixa}
          descricao={`Pirâmide etária do Brasil em ${ano}`}
        />
      </Figura>
      <p>
        O que não se sustenta é a conclusão de que não há saída. A previdência pública vai pesar mais, e isso os dados
        confirmam. Mas, com juro real positivo, guardar por conta própria continua possível.
      </p>
    </Secao>
  )
}
