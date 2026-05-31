/**
 * src/services/ai/appointmentScheduler.ts
 * Motor de turnos inteligente — NutriApp Profesional
 *
 * Función pura, sin efectos secundarios, sin escritura a Dexie.
 * Genera disponibilidad horaria en bloques de 1 hora y emite alertas
 * estructuradas (AgentSuggestion) ante colisiones o saturación de agenda.
 */

import type { AgentSuggestion } from './agent'
import type { Appointment } from './managementReminders'

export type { Appointment }

// ─── Interfaces públicas ──────────────────────────────────────────────────────

export interface WorkingHours {
  startHour: number   // ej. 8  → 08:00
  endHour: number     // ej. 16 → 16:00
}

export interface TimeSlot {
  start: string       // "HH:MM"
  end: string         // "HH:MM"
  available: boolean
}

export interface SchedulerResult {
  slots: TimeSlot[]
  alerts: AgentSuggestion[]
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

function ts(): string {
  return new Date().toISOString()
}

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

function toHHMM(hour: number): string {
  return `${pad(hour)}:00`
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Extrae el número de hora de "HH:MM" o "HH:MM:SS". Devuelve -1 si no parsea. */
function parseHour(hora: string | undefined): number {
  if (!hora) return -1
  const m = hora.match(/^(\d{1,2}):/)
  return m ? parseInt(m[1], 10) : -1
}

const CAPACITY_THRESHOLD = 0.9

// ─── Algoritmo de disponibilidad ──────────────────────────────────────────────

export function getSmartAvailability(
  workingHours: WorkingHours,
  existingAppointments: Appointment[],
  targetDate: Date,
): SchedulerResult {
  const { startHour, endHour } = workingHours
  const dateStr = formatDate(targetDate)
  const alerts: AgentSuggestion[] = []

  // Solo turnos de la fecha objetivo, sin cancelados
  const dayAppointments = existingAppointments.filter(
    (a) => a.fecha === dateStr && a.estado !== 'cancelado',
  )

  // Mapa hora entera → turnos en ese bloque
  const occupancyMap = new Map<number, Appointment[]>()
  for (const appt of dayAppointments) {
    const h = parseHour(appt.hora)
    if (h >= startHour && h < endHour) {
      const bucket = occupancyMap.get(h) ?? []
      bucket.push(appt)
      occupancyMap.set(h, bucket)
    }
  }

  // Generar bloques de 1 hora y detectar colisiones
  const totalSlots = endHour - startHour
  const slots: TimeSlot[] = []
  let occupiedCount = 0

  for (let h = startHour; h < endHour; h++) {
    const appts = occupancyMap.get(h) ?? []
    const occupied = appts.length > 0
    if (occupied) occupiedCount++

    slots.push({ start: toHHMM(h), end: toHHMM(h + 1), available: !occupied })

    // Colisión: 2 o más turnos en el mismo bloque
    if (appts.length >= 2) {
      const bloque = `${toHHMM(h)}–${toHHMM(h + 1)}`
      const exceso = appts.length - 1
      alerts.push({
        id: uid('sched-collision'),
        title: `Colisión horaria — bloque ${toHHMM(h)} del ${dateStr}`,
        description:
          `Se detectaron ${appts.length} turnos asignados al bloque ${bloque}. ` +
          `${exceso} turno${exceso !== 1 ? 's' : ''} deb${exceso !== 1 ? 'en' : 'e'} ser reubicado${exceso !== 1 ? 's' : ''} ` +
          `para evitar superposición. Revisar la agenda y reasignar a un bloque libre.`,
        type: 'alerta',
        priority: 'alta',
        status: 'pending_review',
        actionPayload: {
          action: 'schedule_followup',
          days: 0,
          reason: `Colisión en bloque ${bloque} del ${dateStr} — reubicar turnos superpuestos.`,
        },
        evidenceLevel: 'C',
        createdAt: ts(),
      })
    }
  }

  // Saturación: agenda ≥ 90% de capacidad
  const capacityRatio = totalSlots > 0 ? occupiedCount / totalSlots : 0
  if (capacityRatio >= CAPACITY_THRESHOLD) {
    const pct = Math.round(capacityRatio * 100)
    const libres = totalSlots - occupiedCount
    const libresTxt = libres === 0
      ? 'No hay disponibilidad horaria restante.'
      : `Solo queda${libres > 1 ? 'n' : ''} ${libres} bloque${libres > 1 ? 's' : ''} libre${libres > 1 ? 's' : ''}.`
    alerts.push({
      id: uid('sched-capacity'),
      title: `Agenda al ${pct}% de capacidad — ${dateStr}`,
      description:
        `La jornada del ${dateStr} tiene ${occupiedCount} de ${totalSlots} bloques ocupados (${pct}%). ` +
        `${libresTxt} ` +
        `Evaluar habilitar horario extendido o redirigir nuevos turnos a otra fecha.`,
      type: 'alerta',
      priority: 'alta',
      status: 'pending_review',
      actionPayload: {
        action: 'schedule_followup',
        days: 1,
        reason: `Agenda al ${pct}% el ${dateStr} — gestionar disponibilidad antes de confirmar nuevos turnos.`,
      },
      evidenceLevel: 'C',
      createdAt: ts(),
    })
  }

  return { slots, alerts }
}
