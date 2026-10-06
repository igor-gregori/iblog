import { Selo, type Veredito } from '../components/Selo.tsx'
import type { Dados } from '../dados.ts'
import { lista, mesAno, mesAnoPorExtenso, numero, pct, vezes } from '../formato.ts'
import { INICIO_DO_BITCOIN, ultimoMultiplo, type Numeros } from '../numeros.ts'

interface Props {
  dados: Dados
  n: Numeros
}

export function Abertura({ dados, n }: Props) {
  const ate = mesAno(dados.ate)
  const selicIpca = n.desde2008('selic', 'ipca')
  const selicM2 = n.desde2008('selic', 'm2')
  const negativos = dados.paises.negativos['2009 a 2021']
  const nascimentos = dados.demografia.nascimentos.valores
  const { economia, projecao_ibge: ibge } = dados.demografia
  const pibReal = (ano: number) => economia.pib_real[economia.anos.indexOf(ano)]
  const anosNoVermelho = n.anos.filter((ano) => ano.real < 0).map((ano) => String(ano.ano))
  const picoDaPopulacao = ibge.anos[ibge.populacao.indexOf(Math.max(...ibge.populacao))]

  const placar: { secao: string; afirmacao: string; veredito: Veredito; rotulo?: string; porque: string }[] = [
    {
      secao: 'contas',
      afirmacao: 'Depois de 2008, a Selic e a bolsa renderam menos do que o M2 cresceu.',
      veredito: 'verdade',
      porque: `Em janelas de dez anos começadas desde 2008, a Selic perdeu para o M2 em ${pct(1 - n.vitoriasDaSelic.m2)} das vezes.`,
    },
    {
      secao: 'contas',
      afirmacao: 'O PIB do Brasil era menor em 2022 do que em 2010.',
      veredito: 'em-parte',
      rotulo: 'Verdade só em dólares',
      porque: `É efeito do câmbio. Descontada a inflação, a economia cresceu ${pct(pibReal(2022) / pibReal(2010) - 1)} no período.`,
    },
    {
      secao: 'regua',
      afirmacao: 'O crescimento do M2 é a inflação de verdade.',
      veredito: 'falso',
      porque: `${pct(n.m2QueRendeJuros.hoje)} do M2 são aplicações que rendem juros. Ele dobrou em relação ao PIB porque há mais dinheiro guardado em bancos.`,
    },
    {
      secao: 'juro-real',
      afirmacao: 'No Brasil, o juro real é negativo desde 2008.',
      veredito: 'falso',
      porque: `Descontada a inflação de preços, a Selic ganhou em ${n.anos.length - anosNoVermelho.length} dos ${n.anos.length} anos desde 2008. Perdeu em ${lista(anosNoVermelho)}.`,
    },
    {
      secao: 'mundo',
      afirmacao: 'Juro abaixo da inflação virou regra no mundo depois de 2008.',
      veredito: 'verdade',
      rotulo: 'Verdade nos países ricos',
      porque: `Nos Estados Unidos, o juro ficou abaixo da inflação em ${pct(negativos['Estados Unidos'] ?? 0)} dos meses entre 2009 e 2021. Abaixo de zero mesmo, sem descontar a inflação, só em ${Object.keys(dados.paises.nominal_negativo).length} dos ${dados.paises.paises.length} países comparados.`,
    },
    {
      secao: 'mundo',
      afirmacao: 'Nos Estados Unidos, o dinheiro em circulação cresceu 415% de 2018 a 2022.',
      veredito: 'falso',
      porque: `O salto vem de uma mudança na definição do M1, em maio de 2020. O M2 cresceu ${pct(dados.eua.periodos[2].m2)} e o papel-moeda em circulação, ${pct(dados.eua.periodos[2].papel_moeda)}.`,
    },
    {
      secao: 'investimentos',
      afirmacao: 'A bolsa brasileira não foi investimento.',
      veredito: 'em-parte',
      porque: `Desde 2008 o Ibovespa empatou com a inflação. Mas em prazos de dez anos ganhou dela em ${pct(n.vitoriasDoIbovespaSobreOIpca)} das vezes.`,
    },
    {
      secao: 'investimentos',
      afirmacao: 'Ouro e bitcoin protegem.',
      veredito: 'em-parte',
      porque: `O ouro rendeu ${pct(n.desde2008('ouro', 'm2').acimaDaReguaAoAno, 1)} ao ano acima do M2 desde 2008, e a maior queda dele foi de ${pct(Math.abs(n.quedas.maiorDoOuro?.queda ?? 0))}. O bitcoin subiu ${pct(n.desdeOTexto('bitcoin', 'ipca').variacaoDoAtivo)} desde o texto, mas já perdeu mais da metade do valor ${vezes(n.quedas.grandesDoBitcoin.length)} desde ${INICIO_DO_BITCOIN.slice(0, 4)}.`,
    },
    {
      secao: 'depois',
      afirmacao: 'Juro real positivo não volta mais.',
      veredito: 'falso',
      porque: `Desde a publicação, a Selic rendeu ${pct(n.desdeOTexto('selic', 'ipca').acimaDaReguaAoAno, 1)} ao ano acima da inflação.`,
    },
    {
      secao: 'aposentadoria',
      afirmacao: 'Guardar dinheiro para a aposentadoria ficou inviável.',
      veredito: 'falso',
      porque: `Quem aplicou na Selic todo mês desde 2008 tem ${numero(ultimoMultiplo(dados, '2008-01'), 2)} vez o que guardou, descontada a inflação.`,
    },
    {
      secao: 'aposentadoria',
      afirmacao: 'A população brasileira vai envelhecer e encolher.',
      veredito: 'verdade',
      porque: `Os nascimentos registrados caíram ${pct(1 - nascimentos[nascimentos.length - 1] / nascimentos[0])} desde ${dados.demografia.nascimentos.anos[0]}. A população ainda cresce: pela projeção do IBGE, só começa a encolher depois de ${picoDaPopulacao}.`,
    },
  ]

  return (
    <>
      <header className="manchete">
        <p className="chapeu">Juros, moeda e inflação</p>
        <h1>O juro é negativo?</h1>
        <p className="linha-fina">
          Em 2022, o Trezoitão escreveu que, desde 2008, nenhum investimento tradicional rende mais que a “inflação
          real”, o crescimento do dinheiro em circulação. Este projeto refaz as contas dele com dados públicos, testa a
          régua que ele usou e confere o que aconteceu depois.
        </p>
        <p className="assinatura">
          Dados até {ate} · Texto analisado:{' '}
          <a href={dados.texto.url} target="_blank" rel="noreferrer">
            “O Juro é negativo após 2008”
          </a>
          , de {mesAno(dados.texto.publicado_em)} · Fontes: Banco Central, B3, IBGE, Tesouro Nacional, Federal Reserve, BIS
          e Banco Mundial
        </p>
      </header>

      <div className="abertura">
        <div className="veredito">
          <h2>O veredito</h2>
          <p className="veredito-frase">As contas fecham. A conclusão, não.</p>
          <p className="texto-abertura">
            Para o Brasil, a frase “o juro é negativo depois de 2008” é <strong>falsa</strong> no sentido em que quase
            todo mundo a entende: juro menos inflação. Ela só fica de pé com a régua que o próprio texto escolheu, o M2,
            e essa régua não mede o custo de vida.
          </p>
          <ul>
            <li>
              <strong>A conta dele está certa.</strong> Desde 2008, a Selic rendeu {pct(Math.abs(selicM2.acimaDaReguaAoAno), 1)} ao
              ano a menos do que o M2 cresceu.
            </li>
            <li>
              <strong>Mas o M2 não é inflação.</strong> É o dinheiro em circulação mais os depósitos em bancos, e{' '}
              {pct(n.m2QueRendeJuros.hoje)} dele rende juros. Cresceu porque os brasileiros passaram a guardar mais: de{' '}
              {pct(n.m2SobrePib.antes)} para {pct(n.m2SobrePib.hoje)} do PIB.
            </li>
            <li>
              <strong>Pela inflação de preços, a Selic ganhou.</strong> Rendeu {pct(selicIpca.acimaDaReguaAoAno, 1)} ao ano acima do
              IPCA. Em 12 meses, só ficou abaixo dele entre {mesAnoPorExtenso(n.episodio.de)} e {mesAnoPorExtenso(n.episodio.ate)}, logo antes de o
              texto ser escrito.
            </li>
            <li>
              <strong>A previsão não se confirmou.</strong> O texto dizia que juro real positivo era “uma impossibilidade”.
              Desde então, a Selic rendeu {pct(n.desdeOTexto('selic', 'ipca').acimaDaReguaAoAno, 1)} ao ano acima da inflação.
            </li>
            <li>
              <strong>Onde ele tem razão.</strong> Nos países ricos, o juro ficou abaixo da inflação na maior parte do
              tempo entre 2009 e 2021. No Brasil, a bolsa empatou com a inflação desde 2008, e o ouro ganhou de todas as
              réguas.
            </li>
          </ul>
        </div>

        <aside className="numeros">
          <h2>Em números</h2>
          <dl className="indicadores">
            <div>
              <dt>Selic acima da inflação</dt>
              <dd>{pct(selicIpca.acimaDaReguaAoAno, 1, true)}</dd>
              <small>ao ano, de jan/2008 a {ate}</small>
            </div>
            <div>
              <dt>Selic contra o M2</dt>
              <dd>{pct(selicM2.acimaDaReguaAoAno, 1, true)}</dd>
              <small>ao ano, no mesmo período</small>
            </div>
            <div>
              <dt>Meses de juro real negativo</dt>
              <dd>
                {n.mesesNegativos} de {n.meses}
              </dd>
              <small>desde 2008, descontando a inflação de preços</small>
            </div>
            <div>
              <dt>Juro real hoje</dt>
              <dd>{pct(n.juroRealHoje, 1)}</dd>
              <small>
                Selic de 12 meses ({pct(n.selic12m, 1)}) menos IPCA ({pct(n.ipca12m, 1)})
              </small>
            </div>
          </dl>
        </aside>
      </div>

      <section className="placar" aria-labelledby="titulo-do-placar">
        <h2 id="titulo-do-placar">Afirmação por afirmação</h2>
        <p className="placar-nota">
          As frases resumem o que o texto diz. As citações literais estão em cada seção, com o trecho entre aspas.
        </p>
        <ol>
          {placar.map((linha, i) => (
            <li key={linha.afirmacao}>
              <span className="placar-numero">{String(i + 1).padStart(2, '0')}</span>
              <p className="placar-afirmacao">
                <a href={`#${linha.secao}`}>{linha.afirmacao}</a>
              </p>
              <Selo veredito={linha.veredito} rotulo={linha.rotulo} />
              <p className="placar-porque">{linha.porque}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  )
}
