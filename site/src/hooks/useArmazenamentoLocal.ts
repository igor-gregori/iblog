import { useEffect, useState } from 'react'

export function useArmazenamentoLocal<T>(chave: string, inicial: T) {
  const [valor, setValor] = useState<T>(() => {
    try {
      const bruto = localStorage.getItem(chave)
      return bruto === null ? inicial : (JSON.parse(bruto) as T)
    } catch {
      return inicial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(chave, JSON.stringify(valor))
    } catch {
      // Armazenamento indisponível (ex.: aba anônima); segue só em memória.
    }
  }, [chave, valor])

  return [valor, setValor] as const
}
