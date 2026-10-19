/** Um link do quadro "Fontes e método": um conjunto de dados, uma documentação ou um arquivo da análise. */
export interface Link {
  nome: string
  /** O que esse link mostra, em poucas palavras. */
  detalhe: string
  url: string
}
