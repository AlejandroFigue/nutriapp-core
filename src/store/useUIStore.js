import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useUIStore = create(
  persist(
    (set) => ({

      // ─── Estado ────────────────────────────────────────────────────────
      theme: 'light',
      isOnline: navigator.onLine,
      swUpdateAvailable: false,

      // ─── Acciones ──────────────────────────────────────────────────────
      toggleTheme: () =>
        set((s) => {
          const next = s.theme === 'light' ? 'dark' : 'light'
          document.documentElement.classList.toggle('dark', next === 'dark')
          return { theme: next }
        }),

      setOnline: (value) => set({ isOnline: value }),

      setSwUpdateAvailable: (value) => set({ swUpdateAvailable: value }),

      // Fuerza la activación del nuevo SW y recarga la página
      aplicarActualizacion: () => {
        navigator.serviceWorker?.controller?.postMessage({ type: 'SKIP_WAITING' })
        window.location.reload()
      },
    }),
    {
      name: 'nutriapp-ui',
      // Solo persistir el tema; isOnline y swUpdateAvailable son estado de sesión
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
