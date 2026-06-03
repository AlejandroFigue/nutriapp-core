import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Persistencia de sesión del paciente activo ────────────────────────────────
// Separado de localStorage (theme) para que se limpie al cerrar la pestaña.
const PACIENTE_SESSION_KEY = 'nutriapp:pacienteId'

const readSessionPacienteId = () => {
  try { return sessionStorage.getItem(PACIENTE_SESSION_KEY) } catch { return null }
}

export const useUIStore = create(
  persist(
    (set) => ({

      // ─── Estado ────────────────────────────────────────────────────────
      theme: 'light',
      isOnline: navigator.onLine,
      swUpdateAvailable: false,

      /**
       * UUID del paciente actualmente seleccionado.
       * Persiste en sessionStorage: sobrevive recargas de página dentro de la
       * misma pestaña pero se limpia al cerrarla (sin exposición en localStorage).
       */
      pacienteId: readSessionPacienteId(),

      // ─── Acciones ──────────────────────────────────────────────────────
      toggleTheme: () =>
        set((s) => {
          const next = s.theme === 'light' ? 'dark' : 'light'
          document.documentElement.classList.toggle('dark', next === 'dark')
          return { theme: next }
        }),

      setOnline: (value) => set({ isOnline: value }),

      setSwUpdateAvailable: (value) => set({ swUpdateAvailable: value }),

      /** Selecciona el paciente activo y sincroniza con sessionStorage. */
      setPacienteId: (id) => {
        try {
          if (id) sessionStorage.setItem(PACIENTE_SESSION_KEY, id)
          else    sessionStorage.removeItem(PACIENTE_SESSION_KEY)
        } catch { /* noop — entorno sin sessionStorage (SSR/test) */ }
        set({ pacienteId: id })
      },

      // Fuerza la activación del nuevo SW y recarga la página
      aplicarActualizacion: () => {
        navigator.serviceWorker?.controller?.postMessage({ type: 'SKIP_WAITING' })
        window.location.reload()
      },
    }),
    {
      name: 'nutriapp-ui',
      // Solo persistir el tema; todo lo demás es estado de sesión
      partialize: (s) => ({ theme: s.theme }),
      onRehydrateStorage: () => (state) => {
        // Aplicar clase CSS antes del primer render para evitar FOUC
        if (state?.theme === 'dark') {
          document.documentElement.classList.add('dark')
        }
      },
    }
  )
)
