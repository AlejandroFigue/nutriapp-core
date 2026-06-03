/**
 * Pacientes — Vista principal de gestión clínica de pacientes.
 *
 * Arquitectura:
 *   - Lista reactiva: Dexie liveQuery + useSyncExternalStore (sin polling, sin React Query)
 *   - Nuevo paciente: vista de página completa (sin drawer/modal), renderizado en flujo
 *   - Edición: EditPacienteFullscreen overlay deslizante (sin cambios)
 *   - FAB flotante con degradado + micro-pulso (keyframes CSS)
 *
 * Gestión de memoria:
 *   - PacienteForm se monta/desmonta al cambiar `view` — sin timers de animación.
 *   - EditPacienteFullscreen se monta solo en modo edición y se desmonta
 *     400ms después del cierre (al completar la animación de salida).
 *   - Un solo observer liveQuery para toda la lista — sin re-creación en renders.
 */
import {
  useState,
  useRef,
  useMemo,
  useCallback,
  useEffect,
  useSyncExternalStore,
} from 'react'
import { liveQuery } from 'dexie'
import { db } from '@/db/database'
import PacienteForm from '@/components/PacienteForm'
import EditPacienteFullscreen from '@/components/EditPacienteFullscreen'
import { useUIStore } from '@/store/useUIStore'

// ─── Hook: lista reactiva de pacientes desde IndexedDB ────────────────────────

function usePacientesLive() {
  const obs  = useMemo(() => liveQuery(() => db.pacientes.orderBy('nombre').toArray()), [])
  const snap = useRef([])

  return useSyncExternalStore(
    (notify) => {
      const sub = obs.subscribe({
        next:  (val) => { snap.current = val; notify() },
        error: ()    => notify(),
      })
      return () => sub.unsubscribe()
    },
    () => snap.current,
    () => [],
  )
}

// ─── Mapa de etiquetas para el objetivo del paciente ─────────────────────────

const OBJETIVO_LABELS = {
  bajar:    'Bajar peso',
  mantener: 'Mantener',
  subir:    'Subir peso',
  musculo:  'Ganar músculo',
  salud:    'Salud general',
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Pacientes() {
  // `view`        → 'list' | 'new' (nuevo paciente como página completa, sin modal)
  // `editId`      → UUID del paciente en edición, null cuando no hay edición activa
  // `editOpen`    → dispara la transición CSS de entrada/salida del overlay de edición
  // `editMounted` → mantiene el overlay en el DOM durante la animación de salida
  const [view,        setView]        = useState('list')
  const [editId,      setEditId]      = useState(null)
  const [editOpen,    setEditOpen]    = useState(false)
  const [editMounted, setEditMounted] = useState(false)
  const closeTimerRef = useRef(null)

  const pacientes     = usePacientesLive()
  const setPacienteId = useUIStore((s) => s.setPacienteId)

  useEffect(() => () => clearTimeout(closeTimerRef.current), [])

  // ── Abrir edición de paciente existente ──
  const abrirEdicion = useCallback((id) => {
    clearTimeout(closeTimerRef.current)
    setPacienteId(id)
    setEditId(id)
    setEditMounted(true)
    requestAnimationFrame(() => setEditOpen(true))
  }, [setPacienteId])

  // ── Cerrar edición con animación de salida ──
  const cerrarEdicion = useCallback(() => {
    setEditOpen(false)
    clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(() => {
      setEditMounted(false)
      setEditId(null)
    }, 400)
  }, [])

  // ── Vista: formulario de nuevo paciente (página completa, sin overlay) ──────
  if (view === 'new') {
    return (
      <main className="pac-new-page">
        <header className="pac-new-page__header">
          <button
            type="button"
            className="pac-new-page__back"
            onClick={() => setView('list')}
            aria-label="Volver a la lista de pacientes"
          >
            <IconChevronLeft aria-hidden="true" />
            <span>Volver a Mis Pacientes</span>
          </button>
          <div className="pac-new-page__title-area">
            <div className="pac-new-page__accent-bar" aria-hidden="true" />
            <div>
              <h1 className="pac-new-page__title">Nuevo Paciente</h1>
              <p className="pac-new-page__subtitle">Completá los datos para crear la ficha clínica</p>
            </div>
          </div>
        </header>
        <div className="pac-new-page__rule" aria-hidden="true" />
        <div className="pac-new-page__body">
          <PacienteForm onSaved={() => setView('list')} />
        </div>
      </main>
    )
  }

  // ── Vista: lista de pacientes ────────────────────────────────────────────────
  return (
    <main className="pac-page">

      {/* ── Encabezado de la sección ── */}
      <header className="pac-page__header">
        <div className="pac-page__title-row">
          <h1 className="pac-page__title">Mis Pacientes</h1>
          {pacientes.length > 0 && (
            <span className="pac-page__count">
              {pacientes.length}
            </span>
          )}
        </div>
        <p className="pac-page__subtitle">
          {pacientes.length === 0
            ? 'Aún no tenés pacientes registrados'
            : `${pacientes.length} paciente${pacientes.length !== 1 ? 's' : ''} en tu agenda clínica`}
        </p>
      </header>

      {/* ── Lista de pacientes o estado vacío ── */}
      {pacientes.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="pac-list" role="list" aria-label="Lista de pacientes">
          {pacientes.map((p) => (
            <PacienteCard
              key={p.id}
              paciente={p}
              onClick={() => abrirEdicion(p.id)}
            />
          ))}
        </ul>
      )}

      {/* ── FAB: Registrar Nuevo Paciente ── */}
      <button
        className="pac-fab"
        onClick={() => setView('new')}
        aria-label="Registrar nuevo paciente"
        type="button"
      >
        <IconUserPlus aria-hidden="true" />
        <span>+ Registrar Nuevo Paciente</span>
      </button>

      {/* ── Editor pantalla completa — solo en modo edición ── */}
      {editMounted && editId && (
        <EditPacienteFullscreen
          key={editId}
          pacienteId={editId}
          isOpen={editOpen}
          onClose={cerrarEdicion}
          onSaved={cerrarEdicion}
        />
      )}
    </main>
  )
}

// ─── Tarjeta de paciente ──────────────────────────────────────────────────────

function PacienteCard({ paciente, onClick }) {
  const {
    nombre      = '',
    apellido    = '',
    email,
    telefono,
    objetivo,
    sincronizado,
  } = paciente

  // Iniciales para el avatar
  const initials = [nombre[0], apellido?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase() || '?'

  const displayName = [nombre, apellido].filter(Boolean).join(' ')
  const metaText    = email || telefono || '—'

  return (
    <li>
      <button
        className="pac-card"
        onClick={onClick}
        type="button"
        aria-label={`Ver y editar datos de ${displayName}`}
      >
        {/* Avatar con iniciales */}
        <div className="pac-card__avatar" aria-hidden="true">
          {initials}
        </div>

        {/* Info principal */}
        <div className="pac-card__info">
          <div className="pac-card__name">{displayName}</div>
          <div className="pac-card__meta">
            <span>{metaText}</span>
            {objetivo && (
              <>
                <span className="pac-card__sep" aria-hidden="true">·</span>
                <span className="pac-card__tag">
                  {OBJETIVO_LABELS[objetivo] ?? objetivo}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Indicador de sync pendiente */}
        {sincronizado !== 1 && (
          <span
            className="pac-card__sync-dot"
            aria-label="Sincronización pendiente"
            title="Pendiente de sincronización"
          />
        )}

        {/* Chevron derecho */}
        <div className="pac-card__chevron" aria-hidden="true">
          <IconChevronRight />
        </div>
      </button>
    </li>
  )
}

// ─── Estado vacío ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="pac-empty" role="status" aria-live="polite">
      <div className="pac-empty__illustration" aria-hidden="true">
        <div className="pac-empty__orb" />
        <span className="pac-empty__emoji">🧑‍⚕️</span>
      </div>
      <p className="pac-empty__title">Agenda vacía</p>
      <p className="pac-empty__text">
        Registrá tu primer paciente usando el botón verde y comenzá
        a gestionar tu práctica clínica.
      </p>
    </div>
  )
}

// ─── Íconos (SVG inline, sin dependencias externas) ──────────────────────────

function IconUserPlus() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="16" y1="11" x2="22" y2="11" />
    </svg>
  )
}

function IconChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function IconChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}
