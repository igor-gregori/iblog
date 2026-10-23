import { numero } from '#base/formato.ts'

/** As marcas do eixo de dólares, todas com as mesmas casas, que dependem do maior valor do gráfico; o zero é "0". */
export function tiqueDolares(maximo: number) {
  const casas = maximo >= 10 ? 0 : maximo >= 0.1 ? 2 : 3
  return (valor: number) => (valor === 0 ? '0' : `US$ ${numero(valor, casas)}`)
}
