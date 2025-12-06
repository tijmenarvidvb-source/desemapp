import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// URL moet matchen met je GitHub Repo naam: /desemapp/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  base: '/desemapp/', 
})