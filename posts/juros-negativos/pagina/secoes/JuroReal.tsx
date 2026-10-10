import { useState } from 'react'
import { Figura, Opcoes } from '#base/Figura.tsx'
import { GraficoColunas } from '../components/GraficoColunas.tsx'
import { GraficoLinhas } from '../components/GraficoLinhas.tsx'
import { Afirmacao, Secao } from '../components/Secao.tsx'
import { CONTEXTO, cor, GRAFITE, type Dados } from '../dados.ts'
import { ANALISE, FONTES } from '../fontes.ts'
import { instante, lista, mesAnoPorExtenso, pct } from '#base/formato.ts'
import { desde, eixoDoTempo, tabelaAnual } from '../graficos.ts'
import type { Numeros } from '../numeros.ts'

interface Props {
  dados: Dados
  n: Numeros
}

const REGUAS = { ipca: 'Preços (IPCA)', pib: 'PIB nominal', base_monetaria: 'Base monetária', m2: 'M2' }

export function JuroReal({ dados, n }: Props) {
  const [anos, setAnos] = useState<'5' | '10'>('10')

  const juroReal = desde(dados.juro_real, '2000-01')
  const janelas = dados.janelas[anos]
  const contratado = dados.juro_contratado
  const perdeu = n.anos.filter((ano) => ano.real < 0).map((ano) => String(ano.ano))
  const melhorAno = n.anos.reduce((melhor, ano) => (ano.real > melhor.real ? ano : melhor))

  return (
    <Secao
      id="juro-real"
      numero={3}
      rubrica="O juro real"
      titulo="O juro ficou abaixo da inflação?"
      fontes={[FONTES.selic, FONTES.ipca, FONTES.moeda, FONTES.pib, FONTES.tesouro, FONTES.tips]}
      analise={[ANALISE.juroReal, ANALISE.contasEmPython, ANALISE.metodologia]}
      metodo={
        <>
          O juro real é o que a Selic rendeu em um período descontada a inflação do mesmo período. No gráfico ano a ano,
          o período vai de janeiro a dezembro. No de 12 meses, cada ponto é o período que termina naquele mês. Nas
          janelas, a conta é a mesma para os 5 ou 10 anos seguintes a cada mês de início, em taxa ao ano. A Selic entra
          sem imposto de renda nem custos. A taxa do Tesouro IPCA+ é a média do mês entre os títulos sem juros
          semestrais.
        </>
      }
    >
      <Afirmacao veredito="falso">“juro real negativo após a crise, nada bateu inflação monetária”</Afirmacao>
      <p>
        No sentido comum, juro real é o juro menos a inflação de preços. Ano a ano, a conta é simples: de{' '}
        {n.anos[0].ano} a {n.anos[n.anos.length - 1].ano}, a Selic rendeu mais que a inflação em {n.anos.length - perdeu.length} dos{' '}
        {n.anos.length} anos. Perdeu em {lista(perdeu)}.
      </p>
      <Figura
        titulo="Ano a ano"
        subtitulo="Quanto a Selic de cada ano rendeu acima da inflação do mesmo ano"
        fonte="Selic acumulada de janeiro a dezembro, descontado o IPCA do ano. Fonte: Banco Central (séries 4390 e 433 do SGS)."
        tabela={{
          colunas: ['Ano', 'Selic', 'Inflação (IPCA)', 'Juro real'],
          linhas: n.anos.map((ano) => [String(ano.ano), pct(ano.selic, 1), pct(ano.ipca, 1), pct(ano.real, 1, true)]),
        }}
      >
        <GraficoColunas
          colunas={n.anos.map((ano) => ({
            rotulo: String(ano.ano),
            valor: ano.real,
            detalhes: [
              { nome: 'Selic', valor: pct(ano.selic, 1) },
              { nome: 'inflação (IPCA)', valor: pct(ano.ipca, 1) },
            ],
          }))}
          cor={cor('ipca')}
          nomeDoValor="juro real"
          formato={(v) => pct(v, 1, true)}
          formatoTique={(v) => pct(v)}
          rotuladas={[...perdeu, String(melhorAno.ano)]}
          descricao={`Juro real de cada ano, de ${n.anos[0].ano} a ${n.anos[n.anos.length - 1].ano}: a Selic do ano descontada a inflação do ano`}
        />
      </Figura>
      <p>
        Mês a mês, em períodos de 12 meses, o retrato é o mesmo, com mais detalhe. A Selic acumulada ficou acima do IPCA
        em {n.meses - n.mesesNegativos} dos {n.meses} períodos encerrados desde dezembro de 2008. Ficou abaixo em{' '}
        {n.mesesNegativos}, todos seguidos, de {mesAnoPorExtenso(n.episodio.de)} a {mesAnoPorExtenso(n.episodio.ate)}: a pandemia, com a
        Selic a 2% ao ano e a inflação passando de 10%. No pior momento, em {mesAnoPorExtenso(n.episodio.mesDoPior)}, o juro
        real chegou a {pct(n.episodio.pior, 1)}.
      </p>
      <p>
        O texto foi publicado em outubro de 2022, três meses depois do fim desse período. Quem olhava os dois anos
        anteriores via juro negativo de verdade. Quem olha a série inteira vê uma exceção.
      </p>
      <Figura
        titulo="O juro real, por duas réguas"
        subtitulo="Selic acumulada em 12 meses, descontada a inflação e descontado o crescimento do M2 no mesmo período"
        legenda={[
          { nome: 'Selic menos inflação (IPCA)', cor: cor('ipca') },
          { nome: 'Selic menos crescimento do M2', cor: cor('m2') },
        ]}
        fonte="A faixa marca os meses em que a Selic perdeu para a inflação. Fonte: Banco Central (séries 4390, 433, 27810 e 1837 do SGS)."
        tabela={tabelaAnual(juroReal, REGUAS, (v) => pct(v, 1, true))}
      >
        <GraficoLinhas
          {...eixoDoTempo(juroReal.datas, 4)}
          series={[
            { nome: 'Selic menos inflação (IPCA)', cor: cor('ipca'), valores: juroReal.series.ipca },
            { nome: 'Selic menos crescimento do M2', cor: cor('m2'), valores: juroReal.series.m2 },
          ]}
          intervalos={[{ de: instante(n.episodio.de), ate: instante(n.episodio.ate), rotulo: 'abaixo da inflação' }]}
          formatoY={(v) => pct(v, 1, true)}
          formatoTiqueY={(v) => pct(v)}
          base={0}
          descricao="Juro real de 12 meses da Selic, descontando o IPCA e descontando o M2, desde 2000"
        />
      </Figura>
      <p>
        A linha laranja é a mesma Selic, descontada pelo crescimento do M2. Ela fica abaixo de zero em{' '}
        {pct(n.fracaoNegativaPeloM2)} dos meses desde 2008. É esse o “juro negativo” do texto.
      </p>
      <p>
        Prazos longos contam a mesma história. Em janelas de dez anos começadas desde 2008, a Selic rendeu mais que a
        inflação em {pct(n.vitoriasDaSelic.ipca)} das vezes, mais que o PIB nominal em {pct(n.vitoriasDaSelic.pib)} e mais que o M2 em{' '}
        {pct(n.vitoriasDaSelic.m2)}.
      </p>
      <Figura
        titulo={`Selic em janelas de ${anos} anos`}
        subtitulo="Quanto a Selic rendeu ao ano acima de cada régua, pelo mês em que a janela começa"
        legenda={[
          { nome: 'Acima da inflação (IPCA)', cor: cor('ipca') },
          { nome: 'Acima do M2', cor: cor('m2') },
        ]}
        controles={
          <Opcoes
            rotulo="Tamanho da janela"
            opcoes={[
              { valor: '5', nome: '5 anos' },
              { valor: '10', nome: '10 anos' },
            ]}
            valor={anos}
            aoMudar={setAnos}
          />
        }
        fonte="Abaixo de zero, a Selic perdeu para a régua naquela janela. As janelas se sobrepõem: não são experimentos independentes. Fonte: Banco Central."
        tabela={tabelaAnual(janelas, REGUAS, (v) => pct(v, 1, true), 'Início da janela')}
      >
        <GraficoLinhas
          {...eixoDoTempo(janelas.datas, 4)}
          series={[
            { nome: 'Acima da inflação (IPCA)', cor: cor('ipca'), valores: janelas.series.ipca },
            { nome: 'Acima do M2', cor: cor('m2'), valores: janelas.series.m2 },
          ]}
          marcas={[{ x: instante('2008-01'), rotulo: 'jan/2008' }]}
          formatoY={(v) => pct(v, 1, true)}
          formatoTiqueY={(v) => pct(v)}
          base={0}
          rotuloX="mês em que a janela começa"
          descricao={`Rendimento anual da Selic acima do IPCA e acima do M2 em janelas de ${anos} anos`}
        />
      </Figura>
      <p>
        Existe ainda o juro real que o investidor contrata no dia da compra: a taxa do Tesouro IPCA+, o título público
        que paga a inflação mais uma taxa fixa. Desde 2005, ela nunca foi negativa. O ponto mais baixo foi{' '}
        {pct(n.tesouroMinimo.taxa, 1)} ao ano, em {mesAnoPorExtenso(n.tesouroMinimo.mes)}; hoje está em {pct(n.tesouroHoje, 1)}. Nos Estados
        Unidos, o título equivalente pagou menos que a inflação durante {dados.eua.tips_meses_negativos} meses.
      </p>
      <Figura
        titulo="O juro real contratado"
        subtitulo="Taxa ao ano acima da inflação paga pelo título público a quem compra naquele mês"
        legenda={[
          { nome: 'Brasil (Tesouro IPCA+)', cor: GRAFITE },
          { nome: 'Estados Unidos (TIPS de 10 anos)', cor: CONTEXTO },
        ]}
        fonte="Fontes: Tesouro Nacional (média dos vencimentos do Tesouro IPCA+ sem juros semestrais) e Federal Reserve (H.15)."
        tabela={tabelaAnual(contratado, { brasil: 'Brasil', eua: 'Estados Unidos' }, (v) => pct(v, 1))}
      >
        <GraficoLinhas
          {...eixoDoTempo(contratado.datas, 4)}
          series={[
            { nome: 'Brasil', cor: GRAFITE, valores: contratado.series.brasil, nomeNoRotulo: true },
            { nome: 'EUA', cor: CONTEXTO, valores: contratado.series.eua, nomeNoRotulo: true },
          ]}
          formatoY={(v) => pct(v, 1)}
          formatoTiqueY={(v) => pct(v)}
          base={0}
          altura={300}
          descricao="Taxa real do Tesouro IPCA+ no Brasil e dos títulos indexados à inflação de dez anos nos Estados Unidos"
        />
      </Figura>
    </Secao>
  )
}
