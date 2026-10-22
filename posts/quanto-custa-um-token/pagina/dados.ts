import type { Preco } from '#base/precos.ts'
import urlDosDados from './dados.json?url'

export interface Amostra {
  id: 'texto-pt' | 'texto-en' | 'codigo' | 'json-indentado' | 'json-compacto'
  nome: string
  texto: string
  caracteres: number
  tokens: number
}

/** O conteúdo de `dados.json`, gerado por `analise/exportar_site.py`. */
export interface Dados {
  codificacao: string
  /** Dia em que os preços foram conferidos nas páginas dos fornecedores (AAAA-MM-DD). */
  precos_consultados_em: string
  amostras: Amostra[]
  precos: Preco[]
}

export { urlDosDados }

/** A cor de cada fornecedor nos gráficos: sempre a mesma, das séries do design. */
export const CORES: Record<string, string> = {
  Anthropic: 'var(--serie-1)',
  OpenAI: 'var(--serie-2)',
  Google: 'var(--serie-3)',
}

export function amostra(dados: Dados, id: Amostra['id']): Amostra {
  return dados.amostras.find((a) => a.id === id)!
}
