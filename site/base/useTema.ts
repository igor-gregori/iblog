import { useCallback, useEffect } from 'react'
import { aplicarTema, CHAVE_DO_TEMA, proximoTema, type Tema } from './tema.ts'
import { useArmazenamentoLocal } from './useArmazenamentoLocal.ts'

export function useTema() {
  const [tema, setTema] = useArmazenamentoLocal<Tema>(CHAVE_DO_TEMA, 'sistema')

  useEffect(() => {
    const preferencia = matchMedia('(prefers-color-scheme: dark)')
    const aplicar = () => aplicarTema(tema)
    aplicar()
    preferencia.addEventListener('change', aplicar)
    return () => preferencia.removeEventListener('change', aplicar)
  }, [tema])

  const alternar = useCallback(() => setTema(proximoTema), [setTema])

  return { tema, alternar }
}
