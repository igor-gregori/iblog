import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Uma família só, a Literata, com tamanho óptico: é o que o design Folha Azul usa em tudo.
import '@fontsource-variable/literata/opsz.css'
import '@fontsource-variable/literata/opsz-italic.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
