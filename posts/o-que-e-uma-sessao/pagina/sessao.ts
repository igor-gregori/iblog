// A conta de uma sessão, com e sem cache. Repete `analise/sessao.py`; os testes comparam os dois.

import { MILHAO, type Preco } from '#base/precos.ts'

export interface Sessao {
  /** Instruções e ferramentas, iguais em toda chamada. */
  comeco: number
  chamadas: number
  /** Tokens que entram no histórico antes de cada chamada (o pedido, o resultado de uma ferramenta). */
  novos: number
  /** Tokens que o modelo escreve em cada chamada, e que ficam no histórico. */
  saida: number
  /** A chamada (a partir de 1) que encontra o cache vazio, depois de uma pausa longa. */
  pausa: number | null
}

export interface Chamada {
  /** Tudo o que a chamada manda ao modelo. */
  entrada: number
  lidos: number
  gravados: number
  saida: number
}

/** Uma chamada da sessão real, como está em `dados/manuais/sessao-real.csv`. */
export interface ChamadaReal {
  chamada: number
  /** Minutos desde a primeira chamada. */
  minuto: number
  modelo: string
  /** Entrada fora do cache. */
  entrada: number
  gravados_5m: number
  gravados_1h: number
  lidos: number
  saida: number
  /** A conversa foi resumida logo antes desta chamada. */
  compactou: boolean
}

/** Os tokens de cada chamada da sessão, em ordem. */
export function chamadas(sessao: Sessao, comCache = true): Chamada[] {
  const resultado: Chamada[] = []
  let anterior = 0
  for (let n = 1; n <= sessao.chamadas; n++) {
    const entrada = sessao.comeco + (n - 1) * (sessao.novos + sessao.saida) + sessao.novos
    let lidos = 0
    let gravados = 0
    if (comCache) {
      if (n === 1 || n === sessao.pausa) gravados = entrada
      else [lidos, gravados] = [anterior, entrada - anterior]
    }
    resultado.push({ entrada, lidos, gravados, saida: sessao.saida })
    anterior = entrada
  }
  return resultado
}

/** Dólares: o que foi lido pelo preço do cache, o gravado pelo preço da gravação e o resto pela entrada normal. */
export function custoDaChamada(preco: Preco, chamada: Chamada): number {
  const foraDoCache = chamada.entrada - chamada.lidos - chamada.gravados
  return (
    (chamada.lidos * preco.entrada_cache + chamada.gravados * preco.gravacao_cache + foraDoCache * preco.entrada + chamada.saida * preco.saida) /
    MILHAO
  )
}

/** O custo da sessão até cada chamada, em dólares. */
export function custoAcumulado(preco: Preco, sessao: Sessao, comCache = true): number[] {
  let total = 0
  return chamadas(sessao, comCache).map((chamada) => (total += custoDaChamada(preco, chamada)))
}

/** Tudo o que uma chamada da sessão real mandou ao modelo. */
export function contexto(chamada: ChamadaReal): number {
  return chamada.entrada + chamada.gravados_5m + chamada.gravados_1h + chamada.lidos
}

/** O custo de uma chamada da sessão real: como a API cobrou ou, sem o cache, tudo pelo preço normal de entrada. */
export function custoReal(preco: Preco, chamada: ChamadaReal, comCache = true): number {
  if (!comCache) return (contexto(chamada) * preco.entrada + chamada.saida * preco.saida) / MILHAO
  if (preco.gravacao_cache_longa === null) throw new Error(`${preco.modelo} não tem o prazo longo de cache que a sessão real usou`)
  return (
    (chamada.entrada * preco.entrada +
      chamada.gravados_5m * preco.gravacao_cache +
      chamada.gravados_1h * preco.gravacao_cache_longa +
      chamada.lidos * preco.entrada_cache +
      chamada.saida * preco.saida) /
    MILHAO
  )
}

/** A mesma sessão se o cache durasse só `prazo` minutos: depois de cada pausa maior, grava de novo tudo o que leria. */
export function comPrazoCurto(sessao: ChamadaReal[], prazo: number): ChamadaReal[] {
  return sessao.map((chamada, i) => {
    let gravados = chamada.gravados_5m + chamada.gravados_1h
    let lidos = chamada.lidos
    if (i > 0 && chamada.minuto - sessao[i - 1].minuto > prazo) [gravados, lidos] = [gravados + lidos, 0]
    return { ...chamada, gravados_5m: gravados, gravados_1h: 0, lidos }
  })
}

/** A chamada que encontra o cache vazio quando o leitor liga a pausa no simulador: a do meio da sessão. */
export function chamadaDaPausa(total: number): number {
  return Math.floor(total / 2) + 1
}

/** Soma uma lista de números. */
export function soma(valores: number[]): number {
  return valores.reduce((total, valor) => total + valor, 0)
}
