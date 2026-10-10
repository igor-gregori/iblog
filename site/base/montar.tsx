import { StrictMode, type ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
// As duas famílias do design Papel: a Bricolage Grotesque no texto e nos títulos, a JetBrains Mono nos rótulos.
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/jetbrains-mono'

/** Põe a página de um post na tela. O CSS do post entra pelo `main.tsx` dele. */
export function montar(Pagina: ComponentType) {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Pagina />
    </StrictMode>,
  )
}
