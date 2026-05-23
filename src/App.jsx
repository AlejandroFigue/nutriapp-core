/**
 * App — shell principal de la PWA.
 *
 * Layout (position: fixed):
 *   ┌──────────────────────────────────────┐  ← .app-header  (56px)
 *   │ 🥗 NutriApp Profesional  [sync] [☀]  │
 *   ├──────────────────────────────────────┤
 *   │            <ruta activa>             │  ← .app-main   (flex-1, overflow-y: auto)
 *   ├──────────────────────────────────────┤
 *   │  Plan   Registrar  Progreso  Buscar  │  ← .app-nav    (64px) + indicador flotante
 *   └──────────────────────────────────────┘
 *
 * Incluye:
 *   - Banner de nueva versión de SW disponible
 *   - OfflineBanner (conectividad) — reposicionado bajo el header
 *   - SyncStatus — estado reactivo del outbox
 *   - Navegación inferior con indicador flotante elástico (CSS custom property)
 *   - Fondos orb — gradientes radiales que derivan suavemente (GPU-only)
 */
import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom'
import OfflineBanner from '@/components/OfflineBanner'
import SyncStatus    from '@/components/SyncStatus'
import { useUIStore } from '@/store/useUIStore'

// ─── Rutas (lazy) ─────────────────────────────────────────────────────────────

const Pacientes       = lazy(() => import('@/routes/Pacientes'))
const Plan            = lazy(() => import('@/routes/Plan'))
const Registrar       = lazy(() => import('@/routes/Registrar'))
const Progreso        = lazy(() => import('@/routes/Progreso'))
const Buscar          = lazy(() => import('@/routes/Buscar'))
const ExportarReporte = lazy(() => import('@/components/ExportarReporte'))

// ─── Navegación inferior (5 tabs) ────────────────────────────────────────────

const NAV_ITEMS = [
  { to: '/pacientes', label: 'Pacientes', Icon: IconUsers  },
  { to: '/plan',      label: 'Plan',      Icon: IconPlan   },
  { to: '/registrar', label: 'Registrar', Icon: IconPlus   },
  { to: '/progreso',  label: 'Progreso',  Icon: IconChart  },
  { to: '/buscar',    label: 'Buscar',    Icon: IconSearch },
]

/**
 * Índice de la pestaña activa por ruta.
 * /exportar se solapa sobre Progreso (índice 3) — la burbuja no se mueve.
 */
const ROUTE_INDEX = {
  '/pacientes': 0,
  '/plan':      1,
  '/registrar': 2,
  '/progreso':  3,
  '/buscar':    4,
  '/exportar':  3,
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function App() {
  const theme               = useUIStore((s) => s.theme)
  const toggleTheme         = useUIStore((s) => s.toggleTheme)
  const swUpdateAvailable   = useUIStore((s) => s.swUpdateAvailable)
  const aplicarActualizacion = useUIStore((s) => s.aplicarActualizacion)

  const { pathname } = useLocation()
  const activeIndex  = ROUTE_INDEX[pathname] ?? 0

  return (
    <div className="app-shell">

      {/* ── Fondos orb — gradientes que derivan lentamente (z-index: -1) ── */}
      <div className="bg-orb bg-orb--1" aria-hidden="true" />
      <div className="bg-orb bg-orb--2" aria-hidden="true" />
      <div className="bg-orb bg-orb--3" aria-hidden="true" />

      {/* ── Header ── */}
      <header className="app-header">
        <div className="app-header__brand">
          <span className="app-header__logo" aria-hidden="true">🥗</span>
          <span className="app-header__name">NutriApp</span>
          <span className="app-header__tagline">Profesional</span>
        </div>

        <div className="app-header__actions">
          <SyncStatus />
          <button
            className="app-header__icon-btn"
            onClick={toggleTheme}
            aria-label={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
            title={theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
          >
            {theme === 'light' ? <IconMoon /> : <IconSun />}
          </button>
        </div>
      </header>

      {/* ── Banner: actualización de SW disponible ── */}
      {swUpdateAvailable && (
        <div className="update-banner" role="alert" aria-live="polite">
          <span className="update-banner__text">
            <IconUpdate aria-hidden="true" />
            Nueva versión disponible
          </span>
          <button
            className="update-banner__btn"
            onClick={aplicarActualizacion}
          >
            Actualizar ahora
          </button>
        </div>
      )}

      {/* OfflineBanner — posicionado tras el header via CSS (.offline-banner) */}
      <OfflineBanner />

      {/* ── Contenido principal ── */}
      <main className="app-main" id="main-content">
        <Suspense
          fallback={
            <div
              className="loading-screen"
              role="status"
              aria-label="Cargando…"
            />
          }
        >
          <Routes>
            <Route path="/"           element={<Navigate to="/pacientes" replace />} />
            <Route path="/pacientes"  element={<Pacientes />} />
            <Route path="/plan"       element={<Plan />} />
            <Route path="/registrar"  element={<Registrar />} />
            <Route path="/progreso"   element={<Progreso />} />
            <Route path="/buscar"     element={<Buscar />} />
            <Route path="/exportar"   element={<ExportarReporte />} />
            <Route path="*"           element={<Navigate to="/pacientes" replace />} />
          </Routes>
        </Suspense>
      </main>

      {/* ── Navegación inferior con indicador flotante ── */}
      <nav
        className="app-nav"
        style={{ '--active-tab': activeIndex }}
        aria-label="Navegación principal"
      >
        {/* Burbuja flotante — se mueve con translateX elástico */}
        <div className="nav-indicator" aria-hidden="true" />

        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `nav-tab${isActive ? ' nav-tab--active' : ''}`
            }
          >
            <span className="nav-tab__icon" aria-hidden="true">
              <Icon />
            </span>
            <span className="nav-tab__label">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

// ─── Íconos de navegación (SVG inline, 24×24) ─────────────────────────────────

function IconUsers() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function IconPlan() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8"  y1="2" x2="8"  y2="6" />
      <line x1="3"  y1="10" x2="21" y2="10" />
      <line x1="8"  y1="14" x2="8.01"  y2="14" strokeWidth="2.5" />
      <line x1="12" y1="14" x2="12.01" y2="14" strokeWidth="2.5" />
      <line x1="16" y1="14" x2="16.01" y2="14" strokeWidth="2.5" />
      <line x1="8"  y1="18" x2="8.01"  y2="18" strokeWidth="2.5" />
      <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2.5" />
    </svg>
  )
}

function IconPlus() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8"  y1="12" x2="16" y2="12" />
    </svg>
  )
}

function IconChart() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}

function IconSearch() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function IconMoon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function IconSun() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1"  x2="12" y2="3"  />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22"   x2="5.64"  y2="5.64"  />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1"  y1="12" x2="3"  y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22"  y1="19.78" x2="5.64"  y2="18.36" />
      <line x1="18.36" y1="5.64"  x2="19.78" y2="4.22"  />
    </svg>
  )
}

function IconUpdate() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  )
}
