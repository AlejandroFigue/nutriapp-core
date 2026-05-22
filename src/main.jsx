import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { useNutricionStore } from '@/store/useNutricionStore'
import { useUIStore } from '@/store/useUIStore'
import './index.css'

// ─── TanStack Query ───────────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,         // 5 min: datos frescos sin refetch
      gcTime: 1000 * 60 * 60 * 24,      // 24 h: mantener en memoria aunque no esté montado
      retry: (failureCount) => navigator.onLine && failureCount < 2,
      networkMode: 'offlineFirst',       // ejecutar aunque no haya conexión
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
})

// ─── Service Worker ───────────────────────────────────────────────────────────
// Solo en producción: en dev el SW cachearía assets sin hash y rompería HMR.
// workbox-window mejora el ciclo de vida del SW con manejo de actualizaciones.

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  import('workbox-window').then(({ Workbox }) => {
    const wb = new Workbox('/sw.js')

    // Nuevo SW instalado esperando activación → notificar al usuario
    wb.addEventListener('waiting', () => {
      useUIStore.getState().setSwUpdateAvailable(true)
    })

    // Puente de mensajes SW → stores:
    // El SW no puede acceder a Dexie directamente, por lo que delega
    // el flush de outbox a la app mediante postMessage.
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'FLUSH_OUTBOX') {
        useNutricionStore.getState().flushOutbox()
      }
    })

    wb.register().catch((err) => {
      console.error('[SW] Error al registrar el service worker:', err)
    })
  })
}

// ─── Render ───────────────────────────────────────────────────────────────────

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)
