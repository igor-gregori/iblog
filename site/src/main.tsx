import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Uma família só, em todo o artigo. Ela tem algarismos de largura fixa para as tabelas.
import '@fontsource-variable/instrument-sans'
import '@fontsource-variable/instrument-sans/wght-italic.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
