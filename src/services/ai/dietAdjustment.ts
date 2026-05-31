/**
 * src/services/ai/dietAdjustment.ts
 * Servicio de ajuste dietético — NutriApp Profesional
 *
 * Servicio puro (sin efectos secundarios, sin escritura a Dexie).
 * Analiza el balance de un plan alimentario (tablaRP) contra el perfil clínico
 * del paciente y retorna sugerencias de ajuste ordenadas por prioridad.
 */

// ─── Interfaces públicas ──────────────────────────────────────────────────────

export interface FilaRP {
  id: string
  grupo: string
  alimento: string
  caracteristicas: string
  cantidad: string
}

export interface DietPlan {
  id: string
  pacienteId: string
  fecha: string
  tablaRP: FilaRP[] | string    // acepta el JSON string tal como se guarda en Dexie
  indicacionesIniciales?: string
}

export interface PatientProfile {
  id: string
  nombre: string
  peso?: number
  genero?: 'femenino' | 'masculino' | 'otro' | 'prefiero-no-decir'
  edad?: number
  isHipertenso?: boolean
  isIntoleranteLactosa?: boolean
  condicionesMedicas?: string
}

export interface DietAdjustmentSuggestion {
  id: string
  nutrient: string
  recommendation: string
  priority: 'alta' | 'media'
}

// ─── Etiquetas de grupos (matches GRUPOS_RP de PlanAlimentario.jsx) ────────────

const G_LACTEOS    = 'Lácteos'
const G_HUEVOS     = 'Huevos'
const G_CARNES     = 'Carnes y aves'
const G_PESCADOS   = 'Pescados y mariscos'
const G_HORTALIZAS = 'Hortalizas'
const G_FRUTAS     = 'Frutas'
const G_CEREALES   = 'Cereales y panificados'
const G_LEGUMBRES  = 'Legumbres'

// Términos específicos de alimentos lácteos para el filtro de lactosa.
// Se usan palabras concretas, no el término genérico "lácteo", para evitar
// falsos positivos en recomendaciones que discuten sustituciones.
const DAIRY_KEYWORDS = [
  'leche', 'yogur', 'queso', 'crema de leche', 'manteca',
  'ricota', 'caseína', 'caseina', 'suero de leche', 'whey', 'kéfir', 'kefir',
]

// ─── Helpers internos ─────────────────────────────────────────────────────────

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

function isFemale(p: PatientProfile): boolean {
  return p.genero === 'femenino'
}

function parseTablaRP(raw: FilaRP[] | string): FilaRP[] {
  if (!raw) return []
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return [] }
  }
  return raw
}

function getFilledGroups(rows: FilaRP[]): Set<string> {
  return new Set(rows.filter(r => r.alimento.trim() !== '').map(r => r.grupo))
}

function getAllFoodsText(rows: FilaRP[]): string {
  return rows
    .filter(r => r.alimento.trim() !== '')
    .map(r => `${r.alimento} ${r.caracteristicas}`.toLowerCase())
    .join(' ')
}

function containsDairy(text: string): boolean {
  const lower = text.toLowerCase()
  return DAIRY_KEYWORDS.some(k => lower.includes(k))
}

// ─── Verificador — Proteína ───────────────────────────────────────────────────

function checkProtein(
  groups: Set<string>,
  profile: PatientProfile
): DietAdjustmentSuggestion | null {
  const hasProtein =
    groups.has(G_CARNES) || groups.has(G_PESCADOS) ||
    groups.has(G_HUEVOS) || groups.has(G_LEGUMBRES)
  if (hasProtein) return null

  const pesoRef = profile.peso ? `${profile.peso} kg del paciente` : 'el peso corporal'
  return {
    id: uid('prot'),
    nutrient: 'proteína',
    recommendation: `Incorporar al menos una fuente de proteína completa en cada comida principal: pollo, pescado, huevo o legumbres (lentejas, garbanzos, porotos negros). Meta orientativa: 0.8–1.2 g/kg/día sobre ${pesoRef}.`,
    priority: 'media',
  }
}

// ─── Verificador — Hierro ─────────────────────────────────────────────────────

function checkIron(
  groups: Set<string>,
  allFoods: string,
  profile: PatientProfile
): DietAdjustmentSuggestion | null {
  const hasHemeIron    = groups.has(G_CARNES) || groups.has(G_PESCADOS)
  const hasNonHemeIron = groups.has(G_LEGUMBRES)
  const hasIronVeg     =
    allFoods.includes('espinaca') || allFoods.includes('brócoli') ||
    allFoods.includes('brocoli')  || allFoods.includes('acelga')
  if (hasHemeIron || hasNonHemeIron || hasIronVeg) return null

  const f = isFemale(profile)
  return {
    id: uid('hierro'),
    nutrient: 'hierro',
    recommendation: f
      ? 'Incluir fuentes de hierro diariamente: carne roja o hígado (hierro hem) y lentejas o espinaca (hierro no-hem). Combinar siempre con vitamina C (naranja, kiwi, limón) en la misma comida para potenciar la absorción. Mujeres: requieren 18 mg/día.'
      : 'Incorporar fuentes de hierro: carne roja magra, legumbres o vegetales de hoja verde oscura (espinaca, acelga). Combinar con vitamina C en la misma comida para optimizar la absorción. Meta: 8 mg/día.',
    priority: f ? 'alta' : 'media',
  }
}

// ─── Verificador — Calcio ─────────────────────────────────────────────────────

function checkCalcium(
  groups: Set<string>,
  allFoods: string,
  profile: PatientProfile
): DietAdjustmentSuggestion | null {
  const hasDairy = groups.has(G_LACTEOS)
  const hasFishCalcium =
    groups.has(G_PESCADOS) &&
    (allFoods.includes('sardin') || allFoods.includes('anchoa'))
  const hasVegCalcium =
    allFoods.includes('brócoli') || allFoods.includes('brocoli') ||
    allFoods.includes('sésamo')  || allFoods.includes('sesamo') ||
    allFoods.includes('almendra')|| allFoods.includes('tofu')

  // Paciente intolerante con lácteos en el plan → sustitución urgente
  if (profile.isIntoleranteLactosa && hasDairy) {
    return {
      id: uid('calcio-lactosa'),
      nutrient: 'calcio / intolerancia a lactosa',
      // La recomendación NO menciona términos lácteos para no ser filtrada por applyLactoseFilter
      recommendation:
        'Reemplazar los alimentos con lactosa del plan por alternativas enriquecidas con calcio: bebida de almendras, bebida de avena o de soja (enriquecidas), brócoli, semillas de sésamo, sardinas con espinas y tofu. Meta: 1000–1200 mg/día.',
      priority: 'alta',
    }
  }

  // Sin ninguna fuente de calcio + intolerante → sugerencia no-láctea
  const hasAnyCalcium = hasDairy || hasFishCalcium || hasVegCalcium
  if (!hasAnyCalcium && profile.isIntoleranteLactosa) {
    return {
      id: uid('calcio-alt'),
      nutrient: 'calcio',
      recommendation:
        'Incorporar fuentes de calcio sin lactosa: bebida de almendras o avena enriquecida, brócoli, semillas de sésamo, sardinas con espinas y almendras. Meta: 1000–1200 mg/día.',
      priority: 'alta',
    }
  }

  // Sin ninguna fuente de calcio + sin intolerancia → fuentes convencionales
  if (!hasAnyCalcium) {
    return {
      id: uid('calcio'),
      nutrient: 'calcio',
      recommendation:
        'Incluir fuentes de calcio diarias: yogur natural, leche o queso fresco. Alternativas no-lácteas: brócoli, almendras, sésamo y sardinas. Meta: 1000–1200 mg/día.',
      priority: 'media',
    }
  }

  return null
}

// ─── Verificador — Hipertensión (plan DASH) ────────────────────────────────────

function checkHipertension(
  groups: Set<string>,
  rows: FilaRP[],
  profile: PatientProfile
): DietAdjustmentSuggestion[] {
  if (!profile.isHipertenso) return []
  const out: DietAdjustmentSuggestion[] = []

  const allText = getAllFoodsText(rows)
  const HIGH_SODIUM_WORDS = [
    'embutido', 'fiambre', 'salame', 'salami', 'chorizo',
    'jamón', 'jamon', 'panceta', 'mortadela', 'paté', 'pate',
    'enlatado', 'conserva', 'pickles',
  ]
  const hasSodiumRisk = HIGH_SODIUM_WORDS.some(k => allText.includes(k))

  if (hasSodiumRisk) {
    out.push({
      id: uid('hta-sodio'),
      nutrient: 'sodio / hipertensión',
      recommendation:
        'Retirar embutidos, fiambres y alimentos procesados del plan: aportan sodio oculto en exceso. Reemplazar por pollo o pavo al horno, legumbres y vegetales frescos. Sodio total <2000 mg/día (equivale a ~1 cdta de sal).',
      priority: 'alta',
    })
  }

  // Verificar presencia de alimentos clave del plan DASH
  const missingHortalizas = !groups.has(G_HORTALIZAS)
  const missingFrutas     = !groups.has(G_FRUTAS)
  if (missingHortalizas || missingFrutas) {
    out.push({
      id: uid('hta-dash'),
      nutrient: 'potasio / plan DASH',
      recommendation:
        'Reforzar plan DASH: incorporar 8–10 porciones diarias de frutas y verduras frescas. Priorizar banana, espinaca, papa con cáscara y legumbres para alcanzar potasio ≥4700 mg/día. Limitar sal de mesa a 1 cdta/día (5 g total).',
      priority: 'media',
    })
  }

  return out
}

// ─── Filtro de lactosa (capa de seguridad) ────────────────────────────────────

function applyLactoseFilter(
  suggestions: DietAdjustmentSuggestion[],
  profile: PatientProfile
): DietAdjustmentSuggestion[] {
  if (!profile.isIntoleranteLactosa) return suggestions
  return suggestions.filter(s => !containsDairy(s.recommendation))
}

// ─── Función principal exportada ──────────────────────────────────────────────

export function analyzeDietBalance(
  plan: DietPlan,
  patientProfile: PatientProfile
): DietAdjustmentSuggestion[] {
  const rows    = parseTablaRP(plan.tablaRP)
  const groups  = getFilledGroups(rows)
  const allFoods = getAllFoodsText(rows)

  const candidates: DietAdjustmentSuggestion[] = [
    checkProtein(groups, patientProfile),
    checkIron(groups, allFoods, patientProfile),
    checkCalcium(groups, allFoods, patientProfile),
    ...checkHipertension(groups, rows, patientProfile),
  ].filter((s): s is DietAdjustmentSuggestion => s !== null)

  return applyLactoseFilter(candidates, patientProfile)
    .sort((a, b) =>
      a.priority === 'alta' && b.priority !== 'alta' ? -1 :
      b.priority === 'alta' && a.priority !== 'alta' ?  1 : 0
    )
}
