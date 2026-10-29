import type { Preco } from '#base/precos.ts'
import type { Pedido } from './conta.ts'
import urlDosDados from './dados.json?url'

/** Uma vez em que um CLAUDE.md entrou num pedido da sessão real (`analise/sessao.py`). */
export interface Carga {
  chamada: number
  /** O caminho dentro do projeto. */
  arquivo: string
  motivo: 'inicio' | 'retomada' | 'pasta' | 'compactacao'
  /** Tokens do o200k_base. */
  texto: number
  /** Tokens do Claude, estimados pelo fator da calibração. */
  tokens: number
  posicao: number
}

/** Tokens do Claude por token do o200k_base, na sessão real. */
export interface Calibracao {
  fator: number
  constante: number
  r2: number
  trechos: number
}

/** Os CLAUDE.md do blog no último commit de cada dia em que algum mudou (`analise/historico.py`). */
export interface Dia {
  data: string
  commit: string
  raiz_linhas: number
  /** Tokens do o200k_base. */
  raiz_texto: number
  posts: number
  posts_texto: number
}

/** O que a memória automática do Claude Code guardou na máquina do Igor (`analise/automatica.py`). */
export interface Automatica {
  conferido_em: string
  projetos: number
  com_pasta: number
  com_memorias: number
  memorias: number
  por_tipo: Record<string, number>
  /** Bytes. */
  memoria_mediana: number
  indice_mediano: number
  indice_maior: number
  /** Memórias nas pastas deste blog. */
  deste_blog: number
}

/** O conteúdo de `dados.json`, gerado por `analise/exportar_site.py`. */
export interface Dados {
  precos_consultados_em: string
  documentacao_conferida_em: string
  precos: Preco[]
  modelo_da_sessao: string
  cargas: Carga[]
  pedidos: Pedido[]
  calibracao: Calibracao
  historico: Dia[]
  automatica: Automatica
}

export { urlDosDados }
export type { Pedido }

/** A cor de cada fornecedor: a mesma dos posts anteriores. */
export const CORES: Record<string, string> = {
  Anthropic: 'var(--serie-1)',
  OpenAI: 'var(--serie-2)',
  Google: 'var(--serie-3)',
}

export function preco(dados: Dados, modelo: string): Preco {
  return dados.precos.find((p) => p.modelo === modelo)!
}

/** Tokens do o200k_base → tokens do Claude, pelo fator da sessão real. */
export function emTokensDoClaude(dados: Dados, texto: number): number {
  return Math.round(dados.calibracao.fator * texto)
}
