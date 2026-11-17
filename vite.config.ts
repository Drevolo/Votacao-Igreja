import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Em produção no GitHub Pages, o VITE_BASE_PATH é preenchido pelo workflow
// com o nome do repositório (ex.: /Votacao-Igreja/).
const base = process.env.VITE_BASE_PATH || '/'

export default defineConfig({
  base,
  plugins: [react()],
})
