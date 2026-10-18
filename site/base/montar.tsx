import { StrictMode, type ComponentType } from 'react'
import { createRoot } from 'react-dom/client'

/** Põe a página de um post na tela. O CSS do post (com os designs e as fontes) entra pelo `main.tsx` dele. */
export function montar(Pagina: ComponentType) {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Pagina />
    </StrictMode>,
  )
}
