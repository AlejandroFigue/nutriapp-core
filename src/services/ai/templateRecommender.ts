/**
 * src/services/ai/templateRecommender.ts
 * Recomendador de plantillas dietéticas — NutriApp Profesional
 *
 * Servicio puro (sin efectos secundarios, sin escritura a Dexie).
 * Recibe PatientProfile + DietTemplate[] y devuelve AgentSuggestion[]
 * ordenadas por relevancia decreciente.
 *
 * Algoritmo de puntuación (scoring local):
 *   Base score        100 por plantilla
 *   +40  Objetivo del paciente coincide con el de la plantilla
 *   EXCLUIR si el paciente es hipertenso y la plantilla tiene alto sodio
 *   EXCLUIR si la plantilla contiene ingredientes conflictivos con alergias/intolerancias
 *
 * Detección de objetivo: normaliza texto libre tanto del paciente como de
 * la plantilla a grupos semánticos (bajar / musculo / subir / mantener).
 *
 * Detección de alérgenos: escanea `ingredientes[]`, `tablaRP` (JSON rows),
 * nombre e indicaciones de la plantilla contra la lista de alergias.
 *
 * Detección de sodio alto: flag explícito `sodioAlto: true` en la plantilla
 * o presencia de alimentos marcadores de alto sodio en `tablaRP`.
 */

import type { AgentSuggestion } from './agent'

// ─── Interfaces públicas ──────────────────────────────────────────────────────

/**
 * Subconjunto del paciente necesario para el recomendador.
 * Compatible con el objeto `paciente` de Dexie y con PatientData de agent.ts.
 */
export interface PatientProfile {
  id: string
  nombre: string
  apellido?: string
  /** Valores esperados: 'bajar' | 'mantener' | 'subir' | 'musculo' | 'salud' */
  objetivo?: string
  condicionesMedicas?: string
  alergias?: string
  historia?: {
    presionArterial?: string
    [key: string]: unknown
  }
}

/**
 * Modelo de una plantilla dietética.
 * Campos de la tabla `plantillas` de Dexie más metadatos opcionales de seguridad.
 *
 * Para que los filtros de seguridad funcionen plenamente, los campos
 * `sodioAlto` e `ingredientes` deben estar presentes en las plantillas.
 * El recomendador también escanea `tablaRP` (heurística) cuando estos faltan.
 */
export interface DietTemplate {
  id: string
  nombre_plantilla: string
  /** Objetivo clínico de la plantilla (libre o normalizado). */
  objetivo?: string
  /** Lista de ingredientes notables — usada para detección de alérgenos. */
  ingredientes?: string[]
  /** true si la plantilla contiene alimentos de alto contenido sódico. */
  sodioAlto?: boolean
  /** JSON string de FilaRP[] (de PlanAlimentario). Escaneado para alérgenos. */
  tablaRP?: string
  indicacionesIniciales?: string
  indicaciones?: string
  creadoEn?: string
}

// ─── Grupos semánticos de objetivo ───────────────────────────────────────────

type ObjetivoGroup = 'bajar' | 'subir' | 'musculo' | 'mantener' | 'unknown'

const OBJETIVO_KEYWORDS: Record<Exclude<ObjetivoGroup, 'unknown'>, string[]> = {
  bajar: [
    'bajar', 'pérdida', 'perdida', 'adelgazar', 'descenso', 'déficit',
    'deficit', 'hipocalórico', 'hipocaloric', 'reducción', 'reduccion',
  ],
  subir: [
    'subir', 'ganancia de peso', 'hipercalórico', 'hipercalorico',
    'aumentar peso', 'engordar',
  ],
  musculo: [
    'musculo', 'músculo', 'hipertrofia', 'muscular', 'masa magra',
    'fuerza', 'proteico', 'anabolico', 'anabólico', 'volumen',
  ],
  mantener: [
    'mantener', 'mantenimiento', 'equilibrio', 'salud', 'bienestar',
    'equilibrado', 'normocalórico', 'normocalor',
  ],
}

function normalizeObjetivo(raw?: string): ObjetivoGroup {
  if (!raw) return 'unknown'
  const lower = raw.toLowerCase()
  for (const group of Object.keys(OBJETIVO_KEYWORDS) as Exclude<ObjetivoGroup, 'unknown'>[]) {
    if (OBJETIVO_KEYWORDS[group].some(k => lower.includes(k))) return group
  }
  return 'unknown'
}

// ─── Detección de hipertensión ────────────────────────────────────────────────

function isHypertensive(patient: PatientProfile): boolean {
  const cond = (patient.condicionesMedicas ?? '').toLowerCase()
  if (cond.includes('hipert')) return true
  const pa = patient.historia?.presionArterial
  if (!pa) return false
  const m = pa.match(/(\d+)\s*\/\s*(\d+)/)
  return m ? (parseInt(m[1]) >= 140 || parseInt(m[2]) >= 90) : false
}

// ─── Detección de sodio alto ──────────────────────────────────────────────────

// Alimentos marcadores de alto sodio detectables en texto libre de la plantilla.
const HIGH_SODIUM_MARKERS = [
  'embutido', 'fiambre', 'salchicha', 'mortadela', 'panceta',
  'chorizo', 'salchichón', 'salchichon', 'paté', 'pate',
  'enlatado', 'conserva', 'salmuera',
]

function parseTablaText(template: DietTemplate): string {
  if (!template.tablaRP) return ''
  try {
    const rows = JSON.parse(template.tablaRP) as { alimento?: string; caracteristicas?: string }[]
    return rows.map(r => `${r.alimento ?? ''} ${r.caracteristicas ?? ''}`).join(' ')
  } catch {
    return ''
  }
}

function hasHighSodium(template: DietTemplate): boolean {
  if (template.sodioAlto) return true
  const text = [
    template.nombre_plantilla,
    template.indicaciones ?? '',
    template.indicacionesIniciales ?? '',
    parseTablaText(template),
  ].join(' ').toLowerCase()
  return HIGH_SODIUM_MARKERS.some(marker => text.includes(marker))
}

// ─── Detección de alérgenos ───────────────────────────────────────────────────

function parseAllergenList(patient: PatientProfile): string[] {
  if (!patient.alergias) return []
  return patient.alergias
    .toLowerCase()
    .split(/[,;/\n]+/)
    .map(a => a.trim())
    .filter(Boolean)
}

function hasConflictingIngredient(allergens: string[], template: DietTemplate): boolean {
  if (!allergens.length) return false

  const ingredients = (template.ingredientes ?? []).map(i => i.toLowerCase())
  const tablaText   = parseTablaText(template).toLowerCase()

  const fullText = [
    template.nombre_plantilla,
    template.indicacionesIniciales ?? '',
    template.indicaciones ?? '',
    tablaText,
  ].join(' ').toLowerCase()

  return allergens.some(allergen =>
    ingredients.some(ing => ing.includes(allergen) || allergen.includes(ing)) ||
    fullText.includes(allergen),
  )
}

// ─── Puntuación individual ────────────────────────────────────────────────────

const SCORE_BASE             = 100
const SCORE_OBJECTIVE_MATCH  = 40
const SCORE_DISQUALIFIED     = Number.NEGATIVE_INFINITY

interface ScoredTemplate {
  template: DietTemplate
  score: number
  goalMatch: boolean
  disqualifyReason?: string
}

function scoreTemplate(patient: PatientProfile, template: DietTemplate): ScoredTemplate {
  let score = SCORE_BASE

  const patientGoal  = normalizeObjetivo(patient.objetivo)
  // Use template.objetivo first; fall back to scanning the template name
  const templateGoal = normalizeObjetivo(template.objetivo ?? template.nombre_plantilla)
  const goalMatch    = patientGoal !== 'unknown' && patientGoal === templateGoal

  if (goalMatch) score += SCORE_OBJECTIVE_MATCH

  // Safety: hypertension + high sodium
  if (isHypertensive(patient) && hasHighSodium(template)) {
    return {
      template,
      score:            SCORE_DISQUALIFIED,
      goalMatch,
      disqualifyReason: 'Contraindicada en hipertensión arterial — alto contenido de sodio',
    }
  }

  // Safety: allergens / intolerances
  const allergens = parseAllergenList(patient)
  if (hasConflictingIngredient(allergens, template)) {
    return {
      template,
      score:            SCORE_DISQUALIFIED,
      goalMatch,
      disqualifyReason: `Contiene ingredientes incompatibles con alergias/intolerancias registradas (${allergens.join(', ')})`,
    }
  }

  return { template, score, goalMatch }
}

// ─── UID helper ───────────────────────────────────────────────────────────────

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

// ─── Función principal exportada ──────────────────────────────────────────────

/**
 * Devuelve un array de AgentSuggestion[] ordenado por relevancia decreciente.
 *
 * Las plantillas clínicamente incompatibles (hipertensión + sodio alto, o
 * alergias detectadas) son excluidas del resultado; nunca se muestran al
 * profesional como opciones válidas para ese paciente.
 *
 * Cada sugerencia incluye `actionPayload.templateId` para que la UI pueda
 * aplicar la plantilla directamente al plan alimentario del paciente.
 */
export function getTemplateRecommendations(
  patient: PatientProfile,
  templates: DietTemplate[],
): AgentSuggestion[] {
  const now = new Date().toISOString()

  return templates
    .map(t => scoreTemplate(patient, t))
    .filter(s => s.score !== SCORE_DISQUALIFIED)
    .sort((a, b) => b.score - a.score)
    .map(({ template, score, goalMatch }) => {
      const isTopMatch = score >= SCORE_BASE + SCORE_OBJECTIVE_MATCH
      const priority: AgentSuggestion['priority'] = isTopMatch ? 'alta' : 'media'

      const descParts: string[] = []
      if (goalMatch && patient.objetivo) {
        descParts.push(`Alineada con el objetivo del paciente: "${patient.objetivo}".`)
      } else {
        descParts.push('Plantilla disponible — sin coincidencia directa de objetivo.')
      }
      if (template.objetivo) {
        descParts.push(`Orientada a: ${template.objetivo}.`)
      }

      return {
        id:          uid(`tpl-rec-${template.id}`),
        title:       `Plantilla sugerida: ${template.nombre_plantilla}`,
        description: descParts.join(' '),
        type:        'ajuste' as const,
        priority,
        status:      'pending_review' as const,
        actionPayload: {
          action:       'apply_template' as const,
          templateId:   template.id,
          templateName: template.nombre_plantilla,
        },
        evidenceLevel: goalMatch ? ('B' as const) : ('C' as const),
        createdAt:     now,
      } satisfies AgentSuggestion
    })
}
