import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  resolve: {
    alias: { '@': '/src' },
  },

  plugins: [
    react(),

    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      injectRegister: 'auto',

      // public/manifest.json es gestionado manualmente
      manifest: false,

      includeAssets: [
        'favicon.ico',
        'favicon.svg',
        'apple-touch-icon.png',
        'icons/*.png',
      ],

      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: '/index.html',
      },
    }),
  ],
})
