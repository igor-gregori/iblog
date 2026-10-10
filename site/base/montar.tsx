import { StrictMode, type ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
// Uma família só, em todo o blog: a Literata, uma serifa feita para leitura longa, com o eixo de tamanho
// óptico (o desenho se ajusta do título às notas) e algarismos de largura fixa para as tabelas.
import '@fontsource-variable/literata/opsz.css'
import '@fontsource-variable/literata/opsz-italic.css'

/** Põe a página de um post na tela. O CSS do post entra pelo `main.tsx` dele. */
export function montar(Pagina: ComponentType) {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Pagina />
    </StrictMode>,
  )
}
