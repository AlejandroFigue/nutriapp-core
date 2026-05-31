import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// SW gestionado manualmente en public/sw.js y registrado vía workbox-window.
// vite-plugin-pwa se puede reincorporar si se necesita generateSW en el futuro.
export default defineConfig({
  base: '/nutriapp-core/',
  resolve: {
    alias: { '@': '/src' },
  },
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
