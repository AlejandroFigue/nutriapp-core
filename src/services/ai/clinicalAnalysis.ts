import type { ClinicalTest, Glucemia, PerfilLipidico, Hemograma } from '../../types/laboratory'

// ─── Tipos de salida ──────────────────────────────────────────────────────────

export type SuggestionStatus = 'alerta' | 'info' | 'normal'

export interface ClinicalSuggestion {
  status: SuggestionStatus
  message: string
  action: string
}

export interface ClinicalAnalysisResult {
  testName: string
  patientId: string
  date: string
  summary: string
  suggestions: ClinicalSuggestion[]
}

// ─── Type guards ──────────────────────────────────────────────────────────────

function isGlucemia(test: ClinicalTest): test is Glucemia {
  return 'valorGlucosa' in test
}

function isPerfilLipidico(test: ClinicalTest): test is PerfilLipidico {
  return 'colesterolTotal' in test
}

function isHemograma(test: ClinicalTest): test is Hemograma {
  return 'hemoglobina' in test
}

// ─── Sub-analizadores ─────────────────────────────────────────────────────────

function evaluateGlucemia(test: Glucemia): ClinicalSuggestion[] {
  const suggestions: ClinicalSuggestion[] = []
  const enAyunas = test.ayuno > 0

  // Referencia en ayunas: normal 70–99 mg/dL, prediabetes 100–125, diabetes ≥126
  if (enAyunas && test.valorGlucosa >= 126) {
    suggestions.push({
      status: 'alerta',
      message: 'Glucemia compatible con diagnóstico de diabetes',
      action: 'Derivar a médico para confirmación diagnóstica. Iniciar plan de bajo índice glucémico',
    })
  } else if (enAyunas && test.valorGlucosa >= 100) {
    suggestions.push({
      status: 'alerta',
      message: 'Glucemia elevada detectada',
      action: 'Revisar consumo de carbohidratos simples',
    })
  }

  // Referencia postprandial (≥2 h): normal <140 mg/dL
  if (!enAyunas && test.valorGlucosa >= 200) {
    suggestions.push({
      status: 'alerta',
      message: 'Glucemia postprandial muy elevada — posible diabetes',
      action: 'Consultar con médico. Reducir carga glucémica de las comidas principales',
    })
  } else if (!enAyunas && test.valorGlucosa >= 140) {
    suggestions.push({
      status: 'alerta',
      message: 'Glucemia postprandial elevada',
      action: 'Reducir carbohidratos refinados. Aumentar fibra y proteína en cada comida',
    })
  }

  if (test.valorGlucosa < 70) {
    suggestions.push({
      status: 'alerta',
      message: 'Glucemia por debajo del rango normal — hipoglucemia',
      action: 'Evaluar fraccionamiento de comidas y posibles causas de hipoglucemia',
    })
  }

  return suggestions
}

function evaluatePerfilLipidico(test: PerfilLipidico): ClinicalSuggestion[] {
  const suggestions: ClinicalSuggestion[] = []

  // Colesterol total: deseable <200, limítrofe 200–239, alto ≥240
  if (test.colesterolTotal >= 240) {
    suggestions.push({
      status: 'alerta',
      message: 'Hipercolesterolemia — colesterol total elevado',
      action: 'Reducir grasas saturadas e incorporar omega-3 y fibra soluble (avena, legumbres)',
    })
  } else if (test.colesterolTotal >= 200) {
    suggestions.push({
      status: 'alerta',
      message: 'Colesterol total en zona limítrofe',
      action: 'Revisar calidad de grasas del plan alimentario y aumentar fibra soluble',
    })
  }

  // HDL: protector; bajo si <40 mg/dL (general) — riesgo cardiovascular
  if (test.hdl < 40) {
    suggestions.push({
      status: 'alerta',
      message: 'HDL bajo — colesterol protector insuficiente',
      action: 'Aumentar actividad física aeróbica e incorporar grasas monoinsaturadas (palta, aceite de oliva)',
    })
  }

  // LDL: óptimo <100, limítrofe 130–159, alto ≥160
  if (test.ldl >= 160) {
    suggestions.push({
      status: 'alerta',
      message: 'LDL elevado — riesgo cardiovascular aumentado',
      action: 'Restringir grasas saturadas y trans. Evaluar terapia farmacológica con médico',
    })
  } else if (test.ldl >= 130) {
    suggestions.push({
      status: 'alerta',
      message: 'LDL en zona limítrofe — desequilibrio lipídico detectado',
      action: 'Incorporar psyllium o beta-glucanos (avena, cebada) para reducir LDL',
    })
  }

  // Triglicéridos: normal <150, limítrofe 150–199, alto ≥200, muy alto ≥500
  if (test.trigliceridos >= 500) {
    suggestions.push({
      status: 'alerta',
      message: 'Hipertrigliceridemia severa — riesgo de pancreatitis',
      action: 'Restricción urgente de grasas y azúcares simples. Derivar a médico inmediatamente',
    })
  } else if (test.trigliceridos >= 200) {
    suggestions.push({
      status: 'alerta',
      message: 'Triglicéridos elevados — desequilibrio lipídico detectado',
      action: 'Reducir carbohidratos refinados, azúcares simples y alcohol. Incorporar omega-3',
    })
  } else if (test.trigliceridos >= 150) {
    suggestions.push({
      status: 'alerta',
      message: 'Triglicéridos en zona limítrofe',
      action: 'Revisar ingesta de azúcares simples. Omega-3 puede reducir TG hasta un 30%',
    })
  }

  return suggestions
}

function evaluateHemograma(test: Hemograma): ClinicalSuggestion[] {
  const suggestions: ClinicalSuggestion[] = []

  // Referencia general (sin distinción de sexo en este tipo base)
  if (test.hemoglobina < 12) {
    suggestions.push({
      status: 'alerta',
      message: 'Hemoglobina baja — posible anemia',
      action: 'Priorizar hierro hem (carnes, hígado) más vitamina C para mejorar absorción',
    })
  }

  if (test.hematocrito < 36) {
    suggestions.push({
      status: 'alerta',
      message: 'Hematocrito bajo',
      action: 'Evaluar causas de anemia y ajustar plan con fuentes de hierro y vitamina B12',
    })
  }

  if (test.plaquetas < 150) {
    suggestions.push({
      status: 'alerta',
      message: 'Plaquetas bajas — trombocitopenia',
      action: 'Derivar a médico para evaluación hematológica antes de modificar el plan',
    })
  } else if (test.plaquetas > 400) {
    suggestions.push({
      status: 'alerta',
      message: 'Plaquetas elevadas — trombocitosis',
      action: 'Consultar con médico para descartar causa subyacente',
    })
  }

  return suggestions
}

// ─── Registro de analizadores (extensible) ───────────────────────────────────
// Para agregar un nuevo tipo de análisis: añadir una entrada con su guard y función.

type Analyzer = {
  guard: (t: ClinicalTest) => boolean
  analyze: (t: ClinicalTest) => ClinicalSuggestion[]
}

const ANALYZERS: Analyzer[] = [
  { guard: isGlucemia,       analyze: (t) => evaluateGlucemia(t as Glucemia) },
  { guard: isPerfilLipidico, analyze: (t) => evaluatePerfilLipidico(t as PerfilLipidico) },
  { guard: isHemograma,      analyze: (t) => evaluateHemograma(t as Hemograma) },
]

// ─── Función exportada principal ──────────────────────────────────────────────

export function evaluateClinicalData(testData: ClinicalTest): ClinicalAnalysisResult {
  const suggestions: ClinicalSuggestion[] = []

  for (const { guard, analyze } of ANALYZERS) {
    if (guard(testData)) {
      suggestions.push(...analyze(testData))
    }
  }

  const alertCount = suggestions.filter((s) => s.status === 'alerta').length

  return {
    testName: testData.testName,
    patientId: testData.patientId,
    date: testData.date,
    summary:
      alertCount > 0
        ? `${alertCount} alerta${alertCount > 1 ? 's' : ''} detectada${alertCount > 1 ? 's' : ''} en ${testData.testName}`
        : `${testData.testName} dentro de parámetros normales`,
    suggestions,
  }
}
