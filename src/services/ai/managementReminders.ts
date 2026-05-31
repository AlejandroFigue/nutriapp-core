/**
 * src/services/ai/managementReminders.ts
 * Motor de recordatorios de gestión — NutriApp Profesional
 *
 * Genera AgentSuggestion[] basadas en tres reglas cronológicas locales:
 *   1. Planes pendientes de envío (consulta en las últimas 48 h, plan sin enviar)
 *   2. Pacientes inactivos (sin visita en 45+ días y sin turno futuro)
 *   3. Insights estacionales/feriados (Hemisferio Sur · Posadas, Misiones)
 *
 * Sin efectos secundarios — función pura, sin escritura a Dexie.
 */

import type { AgentSuggestion } from './agent'

// ─── Interfaces del módulo ────────────────────────────────────────────────────

export interface PatientProfile {
  id: string
  nombre: string
  apellido?: string
  ultimaConsulta?: string   // ISO date/datetime de la última historia clínica
  planEstado?: 'pendiente_envio' | 'enviado' | 'activo' | null
}

export interface Appointment {
  id: string
  pacienteId: string
  fecha: string   // ISO date YYYY-MM-DD
  hora?: string
  estado?: string // 'confirmado' | 'pendiente' | 'cancelado'
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

function ts(): string {
  return new Date().toISOString()
}

function fullName(p: PatientProfile): string {
  return [p.nombre, p.apellido].filter(Boolean).join(' ')
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor(Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

// ─── Regla 1: Planes pendientes de envío ─────────────────────────────────────

const PENDING_PLAN_HOURS = 48

function checkPendingPlan(patient: PatientProfile, now: Date): AgentSuggestion | null {
  if (patient.planEstado !== 'pendiente_envio') return null
  if (!patient.ultimaConsulta) return null

  const lastConsult = new Date(patient.ultimaConsulta)
  if (isNaN(lastConsult.getTime())) return null

  const hoursElapsed = (now.getTime() - lastConsult.getTime()) / (1000 * 60 * 60)
  if (hoursElapsed > PENDING_PLAN_HOURS) return null

  const nombre     = fullName(patient)
  const horasStr   = Math.floor(hoursElapsed)
  const fechaStr   = lastConsult.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return {
    id: uid('mgmt-plan-pending'),
    title: `Plan pendiente de envío — ${nombre}`,
    description:
      `Consulta del ${fechaStr}: el plan alimentario aún figura como pendiente de envío. ` +
      `Transcurrieron ${horasStr} h de las 48 h recomendadas. ` +
      `Enviar el plan al paciente para garantizar la continuidad del tratamiento.`,
    type: 'recordatorio',
    priority: 'alta',
    status: 'pending_review',
    actionPayload: {
      action: 'schedule_followup',
      days: 0,
      reason: `Envío pendiente de plan para ${nombre} — consulta del ${fechaStr}.`,
    },
    evidenceLevel: 'C',
    createdAt: ts(),
  }
}

// ─── Regla 2: Pacientes inactivos ─────────────────────────────────────────────

const INACTIVE_DAYS_THRESHOLD = 45

function checkInactivePatient(
  patient: PatientProfile,
  appointments: Appointment[],
  now: Date,
): AgentSuggestion | null {
  if (!patient.ultimaConsulta) return null

  const lastVisit = new Date(patient.ultimaConsulta)
  if (isNaN(lastVisit.getTime())) return null

  const elapsed = daysBetween(lastVisit, now)
  if (elapsed <= INACTIVE_DAYS_THRESHOLD) return null

  const today = now.toISOString().slice(0, 10)
  const hasFutureAppointment = appointments.some(
    (a) =>
      a.pacienteId === patient.id &&
      a.fecha >= today &&
      a.estado !== 'cancelado',
  )
  if (hasFutureAppointment) return null

  const nombre = fullName(patient)

  return {
    id: uid('mgmt-inactive'),
    title: `Paciente sin actividad — ${nombre}`,
    description:
      `${nombre} no registra consultas hace ${elapsed} días y no tiene turnos futuros agendados. ` +
      `Contactar para evaluar adherencia al plan y retomar el seguimiento nutricional.`,
    type: 'recordatorio',
    priority: elapsed > 90 ? 'alta' : 'media',
    status: 'pending_review',
    actionPayload: {
      action: 'schedule_followup',
      days: 7,
      reason: `${elapsed} días sin consulta — riesgo de abandono del plan.`,
    },
    evidenceLevel: 'C',
    createdAt: ts(),
  }
}

// ─── Regla 3: Inteligencia estacional y feriados ──────────────────────────────

interface SeasonalRule {
  condition: (d: Date) => boolean
  title: string
  description: string
  recommendation: string
}

const SEASONAL_RULES: SeasonalRule[] = [
  // ── Fiestas de fin de año (15-31 diciembre) ──
  {
    condition: (d) => d.getMonth() === 11 && d.getDate() >= 15,
    title: 'Fiestas de fin de año — flexibilidad alimentaria',
    description:
      'Se acercan Nochebuena y Año Nuevo. Planificar con los pacientes estrategias de ' +
      'flexibilidad para disfrutar las celebraciones sin generar culpa ni perder los ' +
      'objetivos: menús festivos equilibrados, control de porciones y reencuadre positivo.',
    recommendation:
      'Anticipar menús navideños saludables, hidratación adecuada y reencuadre positivo en la próxima consulta.',
  },
  // ── Verano subtropical (diciembre 1-14, enero, febrero) ──
  {
    condition: (d) => {
      const m = d.getMonth() + 1
      return m === 1 || m === 2 || (m === 12 && d.getDate() < 15)
    },
    title: 'Verano subtropical — alerta de hidratación',
    description:
      'Posadas en verano: temperaturas extremas elevan el riesgo de deshidratación. ' +
      'Reforzar la meta de ≥2.5 L/día en pacientes con HTA, diabetes y adultos mayores. ' +
      'Frutas tropicales locales (mango, mamón, ananá) como fuente de hidratación natural.',
    recommendation:
      'Incluir recordatorio de hidratación en los planes activos. Priorizar preparaciones frías y frutas de estación.',
  },
  // ── Carnaval de Posadas (febrero) ──
  {
    condition: (d) => d.getMonth() === 1,
    title: 'Carnaval de Posadas — prevención de excesos',
    description:
      'Temporada de Carnaval: mayor consumo de alcohol, frituras y snacks ultraprocesados. ' +
      'Preparar a los pacientes con estrategias concretas para disfrutar las comparsas ' +
      'sin desviarse del plan nutricional.',
    recommendation:
      'Sugerir hidratación entre bebidas alcohólicas, elegir snacks proteicos y no saltear comidas principales.',
  },
  // ── Otoño (marzo-mayo) ──
  {
    condition: (d) => {
      const m = d.getMonth() + 1
      return m >= 3 && m <= 5
    },
    title: 'Otoño — cítricos de cosecha y transición energética',
    description:
      'Otoño en el NEA: temporada alta de naranjas, mandarinas y pomelos locales. ' +
      'Oportunidad para reforzar el aporte de vitamina C y preparar a los pacientes ' +
      'para el aumento de demanda calórica del invierno.',
    recommendation:
      'Incorporar cítricos de temporada en los planes. Evaluar necesidad de suplementación vitamínica anticipada.',
  },
  // ── Feriados patrios de mayo y julio (asados/reuniones) ──
  {
    condition: (d) => {
      const m = d.getMonth() + 1
      const day = d.getDate()
      return (m === 5 && day >= 20 && day <= 26) || (m === 7 && day >= 5 && day <= 11)
    },
    title: 'Feriado patrio — asados y reuniones sociales',
    description:
      'Feriado nacional próximo (25 de Mayo o 9 de Julio): reuniones familiares con ' +
      'asados y comidas abundantes. Anticipar con los pacientes estrategias para disfrutar ' +
      'sin comprometer los objetivos nutricionales.',
    recommendation:
      'Priorizar ensaladas, proteína magra y porciones moderadas. Hidratarse bien durante el evento.',
  },
  // ── Invierno (junio-agosto) ──
  {
    condition: (d) => {
      const m = d.getMonth() + 1
      return m >= 6 && m <= 8
    },
    title: 'Invierno — vitamina D y confort térmico',
    description:
      'Invierno en Posadas: menor exposición solar reduce la síntesis de vitamina D. ' +
      'Mayor demanda de alimentos reconfortantes puede impactar el plan. Momento ideal ' +
      'para revisar niveles séricos y considerar suplementación en pacientes de riesgo.',
    recommendation:
      'Solicitar dosaje de 25-OH Vitamina D. Proponer recetas saludables de caldos, guisos y sopas para el frío.',
  },
  // ── Fiesta del Migrante (septiembre) ──
  {
    condition: (d) => d.getMonth() === 8,
    title: 'Fiesta Nacional del Migrante — gastronomía diversa',
    description:
      'Septiembre en Posadas: Fiesta Nacional del Migrante y eventos gastronómicos ' +
      'multiculturales. Oportunidad para enriquecer los planes con diversidad culinaria ' +
      'y anticipar estrategias para las comidas festivas.',
    recommendation:
      'Incorporar alimentos típicos de diversas culturas dentro del balance nutricional del plan.',
  },
  // ── Primavera (septiembre-noviembre) ──
  {
    condition: (d) => {
      const m = d.getMonth() + 1
      return m >= 9 && m <= 11
    },
    title: 'Primavera — reinicio de actividad física al aire libre',
    description:
      'Primavera en el NEA: clima favorable para actividad física al aire libre. ' +
      'Momento óptimo para motivar el movimiento y ajustar los planes hacia objetivos ' +
      'de composición corporal. Frutas de temporada: ananá, frutilla, durazno, mango.',
    recommendation:
      'Alinear planes con mayor actividad física prevista. Incorporar antioxidantes y frutas de estación.',
  },
]

function getSeasonalInsights(now: Date): AgentSuggestion[] {
  return SEASONAL_RULES
    .filter((rule) => rule.condition(now))
    .map((rule) => ({
      id: uid('mgmt-seasonal'),
      title: rule.title,
      description: rule.description,
      type: 'recordatorio' as const,
      priority: 'baja' as const,
      status: 'pending_review' as const,
      actionPayload: {
        action: 'lifestyle' as const,
        recommendation: rule.recommendation,
      },
      evidenceLevel: 'C' as const,
      createdAt: ts(),
    }))
}

// ─── Función principal exportada ──────────────────────────────────────────────

const PRIORITY_ORDER: Record<AgentSuggestion['priority'], number> = { alta: 0, media: 1, baja: 2 }

export function generateManagementReminders(
  patients: PatientProfile[],
  appointments: Appointment[],
): AgentSuggestion[] {
  const now = new Date()
  const out: AgentSuggestion[] = []

  for (const patient of patients) {
    const planAlert     = checkPendingPlan(patient, now)
    const inactiveAlert = checkInactivePatient(patient, appointments, now)
    if (planAlert)     out.push(planAlert)
    if (inactiveAlert) out.push(inactiveAlert)
  }

  out.push(...getSeasonalInsights(now))

  return out.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
}
