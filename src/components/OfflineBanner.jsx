import { useEffect } from 'react'
import { useUIStore } from '@/store/useUIStore'
import { useNutricionStore } from '@/store/useNutricionStore'

/**
 * Monitorea la conectividad de red y expone un banner cuando el dispositivo
 * está offline. También actúa como receptor de mensajes del Service Worker:
 * cuando la red se recupera (evento 'online') dispara el flush del outbox.
 */
export default function OfflineBanner() {
  const isOnline        = useUIStore((s) => s.isOnline)
  const setOnline       = useUIStore((s) => s.setOnline)
  const flushOutbox     = useNutricionStore((s) => s.flushOutbox)

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true)
      flushOutbox()
    }
    const handleOffline = () => setOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setOnline, flushOutbox])

  if (isOnline) return null

  return (
    <div role="alert" aria-live="polite" className="offline-banner">
      Sin conexión — los cambios se sincronizarán al reconectarse
    </div>
  )
}
