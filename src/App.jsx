/**
 * App — shell principal de la PWA · NutriApp Profesional.
 *
 * Layout (position: fixed):
 *   ┌────────────────────────────────────────────┐  ← .app-header  (56px)
 *   │ 🥗 NutriApp  Profesional   [sync]  [☀/🌙]  │
 *   ├────────────────────────────────────────────┤
 *   │  Pacientes │  Agenda  │  Planes │ Reportes  │  ← .app-topnav (48px)
 *   │ ════════                                    │    indicador deslizante (spring)
 *   ├────────────────────────────────────────────┤
 *   │                <ruta activa>               │  ← .app-main (flex-1, scroll)
 *   └────────────────────────────────────────────┘
 *
 * Navegación:
 *   - 4 pestañas superiores (Pacientes / Agenda / Planes / Reportes)
 *   - Indicador deslizante: línea de 3px en el borde inferior del tab bar
 *     → `translateX(calc(N × 100%))` via CSS custom property `--active-tab`
 *     → Transición elástica: cubic-bezier(0.34, 1.56, 0.64, 1) — overshoot real
 *
 * Estado compartido (useUIStore.pacienteId):
 *   - Se establece cuando el profesional selecciona un paciente en /pacientes
 *   - Planes y Reportes lo leen automáticamente → datos del paciente correcto
 */
import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom'
import OfflineBanner from '@/components/OfflineBanner'
import SyncStatus    from '@/components/SyncStatus'
import { useUIStore } from '@/store/useUIStore'

// ─── Rutas (lazy) ─────────────────────────────────────────────────────────────

const Pacientes       = lazy(() => import('@/routes/Pacientes'))
const Agenda          = lazy(() => import('@/routes/Agenda'))
const Planes          = lazy(() => import('@/routes/Planes'))
const ExportarReporte = lazy(() => import('@/components/ExportarReporte'))

// ─── Navegación superior (4 pestañas) ────────────────────────────────────────

const TOP_TABS = [
  { to: '/pacientes', label: 'Pacientes', Icon: IconUsers },
  { to: '/agenda',    label: 'Agenda',    Icon: IconCal   },
  { to: '/planes',    label: 'Planes',    Icon: IconClip  },
  { to: '/reportes',  label: 'Reportes',  Icon: IconDoc   },
]

/**
 * Índice de la pestaña activa por ruta.
 * /exportar redirige a /reportes, pero si no ocurrió aún, lo mapea al mismo índice.
 */
const ROUTE_INDEX = {
  '/pacientes': 0,
  '/agenda':    1,
  '/planes':    2,
  '/reportes':  3,
  '/exportar':  3,
}

// ─── Componente raíz ──────────────────────────────────────────────────────────

export default function App() {
  const theme                = useUIStore((s) => s.theme)
  const toggleTheme          = useUIStore((s) => s.toggleTheme)
  const swUpdateAvailable    = useUIStore((s) => s.swUpdateAvailable)
  const aplicarActualizacion = useUIStore((s) => s.aplicarActualizacion)

  const { pathname }  = useLocation()
  const activeIndex   = ROUTE_INDEX[pathname] ?? 0

  return (
    <div className="app-shell">

      {/* ── Gradientes de fondo — derivan suavemente (GPU-only, z-index: -1) ── */}
      <div className="bg-orb bg-orb--1" aria-hidden="true" />
      <div className="bg-orb bg-orb--2" aria-hidden="true" />
      <div className="bg-orb bg-orb--3" aria-hidden="true" />

      {/* ═══════════════════════════════════════════════════════════════════
          HEADER — brand + sync status + toggle de tema
          ═══════════════════════════════════════════════════════════════════ */}
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
          <button className="update-banner__btn" onClick={aplicarActualizacion}>
            Actualizar ahora
          </button>
        </div>
      )}

      {/* Banner de conectividad — reposicionado bajo header via CSS */}
      <OfflineBanner />

      {/* ═══════════════════════════════════════════════════════════════════
          NAVEGACIÓN SUPERIOR — 4 pestañas profesionales
          ═══════════════════════════════════════════════════════════════════
          El indicador deslizante (.app-topnav__indicator) lee --active-tab
          y se desplaza con translateX(calc(N × 100%)).
          La transición cubic-bezier(0.34, 1.56, 0.64, 1) tiene overshoot
          real (efecto muelle) → animación elástica sin JS.
          ═══════════════════════════════════════════════════════════════════ */}
      <nav
        className="app-topnav"
        style={{ '--active-tab': activeIndex }}
        aria-label="Navegación principal"
      >
        {/* Indicador flotante — barra de 3 px que se desplaza físicamente */}
        <div className="app-topnav__indicator" aria-hidden="true" />

        {TOP_TABS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `app-topnav__tab${isActive ? ' app-topnav__tab--active' : ''}`
            }
          >
            <span className="app-topnav__tab-icon" aria-hidden="true">
              <Icon />
            </span>
            <span className="app-topnav__tab-label">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* ═══════════════════════════════════════════════════════════════════
          CONTENIDO PRINCIPAL
          ═══════════════════════════════════════════════════════════════════ */}
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
            {/* Ruta raíz → Pacientes */}
            <Route path="/"           element={<Navigate to="/pacientes" replace />} />

            {/* ── Pestañas principales ── */}
            <Route path="/pacientes"  element={<Pacientes />} />
            <Route path="/agenda"     element={<Agenda />} />
            <Route path="/planes"     element={<Planes />} />
            <Route path="/reportes"   element={<ExportarReporte />} />

            {/* ── Compatibilidad con rutas heredadas ── */}
            <Route path="/plan"       element={<Navigate to="/planes"   replace />} />
            <Route path="/exportar"   element={<Navigate to="/reportes" replace />} />

            {/* Catch-all */}
            <Route path="*"           element={<Navigate to="/pacientes" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  )
}

// ─── Íconos SVG inline (24 × 24, sin dependencias externas) ──────────────────

function IconUsers() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function IconCal() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8"  y1="2" x2="8"  y2="6" />
      <line x1="3"  y1="10" x2="21" y2="10" />
      <line x1="8"  y1="14" x2="8.01"  y2="14" strokeWidth="2.5" />
      <line x1="12" y1="14" x2="12.01" y2="14" strokeWidth="2.5" />
      <line x1="16" y1="14" x2="16.01" y2="14" strokeWidth="2.5" />
    </svg>
  )
}

function IconClip() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <line x1="9"  y1="12" x2="15" y2="12" />
      <line x1="9"  y1="16" x2="13" y2="16" />
    </svg>
  )
}

function IconDoc() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9"  y1="13" x2="15" y2="13" />
      <line x1="9"  y1="17" x2="12" y2="17" />
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
      <line x1="4.22"  y1="4.22"   x2="5.64"  y2="5.64"  />
      <line x1="18.36" y1="18.36"  x2="19.78" y2="19.78" />
      <line x1="1"     y1="12"     x2="3"     y2="12"    />
      <line x1="21"    y1="12"     x2="23"    y2="12"    />
      <line x1="4.22"  y1="19.78"  x2="5.64"  y2="18.36" />
      <line x1="18.36" y1="5.64"   x2="19.78" y2="4.22"  />
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
