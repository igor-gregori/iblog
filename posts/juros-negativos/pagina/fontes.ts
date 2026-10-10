/**
 * De onde vêm os números do artigo. Cada seção cita as fontes dos dados e os arquivos
 * do repositório em que a análise está feita.
 */

export interface Link {
  nome: string
  /** O que esse link mostra, em poucas palavras. */
  detalhe: string
  url: string
}

export interface Fonte extends Link {
  /** Quem publica o dado. É o que aparece no quadro fechado, sem repetição. */
  origem: string
}

/** Os arquivos da análise apontam para o ramo principal do repositório. */
const REPOSITORIO = 'https://github.com/igor-gregori/iblog/blob/main/posts/juros-negativos'

/** O sistema de séries do Banco Central: a consulta é pelo código da série, que vai no detalhe de cada fonte. */
const SGS = 'https://www3.bcb.gov.br/sgspub/'

export const FONTES = {
  selic: {
    origem: 'Banco Central',
    nome: 'Selic e CDI (Banco Central)',
    detalhe: 'taxa acumulada em cada mês, séries 4390 e 4391 do SGS',
    url: SGS,
  },
  ipca: {
    origem: 'Banco Central',
    nome: 'IPCA (IBGE, via Banco Central)',
    detalhe: 'inflação oficial de cada mês, série 433 do SGS',
    url: SGS,
  },
  moeda: {
    origem: 'Banco Central',
    nome: 'Base monetária e meios de pagamento (Banco Central)',
    detalhe: 'base monetária (série 1788) e M1 a M4 (27791, 27810, 27813 e 27815); antes de dez/2001, as séries antigas 1824 e 1837',
    url: SGS,
  },
  pib: {
    origem: 'Banco Central',
    nome: 'PIB nominal (Banco Central)',
    detalhe: 'acumulado em 12 meses, série 4382 do SGS',
    url: SGS,
  },
  dolar: {
    origem: 'Banco Central',
    nome: 'Dólar PTAX (Banco Central)',
    detalhe: 'cotação do fim do mês (série 3696) e média do mês (3698)',
    url: SGS,
  },
  salarioEImoveis: {
    origem: 'Banco Central',
    nome: 'Salário mínimo e imóveis (Banco Central)',
    detalhe: 'séries 1619 e 21340 do SGS; a de imóveis é o índice IVG-R',
    url: SGS,
  },
  ibovespa: {
    origem: 'B3',
    nome: 'Ibovespa (B3)',
    detalhe: 'fechamento de cada dia desde 1994, com os dividendos reinvestidos',
    url: 'https://www.b3.com.br/pt_br/market-data-e-indices/indices/indices-amplos/indice-ibovespa-ibovespa-estatisticas-historicas.htm',
  },
  ouro: {
    origem: 'Banco Mundial',
    nome: 'Ouro (Banco Mundial)',
    detalhe: 'média do mês em Londres, em dólares por onça, da planilha de preços de commodities (Pink Sheet)',
    url: 'https://www.worldbank.org/en/research/commodity-markets',
  },
  bitcoin: {
    origem: 'Blockchain.com',
    nome: 'Bitcoin (Blockchain.com)',
    detalhe: 'preço de cada dia em dólares, média das principais corretoras',
    url: 'https://www.blockchain.com/explorer/charts/market-price',
  },
  tesouro: {
    origem: 'Tesouro Nacional',
    nome: 'Tesouro IPCA+ (Tesouro Nacional)',
    detalhe: 'taxa de compra de cada título do Tesouro Direto, dia a dia',
    url: 'https://www.tesourotransparente.gov.br/ckan/dataset/taxas-dos-titulos-ofertados-pelo-tesouro-direto',
  },
  dinheiroDosEua: {
    origem: 'Federal Reserve',
    nome: 'Dinheiro nos Estados Unidos (Federal Reserve)',
    detalhe: 'M1, M2, base monetária e papel-moeda em circulação, da publicação H.6',
    url: 'https://www.federalreserve.gov/releases/h6/current/default.htm',
  },
  tips: {
    origem: 'Federal Reserve',
    nome: 'Título americano indexado à inflação (Federal Reserve)',
    detalhe: 'taxa do título de dez anos (TIPS), da publicação H.15',
    url: 'https://www.federalreserve.gov/releases/h15/',
  },
  sp500: {
    origem: 'Robert Shiller',
    nome: 'S&P 500 (base aberta de Robert Shiller)',
    detalhe: 'preço médio de cada mês e dividendos; os dividendos param em jun/2023',
    url: 'https://github.com/datasets/s-and-p-500',
  },
  jurosPorPais: {
    origem: 'BIS',
    nome: 'Juro básico de cada país (BIS)',
    detalhe: 'a taxa de cada banco central, mês a mês',
    url: 'https://data.bis.org/topics/CBPOL',
  },
  precosPorPais: {
    origem: 'BIS',
    nome: 'Preços ao consumidor de cada país (BIS)',
    detalhe: 'o índice de inflação de cada país, mês a mês',
    url: 'https://data.bis.org/topics/CPI',
  },
  depositoNoBce: {
    origem: 'Banco Central Europeu',
    nome: 'Taxa de depósito (Banco Central Europeu)',
    detalhe: 'o que o banco paga pelos depósitos dos bancos, série FM.D.U2.EUR.4F.KR.DFR.LEV',
    url: 'https://data.ecb.europa.eu/data/datasets/FM/FM.D.U2.EUR.4F.KR.DFR.LEV',
  },
  pibDoBancoMundial: {
    origem: 'Banco Mundial',
    nome: 'PIB do Brasil (Banco Mundial)',
    detalhe: 'em dólares correntes e em reais descontada a inflação, total e por pessoa',
    url: 'https://data.worldbank.org/indicator/NY.GDP.MKTP.CD?locations=BR',
  },
  populacao: {
    origem: 'Banco Mundial',
    nome: 'População (Banco Mundial)',
    detalhe: 'filhos por mulher, população por idade e idosos por pessoa em idade de trabalhar, com as projeções da ONU até 2050',
    url: 'https://databank.worldbank.org/source/population-estimates-and-projections',
  },
  nascimentos: {
    origem: 'IBGE',
    nome: 'Registro Civil (IBGE)',
    detalhe: 'nascidos vivos registrados em cartório por ano, tabela 2609 do SIDRA',
    url: 'https://sidra.ibge.gov.br/tabela/2609',
  },
  projecaoDoIbge: {
    origem: 'IBGE',
    nome: 'Projeções da População (IBGE)',
    detalhe: 'revisão de 2024, com a população de cada ano até 2070',
    url: 'https://www.ibge.gov.br/estatisticas/sociais/populacao/9109-projecao-da-populacao.html',
  },
} satisfies Record<string, Fonte>

export const ANALISE = {
  contas: {
    nome: 'Notebook 1: as contas do texto',
    detalhe: 'número por número, os que batem e os que não batem',
    url: `${REPOSITORIO}/notebooks/01_as_contas_do_texto.ipynb`,
  },
  regua: {
    nome: 'Notebook 2: a régua',
    detalhe: 'o que é o M2, de onde vem o crescimento dele e a Selic por quatro réguas',
    url: `${REPOSITORIO}/notebooks/02_a_regua.ipynb`,
  },
  juroReal: {
    nome: 'Notebook 3: o juro real',
    detalhe: 'ano a ano, em 12 meses, em janelas longas e o juro contratado',
    url: `${REPOSITORIO}/notebooks/03_juro_real.ipynb`,
  },
  mundo: {
    nome: 'Notebook 4: no mundo',
    detalhe: 'o juro real país a país e os números dos Estados Unidos',
    url: `${REPOSITORIO}/notebooks/04_no_mundo.ipynb`,
  },
  depois: {
    nome: 'Notebook 5: bolsa, ouro e depois do texto',
    detalhe: 'a bolsa e o ouro desde 2008, as quedas e o que aconteceu desde a publicação',
    url: `${REPOSITORIO}/notebooks/05_depois_do_texto.ipynb`,
  },
  demografia: {
    nome: 'Notebook 6: aposentadoria e demografia',
    detalhe: 'quem guardou todo mês, os números de população e o PIB de 2010 e de 2022',
    url: `${REPOSITORIO}/notebooks/06_aposentadoria_e_demografia.ipynb`,
  },
  citados: {
    nome: 'Os números citados no texto',
    detalhe: 'transcritos um a um, com o trecho de onde cada um saiu',
    url: `${REPOSITORIO}/dados/manuais/afirmacoes.csv`,
  },
  contasEmPython: {
    nome: 'As contas, em Python',
    detalhe: 'as funções que os notebooks usam',
    url: `${REPOSITORIO}/analise/analise.py`,
  },
  contasDaPagina: {
    nome: 'As contas, em TypeScript',
    detalhe: 'a mesma lógica, usada nesta página',
    url: `${REPOSITORIO}/pagina/contas.ts`,
  },
  comparacao: {
    nome: 'O teste das duas contas',
    detalhe: 'compara, caso a caso, a conta desta página com a do Python',
    url: `${REPOSITORIO}/testes/contas.test.ts`,
  },
  tratamento: {
    nome: 'O tratamento dos dados',
    detalhe: 'como as séries de cada fonte viram as tabelas da análise',
    url: `${REPOSITORIO}/analise/tratamento.py`,
  },
  metodologia: {
    nome: 'Metodologia',
    detalhe: 'todas as contas, as escolhas e as limitações',
    url: `${REPOSITORIO}/METODOLOGIA.md`,
  },
} satisfies Record<string, Link>
