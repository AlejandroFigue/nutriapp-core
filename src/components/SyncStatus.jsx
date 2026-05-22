/**
 * SyncStatus — pill compacto que mapea en tiempo real el estado del outbox.
 *
 * Estados derivados:
 *   synced   online  + 0 pendientes     → check verde
 *   syncing  online  + N pendientes     → spinner (CSS animation)
 *   queued   offline + N pendientes     → nube + contador
 *   offline  offline + 0 pendientes     → nube gris
 *   error    N items en estado 'error'  → alerta roja
 *
 * Técnica: useSyncExternalStore + liveQuery de Dexie 4 (sin dexie-react-hooks).
 * El observable de Dexie notifica cada vez que cambia outbox → React re-renderiza
 * de forma reactiva sin polling.
 */
import { useSyncExternalStore, useMemo, useRef } from 'react'
import { liveQuery } from 'dexie'
import { db } from '@/db/database'
import { useUIStore } from '@/store/useUIStore'

// ─── Hook: puente liveQuery ↔ useSyncExternalStore ────────────────────────────

/**
 * @template T
 * @param {() => Promise<T>} querier   Función que retorna una promesa Dexie
 * @param {unknown[]}        deps      Dependencias para recrear el observable
 * @param {T}                initial   Valor mientras carga el primer resultado
 * @returns {T}
 */
function useDexieLive(querier, deps, initial) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const obs  = useMemo(() => liveQuery(querier), deps)
  const snap = useRef(initial)

  return useSyncExternalStore(
    (notify) => {
      const sub = obs.subscribe({
        next:  (val) => { snap.current = val; notify() },
        error: ()    => notify(),
      })
      return () => sub.unsubscribe()
    },
    () => snap.current,
    () => initial,
  )
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function SyncStatus() {
  const isOnline = useUIStore((s) => s.isOnline)

  /** Conteo reactivo de items pendientes y errores en el outbox */
  const stats = useDexieLive(
    () =>
      db.outbox
        .where('estado').anyOf(['pendiente', 'procesando', 'error'])
        .toArray()
        .then((rows) => ({
          pendiente: rows.filter((r) => r.estado !== 'error').length,
          error:     rows.filter((r) => r.estado === 'error').length,
        })),
    [],
    { pendiente: 0, error: 0 },
  )

  // ─── Máquina de estados semánticos ───────────────────────────────────────
  let estado
  if      (stats.error > 0)                  estado = 'error'
  else if (!isOnline && stats.pendiente > 0)  estado = 'queued'
  else if (!isOnline)                         estado = 'offline'
  else if (stats.pendiente > 0)               estado = 'syncing'
  else                                        estado = 'synced'

  const p = stats.pendiente
  const e = stats.error

  const MAP = {
    synced:  { label: 'Sincronizado',                                   color: 'var(--sync-color-synced)',  spin: false },
    syncing: { label: 'Sincronizando…',                                 color: 'var(--sync-color-syncing)', spin: true  },
    queued:  { label: `${p} cambio${p !== 1 ? 's' : ''} pendiente${p !== 1 ? 's' : ''}`,
                                                                        color: 'var(--sync-color-queued)',  spin: false },
    offline: { label: 'Sin conexión',                                   color: 'var(--sync-color-offline)', spin: false },
    error:   { label: `${e} error${e !== 1 ? 'es' : ''} de sync`,      color: 'var(--sync-color-error)',   spin: false },
  }

  const { label, color, spin } = MAP[estado]

  return (
    <div
      className={`sync-status sync-status--${estado}`}
      role="status"
      aria-live="polite"
      aria-label={`Sincronización: ${label}`}
      title={label}
      style={{ '--_color': color }}
    >
      <span
        className={`sync-status__icon${spin ? ' sync-status__icon--spin' : ''}`}
        aria-hidden="true"
      >
        {ICONS[estado]}
      </span>
      <span className="sync-status__label">{label}</span>
    </div>
  )
}

// ─── Íconos SVG inline (sin dependencias de íconos) ──────────────────────────

const ICONS = {
  synced: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  syncing: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  ),
  queued: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
    </svg>
  ),
  offline: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="2" y1="2" x2="22" y2="22" />
      <path d="M5.782 5.782A7 7 0 0 0 9 19h8.5a4.5 4.5 0 0 0 1.307-.193" />
      <path d="M21.532 16.5A4.5 4.5 0 0 0 17.5 10h-1.79A7.008 7.008 0 0 0 10 5.07" />
    </svg>
  ),
  error: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
}
