/**
 * Pacientes — Vista principal de gestión clínica de pacientes.
 *
 * Arquitectura:
 *   - Lista reactiva: Dexie liveQuery + useSyncExternalStore (sin polling, sin React Query)
 *   - Drawer cinemático: translate3d(100%,0,0) ↔ translate3d(0,0,0) acelerado por GPU
 *   - Backdrop con backdrop-filter: blur(8px)
 *   - FAB flotante con degradado + micro-pulso (keyframes CSS)
 *   - PacienteForm integrado dentro del panel
 *   - Al guardar: drawer cierra con transición + lista actualiza desde IndexedDB
 *
 * Gestión de memoria:
 *   - PacienteForm se monta solo cuando el drawer está visible y se desmonta
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
  // ── Estado del drawer ──
  // `drawerOpen`    → controla la clase CSS que dispara la transición
  // `drawerMounted` → controla si el formulario está en el DOM
  // `editId`        → null = nuevo paciente | string = editar existente
  const [drawerOpen,    setDrawerOpen]    = useState(false)
  const [drawerMounted, setDrawerMounted] = useState(false)
  const [editId,        setEditId]        = useState(null)
  const closeTimerRef = useRef(null)

  const pacientes      = usePacientesLive()
  const setPacienteId  = useUIStore((s) => s.setPacienteId)

  // Limpieza del timer al desmontar
  useEffect(() => () => clearTimeout(closeTimerRef.current), [])

  // ── Apertura del drawer ──
  // Cuando se selecciona un paciente existente, actualiza el pacienteId global
  // para que Planes y Reportes carguen sus datos inmediatamente.
  const abrirDrawer = useCallback((id = null) => {
    clearTimeout(closeTimerRef.current)
    if (id) setPacienteId(id)   // ← propaga la selección globalmente
    setEditId(id)
    setDrawerMounted(true)
    // Esperar un frame para que el DOM monte antes de disparar la transición CSS
    requestAnimationFrame(() => setDrawerOpen(true))
  }, [setPacienteId])

  // ── Cierre con animación ──
  const cerrarDrawer = useCallback(() => {
    setDrawerOpen(false) // quita --open → transición de salida inicia
    clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(() => {
      setDrawerMounted(false)
      setEditId(null)
    }, 400) // igual a la duración de la transición CSS del drawer
  }, [])

  const handleSaved = useCallback(() => cerrarDrawer(), [cerrarDrawer])

  // ── Render ──
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
              onClick={() => abrirDrawer(p.id)}
            />
          ))}
        </ul>
      )}

      {/* ── FAB: Registrar Nuevo Paciente ────────────────────────────────────
          Degradado verde + micro-pulso en box-shadow (GPU only, sin layout).
          Se oculta cuando el drawer está abierto para no confundir al usuario.
          ─────────────────────────────────────────────────────────────────── */}
      <button
        className={`pac-fab${drawerOpen ? ' pac-fab--hidden' : ''}`}
        onClick={() => abrirDrawer()}
        aria-label="Registrar nuevo paciente"
        type="button"
      >
        <IconUserPlus aria-hidden="true" />
        <span>+ Registrar Nuevo Paciente</span>
      </button>

      {/* ── Editor pantalla completa — solo en modo edición ──────────────────
          Se monta cuando drawerMounted && editId != null.
          La animación de entrada/salida la controla isOpen.
          ─────────────────────────────────────────────────────────────────── */}
      {drawerMounted && editId && (
        <EditPacienteFullscreen
          key={editId}
          pacienteId={editId}
          isOpen={drawerOpen}
          onClose={cerrarDrawer}
          onSaved={handleSaved}
        />
      )}

      {/* ── Backdrop: overlay con desenfoque — solo para nuevo paciente ──────
          pointer-events controlados por la clase --open en CSS.
          ─────────────────────────────────────────────────────────────────── */}
      {!editId && (
        <div
          className={`pac-backdrop${drawerOpen ? ' pac-backdrop--open' : ''}`}
          onClick={cerrarDrawer}
          aria-hidden="true"
        />
      )}

      {/* ── Drawer lateral — solo para nuevo paciente ────────────────────────
          Siempre en el DOM (position: fixed, off-screen cuando cerrado).
          inert previene foco/interacción cuando está cerrado.
          ─────────────────────────────────────────────────────────────────── */}
      <aside
        className={`pac-drawer${drawerOpen && !editId ? ' pac-drawer--open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Registrar nuevo paciente"
        {...(!(drawerOpen && !editId) ? { inert: '' } : {})}
      >
        {/* Encabezado del panel */}
        <div className="pac-drawer__header">
          <div className="pac-drawer__header-left">
            <div className="pac-drawer__accent-bar" aria-hidden="true" />
            <div>
              <h2 className="pac-drawer__title">Nuevo Paciente</h2>
              <p className="pac-drawer__subtitle">Completá los datos para crear la ficha</p>
            </div>
          </div>
          <button
            className="pac-drawer__close"
            onClick={cerrarDrawer}
            aria-label="Cerrar panel"
            type="button"
          >
            <IconX aria-hidden="true" />
          </button>
        </div>

        {/* Línea de acento degradada bajo el header */}
        <div className="pac-drawer__rule" aria-hidden="true" />

        {/* Cuerpo desplazable — formulario de creación */}
        <div className="pac-drawer__body">
          {drawerMounted && !editId && (
            <PacienteForm
              key="new"
              onSaved={handleSaved}
            />
          )}
        </div>
      </aside>
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

function IconX() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <line x1="18" y1="6"  x2="6"  y2="18" />
      <line x1="6"  y1="6"  x2="18" y2="18" />
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
