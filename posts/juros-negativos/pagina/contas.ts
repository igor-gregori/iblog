// As contas da página. A referência é `src/juros_negativos/analise.py`: o Python exporta
// perguntas e respostas (`test/casos_calculadora.json`) e os testes conferem os dois lados.
//
// Os níveis são os do fim de cada mês. Um período vai da abertura do mês de início à
// abertura do mês de fim, isto é, do fim do mês anterior ao início ao fim do mês anterior ao fim.

export interface Tabela {
  datas: string[]
  series: Record<string, (number | null)[]>
}

/** "2008-01", +1 → "2008-02"; "2008-01", -1 → "2007-12" */
export function somarMeses(mes: string, quantos: number): string {
  const [ano, m] = mes.split('-').map(Number)
  const total = ano * 12 + (m - 1) + quantos
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`
}

export function mesesEntre(inicio: string, fim: string): number {
  const [anoInicio, mesInicio] = inicio.split('-').map(Number)
  const [anoFim, mesFim] = fim.split('-').map(Number)
  return (anoFim - anoInicio) * 12 + mesFim - mesInicio
}

/** O nível da série na abertura do mês (o do fim do mês anterior), ou `null` se não há dado. */
export function nivelNaAbertura(niveis: Tabela, serie: string, mes: string): number | null {
  const posicao = niveis.datas.indexOf(somarMeses(mes, -1))
  return posicao < 0 ? null : niveis.series[serie][posicao]
}

/** Variação da série da abertura de `inicio` à abertura de `fim`. */
export function variacao(niveis: Tabela, serie: string, inicio: string, fim: string): number | null {
  const partida = nivelNaAbertura(niveis, serie, inicio)
  const chegada = nivelNaAbertura(niveis, serie, fim)
  return partida === null || chegada === null ? null : chegada / partida - 1
}

/** Quanto sobra de uma variação depois de descontada a régua: (1 + ativo) ÷ (1 + régua) − 1 */
export function descontar(variacaoTotal: number, regua: number): number {
  return (1 + variacaoTotal) / (1 + regua) - 1
}

/** Variação acumulada em `meses` → taxa anual equivalente. */
export function anualizar(variacaoTotal: number, meses: number): number {
  return (1 + variacaoTotal) ** (12 / meses) - 1
}

export interface Comparacao {
  meses: number
  variacaoDoAtivo: number
  variacaoDaRegua: number
  acimaDaRegua: number
  acimaDaReguaAoAno: number
}

/** O ativo contra a régua em um período, ou `null` se falta dado de um dos dois. */
export function comparar(niveis: Tabela, ativo: string, regua: string, inicio: string, fim: string): Comparacao | null {
  const variacaoDoAtivo = variacao(niveis, ativo, inicio, fim)
  const variacaoDaRegua = variacao(niveis, regua, inicio, fim)
  const meses = mesesEntre(inicio, fim)
  if (variacaoDoAtivo === null || variacaoDaRegua === null || meses <= 0) return null
  const acimaDaRegua = descontar(variacaoDoAtivo, variacaoDaRegua)
  return { meses, variacaoDoAtivo, variacaoDaRegua, acimaDaRegua, acimaDaReguaAoAno: anualizar(acimaDaRegua, meses) }
}

export interface Matriz {
  /** Anos de início (linhas) e de fim (colunas), sempre de janeiro a janeiro. */
  inicios: number[]
  fins: number[]
  /** `valores[i][j]`: quanto o ativo rendeu ao ano acima da régua de `inicios[i]` a `fins[j]`. */
  valores: (number | null)[][]
}

export function matrizDePeriodos(niveis: Tabela, ativo: string, regua: string): Matriz {
  const anos: number[] = []
  for (const data of niveis.datas) {
    if (!data.endsWith('-12')) continue
    const ano = Number(data.slice(0, 4)) + 1 // o fim de dezembro de 2007 é a abertura de 2008
    const mes = `${ano}-01`
    if (nivelNaAbertura(niveis, ativo, mes) !== null && nivelNaAbertura(niveis, regua, mes) !== null) anos.push(ano)
  }
  const inicios = anos.slice(0, -1)
  const fins = anos.slice(1)
  const valores = inicios.map((inicio) =>
    fins.map((fim) => (fim > inicio ? (comparar(niveis, ativo, regua, `${inicio}-01`, `${fim}-01`)?.acimaDaReguaAoAno ?? null) : null)),
  )
  return { inicios, fins, valores }
}

/**
 * Quantas vezes mais (ou menos) de cada coisa o dinheiro aplicado no ativo compra no fim do período.
 * Cada coisa é medida até o último mês em que tem dado.
 */
export function poderDeCompra(niveis: Tabela, ativo: string, coisas: string[], inicio: string, fim: string): Record<string, number | null> {
  const partidaDoAtivo = nivelNaAbertura(niveis, ativo, inicio)
  const resultado: Record<string, number | null> = {}
  for (const coisa of coisas) {
    const partida = nivelNaAbertura(niveis, coisa, inicio)
    let multiplo: number | null = null
    for (let mes = fim; partida !== null && partidaDoAtivo !== null && mesesEntre(inicio, mes) > 0; mes = somarMeses(mes, -1)) {
      const chegada = nivelNaAbertura(niveis, coisa, mes)
      const chegadaDoAtivo = nivelNaAbertura(niveis, ativo, mes)
      if (chegada !== null && chegadaDoAtivo !== null) {
        multiplo = chegadaDoAtivo / partidaDoAtivo / (chegada / partida)
        break
      }
    }
    resultado[coisa] = multiplo
  }
  return resultado
}

/** O ativo medido em unidades da régua, valendo 100 na abertura de `inicio`. Uma posição por mês, do início ao fim dos dados. */
export function indiceDescontado(niveis: Tabela, ativo: string, regua: string | null, inicio: string): { datas: string[]; valores: (number | null)[] } {
  const primeira = niveis.datas.indexOf(somarMeses(inicio, -1))
  const razao = (posicao: number) => {
    const valor = niveis.series[ativo][posicao]
    const divisor = regua === null ? 1 : niveis.series[regua][posicao]
    return valor === null || divisor === null ? null : valor / divisor
  }
  const partida = razao(primeira)
  const datas = niveis.datas.slice(primeira)
  return { datas, valores: datas.map((_, i) => (partida === null ? null : nulo(razao(primeira + i), (r) => (100 * r) / partida))) }
}

/**
 * Quanto a série está, em cada mês, abaixo do maior nível atingido desde a abertura de `inicio`:
 * zero no recorde, −0,5 quando vale metade do que já valeu. Uma posição por mês do período; `null` onde não há dado.
 */
export function distanciaDoPico(niveis: Tabela, serie: string, inicio: string, fim: string): { datas: string[]; valores: (number | null)[] } {
  const primeiro = somarMeses(inicio, -1)
  const ultimo = somarMeses(fim, -1)
  const datas: string[] = []
  const valores: (number | null)[] = []
  let recorde: number | null = null
  niveis.datas.forEach((data, posicao) => {
    if (data < primeiro || data > ultimo) return
    const nivel = niveis.series[serie][posicao]
    if (nivel !== null) recorde = recorde === null ? nivel : Math.max(recorde, nivel)
    datas.push(data)
    valores.push(nivel === null || recorde === null ? null : nivel / recorde - 1)
  })
  return { datas, valores }
}

export interface Queda {
  /** O mês do recorde e o mês do ponto mais baixo antes do recorde seguinte. */
  pico: string
  fundo: string
  /** Fração negativa: −0,5 é perder metade do valor. */
  queda: number
}

/**
 * Cada queda da série entre um recorde e o recorde seguinte (ou o fim do período), do pico ao fundo.
 * Só entram as quedas de pelo menos `minima`. Com níveis de fim de mês, o que cai e volta dentro do mês não aparece.
 */
export function quedas(niveis: Tabela, serie: string, inicio: string, fim: string, minima = 0): Queda[] {
  const { datas, valores } = distanciaDoPico(niveis, serie, inicio, fim)
  const encontradas: Queda[] = []
  // A queda em aberto: do último recorde ao ponto mais baixo desde então.
  let pico: string | null = null
  let fundo = ''
  let menor = 0
  const guardar = () => {
    if (pico !== null && menor < 0 && menor <= -minima) encontradas.push({ pico, fundo, queda: menor })
  }
  for (let i = 0; i < valores.length; i++) {
    const distancia = valores[i]
    if (distancia === null) continue
    if (distancia === 0) {
      // Um recorde fecha a queda anterior e abre o trecho seguinte.
      guardar()
      pico = datas[i]
      fundo = datas[i]
      menor = 0
    } else if (distancia < menor) {
      fundo = datas[i]
      menor = distancia
    }
  }
  guardar()
  return encontradas
}

/** A maior das quedas, ou `null` se a lista está vazia. */
export function maiorQueda(lista: Queda[]): Queda | null {
  return lista.reduce<Queda | null>((maior, queda) => (maior === null || queda.queda < maior.queda ? queda : maior), null)
}

function nulo<T, U>(valor: T | null, transformar: (valor: T) => U): U | null {
  return valor === null ? null : transformar(valor)
}
