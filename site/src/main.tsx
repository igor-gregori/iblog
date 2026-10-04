import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Archivo para o texto (com o eixo de largura, que alarga os títulos) e JetBrains Mono para rótulos e dados,
// como as cotas de uma planta baixa.
import '@fontsource-variable/archivo/wdth.css'
import '@fontsource-variable/jetbrains-mono'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
