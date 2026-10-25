import type { Preco } from '#base/precos.ts'
import type { Pedaco } from './pedacos.ts'
import urlDosDados from './dados.json?url'

export type Metodo = 'palavras' | 'significado' | 'hibrida'
export type Tipo = 'mesmas' | 'outras'

export interface Pergunta {
  id: string
  tipo: Tipo
  pergunta: string
  /** O arquivo em que está a resposta e o trecho que a contém: um pedaço acerta quando tem o trecho. */
  arquivo: string
  trecho: string
}

/** Os pedaços de um tamanho máximo, com o resultado das buscas. */
export interface Tamanho {
  tamanho: number
  pedacos: Pedaco[]
  /** Os 50 pedaços mais parecidos com cada pergunta pelos embeddings: [posição do pedaço, cosseno]. */
  significado: Record<string, [number, number][]>
  /** Em que lugar de cada busca apareceu o primeiro pedaço certo; nulo se não apareceu. */
  posicoes: Record<string, Record<Metodo, number | null>>
}

/** As buscas da sessão real (`analise/sessao.py`): só números. */
export interface Sessao {
  chamadas: number
  ferramentas: Record<string, number>
  comandos: number
  comandos_com_busca: number
}

/** O conteúdo de `dados.json`, gerado por `analise/exportar_site.py`. */
export interface Dados {
  precos_consultados_em: string
  modelo_de_embeddings: string
  limite_da_fusao: number
  /** O tamanho de pedaço que o texto usa como referência. */
  tamanho_padrao: number
  /** Quantos pedaços a busca põe no pedido, e quantos tokens eles somam em média (na busca híbrida). */
  pedacos_no_pedido: number
  tokens_da_busca: number
  documentos: { arquivo: string; tokens: number }[]
  perguntas: Pergunta[]
  tamanhos: Tamanho[]
  /** No tamanho padrão, a posição do primeiro pedaço certo quando a busca vê só o texto, sem o arquivo e os títulos. */
  sem_lugar: Record<string, Record<'palavras' | 'significado', number | null>>
  /** Os pedaços do tamanho padrão num plano, na ordem dos pedaços, e a parte das diferenças que o plano mostra. */
  mapa: { explicado: number; pontos: [number, number][] }
  precos: Preco[]
  sessao: Sessao
}

export { urlDosDados }

export const METODOS: { id: Metodo; nome: string; cor: string }[] = [
  { id: 'palavras', nome: 'Por palavras (BM25)', cor: 'var(--serie-1)' },
  { id: 'significado', nome: 'Por significado (embeddings)', cor: 'var(--serie-2)' },
  { id: 'hibrida', nome: 'Híbrida (as duas juntas)', cor: 'var(--serie-3)' },
]

export const TIPOS: { id: Tipo; nome: string }[] = [
  { id: 'mesmas', nome: 'Perguntas com as palavras do texto' },
  { id: 'outras', nome: 'Perguntas com outras palavras' },
]

export function tamanho(dados: Dados, maximo: number): Tamanho {
  return dados.tamanhos.find((t) => t.tamanho === maximo)!
}

/** Quantas perguntas (do tipo, ou todas) tiveram o pedaço certo entre os `k` primeiros da busca. */
export function acertos(dados: Dados, t: Tamanho, metodo: Metodo, k: number, tipo?: Tipo): number {
  return dados.perguntas.filter((p) => (!tipo || p.tipo === tipo) && (t.posicoes[p.id][metodo] ?? Infinity) <= k).length
}

/** Quantas perguntas a busca deixou de fora dos `k` primeiros (o erro feio). */
export function longe(dados: Dados, t: Tamanho, metodo: Metodo, k: number): number {
  return dados.perguntas.length - acertos(dados, t, metodo, k)
}

/** Os grupos de documentos do mapa dos vetores, com a cor de cada um. */
export const GRUPOS: { nome: string; cor: string; tem: (arquivo: string) => boolean }[] = [
  { nome: 'Regras e plano do blog', cor: 'var(--serie-1)', tem: (a) => !a.startsWith('posts/') },
  { nome: 'Post "Comprar ou alugar?"', cor: 'var(--serie-2)', tem: (a) => a.startsWith('posts/comprar-ou-alugar/') },
  { nome: 'Post "O juro é negativo?"', cor: 'var(--serie-4)', tem: (a) => a.startsWith('posts/juros-negativos/') },
  { nome: 'Posts da série de IA', cor: 'var(--serie-3)', tem: () => true },
]

export function grupo(arquivo: string) {
  return GRUPOS.find((g) => g.tem(arquivo))!
}
