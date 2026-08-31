import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Explícito, aunque ya sea el default de Vite: el bundle de producción se
    // sirve público y un .map reconstruye el código fuente completo.
    sourcemap: false,
  },
})
