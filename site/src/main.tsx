import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Serifa para a prosa (com o eixo de tamanho óptico, que afina os títulos grandes) e sem serifa para os dados.
import '@fontsource-variable/newsreader/opsz.css'
import '@fontsource-variable/newsreader/opsz-italic.css'
import '@fontsource-variable/libre-franklin'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
