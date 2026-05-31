/**
 * src/services/ai/patientMonitoring.ts
 * Motor de monitoreo de evolución y adherencia — NutriApp Profesional
 *
 * Analiza preferencias alimentarias (intolerancias/disgustos) y tendencias
 * de IMC/peso entre consultas. Retorna AgentSuggestion[] con status pending_review.
 * Sin efectos secundarios — función pura, compatible con IndexedDB local.
 */

import type { AgentSuggestion } from './agent'

// ─── Interfaces del módulo ────────────────────────────────────────────────────

export interface PatientProfile {
  id: string
  nombre: string
  objetivo?: 'bajar' | 'mantener' | 'subir' | 'musculo' | 'salud'
  intolerancias?: string[]      // ['lactosa', 'gluten', ...]
  alimentosNoGustan?: string[]  // ['pescado', 'brócoli', ...]
  condicionesMedicas?: string   // texto libre — compatibilidad con PatientData
  alergias?: string             // texto libre — compatibilidad con PatientData
}

export interface ConsultationRecord {
  id: string
  fecha: string   // ISO date (YYYY-MM-DD o timestamp)
  peso: number    // kg
  imc: number     // kg/m²
}

// ─── Helpers locales ──────────────────────────────────────────────────────────

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

function ts(): string {
  return new Date().toISOString()
}

// ─── Intolerancia a lactosa ───────────────────────────────────────────────────

function checkLactoseIntolerance(profile: PatientProfile): AgentSuggestion | null {
  const intol = profile.intolerancias ?? []
  const cond  = (profile.condicionesMedicas ?? '').toLowerCase()
  const aler  = (profile.alergias ?? '').toLowerCase()

  const hasLactose =
    intol.some(i => i.toLowerCase().includes('lactosa')) ||
    cond.includes('lactosa') ||
    aler.includes('lactosa')

  if (!hasLactose) return null

  return {
    id: uid('mon-lactosa'),
    title: 'Intolerancia a lactosa — sustitución de lácteos indicada',
    description:
      'Reemplazar lácteos convencionales por alternativas sin lactosa o leches vegetales (avena, almendra, soja). ' +
      'Garantizar calcio 1000–1200 mg/día mediante brócoli, tofu con calcio, almendras, semillas de sésamo y sardinas.',
    type: 'ajuste',
    priority: 'media',
    status: 'pending_review',
    actionPayload: {
      action: 'restrict_food',
      foods: ['leche entera', 'queso duro', 'yogur común', 'crema de leche', 'dulce de leche'],
      reason: 'Intolerancia a lactosa registrada — sustituir por versiones sin lactosa o alternativas vegetales',
    },
    evidenceLevel: 'A',
    createdAt: ts(),
  }
}

// ─── Alerta proactiva por rechazo al pescado ──────────────────────────────────

const FISH_PATTERN = /pescado|atún|atun|sardina|merluza|salmón|salmon|caballa|anchoa/i

function checkFishDislike(profile: PatientProfile): AgentSuggestion | null {
  const noGustan = profile.alimentosNoGustan ?? []
  if (!noGustan.some(f => FISH_PATTERN.test(f))) return null

  return {
    id: uid('mon-pescado'),
    title: 'Alerta profesional: paciente rechaza pescado — riesgo déficit omega-3',
    description:
      'El paciente registra rechazo al pescado. Evaluar fuentes alternativas de omega-3 y DHA: ' +
      'nueces (7 u/día), semillas de chía (15–20 g/día), lino molido, aceite de canola. ' +
      'Considerar suplemento de omega-3 de algas si el déficit es clínicamente relevante.',
    type: 'alerta',
    priority: 'media',
    status: 'pending_review',
    actionPayload: {
      action: 'adjust_macro',
      nutrient: 'omega3',
      direction: 'increase',
      note: 'Pescado rechazado: cubrir EPA/DHA con nueces, chía, lino molido o suplemento de omega-3 de algas (DHA 200–500 mg/día).',
    },
    evidenceLevel: 'B',
    createdAt: ts(),
  }
}

// ─── Evolución de IMC y Peso ──────────────────────────────────────────────────

function checkBmiEvolution(
  profile: PatientProfile,
  history: ConsultationRecord[],
): AgentSuggestion[] {
  if (history.length < 2) return []

  // Ordenar descendente: sorted[0] = más reciente, sorted[1] = anterior
  const sorted = [...history].sort((a, b) => b.fecha.localeCompare(a.fecha))
  const last = sorted[0]
  const prev = sorted[1]
  const out: AgentSuggestion[] = []

  // Regla 1: IMC cae por debajo de 18.5 (bajo peso)
  if (last.imc < 18.5) {
    const crossedThreshold = prev.imc >= 18.5

    out.push({
      id: uid('mon-imc-bajo'),
      title: crossedThreshold
        ? 'Caída a bajo peso — IMC descendió por debajo de 18.5'
        : 'Bajo peso persistente — revisar aporte calórico total',
      description:
        `IMC actual: ${last.imc.toFixed(1)} kg/m² (anterior: ${prev.imc.toFixed(1)} kg/m²). ` +
        'Revisar aporte energético e incrementar kilocalorías de forma gradual (+300–500 kcal/día) ' +
        'con alimentos de alta densidad nutricional: palta, frutos secos, aceite de oliva, legumbres, huevo.',
      type: 'ajuste',
      priority: crossedThreshold ? 'alta' : 'media',
      status: 'pending_review',
      actionPayload: {
        action: 'adjust_macro',
        nutrient: 'proteina',
        direction: 'increase',
        amountGPerKg: 1.5,
        note: 'Superávit +300–500 kcal/día. Proteína ≥1.5 g/kg. Colaciones densas en energía entre comidas principales.',
      },
      evidenceLevel: 'A',
      createdAt: ts(),
    })
  }

  // Regla 2: objetivo bajar pero peso estancado o en ascenso en últimas 2 consultas
  if (profile.objetivo === 'bajar') {
    const delta = last.peso - prev.peso

    if (delta >= 0) {
      const isStall = delta < 0.3

      out.push({
        id: uid('mon-bajar-stall'),
        title: isStall
          ? 'Estancamiento de peso — objetivo descenso sin progreso'
          : `Aumento de peso (${delta.toFixed(1)} kg) con objetivo de descenso`,
        description: isStall
          ? `Peso sin cambio significativo entre últimas 2 consultas (${prev.peso.toFixed(1)} → ${last.peso.toFixed(1)} kg). ` +
            'Revisar tamaño de porciones, densidad calórica del plan y registros de ingesta real. ' +
            'Evaluar posible meseta metabólica y considerar ajuste de kilocalorías o estrategia de refeed controlado.'
          : `Peso aumentó ${delta.toFixed(1)} kg (de ${prev.peso.toFixed(1)} a ${last.peso.toFixed(1)} kg) en sentido contrario al objetivo. ` +
            'Reajustar kilocalorías totales del plan. Verificar adherencia, colaciones no registradas y tamaño de porciones.',
        type: 'ajuste',
        priority: isStall ? 'media' : 'alta',
        status: 'pending_review',
        actionPayload: {
          action: 'lifestyle',
          recommendation: isStall
            ? 'Auditoría de porciones: registrar ingesta real 3 días. Revisar aceites, snacks y bebidas calóricas no contabilizados.'
            : 'Reducir densidad calórica: reemplazar snacks ultra-procesados, revisar tamaño de porciones de cereales y grasas añadidas. Reajustar kcal totales del plan.',
        },
        evidenceLevel: 'B',
        createdAt: ts(),
      })
    }
  }

  return out
}

// ─── Función principal exportada ──────────────────────────────────────────────

export function analyzePatientEvolution(
  patientData: PatientProfile,
  history: ConsultationRecord[],
): AgentSuggestion[] {
  const out: AgentSuggestion[] = []

  const lactose = checkLactoseIntolerance(patientData)
  if (lactose) out.push(lactose)

  const fish = checkFishDislike(patientData)
  if (fish) out.push(fish)

  out.push(...checkBmiEvolution(patientData, history))

  return out
}
