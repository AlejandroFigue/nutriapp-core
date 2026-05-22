import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import OfflineBanner from '@/components/OfflineBanner'

const Plan = lazy(() => import('@/routes/Plan'))
const Registrar = lazy(() => import('@/routes/Registrar'))
const Progreso = lazy(() => import('@/routes/Progreso'))
const Buscar = lazy(() => import('@/routes/Buscar'))

export default function App() {
  return (
    <>
      <OfflineBanner />
      <Suspense
        fallback={
          <div
            className="loading-screen"
            role="status"
            aria-label="Cargando aplicación…"
          />
        }
      >
        <Routes>
          <Route path="/" element={<Navigate to="/plan" replace />} />
          <Route path="/plan" element={<Plan />} />
          <Route path="/registrar" element={<Registrar />} />
          <Route path="/progreso" element={<Progreso />} />
          <Route path="/buscar" element={<Buscar />} />
          <Route path="*" element={<Navigate to="/plan" replace />} />
        </Routes>
      </Suspense>
    </>
  )
}
