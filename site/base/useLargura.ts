import { useLayoutEffect, useState, type RefObject } from 'react'

/** A largura do elemento, atualizada quando ele muda de tamanho. */
export function useLargura(elemento: RefObject<HTMLElement | null>): number {
  const [largura, setLargura] = useState(0)

  useLayoutEffect(() => {
    const alvo = elemento.current
    if (!alvo) return
    // O observador já avisa o tamanho inicial assim que começa a observar.
    const observador = new ResizeObserver(([entrada]) => setLargura(entrada.contentRect.width))
    observador.observe(alvo)
    return () => observador.disconnect()
  }, [elemento])

  return largura
}
