/**
 * A pergunta da página em cima do simulador: dinheiro na mão, compra à vista ou aluguel
 * pago com a renda dos fundos. Repete `compra_a_vista` e `fundos_a_taxas_fixas` de
 * `src/comprar_ou_alugar/cenarios.py`.
 */

import type { CidadeHoje, Taxas } from './dados.ts'
import { PADRAO, simular, type Cenario, type Parametros } from './simulador.ts'

/** O valor que a página usa como exemplo. */
export const DISPONIVEL = 500_000
/** A cidade dos exemplos do texto. */
export const CIDADE_DO_EXEMPLO = 'Varginha'
/** O rendimento da pergunta: 1% ao mês. */
export const UM_POR_CENTO = 0.01
/** Inflação usada nas projeções. */
export const INFLACAO = 0.045

/** Uma carteira de fundos descrita como o investidor a vê. Taxas em fração. */
export interface Fundos {
  rendimentoMes: number
  /** Variação do preço da cota por ano, sem descontar a inflação. */
  cotaAa: number
}

/** Aluguel de um ano dividido pelo preço do imóvel. */
export function rentabilidadeDoAluguel(cidade: CidadeHoje): number {
  return (cidade.aluguel_m2 * 12) / cidade.preco_m2
}

/** O maior imóvel que `disponivel` paga à vista, já contando os custos da compra. */
export function compraAVista(cidade: CidadeHoje, disponivel: number, ajustes: Partial<Parametros> = {}): Parametros {
  const custos = ajustes.custos_compra_pct ?? PADRAO.custos_compra_pct
  const valor = disponivel / (1 + custos)
  return {
    ...PADRAO,
    juros_aa: 0,
    valor_imovel: valor,
    aluguel_mensal: (valor * rentabilidadeDoAluguel(cidade)) / 12,
    entrada_pct: 1,
    ...ajustes,
  }
}

/** Taxas fixas: a carteira paga `rendimentoMes` e a cota varia `cotaAa`; o imóvel e o aluguel sobem
 * `valorizacaoRealAa` acima da inflação. */
export function fundosATaxasFixas(meses: number, fundos: Fundos, inflacaoAa = INFLACAO, valorizacaoRealAa = 0): Cenario {
  const rendimentoAa = (1 + fundos.rendimentoMes) ** 12 - 1
  const imovelAa = (1 + valorizacaoRealAa) * (1 + inflacaoAa) - 1
  return {
    meses,
    valorizacao_aa: imovelAa,
    reajuste_aluguel_aa: imovelAa,
    carteira_retorno_aa: (1 + rendimentoAa) * (1 + fundos.cotaAa) - 1,
    carteira_rendimento_aa: rendimentoAa,
    inflacao_aa: inflacaoAa,
  }
}

/** Retorno total da carteira por ano, já descontada a inflação. */
export function retornoReal(fundos: Fundos, inflacaoAa = INFLACAO): number {
  return ((1 + fundos.rendimentoMes) ** 12 * (1 + fundos.cotaAa)) / (1 + inflacaoAa) - 1
}

/** Rendimento médio que os FIIs distribuíram por mês nos últimos 12 meses. */
export function rendimentoMedioDoMercado(taxas: Taxas): number {
  return taxas.fii_rendimento_aa / 12
}

/** Os FIIs como foram desde 2011: o rendimento médio de hoje e a variação da cota que,
 * somada a ele, dá o retorno real que o IFIX entregou no período. */
export function fundosDoPassado(taxas: Taxas, inflacaoAa = INFLACAO): Fundos {
  const rendimentoMes = rendimentoMedioDoMercado(taxas)
  return {
    rendimentoMes,
    cotaAa: ((1 + taxas.fii_real_aa) * (1 + inflacaoAa)) / (1 + rendimentoMes) ** 12 - 1,
  }
}

/** Patrimônio de quem aluga menos o de quem compra, em reais de hoje, ao fim de `anos`. */
export function vantagemEmReais(p: Parametros, fundos: Fundos, anos: number, inflacaoAa = INFLACAO, valorizacaoRealAa = 0): number {
  const r = simular(p, fundosATaxasFixas(anos * 12, fundos, inflacaoAa, valorizacaoRealAa))
  const fim = anos * 12
  return (r.patrimonio_inquilino[fim] - r.patrimonio_comprador[fim]) / r.deflator[fim]
}

/** O rendimento mensal que empata as duas escolhas em `anos`, com a cota variando `cotaAa`. */
export function rendimentoDoEmpate(p: Parametros, anos: number, cotaAa: number, inflacaoAa = INFLACAO, valorizacaoRealAa = 0): number {
  let abaixo = 0
  let acima = 0.05
  for (let passo = 0; passo < 40; passo++) {
    const meio = (abaixo + acima) / 2
    const vantagem = vantagemEmReais(p, { rendimentoMes: meio, cotaAa }, anos, inflacaoAa, valorizacaoRealAa)
    if (vantagem > 0) acima = meio
    else abaixo = meio
  }
  return (abaixo + acima) / 2
}
