import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Caminhos relativos: a página funciona na raiz de um domínio ou dentro de uma pasta do blog.
  base: './',
  plugins: [react()],
})
