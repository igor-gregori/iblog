// A contagem de tokens no navegador: o mesmo tokenizador (o200k_base) que a análise em Python usa com o
// `tiktoken`, aqui pelo `gpt-tokenizer`. Os testes conferem que os dois dão o mesmo resultado.
// O vocabulário pesa uns 2 MB: a página carrega este arquivo à parte, depois do texto.
import { decode, encode } from 'gpt-tokenizer/encoding/o200k_base'

/** Quantos tokens o texto tem. */
export function contar(texto: string): number {
  return encode(texto).length
}

/** Um pedaço do texto e quantos tokens ele ocupa. */
export type Pedaco = [texto: string, tokens: number]

/**
 * O texto quebrado nos pedaços que viram tokens. Juntos, voltam a ser o texto.
 * Os bytes de cada token são decodificados em sequência: o `decode` do `gpt-tokenizer` guarda o caractere partido
 * entre dois tokens (um emoji, por exemplo) até o token em que ele termina. Um token que não completa nenhum
 * caractere se junta ao seguinte. Repete `pedacos` de `analise/tokens.py`.
 */
export function pedacos(texto: string): Pedaco[] {
  const resultado: Pedaco[] = []
  let quantos = 0
  for (const token of encode(texto)) {
    quantos++
    const pedaco = decode([token])
    if (pedaco) {
      resultado.push([pedaco, quantos])
      quantos = 0
    }
  }
  return resultado
}
