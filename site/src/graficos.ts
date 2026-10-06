import type { TabelaDeDados } from './components/Figura.tsx'
import type { Tabela } from './contas.ts'
import { instante, mesAno, mesAnoDoInstante } from './formato.ts'

/** As propriedades do eixo horizontal de um gráfico mensal: uma marca a cada `passo` anos. */
export function eixoDoTempo(datas: string[], passo = 2) {
  const primeiroAno = Number(datas[0].slice(0, 4))
  const ultimoAno = Number(datas[datas.length - 1].slice(0, 4))
  const anos = Array.from({ length: ultimoAno - primeiroAno + 2 }, (_, i) => primeiroAno + i).filter((ano) => ano % passo === 0)
  return {
    x: datas.map(instante),
    formatoX: mesAnoDoInstante,
    tiquesX: anos.map((ano) => Date.UTC(ano, 0, 1)),
    formatoTiqueX: (ms: number) => String(new Date(ms).getUTCFullYear()),
  }
}

/** As propriedades do eixo horizontal de um gráfico anual. */
export function eixoDosAnos(anos: number[], passo = 10) {
  return {
    x: anos,
    formatoX: (ano: number) => String(ano),
    tiquesX: anos.filter((ano) => ano % passo === 0),
    formatoTiqueX: (ano: number) => String(ano),
  }
}

/** A tabela recortada a partir de um mês. */
export function desde(tabela: Tabela, mes: string): Tabela {
  const primeira = Math.max(tabela.datas.indexOf(mes), 0)
  return {
    datas: tabela.datas.slice(primeira),
    series: Object.fromEntries(Object.entries(tabela.series).map(([nome, valores]) => [nome, valores.slice(primeira)])),
  }
}

/** Uma linha por ano, com o primeiro mês disponível de cada ano. `colunas`: série → título da coluna. */
export function tabelaAnual(tabela: Tabela, colunas: Record<string, string>, formato: (valor: number) => string, cabecalho = 'Mês'): TabelaDeDados {
  const linhas: string[][] = []
  let anoAnterior = ''
  tabela.datas.forEach((data, i) => {
    const ano = data.slice(0, 4)
    if (ano === anoAnterior) return
    anoAnterior = ano
    linhas.push([
      mesAno(data),
      ...Object.keys(colunas).map((serie) => {
        const valor = tabela.series[serie][i]
        return valor === null ? '–' : formato(valor)
      }),
    ])
  })
  return { colunas: [cabecalho, ...Object.values(colunas)], linhas }
}
