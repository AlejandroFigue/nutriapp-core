import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// SW gestionado manualmente en public/sw.js y registrado vía workbox-window.
// vite-plugin-pwa se puede reincorporar si se necesita generateSW en el futuro.
export default defineConfig({
  resolve: {
    alias: { '@': '/src' },
  },
  plugins: [react()],
})
