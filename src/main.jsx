/**
 * main.jsx — punto de entrada de la aplicación.
 *
 * Responsabilidades:
 *   1. Configurar TanStack Query con estrategia offline-first
 *   2. Registrar el Service Worker (solo en producción)
 *   3. Puente SW → stores (FLUSH_OUTBOX, SKIP_WAITING)
 *   4. Inicializar el diario del día activo antes del primer render
 *   5. Renderizar el árbol React
 */
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { useNutricionStore } from '@/store/useNutricionStore'
import { useUIStore }        from '@/store/useUIStore'
import './index.css'

// ─── TanStack Query ───────────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:   1000 * 60 * 5,         // 5 min: datos frescos sin refetch
      gcTime:      1000 * 60 * 60 * 24,   // 24 h: mantener en GC aunque no esté montado
      retry:       (n) => navigator.onLine && n < 2,
      networkMode: 'offlineFirst',
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
})

// ─── Service Worker ───────────────────────────────────────────────────────────
// Solo en producción; en desarrollo el SW cachearía assets sin hash y rompería HMR.

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  import('workbox-window').then(({ Workbox }) => {
    const wb = new Workbox('/sw.js')

    // Nuevo SW instalado y esperando activación → notificar al usuario
    wb.addEventListener('waiting', () => {
      useUIStore.getState().setSwUpdateAvailable(true)
    })

    // Puente de mensajes SW → stores.
    // El SW no puede acceder a Dexie directamente; delega el flush a la app.
    navigator.serviceWorker.addEventListener('message', ({ data }) => {
      if (data?.type === 'FLUSH_OUTBOX') {
        useNutricionStore.getState().flushOutbox()
      }
    })

    wb.register().catch((err) => {
      console.error('[SW] Error al registrar el service worker:', err)
    })
  })
}

// ─── Inicialización temprana de datos ────────────────────────────────────────
// Cargamos el diario del día activo antes del primer render para que las rutas
// que dependen de `registrosDia` no muestren un estado vacío en el montaje.

useNutricionStore.getState().cargarDiario()

// ─── Render ───────────────────────────────────────────────────────────────────

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
