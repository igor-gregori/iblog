import { useEffect, useState } from 'react'
import type { Tabela } from './contas.ts'

/** Um número citado no texto analisado e o mesmo número refeito com os dados das fontes. */
export interface Afirmacao {
  grupo: string
  pais: string
  inicio: string
  fim: string
  serie: string
  citada: number
  calculada: number
}

export interface PeriodoDosEua {
  inicio: string
  fim: string
  sp500: number
  sp500_total: number
  ouro: number
  cpi: number
  m1: number
  m2: number
}

export interface ComparacaoEntrePaises {
  anos: number[]
  series: Record<string, (number | null)[]>
}

/** O conteúdo de `public/data/dados.json`, gerado por `src/juro_negativo/exportar_site.py`. */
export interface Dados {
  /** Último mês com todos os dados do Brasil ("2026-08"). */
  ate: string
  texto: { url: string; publicado_em: string }
  /** Nível de cada série no fim de cada mês: é daqui que a página refaz as contas de qualquer período. */
  niveis: Tabela
  afirmacoes: Afirmacao[]
  /** Selic de 12 meses descontada de cada régua. */
  juro_real: Tabela
  /** Selic acima de cada régua, ao ano, em janelas de 5 e de 10 anos, pelo mês em que a janela começa. */
  janelas: Record<string, Tabela>
  moeda: Tabela
  juro_contratado: Tabela
  paises: {
    anos: number[]
    paises: string[]
    juro_real: Record<string, (number | null)[]>
    negativos: Record<string, Record<string, number | null>>
  }
  eua: {
    ate: string
    dinheiro: Tabela
    periodos: PeriodoDosEua[]
    tips_meses_negativos: number
    tips_minimo: { mes: string; taxa: number }
  }
  poupar: Record<string, Tabela>
  demografia: {
    fecundidade: ComparacaoEntrePaises
    dependencia_idosos: ComparacaoEntrePaises
    populacao: { anos: number[]; valores: number[] }
    nascimentos: { anos: number[]; valores: number[] }
    piramide: { faixas: string[]; anos: Record<string, { homens: number[]; mulheres: number[] }> }
    economia: { anos: number[]; pib_dolares: number[]; pib_real: number[]; pib_real_por_pessoa: number[] }
  }
}

export const NOMES: Record<string, string> = {
  selic: 'Selic',
  cdi: 'CDI',
  ibovespa: 'Ibovespa',
  ouro: 'Ouro',
  dolar: 'Dólar',
  bitcoin: 'Bitcoin',
  ipca: 'Preços (IPCA)',
  pib: 'PIB nominal',
  base_monetaria: 'Base monetária',
  m1: 'M1',
  m2: 'M2',
  m3: 'M3',
  m4: 'M4',
  salario_minimo: 'Salário mínimo',
  imoveis: 'Imóveis',
  sp500: 'S&P 500',
}

export const ATIVOS = ['selic', 'ibovespa', 'ouro', 'dolar', 'bitcoin']
export const REGUAS = ['ipca', 'pib', 'base_monetaria', 'm1', 'm2', 'm3', 'm4']

/**
 * Só cinco séries têm cor, sempre a mesma em todos os gráficos: a Selic, as duas réguas em disputa
 * e os outros dois investimentos do texto. O resto aparece em grafite (destaque) ou cinza (contexto).
 */
const CORES: Record<string, string> = {
  selic: 'var(--serie-selic)',
  m2: 'var(--serie-m2)',
  ipca: 'var(--serie-ipca)',
  ouro: 'var(--serie-ouro)',
  ibovespa: 'var(--serie-ibovespa)',
}
export const GRAFITE = 'var(--grafite)'
export const CONTEXTO = 'var(--contexto)'

export function cor(serie: string): string {
  return CORES[serie] ?? CONTEXTO
}

export function useDados(): { dados: Dados | null; erro: string | null } {
  const [dados, setDados] = useState<Dados | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/dados.json`)
      .then((resposta) => {
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`)
        return resposta.json() as Promise<Dados>
      })
      .then(setDados)
      .catch((falha: Error) => setErro(falha.message))
  }, [])

  return { dados, erro }
}

/** O último valor preenchido de uma série. */
export function ultimo(valores: (number | null)[]): number {
  for (let i = valores.length - 1; i >= 0; i--) {
    const valor = valores[i]
    if (valor !== null) return valor
  }
  throw new Error('série vazia')
}

/** O valor da série em um mês ("2007-12"). */
export function noMes(tabela: Tabela, serie: string, mes: string): number {
  const valor = tabela.series[serie][tabela.datas.indexOf(mes)]
  if (valor === null || valor === undefined) throw new Error(`sem ${serie} em ${mes}`)
  return valor
}
