import { comparar, distanciaDoPico, maiorQueda, quedas, somarMeses, type Comparacao, type Queda, type Tabela } from './contas.ts'
import type { Dados } from './dados.ts'

export const INICIO_DA_TESE = '2008-01' // "após 2008": da abertura de janeiro de 2008 em diante
const PRIMEIRA_JANELA_DE_12_MESES = '2008-12' // os primeiros 12 meses inteiros depois de jan/2008
const ANOS_DAS_JANELAS = 10
export const INICIO_DO_BITCOIN = '2011-01' // o primeiro ano inteiro com preço do bitcoin
const QUEDA_GRANDE = 0.5 // perder metade do valor

/** Os números que o texto da página cita. Saem todos dos dados, para continuarem certos quando as fontes forem atualizadas. */
export interface Numeros {
  /** Abertura do mês seguinte ao último dado: o fim de todos os períodos "até hoje". */
  fim: string
  desde2008: (ativo: string, regua: string) => Comparacao
  desdeOTexto: (ativo: string, regua: string) => Comparacao
  /** Selic de 12 meses contra a inflação, das janelas terminadas de dez/2008 em diante. */
  meses: number
  mesesNegativos: number
  episodio: { de: string; ate: string; pior: number; mesDoPior: string }
  fracaoNegativaPeloM2: number
  juroRealHoje: number
  selic12m: number
  ipca12m: number
  /** Fração das janelas de dez anos começadas desde 2008 em que a Selic rendeu mais que cada régua. */
  vitoriasDaSelic: Record<string, number>
  vitoriasDoIbovespaSobreOIpca: number
  janelasDesde2008: number
  /** Dos números citados no texto, quantos batem com os refeitos com até 5% de diferença. */
  citados: number
  citadosQueBatem: number
  m2SobrePib: { antes: number; hoje: number }
  baseSobrePib: { antes: number; hoje: number }
  m2QueRendeJuros: { antes: number; hoje: number }
  tesouroHoje: number
  tesouroMinimo: { taxa: number; mes: string }
  /** Ano a ano desde 2008, só os anos completos: quanto a Selic rendeu, quanto os preços subiram e o que sobrou. */
  anos: { ano: number; selic: number; ipca: number; real: number }[]
  /** As quedas do ouro e do bitcoin, em reais, do pico ao fundo, com níveis de fim de mês. */
  quedas: {
    /** As vezes em que o bitcoin perdeu pelo menos metade do valor desde 2011. */
    grandesDoBitcoin: Queda[]
    maiorDoBitcoinDesdeOTexto: Queda | null
    /** A maior queda do ouro desde 2008. */
    maiorDoOuro: Queda | null
    /** Quanto o bitcoin estava abaixo do recorde no fim do mês anterior à publicação do texto. */
    bitcoinNaVesperaDoTexto: number
    /** O bitcoin contra a inflação para quem comprou no último pico antes do texto. */
    desdeOPicoAnteriorAoTexto: (Comparacao & { pico: string }) | null
  }
}

export const TOLERANCIA_DAS_CONTAS = 0.05

/** A distância entre o número citado e o refeito, como fração do valor final (26,48 vezes contra 28,2 vezes é 6%). */
export function erroRelativo(citada: number, calculada: number): number {
  return (1 + calculada) / (1 + citada) - 1
}

export function calcular(dados: Dados): Numeros {
  const { niveis, juro_real: juroReal, moeda, juro_contratado: contratado } = dados
  const fim = somarMeses(dados.ate, 1)
  const periodo = (inicio: string) => (ativo: string, regua: string) => {
    const comparacao = comparar(niveis, ativo, regua, inicio, fim)
    if (!comparacao) throw new Error(`sem dados de ${ativo} ou ${regua} desde ${inicio}`)
    return comparacao
  }

  const primeira = juroReal.datas.indexOf(PRIMEIRA_JANELA_DE_12_MESES)
  const datas = juroReal.datas.slice(primeira)
  const peloIpca = juroReal.series.ipca.slice(primeira) as number[]
  const peloM2 = juroReal.series.m2.slice(primeira) as number[]
  const negativos = datas.filter((_, i) => peloIpca[i] < 0)
  const pior = Math.min(...peloIpca)
  const ultimaSelic = comparar(niveis, 'selic', 'ipca', somarMeses(fim, -12), fim)

  const janelas = dados.janelas[String(ANOS_DAS_JANELAS)]
  const desde = janelas.datas.indexOf(INICIO_DA_TESE)
  const vitorias = (valores: (number | null)[]) => {
    const validos = valores.slice(desde).filter((valor) => valor !== null)
    return validos.filter((valor) => valor > 0).length / validos.length
  }

  const taxas = contratado.series.brasil
  const minimo = Math.min(...taxas.filter((taxa) => taxa !== null))
  const emMoeda = (serie: string, mes: string) => moeda.series[serie][moeda.datas.indexOf(mes)] as number
  const vespera = somarMeses(INICIO_DA_TESE, -1)

  const anos: Numeros['anos'] = []
  for (let ano = Number(INICIO_DA_TESE.slice(0, 4)); ; ano++) {
    const noAno = comparar(niveis, 'selic', 'ipca', `${ano}-01`, `${ano + 1}-01`)
    if (!noAno) break // o ano ainda não terminou
    anos.push({ ano, selic: noAno.variacaoDoAtivo, ipca: noAno.variacaoDaRegua, real: noAno.acimaDaRegua })
  }

  const texto = dados.texto.publicado_em
  const grandesDoBitcoin = quedas(niveis, 'bitcoin', INICIO_DO_BITCOIN, fim, QUEDA_GRANDE)
  const distanciaDoBitcoin = distanciaDoPico(niveis, 'bitcoin', INICIO_DO_BITCOIN, fim)
  const picoAnterior = grandesDoBitcoin.findLast((queda) => queda.pico < texto)?.pico
  // Quem comprou no fim do mês do pico: o período começa na abertura do mês seguinte.
  const desdeOPico = picoAnterior ? comparar(niveis, 'bitcoin', 'ipca', somarMeses(picoAnterior, 1), fim) : null

  return {
    fim,
    desde2008: periodo(INICIO_DA_TESE),
    desdeOTexto: periodo(dados.texto.publicado_em),
    meses: datas.length,
    mesesNegativos: negativos.length,
    episodio: { de: negativos[0], ate: negativos[negativos.length - 1], pior, mesDoPior: datas[peloIpca.indexOf(pior)] },
    fracaoNegativaPeloM2: peloM2.filter((valor) => valor < 0).length / peloM2.length,
    juroRealHoje: peloIpca[peloIpca.length - 1],
    selic12m: ultimaSelic!.variacaoDoAtivo,
    ipca12m: ultimaSelic!.variacaoDaRegua,
    vitoriasDaSelic: Object.fromEntries(Object.entries(janelas.series).map(([regua, valores]) => [regua, vitorias(valores)])),
    vitoriasDoIbovespaSobreOIpca: vitoriasEmJanelas(niveis, 'ibovespa', 'ipca', fim),
    janelasDesde2008: janelas.datas.length - desde,
    citados: dados.afirmacoes.length,
    citadosQueBatem: dados.afirmacoes.filter((a) => Math.abs(erroRelativo(a.citada, a.calculada)) <= TOLERANCIA_DAS_CONTAS).length,
    m2SobrePib: { antes: emMoeda('m2_pib', vespera), hoje: emMoeda('m2_pib', dados.ate) },
    baseSobrePib: { antes: emMoeda('base_pib', vespera), hoje: emMoeda('base_pib', dados.ate) },
    m2QueRendeJuros: { antes: emMoeda('remunerado', vespera), hoje: emMoeda('remunerado', dados.ate) },
    tesouroHoje: taxas.findLast((taxa) => taxa !== null) as number,
    tesouroMinimo: { taxa: minimo, mes: contratado.datas[taxas.indexOf(minimo)] },
    anos,
    quedas: {
      grandesDoBitcoin,
      maiorDoBitcoinDesdeOTexto: maiorQueda(quedas(niveis, 'bitcoin', texto, fim)),
      maiorDoOuro: maiorQueda(quedas(niveis, 'ouro', INICIO_DA_TESE, fim)),
      bitcoinNaVesperaDoTexto: distanciaDoBitcoin.valores[distanciaDoBitcoin.datas.indexOf(somarMeses(texto, -1))] ?? 0,
      desdeOPicoAnteriorAoTexto: picoAnterior && desdeOPico ? { ...desdeOPico, pico: picoAnterior } : null,
    },
  }
}

/** Saldo ÷ total guardado, hoje, de quem aplicou todo mês desde `inicio`, descontada a inflação. */
export function ultimoMultiplo(dados: Dados, inicio: string, ativo = 'selic'): number {
  const valores = dados.poupar[inicio].series[ativo]
  return valores[valores.length - 1] as number
}

/** Fração das janelas de dez anos, começadas em cada mês desde jan/2008, em que o ativo rendeu mais que a régua. */
function vitoriasEmJanelas(niveis: Tabela, ativo: string, regua: string, fim: string): number {
  let janelas = 0
  let vitorias = 0
  for (let inicio = INICIO_DA_TESE; somarMeses(inicio, ANOS_DAS_JANELAS * 12) <= fim; inicio = somarMeses(inicio, 1)) {
    const comparacao = comparar(niveis, ativo, regua, inicio, somarMeses(inicio, ANOS_DAS_JANELAS * 12))
    if (!comparacao) continue
    janelas++
    if (comparacao.acimaDaRegua > 0) vitorias++
  }
  return vitorias / janelas
}
