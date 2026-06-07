/**
 * Pacientes — Vista principal de gestión clínica de pacientes.
 *
 * Arquitectura:
 *   - Lista reactiva: Dexie liveQuery + useSyncExternalStore (sin polling, sin React Query)
 *   - Nuevo paciente: vista de página completa (sin drawer/modal), renderizado en flujo
 *   - Edición: EditPacienteFullscreen como espacio de trabajo plano, sin overlay
 *   - FAB flotante con degradado + micro-pulso (keyframes CSS)
 *
 * Gestión de estado (view: 'list' | 'new' | 'edit'):
 *   - Clic en tarjeta → selecciona el paciente activo en UIStore (sin abrir editor)
 *   - Clic en "Editar Ficha" → cambia view a 'edit' y monta el editor
 *   - Un solo observer liveQuery para toda la lista — sin re-creación en renders.
 */
import {
  useState,
  useRef,
  useMemo,
  useCallback,
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
  // `view`       → 'list' | 'new' | 'edit'
  // `editId`     → UUID del paciente cuya ficha está abierta en el editor
  // `selectedId` → UUID del paciente activo seleccionado en la lista
  const [view,       setView]       = useState('list')
  const [editId,     setEditId]     = useState(null)
  const [selectedId, setSelectedId] = useState(null)

  const pacientes     = usePacientesLive()
  const setPacienteId = useUIStore((s) => s.setPacienteId)

  // ── Seleccionar paciente activo (sin abrir editor) ──
  const seleccionarPaciente = useCallback((id) => {
    setPacienteId(id)
    setSelectedId(id)
  }, [setPacienteId])

  // ── Abrir editor de ficha clínica ──
  const abrirEdicion = useCallback((id) => {
    setPacienteId(id)
    setEditId(id)
    setView('edit')
  }, [setPacienteId])

  // ── Cerrar editor y volver a la lista ──
  const cerrarEdicion = useCallback(() => {
    setView('list')
    setEditId(null)
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

  // ── Vista: editor de ficha clínica (espacio de trabajo plano, sin overlay) ──
  if (view === 'edit' && editId) {
    return (
      <EditPacienteFullscreen
        key={editId}
        pacienteId={editId}
        onClose={cerrarEdicion}
      />
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
              isSelected={p.id === selectedId}
              onSelect={() => seleccionarPaciente(p.id)}
              onEdit={() => abrirEdicion(p.id)}
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

    </main>
  )
}

// ─── Tarjeta de paciente ──────────────────────────────────────────────────────

function PacienteCard({ paciente, isSelected, onSelect, onEdit }) {
  const {
    nombre      = '',
    apellido    = '',
    email,
    telefono,
    objetivo,
    sincronizado,
  } = paciente

  const initials    = [nombre[0], apellido?.[0]].filter(Boolean).join('').toUpperCase() || '?'
  const displayName = [nombre, apellido].filter(Boolean).join(' ')
  const metaText    = email || telefono || '—'

  return (
    <li className="pac-card-row">
      {/* Área de selección: activa el paciente en el SaaS */}
      <button
        className={`pac-card${isSelected ? ' pac-card--selected' : ''}`}
        onClick={onSelect}
        type="button"
        aria-label={`Seleccionar paciente ${displayName}`}
        aria-pressed={isSelected}
      >
        <div className="pac-card__avatar" aria-hidden="true">
          {initials}
        </div>
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
        {sincronizado !== 1 && (
          <span
            className="pac-card__sync-dot"
            aria-label="Sincronización pendiente"
            title="Pendiente de sincronización"
          />
        )}
      </button>

      {/* Botón explícito de edición — abre la ficha clínica completa */}
      <button
        type="button"
        className="pac-card__edit-btn"
        onClick={(e) => { e.stopPropagation(); onEdit() }}
        aria-label={`Editar ficha de ${displayName}`}
      >
        <IconPencil aria-hidden="true" />
        <span>Editar Ficha</span>
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

function IconPencil() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}
