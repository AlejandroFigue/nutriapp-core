/**
 * ActivePatientBanner — indicador global persistente del paciente en sesión.
 *
 * Se renderiza solo cuando hay un pacienteId activo en el UIStore.
 * Se suscribe a la fila de IndexedDB vía liveQuery para reflejar ediciones
 * en tiempo real sin necesidad de prop-drilling ni re-montajes.
 *
 * Acciones:
 *   "Ver Ficha"  → navega a /pacientes (abre la lista con el contexto activo)
 *   "Liberar"    → limpia pacienteId (store + sessionStorage) y va a /pacientes
 */

import { useEffect, useState } from 'react'
import { useNavigate }         from 'react-router-dom'
import { liveQuery }           from 'dexie'
import { useUIStore }          from '@/store/useUIStore'
import { db }                  from '@/db/database'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const OBJETIVO_LABELS = {
  bajar:    'Bajar peso',
  mantener: 'Mantener',
  subir:    'Subir peso',
  musculo:  'Ganar músculo',
  salud:    'Salud general',
}

function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return null
  const hoy = new Date()
  const nac = new Date(fechaNacimiento)
  let edad  = hoy.getFullYear() - nac.getFullYear()
  const dm  = hoy.getMonth() - nac.getMonth()
  if (dm < 0 || (dm === 0 && hoy.getDate() < nac.getDate())) edad--
  return edad > 0 ? edad : null
}

function resolverUltimoPeso(paciente) {
  // Preferir la última evolución antropométrica registrada
  if (Array.isArray(paciente.evoluciones) && paciente.evoluciones.length > 0) {
    const last = [...paciente.evoluciones].reverse().find((e) => e?.peso)
    if (last?.peso) return last.peso
  }
  return paciente.peso ?? null
}

// ─── Componente principal ──────────────────────────────────────────────────────

export default function ActivePatientBanner() {
  // Punto de anclaje al estado global — pacienteId es el pivot de toda la sesión
  const pacienteId    = useUIStore((s) => s.pacienteId)
  const setPacienteId = useUIStore((s) => s.setPacienteId)
  const navigate      = useNavigate()

  const [paciente, setPaciente] = useState(null)

  // Suscripción reactiva a IndexedDB: refleja cualquier edición del registro
  useEffect(() => {
    if (!pacienteId) {
      setPaciente(null)
      return
    }
    const obs = liveQuery(() => db.pacientes.get(pacienteId))
    const sub = obs.subscribe({
      next:  (p) => setPaciente(p ?? null),
      error: ()  => setPaciente(null),
    })
    return () => sub.unsubscribe()
  }, [pacienteId])

  // Sin paciente activo → sin banner (sin espacio visual ocupado)
  if (!pacienteId || !paciente) return null

  const nombreCompleto = [paciente.nombre, paciente.apellido].filter(Boolean).join(' ')
  const edad           = calcularEdad(paciente.fechaNacimiento)
  const peso           = resolverUltimoPeso(paciente)
  const objetivo       = OBJETIVO_LABELS[paciente.objetivo] ?? paciente.objetivo ?? null

  const handleVerFicha = () => navigate('/pacientes')

  const handleLiberar = () => {
    setPacienteId(null)   // limpia store + sessionStorage (ver useUIStore)
    navigate('/pacientes')
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Sesión activa con ${nombreCompleto}`}
      className="apb"
    >
      {/* ── Lado izquierdo — identidad del paciente ── */}
      <div className="apb__left">

        {/* Indicador de pulso verde — sesión activa */}
        <span className="apb__pulse" aria-hidden="true" />

        <div className="apb__info">
          <span className="apb__session-label">En sesión con</span>
          <span className="apb__name">{nombreCompleto}</span>
        </div>

        {/* Píldoras de datos rápidos */}
        <div className="apb__tags" aria-label="Datos rápidos del paciente">
          {edad   !== null && <span className="apb__tag">{edad} años</span>}
          {peso   !== null && <span className="apb__tag">{peso} kg</span>}
          {objetivo        && <span className="apb__tag">{objetivo}</span>}
        </div>
      </div>

      {/* ── Lado derecho — acciones contextuales ── */}
      <div className="apb__right">
        <button
          className="apb__btn-ficha"
          onClick={handleVerFicha}
          type="button"
          aria-label={`Ver ficha completa de ${nombreCompleto}`}
        >
          <IconUser aria-hidden="true" />
          Ver Ficha
        </button>

        <button
          className="apb__btn-liberar"
          onClick={handleLiberar}
          type="button"
          aria-label="Liberar sesión con paciente actual"
          title="Liberar paciente"
        >
          <IconX aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

// ─── Íconos ────────────────────────────────────────────────────────────────────

function IconUser() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
         aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function IconX() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
         aria-hidden="true">
      <line x1="18" y1="6"  x2="6"  y2="18" />
      <line x1="6"  y1="6"  x2="18" y2="18" />
    </svg>
  )
}
