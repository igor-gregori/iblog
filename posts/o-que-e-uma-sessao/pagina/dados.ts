import type { Preco } from '#base/precos.ts'
import urlDosDados from './dados.json?url'
import type { ChamadaReal, Sessao } from './sessao.ts'

/** O conteúdo de `dados.json`, gerado por `analise/exportar_site.py`. */
export interface Dados {
  /** Dia em que os preços foram conferidos nas páginas dos fornecedores (AAAA-MM-DD). */
  precos_consultados_em: string
  precos: Preco[]
  /** A sessão simulada que a página mostra antes de o leitor mexer. */
  sessao_padrao: Sessao
  sessao_real: {
    /** O modelo que a sessão usou. */
    modelo: string
    /** O prazo de cache, em minutos, com que a sessão real é comparada. */
    prazo_curto: number
    chamadas: ChamadaReal[]
  }
}

export { urlDosDados }

/** A cor de cada fornecedor: a mesma do post sobre tokens. */
export const CORES: Record<string, string> = {
  Anthropic: 'var(--serie-1)',
  OpenAI: 'var(--serie-2)',
  Google: 'var(--serie-3)',
}

export function preco(dados: Dados, modelo: string): Preco {
  return dados.precos.find((p) => p.modelo === modelo)!
}
