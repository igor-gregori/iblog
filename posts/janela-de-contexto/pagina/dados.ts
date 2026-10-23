import { tokens } from '#base/formato.ts'
import type { Preco } from '#base/precos.ts'
import urlDosDados from './dados.json?url'

export type Categoria = 'instrucoes' | 'modelo' | 'comandos' | 'imagens' | 'outros'

/** Do que era feito o pedido de uma chamada da sessão real, em tokens. */
export type Composicao = { chamada: number; contexto: number } & Record<Categoria, number>

/** A calibração da contagem e os números gerais da sessão real (`analise/composicao.py`). */
export interface Calibracao {
  /** Tokens do Claude por token do o200k_base, no texto desta sessão. */
  fator: number
  constante: number
  r2: number
  trechos: number
  saida_total: number
  /** A parte da saída que é texto e pedido de ferramenta, estimada; o resto é raciocínio. */
  saida_visivel: number
  imagens: number
  comandos: number
  compactacao_gatilho: string
  compactacao_antes: number
  compactacao_resumo: number
}

/** O conteúdo de `dados.json`, gerado por `analise/exportar_site.py`. */
export interface Dados {
  /** Dia em que a janela e os preços da faixa longa foram conferidos (AAAA-MM-DD). */
  precos_consultados_em: string
  precos: Preco[]
  modelo_da_sessao: string
  composicao: Composicao[]
  calibracao: Calibracao
}

export { urlDosDados }

/** As categorias, na ordem em que se empilham, com o nome e a cor. */
export const CATEGORIAS: { id: Categoria; nome: string; cor: string }[] = [
  { id: 'instrucoes', nome: 'Instruções, ferramentas e CLAUDE.md', cor: 'var(--serie-1)' },
  { id: 'modelo', nome: 'Respostas do modelo, com o raciocínio', cor: 'var(--serie-2)' },
  { id: 'comandos', nome: 'Saídas de comandos', cor: 'var(--serie-3)' },
  { id: 'imagens', nome: 'Capturas de tela', cor: 'var(--serie-4)' },
  { id: 'outros', nome: 'Mensagens do Igor e o resto', cor: 'var(--suave)' },
]

/** Os tokens de saída de cada chamada na calculadora: uma resposta curta de agente. */
export const SAIDA = 1_000

/** A cor de cada fornecedor: a mesma dos posts anteriores. */
export const CORES: Record<string, string> = {
  Anthropic: 'var(--serie-1)',
  OpenAI: 'var(--serie-2)',
  Google: 'var(--serie-3)',
}

export function preco(dados: Dados, modelo: string): Preco {
  return dados.precos.find((p) => p.modelo === modelo)!
}

/** A janela por extenso, sem casas quando é redonda: 1000000 → "1 milhão"; 1048576 → "1,05 milhão" */
export function janelaPorExtenso(valor: number): string {
  return valor % 1e6 === 0 ? `${valor / 1e6} ${valor < 2e6 ? 'milhão' : 'milhões'}` : tokens(valor)
}
