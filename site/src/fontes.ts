/**
 * De onde vêm os números do artigo. Cada pergunta cita as fontes dos dados e os arquivos
 * do repositório em que a análise está feita.
 */

export interface Link {
  nome: string
  /** O que esse link mostra, em poucas palavras. */
  detalhe: string
  url: string
}

/** Os arquivos da análise apontam para o ramo principal do repositório. */
const REPOSITORIO = 'https://github.com/igor-gregori/comprar-ou-alugar/blob/main'

export const FONTES = {
  anuncios: {
    nome: 'Anúncios de Varginha',
    detalhe: 'apartamentos à venda e para alugar, coletados em out/2026',
    url: `${REPOSITORIO}/data/manual/varginha_anuncios.csv`,
  },
  fipezap: {
    nome: 'Índice FipeZAP (Fipe)',
    detalhe: 'preço de venda e de aluguel do m² em 56 cidades, desde 2008',
    url: 'https://www.fipe.org.br/pt-br/indices/fipezap/',
  },
  cvm: {
    nome: 'Informe mensal dos FIIs (CVM)',
    detalhe: 'quanto cada fundo imobiliário distribuiu em cada mês',
    url: 'https://dados.cvm.gov.br/dataset/fii-doc-inf_mensal',
  },
  ifix: {
    nome: 'IFIX (B3)',
    detalhe: 'índice dos fundos imobiliários, com os rendimentos reinvestidos',
    url: 'https://www.b3.com.br/pt_br/market-data-e-indices/indices/indices-de-segmentos-e-setoriais/indice-de-fundos-de-investimentos-imobiliarios-ifix.htm',
  },
  ipca: {
    nome: 'IPCA (IBGE)',
    detalhe: 'inflação oficial, tabela 1737 do SIDRA',
    url: 'https://sidra.ibge.gov.br/tabela/1737',
  },
  cdi: {
    nome: 'CDI (Banco Central)',
    detalhe: 'série 4391 do Sistema Gerenciador de Séries Temporais',
    url: 'https://www3.bcb.gov.br/sgspub/',
  },
  isencao: {
    nome: 'Lei 11.033/2004, art. 3º',
    detalhe: 'isenção de imposto de renda dos rendimentos de FII para pessoa física',
    url: 'https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2004/lei/l11033.htm',
  },
} satisfies Record<string, Link>

export const ANALISE = {
  varginha: { nome: 'Notebook 5: Varginha', detalhe: 'a amostra de anúncios e a margem de erro', url: `${REPOSITORIO}/notebooks/05_varginha.ipynb` },
  precos: { nome: 'Notebook 1: preços', detalhe: 'o preço do m² descontada a inflação', url: `${REPOSITORIO}/notebooks/01_precos.ipynb` },
  fundos: {
    nome: 'Notebook 3: imóvel, fundos e renda fixa',
    detalhe: 'retorno e risco desde 2011',
    url: `${REPOSITORIO}/notebooks/03_imovel_fii_renda_fixa.ipynb`,
  },
  aVista: { nome: 'Notebook 6: R$ 500 mil à vista', detalhe: 'a conta deste artigo, em Python', url: `${REPOSITORIO}/notebooks/06_a_vista.ipynb` },
  simulador: { nome: 'O simulador', detalhe: 'as regras da conta mês a mês', url: `${REPOSITORIO}/src/comprar_ou_alugar/simulador.py` },
  rendimento: {
    nome: 'O cálculo do rendimento médio',
    detalhe: 'filtros e média ponderada dos informes da CVM',
    url: `${REPOSITORIO}/src/comprar_ou_alugar/tratamento.py`,
  },
  metodologia: { nome: 'Metodologia', detalhe: 'todas as premissas e limitações', url: `${REPOSITORIO}/METODOLOGIA.md` },
} satisfies Record<string, Link>
