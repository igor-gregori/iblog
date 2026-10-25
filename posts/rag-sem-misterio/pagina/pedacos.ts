// A divisão dos documentos em pedaços. Repete `analise/pedacos.py`; os testes conferem os dois lados.

export interface Pedaco {
  arquivo: string
  titulos: string[]
  texto: string
  tokens: number
}

const TITULO = /^(#{1,6})\s+(.*)$/
const ITEM = /^(\s*)([-*]|\d+\.)\s/
const SEPARADOR_DE_TABELA = /^\|[\s|:-]+\|$/
const FIM_DE_FRASE = /(?<=[.!?])\s+/

/** O texto em que a busca procura: o lugar do pedaço e o pedaço. */
export function busca(pedaco: Pedaco): string {
  return [pedaco.arquivo, ...pedaco.titulos].join(' › ') + '\n' + pedaco.texto
}

/** Os blocos de um documento em Markdown (parágrafo, item de lista, linha de tabela, código), com os títulos acima. */
export function blocos(texto: string): [titulos: string[], bloco: string][] {
  const resultado: [string[], string][] = []
  const titulos: string[] = []
  const atual: string[] = []
  let emCodigo = false
  const fechar = () => {
    if (atual.length) resultado.push([[...titulos], atual.join('\n')])
    atual.length = 0
  }

  for (const linha of texto.split('\n')) {
    if (linha.startsWith('```')) {
      if (!emCodigo) fechar()
      atual.push(linha)
      emCodigo = !emCodigo
      if (!emCodigo) fechar()
      continue
    }
    if (emCodigo) {
      atual.push(linha)
      continue
    }
    const titulo = TITULO.exec(linha)
    if (titulo) {
      fechar()
      const nivel = titulo[1].length
      titulos.length = Math.min(titulos.length, nivel - 1)
      while (titulos.length < nivel - 1) titulos.push('')
      titulos.push(titulo[2].trim())
      continue
    }
    if (!linha.trim()) {
      fechar()
      continue
    }
    if (SEPARADOR_DE_TABELA.test(linha)) continue
    const item = ITEM.exec(linha)
    if (linha.startsWith('|') || (item && !item[1])) fechar()
    atual.push(linha)
    if (linha.startsWith('|')) fechar()
  }
  fechar()
  return resultado.map(([ts, bloco]) => [ts.filter(Boolean), bloco])
}

/** Os pedaços de um documento, com no máximo `maximo` tokens cada um (uma frase maior fica inteira). */
export function dividir(arquivo: string, texto: string, maximo: number, contar: (texto: string) => number): Pedaco[] {
  const pedacos: Pedaco[] = []
  let atual: string[] = []
  let tokens = 0
  let lugar: string[] = []
  const fechar = () => {
    if (atual.length) pedacos.push({ arquivo, titulos: lugar, texto: atual.join('\n'), tokens })
    atual = []
    tokens = 0
  }

  for (const [titulos, bloco] of blocos(texto)) {
    if (titulos.join('\0') !== lugar.join('\0')) {
      fechar()
      lugar = titulos
    }
    const tamanho = contar(bloco)
    const partes = tamanho <= maximo ? [[bloco, tamanho] as const] : bloco.split(FIM_DE_FRASE).map((f) => [f, contar(f)] as const)
    for (const [parte, n] of partes) {
      if (atual.length && tokens + n > maximo) fechar()
      atual.push(parte)
      tokens += n
    }
  }
  fechar()
  return pedacos
}
