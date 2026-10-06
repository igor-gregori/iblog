const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

const formatadores = new Map<number, Intl.NumberFormat>()

/** 12345.6 → "12.345,6" */
export function numero(valor: number, casas = 0): string {
  let formatador = formatadores.get(casas)
  if (!formatador) {
    formatador = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
    formatadores.set(casas, formatador)
  }
  // O sinal de menos tipográfico tem a largura dos dígitos e não quebra a linha.
  return formatador.format(valor).replace('-', '−')
}

/** 0.065 → "6,5%"; com `sinal`, 0.065 → "+6,5%" */
export function pct(valor: number, casas = 0, sinal = false): string {
  const texto = `${numero(valor * 100, casas)}%`
  return sinal && valor > 0 ? `+${texto}` : texto
}

/** Variações grandes ficam sem casas decimais; as pequenas ganham uma. 4.968 → "497%"; 0.048 → "4,8%" */
export function variacao(valor: number, sinal = false): string {
  return pct(valor, Math.abs(valor) < 0.0995 ? 1 : 0, sinal)
}

const POR_EXTENSO = ['nenhuma', 'uma', 'duas', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez']

/** 5 → "cinco vezes"; 1 → "uma vez"; 12 → "12 vezes" */
export function vezes(quantas: number): string {
  return `${POR_EXTENSO[quantas] ?? numero(quantas)} ${quantas === 1 ? 'vez' : 'vezes'}`
}

/** "2026-08" → "ago/2026" */
export function mesAno(mes: string): string {
  const [ano, m] = mes.split('-')
  return `${MESES[Number(m) - 1]}/${ano}`
}

/** "2026-08" → "agosto de 2026" */
export function mesAnoPorExtenso(mes: string): string {
  const nomes = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
  const [ano, m] = mes.split('-')
  return `${nomes[Number(m) - 1]} de ${ano}`
}

/** "2026-08" → posição no eixo do tempo (milissegundos). */
export function instante(mes: string): number {
  const [ano, m] = mes.split('-')
  return Date.UTC(Number(ano), Number(m) - 1, 1)
}

/** Posição no eixo do tempo → "ago/2026" */
export function mesAnoDoInstante(ms: number): string {
  const data = new Date(ms)
  return `${MESES[data.getUTCMonth()]}/${data.getUTCFullYear()}`
}

/** 213421000 → "213 milhões"; 2421079 → "2,42 milhões" */
export function milhoes(valor: number, casas = 0): string {
  return `${numero(valor / 1e6, casas)} milhões`
}
