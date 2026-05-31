/**
 * src/services/ai/agent.ts
 * Motor de análisis clínico — Agente IA NutriApp Profesional
 *
 * Servicio puro (sin efectos secundarios, sin escritura a Dexie).
 * Recibe PatientData y devuelve AgentSuggestion[] ordenadas por prioridad.
 * Diseñado para Posadas, Misiones — contexto estacional subtropical.
 */

// ─── Interfaces públicas ──────────────────────────────────────────────────────

export interface HemogramaData {
  hemoglobina?: number           // g/dL  ♀ 12–16  ♂ 13.5–17.5
  hematocrito?: number           // %     ♀ 36–46  ♂ 41–53
  globulosBlancos?: number       // × 10³/µL  normal 4.5–11.0
  plaquetas?: number             // × 10³/µL  normal 150–400
  ferritina?: number             // ng/mL  ♀ 12–150  ♂ 12–300
  hierro?: number                // µg/dL  60–170
  saturacionTransferrina?: number// %  20–50
}

export interface LipidosData {
  colesterolTotal?: number       // mg/dL  deseable <200
  hdl?: number                   // mg/dL  ♀ >55  ♂ >45
  ldl?: number                   // mg/dL  óptimo <100
  trigliceridos?: number         // mg/dL  normal <150
  vldl?: number                  // mg/dL  <30
}

export interface TiroidesData {
  tsh?: number                   // mUI/L  0.4–4.0
  t4libre?: number               // ng/dL  0.8–1.8
  t3libre?: number               // pg/mL  2.3–4.2
}

export interface RenalData {
  urea?: number                  // mg/dL  10–50
  creatinina?: number            // mg/dL  ♀ 0.5–1.1  ♂ 0.7–1.3
  acidoUrico?: number            // mg/dL  ♀ 2.4–5.7  ♂ 3.5–7.2
  tfg?: number                   // mL/min/1.73m²
}

export interface GlucemiaData {
  glucosaAyunas?: number         // mg/dL  normal 70–99
  glucosaPostprandial?: number   // mg/dL  <140
  hba1c?: number                 // %  normal <5.7
  insulina?: number              // µUI/mL  2–25
}

export interface ExtendedAnalytics {
  hemograma?: HemogramaData
  lipidos?: LipidosData
  tiroides?: TiroidesData
  renal?: RenalData
  glucemia?: GlucemiaData
  vitaminaD?: number             // ng/mL  suficiente >30
  vitaminaB12?: number           // pg/mL  normal >200
  acidoFolico?: number           // ng/mL  normal >3.0
}

export interface ClinicalHistory {
  id: string
  pacienteId: string
  fecha: string
  peso: number
  altura: number
  imc: number
  masaGrasa?: number             // %
  masaMuscular?: number          // %
  aguaCorporal?: number          // %
  cintura?: number               // cm
  cadera?: number                // cm
  glucosa?: number               // mg/dL
  presionArterial?: string       // "120/80"
  analytics?: ExtendedAnalytics
}

export interface PatientData {
  id: string
  nombre: string
  apellido?: string
  fechaNacimiento?: string
  genero?: 'femenino' | 'masculino' | 'otro' | 'prefiero-no-decir'
  peso?: number
  altura?: number
  objetivo?: 'bajar' | 'mantener' | 'subir' | 'musculo' | 'salud'
  condicionesMedicas?: string
  alergias?: string
  historia?: ClinicalHistory     // última historia clínica
  historias?: ClinicalHistory[]  // historial completo (≥2 para tendencias)
  diasDesdeUltimaConsulta?: number
}

// ─── Action Payloads ──────────────────────────────────────────────────────────

export type NutrientKey =
  | 'proteina' | 'sodio' | 'potasio' | 'hierro' | 'calcio'
  | 'fibra' | 'omega3' | 'vitamina_d' | 'vitamina_b12' | 'acido_folico'

export type ActionPayload =
  | { action: 'adjust_macro'; nutrient: NutrientKey; direction: 'increase' | 'decrease'; amountGPerKg?: number; note?: string }
  | { action: 'restrict_food'; foods: string[]; reason: string }
  | { action: 'add_supplement'; supplement: string; dose: string; reason: string }
  | { action: 'request_lab'; tests: string[]; urgency: 'routine' | 'urgent' }
  | { action: 'schedule_followup'; days: number; reason: string }
  | { action: 'adjust_plan_text'; field: 'desayuno' | 'almuerzo' | 'merienda' | 'cena'; suggestion: string }
  | { action: 'lifestyle'; recommendation: string }
  | { action: 'apply_template'; templateId: string; templateName: string }

export interface AgentSuggestion {
  id: string
  title: string
  description: string
  type: 'alerta' | 'ajuste' | 'recordatorio'
  priority: 'alta' | 'media' | 'baja'
  status: 'pending_review'
  actionPayload: ActionPayload
  seasonalContext?: string
  evidenceLevel?: 'A' | 'B' | 'C'
  createdAt: string
}

// ─── Contexto estacional (Posadas, Misiones) ──────────────────────────────────

type Season = 'verano' | 'otono' | 'invierno' | 'primavera'

export interface SeasonalContext {
  season: Season
  label: string
  availableProducePosadas: string[]
  nutritionalFocus: string
  hydrationAlert: boolean
  localEvents: string[]
}

export function getSeasonalContext(): SeasonalContext {
  const m = new Date().getMonth() + 1 // 1–12

  if (m === 12 || m <= 2) {
    return {
      season: 'verano',
      label: 'Verano subtropical · Posadas',
      availableProducePosadas: ['mango', 'mamón', 'ananá', 'sandía', 'melón', 'tomate', 'pepino', 'choclo', 'berenjena'],
      nutritionalFocus: 'Hidratación intensa. Frutas tropicales locales. Preparaciones frías y ligeras.',
      hydrationAlert: true,
      localEvents: m === 2 ? ['Carnaval de Posadas — vigilar exceso de alcohol y frituras'] : [],
    }
  }
  if (m <= 5) {
    return {
      season: 'otono',
      label: 'Otoño · Posadas',
      availableProducePosadas: ['naranja', 'mandarina', 'pomelo', 'batata', 'calabaza', 'zanahoria', 'remolacha'],
      nutritionalFocus: 'Vitamina C (cítricos de cosecha). Transición energética hacia el invierno.',
      hydrationAlert: false,
      localEvents: [],
    }
  }
  if (m <= 8) {
    return {
      season: 'invierno',
      label: 'Invierno · Posadas',
      availableProducePosadas: ['naranja', 'mandarina', 'brócoli', 'coliflor', 'acelga', 'espinaca', 'papa', 'batata'],
      nutritionalFocus: 'Vitamina D (menor exposición solar). Caldos reconfortantes. Refuerzo inmunitario.',
      hydrationAlert: false,
      localEvents: [],
    }
  }
  return {
    season: 'primavera',
    label: 'Primavera · Posadas',
    availableProducePosadas: ['ananá', 'mango', 'frutilla', 'durazno', 'chaucha', 'zapallito', 'tomate'],
    nutritionalFocus: 'Antioxidantes (frutas de estación). Reinicio de actividad física al aire libre.',
    hydrationAlert: false,
    localEvents: m === 9 ? ['Fiesta del Migrante (septiembre) — planificar ingesta festiva'] : [],
  }
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

function fem(data: PatientData): boolean {
  return data.genero === 'femenino'
}

function ts(): string {
  return new Date().toISOString()
}

// ─── Hemograma ────────────────────────────────────────────────────────────────

function analyzeHemograma(data: PatientData, sc: SeasonalContext): AgentSuggestion[] {
  const hem = data.historia?.analytics?.hemograma
  if (!hem) return []
  const out: AgentSuggestion[] = []
  const f = fem(data)

  if (hem.hemoglobina !== undefined) {
    const hbMin = f ? 12 : 13.5, hbMax = f ? 16 : 17.5
    if (hem.hemoglobina < hbMin) {
      const severa = hem.hemoglobina < (f ? 10 : 11)
      out.push({
        id: uid('hemo-hb-low'),
        title: severa ? 'Anemia severa detectada' : 'Hemoglobina baja — posible anemia ferropénica',
        description: `Hb ${hem.hemoglobina} g/dL (ref. ${hbMin}–${hbMax}). Priorizar hierro hem (carne roja, hígado) + vitamina C para absorción. Evitar té/café en las 2h post-comida.${sc.hydrationAlert ? ' Hidratación clave en el verano de Posadas.' : ''}`,
        type: severa ? 'alerta' : 'ajuste',
        priority: severa ? 'alta' : 'media',
        status: 'pending_review',
        actionPayload: { action: 'adjust_macro', nutrient: 'hierro', direction: 'increase', note: 'Hierro hem + vitamina C en cada ingesta. Separar calcio y café del hierro.' },
        seasonalContext: sc.label, evidenceLevel: 'A', createdAt: ts(),
      })
    } else if (hem.hemoglobina > hbMax) {
      out.push({
        id: uid('hemo-hb-high'),
        title: 'Hemoglobina elevada',
        description: `Hb ${hem.hemoglobina} g/dL supera referencia (${hbMax}).${sc.hydrationAlert ? ' Verificar hidratación — especialmente crítico en el verano subtropical de Posadas.' : ' Verificar hidratación adecuada.'}`,
        type: 'alerta', priority: 'media', status: 'pending_review',
        actionPayload: { action: 'lifestyle', recommendation: 'Ingesta de líquidos ≥2.5L/día. Derivar a médico si persiste.' },
        seasonalContext: sc.label, evidenceLevel: 'B', createdAt: ts(),
      })
    }
  }

  if (hem.ferritina !== undefined) {
    const ferMin = 12, ferOpt = f ? 30 : 50
    if (hem.ferritina < ferMin) {
      out.push({
        id: uid('hemo-ferritin-low'),
        title: 'Ferritina crítica — reservas de hierro agotadas',
        description: `Ferritina ${hem.ferritina} ng/mL (ref. >${ferMin}). Riesgo inmediato de anemia ferropénica. Evaluar suplementación oral.`,
        type: 'alerta', priority: hem.ferritina < 7 ? 'alta' : 'media', status: 'pending_review',
        actionPayload: { action: 'add_supplement', supplement: 'Hierro polimaltosado o sulfato ferroso', dose: '100–200 mg/día de hierro elemental (según indicación médica)', reason: `Ferritina crítica: ${hem.ferritina} ng/mL` },
        seasonalContext: sc.label, evidenceLevel: 'A', createdAt: ts(),
      })
    } else if (hem.ferritina < ferOpt) {
      out.push({
        id: uid('hemo-ferritin-sub'),
        title: 'Ferritina subóptima',
        description: `Ferritina ${hem.ferritina} ng/mL (óptimo >${ferOpt}). Incluir legumbres, semillas de calabaza y carnes magras con fuentes de vitamina C en cada comida principal.`,
        type: 'ajuste', priority: 'baja', status: 'pending_review',
        actionPayload: { action: 'adjust_macro', nutrient: 'hierro', direction: 'increase', note: 'Hierro no-hem + potenciadores de absorción (cítricos, kiwi).' },
        seasonalContext: sc.label, evidenceLevel: 'B', createdAt: ts(),
      })
    }
  }

  if (hem.globulosBlancos !== undefined) {
    if (hem.globulosBlancos < 4.5) {
      out.push({
        id: uid('hemo-wbc-low'),
        title: 'Leucopenia — inmunodepresión relativa',
        description: `GB ${hem.globulosBlancos} × 10³/µL (ref. 4.5–11). Evaluar déficit de zinc, selenio, vitamina C y D.`,
        type: 'alerta', priority: 'alta', status: 'pending_review',
        actionPayload: { action: 'request_lab', tests: ['Zinc sérico', 'Selenio plasmático', '25-OH Vitamina D'], urgency: 'routine' },
        seasonalContext: sc.label, evidenceLevel: 'B', createdAt: ts(),
      })
    } else if (hem.globulosBlancos > 11) {
      out.push({
        id: uid('hemo-wbc-high'),
        title: 'Leucocitosis — proceso inflamatorio activo',
        description: `GB ${hem.globulosBlancos} × 10³/µL. Puede indicar infección o inflamación. Evitar ajustes calóricos agresivos hasta descartar causa aguda.`,
        type: 'alerta', priority: 'alta', status: 'pending_review',
        actionPayload: { action: 'schedule_followup', days: 7, reason: 'Leucocitosis: controlar evolución antes de modificar plan.' },
        seasonalContext: sc.label, evidenceLevel: 'B', createdAt: ts(),
      })
    }
  }

  return out
}

// ─── Lípidos ──────────────────────────────────────────────────────────────────

function analyzeLipidos(data: PatientData, sc: SeasonalContext): AgentSuggestion[] {
  const lip = data.historia?.analytics?.lipidos
  if (!lip) return []
  const out: AgentSuggestion[] = []

  if (lip.colesterolTotal !== undefined) {
    if (lip.colesterolTotal >= 240) {
      out.push({
        id: uid('lip-ct-high'),
        title: 'Hipercolesterolemia — riesgo cardiovascular elevado',
        description: `Colesterol total ${lip.colesterolTotal} mg/dL (deseable <200). Reducir grasas saturadas, aumentar fibra soluble (avena, legumbres) y omega-3 (sardinas, chía, nueces).`,
        type: 'alerta', priority: 'alta', status: 'pending_review',
        actionPayload: { action: 'adjust_macro', nutrient: 'omega3', direction: 'increase', note: 'EPA+DHA ≥1g/día. Grasas saturadas <7% VCT. Fibra soluble ≥10g/día.' },
        seasonalContext: sc.label, evidenceLevel: 'A', createdAt: ts(),
      })
    } else if (lip.colesterolTotal >= 200) {
      out.push({
        id: uid('lip-ct-border'),
        title: 'Colesterol en zona limítrofe',
        description: `Colesterol ${lip.colesterolTotal} mg/dL. Revisar calidad de grasas del plan. Incorporar beta-glucanos (avena) y fitosteroles (aceite de oliva virgen extra).`,
        type: 'ajuste', priority: 'media', status: 'pending_review',
        actionPayload: { action: 'adjust_macro', nutrient: 'fibra', direction: 'increase', note: 'Fibra soluble ≥10g/día. Avena, legumbres, manzana con piel.' },
        seasonalContext: sc.label, evidenceLevel: 'A', createdAt: ts(),
      })
    }
  }

  const hdlMin = fem(data) ? 55 : 45
  if (lip.hdl !== undefined && lip.hdl < hdlMin) {
    out.push({
      id: uid('lip-hdl-low'),
      title: 'HDL bajo — colesterol protector insuficiente',
      description: `HDL ${lip.hdl} mg/dL (ref. >${hdlMin}). Aumentar actividad física aeróbica e incorporar grasas monoinsaturadas (palta, aceite de oliva) y omega-3.`,
      type: 'ajuste', priority: 'media', status: 'pending_review',
      actionPayload: { action: 'adjust_macro', nutrient: 'omega3', direction: 'increase', note: 'Palta, aceite de oliva, nueces, sardinas. Actividad aeróbica ≥150 min/sem.' },
      seasonalContext: sc.label, evidenceLevel: 'A', createdAt: ts(),
    })
  }

  if (lip.ldl !== undefined) {
    if (lip.ldl >= 160) {
      out.push({
        id: uid('lip-ldl-high'),
        title: 'LDL elevado — riesgo cardiovascular aumentado',
        description: `LDL ${lip.ldl} mg/dL (óptimo <100, alto riesgo ≥160). Restricción de grasas saturadas y trans. Evaluar terapia farmacológica con médico.`,
        type: 'alerta', priority: 'alta', status: 'pending_review',
        actionPayload: { action: 'restrict_food', foods: ['manteca', 'crema de leche', 'fiambres grasos', 'embutidos', 'galletitas industriales', 'margarina hidrogenada'], reason: `LDL ${lip.ldl} mg/dL` },
        seasonalContext: sc.label, evidenceLevel: 'A', createdAt: ts(),
      })
    } else if (lip.ldl >= 130) {
      out.push({
        id: uid('lip-ldl-border'),
        title: 'LDL limítrofe',
        description: `LDL ${lip.ldl} mg/dL. Psyllium o beta-glucanos pueden reducir LDL 5–10%. Revisar fuentes de grasa del plan.`,
        type: 'ajuste', priority: 'media', status: 'pending_review',
        actionPayload: { action: 'adjust_macro', nutrient: 'fibra', direction: 'increase', note: 'Psyllium 10g/día o ≥3g/día de beta-glucanos (avena, cebada).' },
        seasonalContext: sc.label, evidenceLevel: 'A', createdAt: ts(),
      })
    }
  }

  if (lip.trigliceridos !== undefined) {
    if (lip.trigliceridos >= 500) {
      out.push({
        id: uid('lip-tg-very-high'),
        title: 'Hipertrigliceridemia severa — riesgo de pancreatitis',
        description: `TG ${lip.trigliceridos} mg/dL. RESTRICCIÓN URGENTE de grasas (<15% VCT) y azúcares simples. Derivación médica inmediata.`,
        type: 'alerta', priority: 'alta', status: 'pending_review',
        actionPayload: { action: 'request_lab', tests: ['Panel lipídico completo', 'Glucemia', 'Insulina basal', 'Amilasa', 'Lipasa'], urgency: 'urgent' },
        seasonalContext: sc.label, evidenceLevel: 'A', createdAt: ts(),
      })
    } else if (lip.trigliceridos >= 200) {
      out.push({
        id: uid('lip-tg-high'),
        title: 'Triglicéridos elevados',
        description: `TG ${lip.trigliceridos} mg/dL (normal <150). Reducir carbohidratos refinados, azúcares simples y alcohol. Incorporar omega-3.`,
        type: lip.trigliceridos >= 400 ? 'alerta' : 'ajuste',
        priority: lip.trigliceridos >= 400 ? 'alta' : 'media', status: 'pending_review',
        actionPayload: { action: 'restrict_food', foods: ['bebidas azucaradas', 'azúcar de mesa', 'galletitas', 'jugos industriales', 'alcohol'], reason: `TG ${lip.trigliceridos} mg/dL` },
        seasonalContext: sc.label, evidenceLevel: 'A', createdAt: ts(),
      })
    } else if (lip.trigliceridos >= 150) {
      out.push({
        id: uid('lip-tg-border'),
        title: 'Triglicéridos en zona limítrofe',
        description: `TG ${lip.trigliceridos} mg/dL. Revisar ingesta de azúcares simples. Omega-3 puede reducir TG hasta 30%.`,
        type: 'ajuste', priority: 'baja', status: 'pending_review',
        actionPayload: { action: 'adjust_macro', nutrient: 'fibra', direction: 'increase', note: 'Reemplazar carbohidratos refinados por integrales. Aumentar omega-3.' },
        seasonalContext: sc.label, evidenceLevel: 'B', createdAt: ts(),
      })
    }
  }

  return out
}

// ─── Composición corporal y mediciones ───────────────────────────────────────

function analyzeBodyComposition(data: PatientData, sc: SeasonalContext): AgentSuggestion[] {
  const h = data.historia
  if (!h) return []
  const out: AgentSuggestion[] = []
  const f = fem(data)

  if (h.imc !== undefined) {
    if (h.imc < 16) {
      out.push({
        id: uid('imc-dsev'),
        title: 'Desnutrición severa — intervención urgente',
        description: `IMC ${h.imc.toFixed(1)} kg/m². Aumentar aporte calórico de forma progresiva y supervisada (+300 kcal/cada 3 días). Controlar síndrome de realimentación.`,
        type: 'alerta', priority: 'alta', status: 'pending_review',
        actionPayload: { action: 'adjust_macro', nutrient: 'proteina', direction: 'increase', amountGPerKg: 1.8, note: 'Realimentación gradual. Proteína 1.5–2g/kg. Derivar a médico.' },
        seasonalContext: sc.label, evidenceLevel: 'A', createdAt: ts(),
      })
    } else if (h.imc < 18.5) {
      out.push({
        id: uid('imc-bajo'),
        title: 'Bajo peso — plan hipercalórico indicado',
        description: `IMC ${h.imc.toFixed(1)} kg/m². Superávit calórico +300–500 kcal/día con alimentos densos en nutrientes (palta, frutos secos, aceite de oliva, legumbres).`,
        type: 'ajuste', priority: 'media', status: 'pending_review',
        actionPayload: { action: 'adjust_macro', nutrient: 'proteina', direction: 'increase', amountGPerKg: 1.5, note: 'Proteína ≥1.5g/kg + superávit saludable. Colaciones densas en energía.' },
        seasonalContext: sc.label, evidenceLevel: 'A', createdAt: ts(),
      })
    } else if (h.imc >= 40) {
      out.push({
        id: uid('imc-ob3'),
        title: 'Obesidad Clase III — abordaje multidisciplinario',
        description: `IMC ${h.imc.toFixed(1)} kg/m². Déficit calórico moderado (500–750 kcal/día). Proteína ≥1.2g/kg para preservar masa magra.`,
        type: 'alerta', priority: 'alta', status: 'pending_review',
        actionPayload: { action: 'adjust_macro', nutrient: 'proteina', direction: 'increase', amountGPerKg: 1.2, note: 'Déficit moderado. Abordaje conductual + actividad progresiva.' },
        seasonalContext: sc.label, evidenceLevel: 'A', createdAt: ts(),
      })
    } else if (h.imc >= 30) {
      out.push({
        id: uid('imc-ob1-2'),
        title: 'Obesidad — plan de descenso de peso',
        description: `IMC ${h.imc.toFixed(1)} kg/m². Déficit sostenible (300–500 kcal/día), alta proteína, baja densidad energética.${sc.season === 'verano' ? ' Hidratación esencial en el verano de Posadas.' : ''}`,
        type: 'ajuste', priority: h.imc >= 35 ? 'alta' : 'media', status: 'pending_review',
        actionPayload: { action: 'adjust_macro', nutrient: 'proteina', direction: 'increase', note: 'Proteína ≥1.2g/kg. Fibra 30g/día. Reducir densidad calórica.' },
        seasonalContext: sc.label, evidenceLevel: 'A', createdAt: ts(),
      })
    } else if (h.imc >= 25) {
      out.push({
        id: uid('imc-sobrepeso'),
        title: 'Sobrepeso — ajuste preventivo del plan',
        description: `IMC ${h.imc.toFixed(1)} kg/m². Déficit leve (200–300 kcal/día). Priorizar proteína magra, fibra y alimentos de bajo índice glucémico.`,
        type: 'ajuste', priority: 'baja', status: 'pending_review',
        actionPayload: { action: 'adjust_macro', nutrient: 'fibra', direction: 'increase', note: 'Fibra ≥25g/día + proteína ≥1g/kg. Cambios de hábitos sostenibles.' },
        seasonalContext: sc.label, evidenceLevel: 'A', createdAt: ts(),
      })
    }
  }

  if (h.masaGrasa !== undefined && (f ? h.masaGrasa > 35 : h.masaGrasa > 25)) {
    out.push({
      id: uid('fat-high'),
      title: 'Porcentaje de grasa corporal elevado',
      description: `Grasa ${h.masaGrasa}% (ref. ${f ? '21–33' : '8–19'}%). Déficit calórico moderado con alta proteína para preservar masa magra durante la pérdida de grasa.`,
      type: 'ajuste', priority: 'media', status: 'pending_review',
      actionPayload: { action: 'adjust_macro', nutrient: 'proteina', direction: 'increase', amountGPerKg: 1.2, note: 'Proteína ≥1.2g/kg con déficit calórico para preservar masa magra.' },
      seasonalContext: sc.label, evidenceLevel: 'B', createdAt: ts(),
    })
  }

  if (h.masaMuscular !== undefined && (f ? h.masaMuscular < 24 : h.masaMuscular < 33)) {
    out.push({
      id: uid('muscle-low'),
      title: 'Masa muscular reducida — riesgo de sarcopenia',
      description: `Masa muscular ${h.masaMuscular}% (ref. ${f ? '>24' : '>33'}%). Incrementar proteína de alto valor biológico y asociar entrenamiento de fuerza.`,
      type: 'ajuste', priority: 'media', status: 'pending_review',
      actionPayload: { action: 'adjust_macro', nutrient: 'proteina', direction: 'increase', amountGPerKg: 1.6, note: 'Meta: 1.6–2.0g/kg/día + resistencia muscular.' },
      seasonalContext: sc.label, evidenceLevel: 'A', createdAt: ts(),
    })
  }

  if (h.cintura && h.cadera && h.cadera > 0) {
    const rcc = h.cintura / h.cadera
    if (f ? rcc > 0.85 : rcc > 0.90) {
      out.push({
        id: uid('rcc-high'),
        title: 'RCC elevado — grasa visceral abdominal',
        description: `RCC ${rcc.toFixed(2)} (ref. ${f ? '≤0.85' : '≤0.90'}). Mayor riesgo cardiovascular y metabólico. Actividad aeróbica diaria y reducción de carbohidratos refinados.`,
        type: 'alerta', priority: rcc > (f ? 0.95 : 1.0) ? 'alta' : 'media', status: 'pending_review',
        actionPayload: { action: 'lifestyle', recommendation: 'Aeróbico ≥30 min/día. Reducir azúcares simples y alcohol. Fibra insoluble (verduras crudas, salvado).' },
        seasonalContext: sc.label, evidenceLevel: 'A', createdAt: ts(),
      })
    }
  }

  if (h.glucosa !== undefined) {
    if (h.glucosa >= 126) {
      out.push({
        id: uid('gluc-dm'),
        title: 'Glucemia compatible con diabetes — derivar a médico',
        description: `Glucosa ${h.glucosa} mg/dL (diagnóstico ≥126 mg/dL en ayunas). Plan de bajo IG. Fraccionamiento en 5–6 comidas. Confirmación médica obligatoria.`,
        type: 'alerta', priority: 'alta', status: 'pending_review',
        actionPayload: { action: 'restrict_food', foods: ['azúcar de mesa', 'bebidas azucaradas', 'jugos industriales', 'pan blanco', 'arroz blanco', 'galletitas'], reason: `Glucemia ${h.glucosa} mg/dL` },
        seasonalContext: sc.label, evidenceLevel: 'A', createdAt: ts(),
      })
    } else if (h.glucosa >= 100) {
      out.push({
        id: uid('gluc-pre'),
        title: 'Glucemia en rango de prediabetes',
        description: `Glucosa ${h.glucosa} mg/dL (prediabetes: 100–125). La intervención nutricional puede revertir la prediabetes. Reducir CHO de alto IG y aumentar fibra.`,
        type: 'ajuste', priority: 'media', status: 'pending_review',
        actionPayload: { action: 'adjust_macro', nutrient: 'fibra', direction: 'increase', note: 'IG bajo: legumbres, avena, vegetales no feculentos. Actividad física ≥150 min/sem.' },
        seasonalContext: sc.label, evidenceLevel: 'A', createdAt: ts(),
      })
    }
  }

  if (h.presionArterial) {
    const m = h.presionArterial.match(/(\d+)\s*\/\s*(\d+)/)
    if (m) {
      const sis = parseInt(m[1]), dia = parseInt(m[2])
      if (sis >= 140 || dia >= 90) {
        out.push({
          id: uid('bp-hta'),
          title: 'Hipertensión medida — plan DASH recomendado',
          description: `PA ${h.presionArterial} mmHg (meta <130/80). Sodio <2300mg/día. Potasio ≥4700mg/día (banana, espinaca, papa). 8–10 porciones de frutas/verduras.`,
          type: 'alerta', priority: sis >= 160 || dia >= 100 ? 'alta' : 'media', status: 'pending_review',
          actionPayload: { action: 'adjust_macro', nutrient: 'sodio', direction: 'decrease', note: 'DASH: sodio <2g/día, potasio 4700mg, magnesio 420mg, calcio 1000mg.' },
          seasonalContext: sc.label, evidenceLevel: 'A', createdAt: ts(),
        })
      } else if (sis >= 130 || dia >= 80) {
        out.push({
          id: uid('bp-elevated'),
          title: 'Presión arterial elevada (Estadio 1)',
          description: `PA ${h.presionArterial} mmHg. Reducir sodio y aumentar potasio como primera medida no farmacológica.`,
          type: 'ajuste', priority: 'media', status: 'pending_review',
          actionPayload: { action: 'adjust_macro', nutrient: 'potasio', direction: 'increase', note: 'Potasio: banana, espinaca, papa con cáscara, legumbres. Reducir sal procesada.' },
          seasonalContext: sc.label, evidenceLevel: 'A', createdAt: ts(),
        })
      }
    }
  }

  return out
}

// ─── Condiciones médicas declaradas ──────────────────────────────────────────

function analyzeConditions(data: PatientData, sc: SeasonalContext): AgentSuggestion[] {
  if (!data.condicionesMedicas && !data.alergias) return []
  const cond = (data.condicionesMedicas ?? '').toLowerCase()
  const aler = (data.alergias ?? '').toLowerCase()
  const out: AgentSuggestion[] = []

  if (cond.includes('hipert')) {
    out.push({
      id: uid('cond-hta'),
      title: 'Hipertensión arterial — restricción de sodio',
      description: 'Plan DASH: sodio <2g/día, potasio ≥4700mg/día. Evitar carnes procesadas, enlatados, embutidos y sal de mesa en exceso.',
      type: 'alerta', priority: 'media', status: 'pending_review',
      actionPayload: { action: 'adjust_macro', nutrient: 'sodio', direction: 'decrease', note: 'DASH: potasio (banana, espinaca, papa), magnesio, calcio. Sal <5g/día total.' },
      seasonalContext: sc.label, evidenceLevel: 'A', createdAt: ts(),
    })
  }

  if (cond.includes('erc') || cond.includes('renal') || cond.includes('nefro') || cond.includes('riñon') || cond.includes('riñón')) {
    const cr = data.historia?.analytics?.renal?.creatinina
    const crElevada = cr !== undefined && cr > (fem(data) ? 1.1 : 1.3)
    out.push({
      id: uid('cond-erc'),
      title: crElevada ? `ERC con creatinina elevada (${cr} mg/dL)` : 'Enfermedad Renal Crónica — restricción proteica',
      description: `${crElevada ? `Creatinina ${cr} mg/dL. ` : ''}Proteína: 0.6–0.8g/kg/día (sin hemodiálisis). Restricción de potasio, fósforo y sodio.`,
      type: 'alerta', priority: 'alta', status: 'pending_review',
      actionPayload: { action: 'adjust_macro', nutrient: 'proteina', direction: 'decrease', note: 'ERC sin HD: 0.6–0.8g/kg. Con HD: 1.2g/kg. Derivar a nefrólogo.' },
      seasonalContext: sc.label, evidenceLevel: 'A', createdAt: ts(),
    })
  }

  if (cond.includes('celiaq') || aler.includes('gluten') || aler.includes('tacc')) {
    out.push({
      id: uid('cond-celiac'),
      title: 'Celiaquía — plan 100% libre de gluten',
      description: 'Eliminar trigo, centeno, cebada y avena no certificada. Alternativas: arroz, maíz, papa, mandioca, quinoa. Vigilar déficit de hierro, B12 y folato.',
      type: 'alerta', priority: 'alta', status: 'pending_review',
      actionPayload: { action: 'restrict_food', foods: ['pan de trigo', 'galletitas con gluten', 'pasta de trigo', 'sémola', 'cebada', 'centeno', 'avena sin certificar'], reason: 'Celiaquía — intolerancia permanente al gluten' },
      seasonalContext: sc.label, evidenceLevel: 'A', createdAt: ts(),
    })
  }

  if (cond.includes('hipotiro') || cond.includes('hashimoto') || (cond.includes('tiroides') && !cond.includes('hipertiro'))) {
    const tsh = data.historia?.analytics?.tiroides?.tsh
    const tshAlta = tsh !== undefined && tsh > 4.0
    out.push({
      id: uid('cond-hypo-thyroid'),
      title: tshAlta ? `Hipotiroidismo descompensado (TSH ${tsh})` : 'Hipotiroidismo — interferentes dietarios',
      description: `${tshAlta ? `TSH ${tsh} mUI/L. ` : ''}Selenio (1–2 nueces de Brasil/día), yodo (mariscos, sal yodada). Evitar bociógenos crudos en exceso. Separar levotiroxina de calcio y fibra.`,
      type: tshAlta ? 'alerta' : 'ajuste', priority: tshAlta ? 'alta' : 'media', status: 'pending_review',
      actionPayload: { action: 'add_supplement', supplement: 'Selenio (si déficit confirmado)', dose: '55–200 µg/día (nueces de Brasil: 1–2 u. como fuente natural)', reason: 'Soporte tiroideo — selenio cofactor de desyodasa.' },
      seasonalContext: sc.label, evidenceLevel: 'B', createdAt: ts(),
    })
  }

  if (cond.includes('hipertiro') || cond.includes('graves') || cond.includes('basedow')) {
    out.push({
      id: uid('cond-hyper-thyroid'),
      title: 'Hipertiroidismo — requerimiento calórico aumentado',
      description: 'Metabolismo acelerado: aumentar VCT. Calcio y vitamina D ante riesgo de osteoporosis. Restricción de yodo si hay indicación médica (mariscos, sal yodada).',
      type: 'ajuste', priority: 'media', status: 'pending_review',
      actionPayload: { action: 'adjust_macro', nutrient: 'calcio', direction: 'increase', note: 'VCT aumentado según grado. Calcio ≥1200mg + vitamina D. Proteína alta.' },
      seasonalContext: sc.label, evidenceLevel: 'B', createdAt: ts(),
    })
  }

  if (aler.includes('lactosa') || cond.includes('lactosa')) {
    out.push({
      id: uid('cond-lactose'),
      title: 'Intolerancia a lactosa — fuentes alternativas de calcio',
      description: 'Sustituir lácteos por versiones sin lactosa o leches vegetales. Calcio (1000–1200mg/día) con brócoli, almendras, semillas de sésamo, sardinas y tofu con calcio.',
      type: 'ajuste', priority: 'media', status: 'pending_review',
      actionPayload: { action: 'adjust_macro', nutrient: 'calcio', direction: 'increase', note: 'Calcio no-lácteo + vitamina D para absorción óptima.' },
      seasonalContext: sc.label, evidenceLevel: 'A', createdAt: ts(),
    })
  }

  if (cond.includes('diabet') || cond.includes('dbt')) {
    const hba1c = data.historia?.analytics?.glucemia?.hba1c
    const mal = hba1c !== undefined && hba1c >= 8
    out.push({
      id: uid('cond-diabetes'),
      title: mal ? `Diabetes mal controlada (HbA1c ${hba1c}%)` : 'Diabetes — plan de bajo índice glucémico',
      description: `${hba1c ? `HbA1c ${hba1c}%. ` : ''}5–6 comidas regulares, CHO de bajo IG, control de porciones.${sc.season === 'verano' ? ' Vigilar hipoglucemia por actividad e hidratación en verano.' : ''}`,
      type: mal ? 'alerta' : 'ajuste', priority: mal ? 'alta' : 'media', status: 'pending_review',
      actionPayload: { action: 'adjust_macro', nutrient: 'fibra', direction: 'increase', note: 'CHO complejos + fibra ≥25g/día. 5–6 comidas regulares. Monitoreo glucémico post-prandial.' },
      seasonalContext: sc.label, evidenceLevel: 'A', createdAt: ts(),
    })
  }

  if (cond.includes('sop') || cond.includes('poliquístico') || cond.includes('poliquistico')) {
    out.push({
      id: uid('cond-pcos'),
      title: 'SOP — reducción de resistencia insulínica',
      description: 'Alimentación de bajo IG para reducir resistencia a la insulina. Mioinositol, omega-3 y reducción de azúcares simples tienen evidencia en SOP.',
      type: 'ajuste', priority: 'media', status: 'pending_review',
      actionPayload: { action: 'add_supplement', supplement: 'Mioinositol', dose: '2–4g/día (proporción 40:1 con D-chiro-inositol)', reason: 'SOP: mejora sensibilidad insulínica y perfil hormonal.' },
      seasonalContext: sc.label, evidenceLevel: 'B', createdAt: ts(),
    })
  }

  if (cond.includes('gota') || cond.includes('uricemia') || cond.includes('úrico') || cond.includes('urico')) {
    out.push({
      id: uid('cond-gout'),
      title: 'Hiperuricemia / Gota — restricción de purinas',
      description: 'Reducir vísceras, mariscos, carnes rojas en exceso y alcohol (especialmente cerveza). Hidratación ≥2.5L/día. Evitar fructosa en exceso.',
      type: 'alerta', priority: 'media', status: 'pending_review',
      actionPayload: { action: 'restrict_food', foods: ['vísceras (hígado, riñón)', 'mariscos', 'sardinas en aceite', 'carnes rojas en exceso', 'alcohol', 'jugos azucarados industriales'], reason: 'Gota/hiperuricemia — alimentos con alto contenido de purinas' },
      seasonalContext: sc.label, evidenceLevel: 'A', createdAt: ts(),
    })
  }

  return out
}

// ─── Objetivo nutricional ─────────────────────────────────────────────────────

function analyzeObjective(data: PatientData, sc: SeasonalContext): AgentSuggestion[] {
  if (!data.objetivo) return []
  const out: AgentSuggestion[] = []
  const h = data.historia

  if (data.objetivo === 'musculo') {
    out.push({
      id: uid('obj-musculo'),
      title: 'Ganancia muscular — proteína y superávit calórico',
      description: `Proteína ≥1.6g/kg/día en ≥4 comidas. Superávit +200–300 kcal/día. CHO de calidad post-entrenamiento (avena, arroz integral, batata).${sc.season === 'verano' ? ' Aumentar hidratación por pérdidas por sudoración.' : ''}`,
      type: 'ajuste', priority: 'media', status: 'pending_review',
      actionPayload: { action: 'adjust_macro', nutrient: 'proteina', direction: 'increase', amountGPerKg: 1.6, note: 'Proteína fraccionada. CHO post-entrenamiento. Superávit +200–300 kcal.' },
      seasonalContext: sc.label, evidenceLevel: 'A', createdAt: ts(),
    })
  } else if (data.objetivo === 'bajar') {
    out.push({
      id: uid('obj-bajar'),
      title: 'Descenso de peso — déficit sostenible',
      description: `Déficit 300–500 kcal/día. Proteína ≥1.2g/kg para preservar músculo. Fibra ≥30g/día para saciedad.${h?.imc && h.imc < 25 ? ' IMC ya en rango normal — revisar objetivo.' : ''}`,
      type: 'ajuste', priority: 'media', status: 'pending_review',
      actionPayload: { action: 'adjust_macro', nutrient: 'fibra', direction: 'increase', note: 'Déficit moderado + proteína ≥1.2g/kg. Cambios sostenibles a largo plazo.' },
      seasonalContext: sc.label, evidenceLevel: 'A', createdAt: ts(),
    })
  } else if (data.objetivo === 'subir') {
    out.push({
      id: uid('obj-subir'),
      title: 'Ganancia de peso — superávit calórico saludable',
      description: 'Superávit +300–500 kcal/día con alimentos densos en energía y nutrientes (palta, frutos secos, aceite de oliva, avena, legumbres). Proteína ≥1.5g/kg.',
      type: 'ajuste', priority: 'media', status: 'pending_review',
      actionPayload: { action: 'adjust_macro', nutrient: 'proteina', direction: 'increase', amountGPerKg: 1.5, note: 'Colaciones densas en energía. Sin hipercalóricos de baja calidad.' },
      seasonalContext: sc.label, evidenceLevel: 'A', createdAt: ts(),
    })
  } else if (data.objetivo === 'salud' || data.objetivo === 'mantener') {
    out.push({
      id: uid('obj-salud'),
      title: 'Mantenimiento — alimentación equilibrada de calidad',
      description: `Plan variado con frutas y verduras de temporada (${sc.availableProducePosadas.slice(0, 3).join(', ')}), proteínas magras, grasas saludables y carbohidratos integrales.`,
      type: 'ajuste', priority: 'baja', status: 'pending_review',
      actionPayload: { action: 'lifestyle', recommendation: 'Plato de Harvard: ½ vegetales/frutas, ¼ proteína magra, ¼ CHO integrales. Aceite de oliva como grasa principal.' },
      seasonalContext: sc.label, evidenceLevel: 'A', createdAt: ts(),
    })
  }

  return out
}

// ─── Adherencia y seguimiento ─────────────────────────────────────────────────

function analyzeAdherence(data: PatientData, sc: SeasonalContext): AgentSuggestion[] {
  const out: AgentSuggestion[] = []

  if (data.diasDesdeUltimaConsulta !== undefined && data.diasDesdeUltimaConsulta > 45) {
    out.push({
      id: uid('adh-followup'),
      title: `Sin consulta hace ${data.diasDesdeUltimaConsulta} días`,
      description: 'Contactar al paciente/a para evaluar adherencia al plan y ajustes necesarios.',
      type: 'recordatorio', priority: data.diasDesdeUltimaConsulta > 90 ? 'alta' : 'media', status: 'pending_review',
      actionPayload: { action: 'schedule_followup', days: 7, reason: `${data.diasDesdeUltimaConsulta} días sin consulta — riesgo de abandono del plan.` },
      seasonalContext: sc.label, evidenceLevel: 'C', createdAt: ts(),
    })
  }

  if (data.historias && data.historias.length >= 2) {
    const sorted = [...data.historias].sort((a, b) => b.fecha.localeCompare(a.fecha))
    const delta = sorted[0].peso - sorted[1].peso
    if (data.objetivo === 'bajar' && delta > 0.5) {
      out.push({
        id: uid('adh-wt-up'),
        title: 'Peso en ascenso con objetivo de descenso',
        description: `Peso aumentó ${delta.toFixed(1)} kg entre consultas. Revisar adherencia y posibles causas.`,
        type: 'alerta', priority: 'media', status: 'pending_review',
        actionPayload: { action: 'schedule_followup', days: 14, reason: 'Peso sin descender hacia objetivo declarado.' },
        seasonalContext: sc.label, evidenceLevel: 'C', createdAt: ts(),
      })
    } else if (data.objetivo === 'subir' && delta < 0) {
      out.push({
        id: uid('adh-wt-down'),
        title: 'Pérdida de peso en objetivo de ganancia',
        description: `Peso disminuyó ${Math.abs(delta).toFixed(1)} kg. Evaluar ingesta calórica real vs. planificada.`,
        type: 'alerta', priority: 'media', status: 'pending_review',
        actionPayload: { action: 'adjust_macro', nutrient: 'proteina', direction: 'increase', note: 'Aumentar VCT. Registrar ingesta real para detectar brecha.' },
        seasonalContext: sc.label, evidenceLevel: 'C', createdAt: ts(),
      })
    }
  }

  return out
}

// ─── Contexto estacional ──────────────────────────────────────────────────────

function analyzeSeasonalContext(data: PatientData, sc: SeasonalContext): AgentSuggestion[] {
  const out: AgentSuggestion[] = []
  const hasData = !!(data.historia || data.condicionesMedicas)

  for (const ev of sc.localEvents) {
    out.push({
      id: uid('seasonal-event'),
      title: `Alerta estacional: ${ev.split('—')[0].trim()}`,
      description: `${ev}. Planificar estrategia nutricional preventiva para el período.`,
      type: 'recordatorio', priority: 'baja', status: 'pending_review',
      actionPayload: { action: 'lifestyle', recommendation: `Estrategia preventiva: ${ev}` },
      seasonalContext: sc.label, evidenceLevel: 'C', createdAt: ts(),
    })
  }

  if (sc.hydrationAlert && hasData) {
    out.push({
      id: uid('seasonal-hydration'),
      title: 'Verano subtropical — alerta de hidratación',
      description: `${sc.nutritionalFocus} Meta: 2.5–3L/día. Frutas de temporada en Posadas: ${sc.availableProducePosadas.slice(0, 4).join(', ')}.`,
      type: 'recordatorio', priority: 'baja', status: 'pending_review',
      actionPayload: { action: 'lifestyle', recommendation: 'Hidratación ≥2.5L/día. Frutas frescas locales. Evitar bebidas azucaradas como fuente de líquidos.' },
      seasonalContext: sc.label, evidenceLevel: 'C', createdAt: ts(),
    })
  }

  if (sc.season === 'invierno' && hasData) {
    const vitD = data.historia?.analytics?.vitaminaD
    const insuf = vitD !== undefined && vitD < 30
    out.push({
      id: uid('seasonal-vitd'),
      title: insuf ? `Vitamina D insuficiente (${vitD} ng/mL)` : 'Invierno — evaluar vitamina D',
      description: `Menor exposición solar reduce síntesis de vitamina D.${vitD !== undefined ? ` Nivel: ${vitD} ng/mL (suficiente >30).` : ''} Fuentes: yema de huevo, pescados grasos, lácteos fortificados.`,
      type: 'recordatorio', priority: insuf ? 'media' : 'baja', status: 'pending_review',
      actionPayload: insuf
        ? { action: 'add_supplement', supplement: 'Vitamina D3 (colecalciferol)', dose: '1000–2000 UI/día (ajustar según dosaje sérico)', reason: `Vitamina D insuficiente: ${vitD} ng/mL` }
        : { action: 'request_lab', tests: ['25-OH Vitamina D sérica'], urgency: 'routine' },
      seasonalContext: sc.label, evidenceLevel: 'B', createdAt: ts(),
    })
  }

  return out
}

// ─── Función principal exportada ──────────────────────────────────────────────

const PRIORITY_ORDER: Record<AgentSuggestion['priority'], number> = { alta: 0, media: 1, baja: 2 }
const TYPE_ORDER:     Record<AgentSuggestion['type'],     number> = { alerta: 0, ajuste: 1, recordatorio: 2 }

export function analyzeClinicalData(data: PatientData): AgentSuggestion[] {
  const sc = getSeasonalContext()

  const all: AgentSuggestion[] = [
    ...analyzeHemograma(data, sc),
    ...analyzeLipidos(data, sc),
    ...analyzeBodyComposition(data, sc),
    ...analyzeConditions(data, sc),
    ...analyzeObjective(data, sc),
    ...analyzeAdherence(data, sc),
    ...analyzeSeasonalContext(data, sc),
  ]

  return all.sort((a, b) => {
    const dp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    return dp !== 0 ? dp : TYPE_ORDER[a.type] - TYPE_ORDER[b.type]
  })
}
