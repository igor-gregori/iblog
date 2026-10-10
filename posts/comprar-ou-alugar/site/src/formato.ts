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

/** 0.065 → "6,5%" */
export function pct(valor: number, casas = 0, sinal = false): string {
  const texto = `${numero(valor * 100, casas)}%`
  return sinal && valor > 0 ? `+${texto}` : texto
}

/** 789308 → "R$ 789.308" */
export function reais(valor: number): string {
  return `R$ ${numero(valor)}`
}

/** 1234567 → "R$ 1,23 mi"; 789308 → "R$ 789 mil" */
export function reaisCurto(valor: number): string {
  const absoluto = Math.abs(valor)
  if (absoluto >= 1e6) return `R$ ${numero(valor / 1e6, 2)} mi`
  if (absoluto >= 1e4) return `R$ ${numero(valor / 1e3)} mil`
  return reais(valor)
}

/** 293000 → "+R$ 293 mil"; −141000 → "−R$ 141 mil" */
export function reaisComSinal(valor: number): string {
  const sinal = valor > 0 ? '+' : valor < 0 ? '−' : ''
  return `${sinal}${reaisCurto(Math.abs(valor))}`
}

/** "2026-08" → "ago/2026" */
export function mesAno(mes: string): string {
  const [ano, m] = mes.split('-')
  return `${MESES[Number(m) - 1]}/${ano}`
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
