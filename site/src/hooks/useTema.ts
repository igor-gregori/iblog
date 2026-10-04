import { useCallback, useEffect } from 'react'
import { useArmazenamentoLocal } from './useArmazenamentoLocal.ts'

export type Tema = 'sistema' | 'claro' | 'escuro'

const ORDEM: Tema[] = ['sistema', 'claro', 'escuro']

export const NOMES_DOS_TEMAS: Record<Tema, string> = {
  sistema: 'Sistema',
  claro: 'Claro',
  escuro: 'Escuro',
}

// A mesma chave é lida pelo script em index.html, para aplicar o tema antes do React carregar.
export function useTema() {
  const [tema, setTema] = useArmazenamentoLocal<Tema>('comprar-ou-alugar:tema', 'sistema')

  useEffect(() => {
    const preferencia = matchMedia('(prefers-color-scheme: dark)')
    const aplicar = () => {
      const escuro = tema === 'sistema' ? preferencia.matches : tema === 'escuro'
      document.documentElement.dataset.theme = escuro ? 'dark' : 'light'
    }
    aplicar()
    preferencia.addEventListener('change', aplicar)
    return () => preferencia.removeEventListener('change', aplicar)
  }, [tema])

  const alternar = useCallback(() => {
    setTema((atual) => ORDEM[(ORDEM.indexOf(atual) + 1) % ORDEM.length])
  }, [setTema])

  return { tema, alternar }
}
