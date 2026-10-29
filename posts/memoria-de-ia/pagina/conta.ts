// O custo da memória: na sessão real e na calculadora. Repete `analise/conta.py`; `npm test` compara os dois.

import { MILHAO, type Preco } from '#base/precos.ts'

/** Uma chamada da sessão real (`analise/sessao.py`): o uso exato da API e quanto do pedido era memória. */
export interface Pedido {
  chamada: number
  /** AAAA-MM-DD, no fuso de Brasília. */
  dia: string
  contexto: number
  fora: number
  lidos: number
  gravados: number
  gravados_longos: number
  saida: number
  memoria: number
  /** A parte da memória que era a versão mais nova de cada arquivo; o resto eram cópias antigas. */
  memoria_atual: number
  copias: number
  memoria_lida: number
}

/** O preço da gravação no prazo longo, onde existe; senão, o do prazo padrão. */
function gravacaoLonga(preco: Preco): number {
  return preco.gravacao_cache_longa ?? preco.gravacao_cache
}

/** O preço médio da gravação no cache, pesando os tokens gravados em cada prazo. */
export function precoDaGravacao(preco: Preco, curtos: number, longos: number): number {
  if (!(curtos + longos)) return preco.entrada
  return (curtos * preco.gravacao_cache + longos * gravacaoLonga(preco)) / (curtos + longos)
}

/** O custo de uma chamada da sessão real, com a leitura e a gravação no cache. */
export function custoDoPedido(preco: Preco, pedido: Pedido): number {
  return (
    (pedido.fora * preco.entrada +
      pedido.lidos * preco.entrada_cache +
      pedido.gravados * preco.gravacao_cache +
      pedido.gravados_longos * gravacaoLonga(preco) +
      pedido.saida * preco.saida) /
    MILHAO
  )
}

/** A parte do custo da chamada que foi dos CLAUDE.md: a lida do cache e a gravada, pelo preço médio da gravação. */
export function custoDaMemoria(preco: Preco, pedido: Pedido): number {
  const gravada = pedido.memoria - pedido.memoria_lida
  const gravacao = precoDaGravacao(preco, pedido.gravados, pedido.gravados_longos)
  return (pedido.memoria_lida * preco.entrada_cache + gravada * gravacao) / MILHAO
}

/** Quanto uma memória de `tokens` custa num mês de `dias` de trabalho, gravada `gravacoes` vezes por dia. */
export function custoMensal(preco: Preco, tokens: number, chamadas: number, gravacoes: number, dias: number): number {
  const vezes = Math.min(gravacoes, chamadas)
  const gravacao = precoDaGravacao(preco, 0, 1)
  return (dias * tokens * (vezes * gravacao + (chamadas - vezes) * preco.entrada_cache)) / MILHAO
}

/** O mesmo mês sem cache: a memória paga o preço cheio da entrada em todo pedido. */
export function custoMensalSemCache(preco: Preco, tokens: number, chamadas: number, dias: number): number {
  return (dias * tokens * chamadas * preco.entrada) / MILHAO
}
