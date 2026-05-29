/**
 * AgenteIA.jsx — Copiloto clínico flotante
 *
 * Arquitectura:
 *   - Dock fijo bottom-right con backdrop-filter: blur
 *   - Motor de sugerencias puramente local (sin API), basado en datos del paciente activo
 *   - Carga reactiva via Dexie liveQuery + useSyncExternalStore (igual que el resto del proyecto)
 *   - Cada sugerencia expone tres acciones: Aplicar | Editar | Descartar
 *   - CSS inyectado una sola vez (mismo patrón que AnalysisDashboard)
 *
 * Optimizaciones de render:
 *   - useMemo para el motor de sugerencias (no recalcula si los datos no cambian)
 *   - useCallback para subscribe (evita re-suscripción a Dexie en cada render)
 *   - Panel con `inert` cuando está cerrado (no consume eventos ni foco)
 */

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  useSyncExternalStore,
} from 'react'
import { useLocation } from 'react-router-dom'
import { liveQuery } from 'dexie'
import { db } from '@/db/database'
import { useUIStore } from '@/store/useUIStore'

// ─── CSS inyectado una sola vez ───────────────────────────────────────────────

const COMPONENT_CSS = `
.ia-dock {
  position: fixed;
  bottom: var(--space-6);
  right: var(--space-6);
  z-index: calc(var(--z-modal) + 10);
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-3);
  pointer-events: none;
}

/* ── Botón disparador ── */
.ia-trigger {
  pointer-events: all;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-full);
  border: 1.5px solid rgba(255,255,255,0.65);
  background: rgba(255,255,255,0.78);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 4px 20px rgba(232,149,106,0.18), 0 1px 4px rgba(0,0,0,0.06);
  cursor: pointer;
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-high);
  letter-spacing: 0.01em;
  transition:
    transform var(--transition-fast),
    box-shadow var(--transition-fast);
  will-change: transform;
}
.ia-trigger:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 28px rgba(232,149,106,0.28), 0 2px 6px rgba(0,0,0,0.08);
}
.ia-trigger:active { transform: translateY(0); }

.ia-trigger__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary);
  flex-shrink: 0;
  animation: ia-pulse 2.6s ease-in-out infinite;
}
.ia-trigger__dot--alert { background: var(--color-warning); }

@keyframes ia-pulse {
  0%, 100% { opacity: 1;   transform: scale(1);    }
  50%       { opacity: 0.5; transform: scale(0.82); }
}

.ia-trigger__badge {
  min-width: 18px;
  height: 18px;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  color: white;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
  line-height: 1;
}
.ia-trigger__badge--alert { background: var(--color-warning); }

/* ── Panel principal ── */
.ia-panel {
  pointer-events: all;
  width: 348px;
  max-height: 500px;
  border-radius: var(--radius-xl);
  border: 1.5px solid rgba(255,255,255,0.72);
  background: rgba(253,250,248,0.88);
  backdrop-filter: blur(22px) saturate(180%);
  -webkit-backdrop-filter: blur(22px) saturate(180%);
  box-shadow:
    0 16px 48px rgba(232,149,106,0.16),
    0 4px 12px rgba(0,0,0,0.07);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transform-origin: bottom right;
  transition:
    opacity var(--transition-normal),
    transform var(--transition-spring);
}
.ia-panel--closed {
  opacity: 0;
  transform: scale(0.88) translateY(14px);
  pointer-events: none;
}
.ia-panel--open {
  opacity: 1;
  transform: scale(1) translateY(0);
}

/* ── Header ── */
.ia-panel__header {
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-divider);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}
.ia-panel__brand {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.ia-panel__icon {
  width: 26px;
  height: 26px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--color-durazno), #E8C870);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--color-durazno-dark);
}
.ia-panel__title {
  font-size: var(--text-sm);
  font-weight: 800;
  color: var(--color-text-high);
  letter-spacing: -0.01em;
  line-height: 1.2;
}
.ia-panel__context {
  font-size: 10px;
  font-weight: 600;
  color: var(--color-text-low);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-top: 1px;
}
.ia-panel__close {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-md);
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-low);
  transition:
    background var(--transition-fast),
    color var(--transition-fast);
}
.ia-panel__close:hover {
  background: var(--color-divider);
  color: var(--color-text-high);
}

/* ── Lista de sugerencias ── */
.ia-suggestions {
  overflow-y: auto;
  flex: 1;
  padding: var(--space-3) var(--space-4) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: var(--color-border) transparent;
}
.ia-suggestions::-webkit-scrollbar { width: 4px; }
.ia-suggestions::-webkit-scrollbar-track { background: transparent; }
.ia-suggestions::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 4px;
}

/* ── Tarjeta de sugerencia ── */
.ia-card {
  border-radius: var(--radius-lg);
  border: 1.5px solid var(--color-border);
  background: var(--color-surface);
  padding: var(--space-3) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  animation: ia-card-in 220ms cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes ia-card-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0);   }
}
.ia-card--alerta {
  border-color: rgba(212,146,74,0.4);
  background: rgba(255,248,225,0.6);
}
.ia-card--info {
  border-color: rgba(123,174,112,0.35);
  background: rgba(226,240,217,0.4);
}
.ia-card--warn {
  border-color: rgba(209,119,119,0.35);
  background: rgba(255,240,240,0.5);
}

.ia-card__header {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
}
.ia-card__badge {
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
  margin-top: 2px;
  line-height: 1.6;
}
.ia-card--alerta .ia-card__badge {
  background: rgba(232,200,112,0.45);
  color: var(--color-warning);
}
.ia-card--info .ia-card__badge {
  background: rgba(123,174,112,0.2);
  color: var(--color-verde-dark, #568A48);
}
.ia-card--warn .ia-card__badge {
  background: rgba(209,119,119,0.15);
  color: var(--color-error);
}

.ia-card__msg {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-high);
  line-height: 1.5;
  flex: 1;
}

.ia-card__applied {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-success);
  margin-left: var(--space-2);
}

.ia-card__detail {
  font-size: var(--text-xs);
  color: var(--color-text-mid);
  line-height: 1.6;
  padding-top: var(--space-2);
  border-top: 1px dashed var(--color-divider);
}

/* ── Textarea de edición ── */
.ia-card__edit {
  flex: 1;
  resize: none;
  border: 1.5px solid var(--color-primary);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  background: var(--color-primary-surface);
  color: var(--color-text-high);
  line-height: 1.5;
  outline: none;
  width: 100%;
  min-height: 64px;
}

/* ── Acciones ── */
.ia-card__actions {
  display: flex;
  gap: var(--space-2);
  padding-top: var(--space-1);
}
.ia-btn {
  flex: 1;
  padding: 5px var(--space-2);
  border-radius: var(--radius-md);
  border: 1.5px solid var(--color-border);
  background: transparent;
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  color: var(--color-text-mid);
  transition:
    background var(--transition-fast),
    color var(--transition-fast),
    border-color var(--transition-fast),
    transform var(--transition-fast);
  letter-spacing: 0.01em;
  line-height: 1.4;
}
.ia-btn:disabled {
  opacity: 0.45;
  cursor: default;
  pointer-events: none;
}
.ia-btn:active:not(:disabled) { transform: scale(0.95); }

.ia-btn--apply {
  background: linear-gradient(
    135deg,
    var(--color-durazno-deep),
    var(--color-durazno-dark)
  );
  border-color: transparent;
  color: white;
}
.ia-btn--apply:hover:not(:disabled) { filter: brightness(1.1); }

.ia-btn--edit:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-primary-surface);
}
.ia-btn--discard:hover:not(:disabled) {
  border-color: var(--color-error);
  color: var(--color-error);
  background: var(--color-error-surface);
}

/* ── Estado vacío ── */
.ia-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-8) var(--space-4);
  gap: var(--space-3);
  text-align: center;
}
.ia-empty__icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-lg);
  background: var(--color-divider);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-low);
}
.ia-empty__msg {
  font-size: var(--text-sm);
  color: var(--color-text-low);
  line-height: 1.55;
  max-width: 220px;
}

/* ── Dark mode ── */
.dark .ia-trigger {
  background: rgba(34,28,24,0.82);
  border-color: rgba(255,255,255,0.10);
  color: var(--color-text-high);
}
.dark .ia-panel {
  background: rgba(34,28,24,0.90);
  border-color: rgba(255,255,255,0.08);
}
.dark .ia-card { background: var(--color-surface-raised); }
.dark .ia-card--alerta { background: rgba(42,32,10,0.75); }
.dark .ia-card--info   { background: rgba(20,36,16,0.75); }
.dark .ia-card--warn   { background: rgba(40,16,16,0.75); }
.dark .ia-card__edit   { background: var(--color-primary-surface); }
`

// ─── Motor de sugerencias ─────────────────────────────────────────────────────

function calcularIMC(pesoKg, alturaCm) {
  const p = Number(pesoKg)
  const a = Number(alturaCm)
  if (!p || !a || p <= 0 || a <= 0) return null
  return +((p / ((a / 100) ** 2)).toFixed(1))
}

function clasificarIMC(imc) {
  if (imc < 16)   return { label: 'Desnutrición severa', nivel: 'warn' }
  if (imc < 18.5) return { label: 'Bajo peso',           nivel: 'alerta' }
  if (imc < 25)   return { label: 'Normopeso',           nivel: 'info' }
  if (imc < 30)   return { label: 'Sobrepeso',           nivel: 'alerta' }
  if (imc < 35)   return { label: 'Obesidad grado I',    nivel: 'warn' }
  if (imc < 40)   return { label: 'Obesidad grado II',   nivel: 'warn' }
  return                  { label: 'Obesidad grado III',  nivel: 'warn' }
}

function generarSugerencias({ paciente, ultimaHistoria, ruta }) {
  if (!paciente) {
    return [{
      id: 'no-patient',
      nivel: 'info',
      tipo: 'Contexto',
      msg: 'Seleccioná un paciente para recibir sugerencias contextuales.',
      detalle: null,
    }]
  }

  const lista       = []
  const condiciones = (paciente.condicionesMedicas ?? '').toLowerCase()
  const alergias    = (paciente.alergias ?? '').toLowerCase()
  const objetivo    = paciente.objetivo ?? ''
  const imc         = calcularIMC(paciente.peso, paciente.altura)
  const imcMostrar  = ultimaHistoria?.imc ?? imc

  // ── Condiciones médicas ──────────────────────────────────────
  if (condiciones.includes('hipert')) {
    lista.push({
      id: 'hipert',
      nivel: 'alerta',
      tipo: 'Alerta',
      msg: 'Paciente hipertenso: reducir sodio por debajo de 2 g/día.',
      detalle:
        'Evitar carnes procesadas, enlatados y embutidos. Priorizar potasio (banana, espinaca, papa). Limitar sal de mesa a < 5 g/día.',
    })
  }

  if (condiciones.includes('diabet')) {
    lista.push({
      id: 'diabetes',
      nivel: 'alerta',
      tipo: 'Alerta',
      msg: 'Paciente diabético: monitorear índice glucémico del plan.',
      detalle:
        'Priorizar hidratos complejos y fibra. Distribuir en 5-6 comidas diarias. Evitar azúcares simples y bebidas azucaradas.',
    })
  }

  if (condiciones.includes('celiaq') || alergias.includes('gluten') || alergias.includes('tacc')) {
    lista.push({
      id: 'celiaco',
      nivel: 'warn',
      tipo: 'Restricción',
      msg: 'Paciente celíaco: eliminar todo gluten del plan alimentario.',
      detalle:
        'Verificar etiquetas de cada producto. Reemplazar harinas y pastas con versiones certificadas sin TACC (arroz, maíz, mandioca, quínoa).',
    })
  }

  if (condiciones.includes('renal') || condiciones.includes('riñon') || condiciones.includes('riñón')) {
    lista.push({
      id: 'renal',
      nivel: 'warn',
      tipo: 'Restricción',
      msg: 'Función renal comprometida: restringir proteínas y fósforo.',
      detalle:
        'Limitar proteínas a 0.6–0.8 g/kg/día según estadio de ERC. Reducir potasio si hay hipercalemia y fósforo en alimentos procesados.',
    })
  }

  if (condiciones.includes('tiroides') || condiciones.includes('hipotiro') || condiciones.includes('hipertiro')) {
    lista.push({
      id: 'tiroides',
      nivel: 'info',
      tipo: 'Info',
      msg: 'Patología tiroidea: considerar interferentes en absorción de medicación.',
      detalle:
        'Evitar soja, fibra en exceso y calcio en las 1-2 h posteriores a la toma de levotiroxina. Adecuar yodo según el tipo de disfunción.',
    })
  }

  if (alergias.includes('lactosa') || condiciones.includes('intolerancia a la lactosa')) {
    lista.push({
      id: 'lactosa',
      nivel: 'info',
      tipo: 'Restricción',
      msg: 'Intolerancia a la lactosa: sustituir lácteos convencionales.',
      detalle:
        'Usar bebidas vegetales (avena, almendra) o lácteos sin lactosa. Garantizar calcio por otras fuentes: sardina, brócoli, semillas de sésamo.',
    })
  }

  // ── IMC ──────────────────────────────────────────────────────
  if (imc) {
    const clase = clasificarIMC(imc)
    if (clase.nivel !== 'info') {
      lista.push({
        id: 'imc',
        nivel: clase.nivel,
        tipo: 'IMC',
        msg: `${clase.label} detectado (IMC ${imcMostrar}).`,
        detalle:
          imc < 18.5
            ? 'Plantear hipercaloría saludable: frutos secos, palta, aceite de oliva, legumbres. Aumentar gradualmente 300-500 kcal/día.'
            : 'Diseñar déficit moderado (−300 a −500 kcal/día). Mantener proteínas altas (≥1.2 g/kg) para preservar masa muscular.',
      })
    }
  }

  // ── Objetivo ─────────────────────────────────────────────────
  if (objetivo === 'musculo') {
    lista.push({
      id: 'obj-musculo',
      nivel: 'info',
      tipo: 'Objetivo',
      msg: 'Ganancia muscular: asegurar ≥ 1.6 g de proteína/kg/día.',
      detalle:
        'Distribuir proteínas en ≥4 ingestas diarias. Incluir carbohidratos de calidad post-entrenamiento. Superávit calórico de +200 a +300 kcal/día.',
    })
  }
  if (objetivo === 'bajar') {
    lista.push({
      id: 'obj-bajar',
      nivel: 'info',
      tipo: 'Objetivo',
      msg: 'Descenso de peso: déficit sostenible con proteína alta.',
      detalle:
        'Proteína ≥ 1.2 g/kg para reducir catabolismo. Priorizar saciedad: fibra, volumen alimentario y tiempos de comida regulares.',
    })
  }
  if (objetivo === 'subir') {
    lista.push({
      id: 'obj-subir',
      nivel: 'info',
      tipo: 'Objetivo',
      msg: 'Ganancia de peso: superávit de +300 a +500 kcal/día.',
      detalle:
        'Agregar colaciones densas en energía. Priorizar hipercalóricos saludables: palta, frutos secos, batata, avena, aceite de oliva.',
    })
  }

  // ── Contexto por ruta activa ──────────────────────────────────
  if (ruta === '/analisis' && imc) {
    lista.push({
      id: 'ctx-analisis',
      nivel: 'info',
      tipo: 'Análisis',
      msg: 'Revisá evolución de peso y composición corporal en los gráficos.',
      detalle:
        'Los donuts reflejan el plan alimentario actual. Comparar IMC y RCC con la última historia clínica para evaluar tendencia.',
    })
  }
  if (ruta === '/planes') {
    lista.push({
      id: 'ctx-planes',
      nivel: 'info',
      tipo: 'Plan',
      msg: 'Al asignar el plan, verificar adecuación a las restricciones del paciente.',
      detalle:
        'El motor de costos usa precios regionales de Posadas. El reporte PDF incluye desglose económico por comida para facilitar la adherencia.',
    })
  }

  if (lista.length > 0) return lista

  return [{
    id: 'ok',
    nivel: 'info',
    tipo: 'Estado',
    msg: `Sin alertas para ${[paciente.nombre, paciente.apellido].filter(Boolean).join(' ')}.`,
    detalle:
      'Los parámetros clínicos registrados están dentro de rangos esperados para el objetivo declarado.',
  }]
}

// ─── Hook: carga reactiva del paciente activo ─────────────────────────────────

function usePacienteActivo(pacienteId) {
  const snap = useRef({ paciente: null, ultimaHistoria: null })

  const obs = useMemo(() => {
    if (!pacienteId) return null
    return liveQuery(async () => {
      const [paciente, historias] = await Promise.all([
        db.pacientes.get(pacienteId),
        db.historias.where('pacienteId').equals(pacienteId).sortBy('fecha'),
      ])
      const ultimaHistoria = historias?.length
        ? historias[historias.length - 1]
        : null
      return { paciente: paciente ?? null, ultimaHistoria }
    })
  }, [pacienteId])

  const subscribe = useCallback(
    (notify) => {
      if (!obs) {
        snap.current = { paciente: null, ultimaHistoria: null }
        notify()
        return () => {}
      }
      const sub = obs.subscribe({
        next:  (val) => { snap.current = val; notify() },
        error: ()    => notify(),
      })
      return () => sub.unsubscribe()
    },
    [obs],
  )

  return useSyncExternalStore(
    subscribe,
    () => snap.current,
    () => ({ paciente: null, ultimaHistoria: null }),
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AgenteIA() {
  const [abierto,     setAbierto]     = useState(false)
  const [descartadas, setDescartadas] = useState(() => new Set())
  const [aplicadas,   setAplicadas]   = useState(() => new Set())
  const [editando,    setEditando]    = useState(null)   // id de la card en edición
  const [editTextos,  setEditTextos]  = useState({})     // id → texto editado

  const pacienteId              = useUIStore((s) => s.pacienteId)
  const { pathname }            = useLocation()
  const { paciente, ultimaHistoria } = usePacienteActivo(pacienteId)

  // Inyectar CSS una sola vez
  useEffect(() => {
    if (document.getElementById('ia-styles')) return
    const tag = document.createElement('style')
    tag.id          = 'ia-styles'
    tag.textContent = COMPONENT_CSS
    document.head.appendChild(tag)
  }, [])

  // Reset al cambiar de paciente
  useEffect(() => {
    setDescartadas(new Set())
    setAplicadas(new Set())
    setEditando(null)
    setEditTextos({})
  }, [pacienteId])

  const todasSugerencias = useMemo(
    () => generarSugerencias({ paciente, ultimaHistoria, ruta: pathname }),
    [paciente, ultimaHistoria, pathname],
  )

  const sugerencias = useMemo(
    () => todasSugerencias.filter((s) => !descartadas.has(s.id)),
    [todasSugerencias, descartadas],
  )

  const alertCount = sugerencias.filter(
    (s) => s.nivel === 'warn' || s.nivel === 'alerta',
  ).length

  const handleAplicar = useCallback((id) => {
    setAplicadas((prev) => new Set([...prev, id]))
  }, [])

  const handleEditar = useCallback((s) => {
    setEditTextos((prev) => ({ ...prev, [s.id]: prev[s.id] ?? s.msg }))
    setEditando(s.id)
  }, [])

  const handleGuardar = useCallback(() => {
    setEditando(null)
  }, [])

  const handleDescartar = useCallback((id) => {
    setDescartadas((prev) => new Set([...prev, id]))
    setEditando((prev) => (prev === id ? null : prev))
  }, [])

  const handleEditTexto = useCallback((id, texto) => {
    setEditTextos((prev) => ({ ...prev, [id]: texto }))
  }, [])

  return (
    <div className="ia-dock" aria-live="polite" aria-atomic="false">

      {/* ── Panel ── */}
      <div
        className={`ia-panel ${abierto ? 'ia-panel--open' : 'ia-panel--closed'}`}
        role="complementary"
        aria-label="Copiloto clínico IA"
        aria-hidden={!abierto}
        {...(!abierto ? { inert: '' } : {})}
      >
        <div className="ia-panel__header">
          <div className="ia-panel__brand">
            <div className="ia-panel__icon" aria-hidden="true">
              <IconSparkle />
            </div>
            <div>
              <div className="ia-panel__title">Copiloto Clínico</div>
              <div className="ia-panel__context">
                {paciente
                  ? [paciente.nombre, paciente.apellido].filter(Boolean).join(' ')
                  : 'Sin paciente seleccionado'}
              </div>
            </div>
          </div>
          <button
            className="ia-panel__close"
            onClick={() => setAbierto(false)}
            aria-label="Cerrar copiloto"
            type="button"
          >
            <IconX />
          </button>
        </div>

        <div className="ia-suggestions" role="list">
          {sugerencias.length === 0 ? (
            <div className="ia-empty">
              <div className="ia-empty__icon" aria-hidden="true">
                <IconCheck />
              </div>
              <p className="ia-empty__msg">
                Todas las sugerencias fueron gestionadas.
              </p>
            </div>
          ) : (
            sugerencias.map((s, i) => (
              <SugerenciaCard
                key={s.id}
                sugerencia={s}
                index={i}
                enEdicion={editando === s.id}
                textoEditado={editTextos[s.id] ?? s.msg}
                aplicada={aplicadas.has(s.id)}
                onAplicar={handleAplicar}
                onEditar={handleEditar}
                onGuardar={handleGuardar}
                onDescartar={handleDescartar}
                onEditTexto={handleEditTexto}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Botón disparador ── */}
      <button
        className="ia-trigger"
        onClick={() => setAbierto((v) => !v)}
        aria-label={abierto ? 'Cerrar copiloto IA' : 'Abrir copiloto IA'}
        aria-expanded={abierto}
        aria-controls="ia-panel"
        type="button"
      >
        <span
          className={`ia-trigger__dot${alertCount > 0 ? ' ia-trigger__dot--alert' : ''}`}
          aria-hidden="true"
        />
        Copiloto
        {sugerencias.length > 0 && (
          <span
            className={`ia-trigger__badge${alertCount > 0 ? ' ia-trigger__badge--alert' : ''}`}
            aria-label={`${sugerencias.length} sugerencias activas`}
          >
            {sugerencias.length}
          </span>
        )}
      </button>

    </div>
  )
}

// ─── Tarjeta de sugerencia ────────────────────────────────────────────────────

function SugerenciaCard({
  sugerencia,
  index,
  enEdicion,
  textoEditado,
  aplicada,
  onAplicar,
  onEditar,
  onGuardar,
  onDescartar,
  onEditTexto,
}) {
  const { id, nivel, tipo, msg, detalle } = sugerencia
  const msgFinal = textoEditado !== msg ? textoEditado : msg

  return (
    <div
      className={`ia-card ia-card--${nivel}`}
      role="listitem"
      style={{ animationDelay: `${index * 45}ms` }}
    >
      <div className="ia-card__header">
        <span className="ia-card__badge">{tipo}</span>

        {enEdicion ? (
          <textarea
            className="ia-card__edit"
            value={textoEditado}
            onChange={(e) => onEditTexto(id, e.target.value)}
            onBlur={onGuardar}
            rows={3}
            aria-label="Editar texto de la sugerencia"
            autoFocus
          />
        ) : (
          <p className="ia-card__msg">
            {aplicada ? <s style={{ opacity: 0.55 }}>{msgFinal}</s> : msgFinal}
            {aplicada && (
              <span className="ia-card__applied" aria-live="polite">
                <IconCheckSmall />
                Aplicada
              </span>
            )}
          </p>
        )}
      </div>

      {detalle && !enEdicion && (
        <p className="ia-card__detail">{detalle}</p>
      )}

      <div className="ia-card__actions">
        <button
          className="ia-btn ia-btn--apply"
          onClick={() => onAplicar(id)}
          disabled={aplicada}
          aria-label={aplicada ? 'Sugerencia ya aplicada' : 'Aplicar sugerencia'}
          type="button"
        >
          Aplicar
        </button>
        <button
          className="ia-btn ia-btn--edit"
          onClick={enEdicion ? onGuardar : () => onEditar(sugerencia)}
          aria-label={enEdicion ? 'Guardar cambios' : 'Editar sugerencia'}
          type="button"
        >
          {enEdicion ? 'Guardar' : 'Editar'}
        </button>
        <button
          className="ia-btn ia-btn--discard"
          onClick={() => onDescartar(id)}
          aria-label="Descartar sugerencia"
          type="button"
        >
          Descartar
        </button>
      </div>
    </div>
  )
}

// ─── Íconos SVG inline ────────────────────────────────────────────────────────

function IconSparkle() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2 L13.5 8.5 L20 10 L13.5 11.5 L12 18 L10.5 11.5 L4 10 L10.5 8.5 Z" />
      <path d="M19 2 L19.8 4.2 L22 5 L19.8 5.8 L19 8 L18.2 5.8 L16 5 L18.2 4.2 Z" />
    </svg>
  )
}

function IconX() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6"  x2="6"  y2="18" />
      <line x1="6"  y1="6"  x2="18" y2="18" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function IconCheckSmall() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
