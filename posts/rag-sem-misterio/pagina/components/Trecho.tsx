import { numero } from '#base/formato.ts'
import type { Pedaco } from '../pedacos.ts'

interface Props {
  pedaco: Pedaco
  /** O que vai à direita do cabeçalho: a nota da busca, por exemplo. */
  nota?: string
  /** O pedaço tem o trecho que responde a pergunta. */
  certo?: boolean
  /** Corta o texto neste número de caracteres. */
  corte?: number
  /** Só o arquivo e o último título no cabeçalho, para colunas estreitas. */
  curto?: boolean
}

/**
 * O texto para ler na tela: os documentos quebram as linhas a cada 120 caracteres, e aqui as linhas de um mesmo
 * parágrafo ou item voltam a ser uma. Ficam as quebras antes de um item de lista, de uma linha de tabela e de código.
 * As marcas de negrito e de código do Markdown saem.
 */
function legivel(texto: string) {
  return texto
    .replace(/\n(?!\s*(?:[-*]|\d+\.)\s|\||```)\s*/g, ' ')
    .replace(/\*\*|(?<!`)`(?!`)/g, '')
}

/** Um pedaço de documento: de onde ele é, quantos tokens tem e o texto. */
export function Trecho({ pedaco, nota, certo, corte, curto }: Props) {
  const inteiro = legivel(pedaco.texto)
  // O primeiro título é o do documento, que o nome do arquivo já diz.
  const subtitulos = pedaco.titulos.slice(1)
  const texto = corte && inteiro.length > corte ? inteiro.slice(0, corte).trimEnd() + '…' : inteiro
  return (
    <div className={`trecho${certo ? ' trecho-certo' : ''}`}>
      <p className="trecho-lugar">
        <span>{[pedaco.arquivo, ...(curto ? subtitulos.slice(-1) : subtitulos)].join(' › ')}</span>
        <span>{nota ?? `${numero(pedaco.tokens)} tokens`}</span>
      </p>
      <p className="trecho-texto">{texto}</p>
      {certo && <p className="trecho-selo">✓ tem a resposta</p>}
    </div>
  )
}
