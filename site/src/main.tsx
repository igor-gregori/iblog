import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Uma família só, em todo o artigo: uma serifa feita para leitura longa, com o eixo de tamanho óptico
// (o desenho se ajusta do título às notas) e algarismos de largura fixa para as tabelas.
import '@fontsource-variable/literata/opsz.css'
import '@fontsource-variable/literata/opsz-italic.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
