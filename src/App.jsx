import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate, NavLink, useLocation, useNavigate } from 'react-router-dom'
import OfflineBanner        from '@/components/OfflineBanner'
import ActivePatientBanner from '@/components/ActivePatientBanner'
import SyncStatus          from '@/components/SyncStatus'
import AgenteIA            from '@/components/AgenteIA'
import { useUIStore }      from '@/store/useUIStore'

// ─── Rutas (lazy) ─────────────────────────────────────────────────────────────

const HomeDashboard    = lazy(() => import('@/components/HomeDashboard'))
const Pacientes        = lazy(() => import('@/routes/Pacientes'))
const Agenda           = lazy(() => import('@/routes/Agenda'))
const Planes           = lazy(() => import('@/routes/Planes'))
const ExportarReporte  = lazy(() => import('@/components/ExportarReporte'))
const AnalysisDashboard = lazy(() => import('@/components/AnalysisDashboard'))

// ─── Navegación ───────────────────────────────────────────────────────────────

const TOP_TABS = [
  { to: '/inicio',    label: 'Inicio'    },
  { to: '/pacientes', label: 'Pacientes' },
  { to: '/analisis',  label: 'Análisis'  },
  { to: '/agenda',    label: 'Agenda'    },
  { to: '/planes',    label: 'Planes'    },
  { to: '/reportes',  label: 'Reportes'  },
]

const ROUTE_INDEX = {
  '/inicio':    0,
  '/pacientes': 1,
  '/analisis':  2,
  '/agenda':    3,
  '/planes':    4,
  '/reportes':  5,
  '/exportar':  5,
}

// ─── Componente raíz ──────────────────────────────────────────────────────────

export default function App() {
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    function handleFocusIn(e) {
      const el = e.target
      if (el.matches('input, select, textarea, button')) {
        el.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'center' })
      }
    }
    document.addEventListener('focusin', handleFocusIn)
    return () => document.removeEventListener('focusin', handleFocusIn)
  }, [])

  const theme                = useUIStore((s) => s.theme)
  const toggleTheme          = useUIStore((s) => s.toggleTheme)
  const swUpdateAvailable    = useUIStore((s) => s.swUpdateAvailable)
  const aplicarActualizacion = useUIStore((s) => s.aplicarActualizacion)

  const { pathname } = useLocation()
  const navigate     = useNavigate()
  const activeIndex  = ROUTE_INDEX[pathname] ?? 0

  const handleNewPatient = () => navigate('/pacientes')

  return (
    <div className="app-shell">

      {/* Orbs de fondo pastel */}
      <div className="bg-orb bg-orb--1" aria-hidden="true" />
      <div className="bg-orb bg-orb--2" aria-hidden="true" />
      <div className="bg-orb bg-orb--3" aria-hidden="true" />

      {/* ── Header ── */}
      <header className="app-header">
        <div className="app-header__brand">
          <span className="app-header__mark" aria-hidden="true" />
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

      {/* Banner de actualización SW */}
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

      <OfflineBanner />

      {/* Indicador de sesión activa — visible en toda la app cuando hay paciente seleccionado */}
      <ActivePatientBanner />

      {/* ── Asistente Inteligente — global, no intrusivo ── */}
      <AgenteIA />

      {/* ── Navegación superior — 6 pestañas con indicador deslizante GPU ── */}
      <nav
        className="app-topnav"
        style={{ '--active-tab': activeIndex }}
        aria-label="Navegación principal"
      >
        <div className="app-topnav__indicator" aria-hidden="true" />

        {TOP_TABS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `app-topnav__tab${isActive ? ' app-topnav__tab--active' : ''}`
            }
          >
            <span className="app-topnav__tab-label">{label}</span>
          </NavLink>
        ))}
      </nav>

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
            <Route path="/"           element={<Navigate to="/inicio"   replace />} />
            <Route path="/inicio"     element={<HomeDashboard onNewPatient={handleNewPatient} />} />
            <Route path="/pacientes"  element={<Pacientes />} />
            <Route path="/analisis"   element={<AnalysisDashboard />} />
            <Route path="/agenda"     element={<Agenda />} />
            <Route path="/planes"     element={<Planes />} />
            <Route path="/reportes"   element={<ExportarReporte />} />
            <Route path="/plan"       element={<Navigate to="/planes"   replace />} />
            <Route path="/exportar"   element={<Navigate to="/reportes" replace />} />
            <Route path="*"           element={<Navigate to="/inicio"   replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  )
}

// ─── Íconos funcionales ───────────────────────────────────────────────────────

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
