import { numero } from '#base/formato.ts'

/** As marcas do eixo de dólares, todas com as mesmas casas, que dependem do maior valor do gráfico; o zero é "0". */
export function tiqueDolares(maximo: number) {
  const casas = maximo >= 10 ? 0 : maximo >= 0.1 ? 2 : 3
  return (valor: number) => (valor === 0 ? '0' : `US$ ${numero(valor, casas)}`)
}

/** 558624 → "559 mil"; 2420000 → "2,42 milhões" */
export function tokens(valor: number) {
  if (valor >= 1e6) return `${numero(valor / 1e6, 2)} milhões`
  if (valor >= 1e4) return `${numero(valor / 1e3)} mil`
  return numero(valor)
}
