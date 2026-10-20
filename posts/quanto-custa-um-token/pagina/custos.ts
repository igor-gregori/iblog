// Quanto custa um pedido a um modelo. Repete `custo` de `analise/custos.py`; os testes comparam os dois.

export interface Preco {
  fornecedor: string
  modelo: string
  nome: string
  /** Dólares por milhão de tokens de entrada fora do cache. */
  entrada: number
  /** Dólares por milhão de tokens de entrada que já estavam no cache. */
  entrada_cache: number
  /** Dólares por milhão de tokens de saída, raciocínio incluído. */
  saida: number
  observacao: string
  fonte: string
}

const MILHAO = 1_000_000

/** O custo em dólares de um pedido; `fracaoEmCache` é a parte da entrada (de 0 a 1) que já estava no cache. */
export function custo(preco: Preco, entrada: number, saida: number, fracaoEmCache = 0): number {
  const emCache = entrada * fracaoEmCache
  const foraDoCache = entrada - emCache
  return (foraDoCache * preco.entrada + emCache * preco.entrada_cache + saida * preco.saida) / MILHAO
}
