// Os preços públicos de API dos modelos que os posts da série de IA comparam, e o custo de um pedido. Repete
// `comum/precos.py`; os testes dos posts comparam os dois.

export interface Preco {
  fornecedor: string
  modelo: string
  nome: string
  /** Dólares por milhão de tokens de entrada fora do cache. */
  entrada: number
  /** Dólares por milhão de tokens de entrada que já estavam no cache. */
  entrada_cache: number
  /** Dólares por milhão de tokens gravados no cache, no prazo padrão; igual à entrada onde a gravação não é cobrada. */
  gravacao_cache: number
  /** Minutos que o cache dura no prazo padrão; nulo onde o fornecedor não informa. */
  prazo_cache: number | null
  /** Dólares por milhão de tokens gravados no prazo longo opcional, onde existe. */
  gravacao_cache_longa: number | null
  prazo_cache_longo: number | null
  /** Dólares por milhão de tokens de saída, raciocínio incluído. */
  saida: number
  observacao: string
  fonte: string
}

export const MILHAO = 1_000_000

/** O custo em dólares de um pedido; `fracaoEmCache` é a parte da entrada (de 0 a 1) que já estava no cache. */
export function custo(preco: Preco, entrada: number, saida: number, fracaoEmCache = 0): number {
  const emCache = entrada * fracaoEmCache
  const foraDoCache = entrada - emCache
  return (foraDoCache * preco.entrada + emCache * preco.entrada_cache + saida * preco.saida) / MILHAO
}
