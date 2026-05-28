import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useUIStore = create(
  persist(
    (set) => ({

      // ─── Estado ────────────────────────────────────────────────────────
      theme: 'light',
      isOnline: navigator.onLine,
      swUpdateAvailable: false,

      /**
       * UUID del paciente actualmente seleccionado (estado de sesión — no persiste).
       * Se establece al hacer clic en una tarjeta de paciente en la lista.
       * Permite que Planes y Reportes carguen los datos del paciente correcto.
       */
      pacienteId: null,

      // ─── Acciones ──────────────────────────────────────────────────────
      toggleTheme: () =>
        set((s) => {
          const next = s.theme === 'light' ? 'dark' : 'light'
          document.documentElement.classList.toggle('dark', next === 'dark')
          return { theme: next }
        }),

      setOnline: (value) => set({ isOnline: value }),

      setSwUpdateAvailable: (value) => set({ swUpdateAvailable: value }),

      /** Selecciona el paciente activo para Planes y Reportes. */
      setPacienteId: (id) => set({ pacienteId: id }),

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
