import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { paginas } from './site/paginas.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), paginas()],
})
