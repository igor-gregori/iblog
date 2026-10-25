// Quanto custa uma pergunta com todos os documentos no pedido e com só os pedaços que a busca trouxe. Repete
// `analise/conta.py`; os testes conferem os dois lados.
import { custoComFaixas, type Preco } from '#base/precos.ts'

/** Os tokens que vão em toda pergunta além dos documentos: as instruções e a própria pergunta. */
export const EXTRA = 500
/** Uma resposta curta. */
export const SAIDA = 500

/** Quantas perguntas a figura soma. */
export const PERGUNTAS_NA_CONTA = 1_000

export interface CustoDaPergunta {
  /** Nulos quando os documentos não cabem na janela do modelo. */
  tudoSemCache: number | null
  tudoComCache: number | null
  rag: number
  extra: number
  saida: number
}

/** O custo de uma pergunta com `documentos` tokens no pedido (lidos do cache ou não) e com `pedacos` tokens. */
export function custoDaPergunta(preco: Preco, documentos: number, pedacos: number): CustoDaPergunta {
  const entrada = documentos + EXTRA
  const cabe = entrada + SAIDA <= preco.janela
  return {
    tudoSemCache: cabe ? custoComFaixas(preco, entrada, SAIDA, 0) : null,
    tudoComCache: cabe ? custoComFaixas(preco, entrada, SAIDA, documentos / entrada) : null,
    rag: custoComFaixas(preco, pedacos + EXTRA, SAIDA, 0),
    extra: EXTRA,
    saida: SAIDA,
  }
}
