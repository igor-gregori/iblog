import type { Preco } from '#base/precos.ts'
import urlDosDados from './dados.json?url'

export type IdDaTarefa = 'p-paginacao' | 'm-cupom' | 'g-devolucao'
export type IdDaVariante = 'A' | 'B' | 'C'
export type TipoDeRegra = 'silencio' | 'escolha' | 'contrato'

export interface Tarefa {
  id: IdDaTarefa
  nome: string
  tamanho: string
  pedido: string
  palavras_pedido: number
  palavras_spec: number
  testes_obvios: number
  testes_regras: number
  linhas_referencia: number
}

/** Uma tarefa num jeito de pedir: médias das três repetições (`analise/exportar_site.py`). */
export interface Resumo {
  tarefa: IdDaTarefa
  variante: IdDaVariante
  execucoes: number
  prontas_na_entrega: number
  prontas_no_fim: number
  /** Fração dos testes escondidos que passou na primeira entrega. */
  obvios_na_entrega: number
  regras_na_entrega: number
  correcoes: number[]
  custo: number
  custo_minimo: number
  custo_maximo: number
  custo_entrega: number
  custo_correcoes: number
  minutos: number
  minutos_entrega: number
  respostas: number
}

/** Um teste do grupo "regras", com o tipo de decisão e quantas vezes falhou na entrega, por jeito de pedir. */
export interface Regra {
  tarefa: IdDaTarefa
  nome: string
  tipo: TipoDeRegra
  falhas: Record<IdDaVariante, number>
}

export interface Tipo {
  id: TipoDeRegra
  nome: string
  testes: number
  falhas_ab: number
  chances_ab: number
  falhas_c: number
}

export interface Dados {
  documentacao_conferida_em: string
  precos_consultados_em: string
  modelo: { id: string; nome: string }
  esforco: string
  preco: Preco
  periodo: { inicio: string; fim: string }
  total: { execucoes: number; custo: number; minutos: number }
  tarefas: Tarefa[]
  variantes: { id: IdDaVariante; nome: string }[]
  resumo: Resumo[]
  regras: Regra[]
  tipos: Tipo[]
  primeiro_lote: { tarefa: IdDaTarefa; variante: IdDaVariante; prontas_na_entrega: number; prontas_no_fim: number }[]
  isolamento: {
    versoes: string[]
    servidores_mcp: number
    respostas_de_subagentes: number
    estouros: number
    negacoes: number
    regressoes: number
  }
  trecho_da_spec: string
}

export { urlDosDados }

export function resumo(dados: Dados, tarefa: IdDaTarefa, variante: IdDaVariante): Resumo {
  const achado = dados.resumo.find((r) => r.tarefa === tarefa && r.variante === variante)
  if (!achado) throw new Error(`sem resumo para ${tarefa} ${variante}`)
  return achado
}

export function tipo(dados: Dados, id: TipoDeRegra): Tipo {
  return dados.tipos.find((t) => t.id === id)!
}
