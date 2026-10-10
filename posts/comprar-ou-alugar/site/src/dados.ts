import { useEffect, useState } from 'react'

/** Séries mensais: uma data ("2026-08") por posição e uma lista de valores por série. */
export interface Tabela {
  datas: string[]
  series: Record<string, (number | null)[]>
}

export interface CidadeHoje {
  preco_m2: number
  aluguel_m2: number
  area_m2: number
  mes: string
  /** Só em Varginha: o tamanho da amostra de anúncios. */
  anuncios?: number
}

export interface Taxas {
  juros_financiamento_aa: number
  juros_financiamento_mercado_aa: number
  juros_financiamento_regulado_aa: number
  tesouro_ipca_aa: number
  fii_rendimento_aa: number
  fii_real_aa: number
  cdi_real_aa: number
  inflacao_12m: number
}

/** O conteúdo de `public/data/dados.json`, gerado por `src/comprar_ou_alugar/exportar_site.py`. */
export interface Dados {
  hoje: Record<string, CidadeHoje>
  taxas: Taxas
  precos: Tabela & { nominal_brasil: (number | null)[] }
  /** Rendimento mensal distribuído pelos FIIs, sobre o valor patrimonial (série "FIIs"). */
  rendimento_fiis: Tabela
  ativos: Tabela
}

export const CIDADES = ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte'] as const

/** Cada cidade e cada ativo tem sempre a mesma cor, em todos os gráficos. */
export const CORES: Record<string, string> = {
  'São Paulo': 'var(--serie-1)',
  'Rio de Janeiro': 'var(--serie-2)',
  'Belo Horizonte': 'var(--serie-3)',
  'Imóvel em São Paulo': 'var(--serie-1)',
  'FIIs (IFIX)': 'var(--serie-2)',
  FIIs: 'var(--serie-2)',
  CDI: 'var(--serie-3)',
  Brasil: 'var(--contexto)',
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
