/**
 * ClinicalAnalysisDashboard.tsx
 *
 * Panel standalone de análisis clínico. Recibe patientData + labResults,
 * llama al motor de inferencia local y presenta las sugerencias agrupadas
 * por tipo (Alerta / Ajuste / Recordatorio) con acciones Aplicar·Editar·Descartar.
 *
 * Diseño: sistema de CSS variables del proyecto (mismo token set que AgenteIA).
 * CSS inyectado una sola vez via useEffect (id="cad-styles").
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  analyzeClinicalData,
  getSeasonalContext,
  type PatientData,
  type AgentSuggestion,
  type ExtendedAnalytics,
} from '../services/ai/agent'

// ─── Props ────────────────────────────────────────────────────────────────────

interface ClinicalAnalysisDashboardProps {
  patientData: PatientData
  labResults?: ExtendedAnalytics
}

// ─── CSS ─────────────────────────────────────────────────────────────────────

const COMPONENT_CSS = `
/* ══ Wrapper ═══════════════════════════════════════════════════════════════ */
.cad {
  font-family: var(--font-sans);
  max-width: 900px;
  margin-inline: auto;
  padding: var(--space-6) var(--space-5) var(--space-12);
  animation: cad-fade-in 280ms cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes cad-fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ══ Header ═══════════════════════════════════════════════════════════════ */
.cad__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
  flex-wrap: wrap;
}
.cad__header-left {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.cad__header-icon {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, var(--color-durazno), #E8C870);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--color-durazno-dark);
  box-shadow: 0 2px 8px rgba(232,149,106,0.30);
}
.cad__title {
  font-size: var(--text-xl);
  font-weight: 800;
  color: var(--color-text-high);
  letter-spacing: -0.02em;
  line-height: 1.2;
}
.cad__subtitle {
  font-size: var(--text-xs);
  color: var(--color-text-low);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-top: 2px;
}
.cad__header-right {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

/* Chips de resumen en el header */
.cad__chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 12px;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1.4;
  border: 1.5px solid transparent;
}
.cad__chip--alert {
  background: rgba(255,235,195,0.80);
  border-color: rgba(212,146,74,0.50);
  color: #9a5c10;
}
.cad__chip--adjust {
  background: rgba(226,240,217,0.80);
  border-color: rgba(123,174,112,0.45);
  color: var(--color-verde-dark, #4a7a3c);
}
.cad__chip--reminder {
  background: rgba(230,234,255,0.80);
  border-color: rgba(100,130,200,0.35);
  color: #3d5a9e;
}
.cad__chip--season {
  background: var(--color-surface-raised, #f5f0ec);
  border-color: var(--color-border);
  color: var(--color-text-mid);
  font-weight: 600;
}

/* ══ Banner de alerta global ════════════════════════════════════════════════ */
.cad__alert-banner {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  border-radius: var(--radius-lg);
  background: rgba(255,244,210,0.92);
  border: 1.5px solid rgba(212,146,74,0.55);
  margin-bottom: var(--space-6);
  box-shadow: 0 2px 8px rgba(212,146,74,0.10);
}
.cad__alert-banner__icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  background: rgba(212,146,74,0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #b07014;
  margin-top: 1px;
}
.cad__alert-banner__body {}
.cad__alert-banner__title {
  font-size: var(--text-sm);
  font-weight: 800;
  color: #7d4e0a;
  letter-spacing: -0.01em;
}
.cad__alert-banner__desc {
  font-size: var(--text-xs);
  color: #9a6020;
  line-height: 1.6;
  margin-top: 3px;
}

/* ══ Sección ════════════════════════════════════════════════════════════════ */
.cad__section {
  margin-bottom: var(--space-6);
}
.cad__section-label {
  font-size: var(--text-xs);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: var(--color-primary);
  margin-bottom: var(--space-3);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.cad__section-label--alert { color: #b07014; }
.cad__section-label--adjust { color: var(--color-verde-dark, #4a7a3c); }
.cad__section-label--reminder { color: #3d5a9e; }
.cad__section-label::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--color-divider);
}

/* ══ Tarjeta de sugerencia ══════════════════════════════════════════════════ */
.cad__card {
  border-radius: var(--radius-xl);
  border: 1.5px solid var(--color-border);
  background: var(--color-surface);
  padding: var(--space-4) var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
  transition: box-shadow var(--transition-fast);
  animation: cad-card-in 240ms cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes cad-card-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0);   }
}
.cad__card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.06);
}

/* Variantes por tipo */
.cad__card--alerta {
  border-color: rgba(212,146,74,0.45);
  background: rgba(255,248,225,0.70);
}
.cad__card--alerta:hover { box-shadow: 0 4px 16px rgba(212,146,74,0.14); }
.cad__card--ajuste {
  border-color: rgba(123,174,112,0.40);
  background: rgba(226,240,217,0.45);
}
.cad__card--ajuste:hover { box-shadow: 0 4px 16px rgba(123,174,112,0.12); }
.cad__card--recordatorio {
  border-color: rgba(100,130,200,0.30);
  background: rgba(230,234,255,0.40);
}

/* ── Card head ── */
.cad__card-head {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
}
.cad__card-badges {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
  padding-top: 1px;
}
.cad__badge {
  display: inline-flex;
  align-items: center;
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.10em;
  padding: 2px 9px;
  border-radius: var(--radius-full);
  line-height: 1.6;
  white-space: nowrap;
}
.cad__badge--type-alerta {
  background: rgba(212,146,74,0.20);
  color: #8a4e0a;
}
.cad__badge--type-ajuste {
  background: rgba(123,174,112,0.22);
  color: #376a2a;
}
.cad__badge--type-recordatorio {
  background: rgba(100,130,200,0.20);
  color: #2c4799;
}
.cad__badge--priority-alta {
  background: rgba(209,119,119,0.18);
  color: var(--color-error, #b94a4a);
}
.cad__badge--priority-media {
  background: rgba(232,200,112,0.28);
  color: #8a6c0a;
}
.cad__badge--priority-baja {
  background: var(--color-divider);
  color: var(--color-text-low);
}
.cad__badge--evidence {
  background: rgba(100,130,200,0.14);
  color: #3d5a9e;
}

.cad__card-content { flex: 1; min-width: 0; }
.cad__card-title {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--color-text-high);
  line-height: 1.4;
  letter-spacing: -0.01em;
}
.cad__card-title--applied {
  text-decoration: line-through;
  opacity: 0.50;
}
.cad__card-applied-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-success);
}

/* ── Descripción ── */
.cad__card-desc {
  font-size: var(--text-xs);
  color: var(--color-text-mid);
  line-height: 1.65;
  margin-top: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px dashed var(--color-divider);
  white-space: pre-line;
}

/* ── Payload detail ── */
.cad__card-payload {
  font-size: var(--text-xs);
  color: var(--color-text-mid);
  line-height: 1.6;
  padding: var(--space-2) var(--space-3);
  background: rgba(0,0,0,0.025);
  border-radius: var(--radius-md);
  border-left: 2.5px solid var(--color-divider);
  white-space: pre-line;
}

/* ── Textarea de edición ── */
.cad__card-edit {
  width: 100%;
  resize: vertical;
  border: 1.5px solid var(--color-primary);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  background: var(--color-primary-surface);
  color: var(--color-text-high);
  line-height: 1.5;
  outline: none;
  min-height: 72px;
  box-shadow: 0 0 0 3px rgba(232,149,106,0.10);
  transition: border-color var(--transition-fast);
}
.cad__card-edit:focus {
  border-color: var(--color-durazno-deep);
  box-shadow: 0 0 0 3px rgba(232,149,106,0.18);
}

/* ── Acciones ── */
.cad__card-actions {
  display: flex;
  gap: var(--space-2);
  padding-top: var(--space-1);
}
.cad__btn {
  flex: 1;
  max-width: 120px;
  padding: 6px var(--space-3);
  border-radius: var(--radius-md);
  border: 1.5px solid var(--color-border);
  background: transparent;
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  color: var(--color-text-mid);
  letter-spacing: 0.02em;
  transition:
    background var(--transition-fast),
    color var(--transition-fast),
    border-color var(--transition-fast),
    transform var(--transition-fast);
}
.cad__btn:disabled {
  opacity: 0.40;
  cursor: default;
  pointer-events: none;
}
.cad__btn:active:not(:disabled) { transform: scale(0.96); }

.cad__btn--apply {
  background: linear-gradient(135deg, var(--color-durazno-deep), var(--color-durazno-dark));
  border-color: transparent;
  color: #fff;
}
.cad__btn--apply:hover:not(:disabled) { filter: brightness(1.08); }

.cad__btn--edit:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-primary-surface);
}
.cad__btn--discard:hover:not(:disabled) {
  border-color: var(--color-error);
  color: var(--color-error);
  background: var(--color-error-surface, rgba(209,119,119,0.08));
}

/* ══ Empty state ════════════════════════════════════════════════════════════ */
.cad__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-12) var(--space-4);
  gap: var(--space-4);
  text-align: center;
}
.cad__empty-icon {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-xl);
  background: var(--color-surface-raised, #f5f0ec);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-low);
}
.cad__empty-title {
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--color-text-mid);
}
.cad__empty-desc {
  font-size: var(--text-sm);
  color: var(--color-text-low);
  line-height: 1.6;
  max-width: 300px;
}

/* ══ Dark mode ══════════════════════════════════════════════════════════════ */
.dark .cad__card { background: var(--color-surface-raised); }
.dark .cad__card--alerta { background: rgba(50,32,8,0.75); border-color: rgba(212,146,74,0.30); }
.dark .cad__card--ajuste { background: rgba(18,36,14,0.75); border-color: rgba(123,174,112,0.25); }
.dark .cad__card--recordatorio { background: rgba(16,22,48,0.70); border-color: rgba(100,130,200,0.20); }
.dark .cad__alert-banner { background: rgba(50,32,8,0.82); border-color: rgba(212,146,74,0.35); }
.dark .cad__card-payload { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.12); }
.dark .cad__chip--season { background: var(--color-surface); }
`

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildPayloadNote(s: AgentSuggestion): string | null {
  const p = s.actionPayload
  switch (p.action) {
    case 'adjust_macro':
      return p.note ? `Indicación: ${p.note}` : null
    case 'restrict_food':
      return `Evitar: ${p.foods.join(', ')}.`
    case 'add_supplement':
      return `Suplemento: ${p.supplement} — ${p.dose}`
    case 'request_lab':
      return `Solicitar${p.urgency === 'urgent' ? ' [URGENTE]' : ''}: ${p.tests.join(', ')}.`
    case 'schedule_followup':
      return `Programar seguimiento en ${p.days} días.`
    case 'lifestyle':
      return p.recommendation
    case 'adjust_plan_text':
      return `Ajustar ${p.field}: ${p.suggestion}`
    default:
      return null
  }
}

const TYPE_LABEL: Record<AgentSuggestion['type'], string> = {
  alerta: 'Alerta',
  ajuste: 'Ajuste',
  recordatorio: 'Recordatorio',
}

const PRIORITY_LABEL: Record<AgentSuggestion['priority'], string> = {
  alta: 'Prioridad Alta',
  media: 'Prioridad Media',
  baja: 'Prioridad Baja',
}

// ─── Componente de tarjeta ────────────────────────────────────────────────────

interface CardState {
  applied: Set<string>
  discarded: Set<string>
  editing: string | null
  editTexts: Record<string, string>
}

interface SuggestionCardProps {
  suggestion: AgentSuggestion
  index: number
  state: CardState
  onApply: (id: string) => void
  onEdit: (id: string, currentTitle: string) => void
  onSave: () => void
  onDiscard: (id: string) => void
  onEditText: (id: string, text: string) => void
}

function SuggestionCard({
  suggestion: s,
  index,
  state,
  onApply,
  onEdit,
  onSave,
  onDiscard,
  onEditText,
}: SuggestionCardProps) {
  const isApplied  = state.applied.has(s.id)
  const isEditing  = state.editing === s.id
  const titleText  = state.editTexts[s.id] ?? s.title
  const payloadNote = buildPayloadNote(s)

  return (
    <div
      className={`cad__card cad__card--${s.type}`}
      role="listitem"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="cad__card-head">
        <div className="cad__card-badges">
          <span className={`cad__badge cad__badge--type-${s.type}`}>
            {TYPE_LABEL[s.type]}
          </span>
          <span className={`cad__badge cad__badge--priority-${s.priority}`}>
            {PRIORITY_LABEL[s.priority]}
          </span>
          {s.evidenceLevel && (
            <span className="cad__badge cad__badge--evidence">
              Evidencia {s.evidenceLevel}
            </span>
          )}
        </div>

        <div className="cad__card-content">
          {isEditing ? (
            <textarea
              className="cad__card-edit"
              value={titleText}
              rows={3}
              autoFocus
              aria-label="Editar título de la sugerencia"
              onChange={(e) => onEditText(s.id, e.target.value)}
              onBlur={onSave}
            />
          ) : (
            <p className={`cad__card-title${isApplied ? ' cad__card-title--applied' : ''}`}>
              {titleText}
              {isApplied && (
                <span className="cad__card-applied-tag" aria-live="polite">
                  <IconCheckSmall />
                  Aplicada
                </span>
              )}
            </p>
          )}

          {!isEditing && (
            <p className="cad__card-desc">{s.description}</p>
          )}

          {!isEditing && payloadNote && (
            <p className="cad__card-payload">{payloadNote}</p>
          )}
        </div>
      </div>

      <div className="cad__card-actions">
        <button
          className="cad__btn cad__btn--apply"
          onClick={() => onApply(s.id)}
          disabled={isApplied}
          aria-label={isApplied ? 'Sugerencia ya aplicada' : 'Aplicar sugerencia'}
          type="button"
        >
          {isApplied ? 'Aplicada' : 'Aplicar'}
        </button>
        <button
          className="cad__btn cad__btn--edit"
          onClick={isEditing ? onSave : () => onEdit(s.id, titleText)}
          aria-label={isEditing ? 'Guardar cambios' : 'Editar sugerencia'}
          type="button"
        >
          {isEditing ? 'Guardar' : 'Editar'}
        </button>
        <button
          className="cad__btn cad__btn--discard"
          onClick={() => onDiscard(s.id)}
          aria-label="Descartar sugerencia"
          type="button"
        >
          Descartar
        </button>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ClinicalAnalysisDashboard({
  patientData,
  labResults,
}: ClinicalAnalysisDashboardProps) {

  // Fusionar labResults en historia.analytics para el motor
  const enrichedData: PatientData = useMemo(() => {
    if (!labResults) return patientData
    const historia = patientData.historia ?? {
      id: 'temp',
      pacienteId: patientData.id,
      fecha: new Date().toISOString(),
      peso: patientData.peso ?? 0,
      altura: patientData.altura ?? 0,
      imc: patientData.peso && patientData.altura
        ? +(patientData.peso / ((patientData.altura / 100) ** 2)).toFixed(1)
        : 0,
    }
    return {
      ...patientData,
      historia: {
        ...historia,
        analytics: { ...historia.analytics, ...labResults },
      },
    }
  }, [patientData, labResults])

  // Motor de inferencia
  const allSuggestions = useMemo(
    () => analyzeClinicalData(enrichedData),
    [enrichedData],
  )

  // Estado de acciones
  const [applied,   setApplied]   = useState<Set<string>>(() => new Set())
  const [discarded, setDiscarded] = useState<Set<string>>(() => new Set())
  const [editing,   setEditing]   = useState<string | null>(null)
  const [editTexts, setEditTexts] = useState<Record<string, string>>({})

  // Reset al cambiar de paciente
  useEffect(() => {
    setApplied(new Set())
    setDiscarded(new Set())
    setEditing(null)
    setEditTexts({})
  }, [patientData.id])

  // Inyectar CSS una sola vez
  useEffect(() => {
    if (document.getElementById('cad-styles')) return
    const tag = document.createElement('style')
    tag.id          = 'cad-styles'
    tag.textContent = COMPONENT_CSS
    document.head.appendChild(tag)
  }, [])

  const visible = useMemo(
    () => allSuggestions.filter((s) => !discarded.has(s.id)),
    [allSuggestions, discarded],
  )

  const alertas      = visible.filter((s) => s.type === 'alerta')
  const ajustes      = visible.filter((s) => s.type === 'ajuste')
  const recordatorios = visible.filter((s) => s.type === 'recordatorio')

  const cardState: CardState = { applied, discarded, editing, editTexts }

  const handleApply = useCallback((id: string) => {
    setApplied((prev) => new Set([...prev, id]))
  }, [])

  const handleEdit = useCallback((id: string, current: string) => {
    setEditTexts((prev) => ({ ...prev, [id]: prev[id] ?? current }))
    setEditing(id)
  }, [])

  const handleSave = useCallback(() => setEditing(null), [])

  const handleDiscard = useCallback((id: string) => {
    setDiscarded((prev) => new Set([...prev, id]))
    setEditing((prev) => (prev === id ? null : prev))
  }, [])

  const handleEditText = useCallback((id: string, text: string) => {
    setEditTexts((prev) => ({ ...prev, [id]: text }))
  }, [])

  const sc = getSeasonalContext()
  const patientName = [patientData.nombre, patientData.apellido].filter(Boolean).join(' ')

  return (
    <section className="cad" aria-label="Análisis clínico del paciente">

      {/* ── Header ── */}
      <header className="cad__header">
        <div className="cad__header-left">
          <div className="cad__header-icon" aria-hidden="true">
            <IconSparkle />
          </div>
          <div>
            <h2 className="cad__title">Análisis Clínico</h2>
            <p className="cad__subtitle">{patientName || 'Paciente sin nombre'}</p>
          </div>
        </div>

        <div className="cad__header-right" aria-label="Resumen de sugerencias">
          <span className="cad__chip cad__chip--season">{sc.label}</span>
          {alertas.length > 0 && (
            <span className="cad__chip cad__chip--alert">
              <IconAlertDot />
              {alertas.length} {alertas.length === 1 ? 'alerta' : 'alertas'}
            </span>
          )}
          {ajustes.length > 0 && (
            <span className="cad__chip cad__chip--adjust">
              {ajustes.length} {ajustes.length === 1 ? 'ajuste' : 'ajustes'}
            </span>
          )}
          {recordatorios.length > 0 && (
            <span className="cad__chip cad__chip--reminder">
              {recordatorios.length} {recordatorios.length === 1 ? 'recordatorio' : 'recordatorios'}
            </span>
          )}
        </div>
      </header>

      {/* ── Banner de alerta global ── */}
      {alertas.length > 0 && (
        <div className="cad__alert-banner" role="alert">
          <div className="cad__alert-banner__icon" aria-hidden="true">
            <IconWarning />
          </div>
          <div className="cad__alert-banner__body">
            <p className="cad__alert-banner__title">
              {alertas.length === 1
                ? 'Hay 1 alerta clínica activa que requiere revisión.'
                : `Hay ${alertas.length} alertas clínicas activas que requieren revisión.`}
            </p>
            <p className="cad__alert-banner__desc">
              Revisá cada sugerencia y seleccioná Aplicar, Editar o Descartar según corresponda.
              Las alertas de prioridad alta deben atenderse antes de modificar el plan alimentario.
            </p>
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {visible.length === 0 && (
        <div className="cad__empty">
          <div className="cad__empty-icon" aria-hidden="true">
            <IconCheck />
          </div>
          <p className="cad__empty-title">Sin sugerencias pendientes</p>
          <p className="cad__empty-desc">
            Todos los parámetros clínicos se encuentran dentro de los rangos esperados
            para el objetivo y condiciones declaradas del/la paciente.
          </p>
        </div>
      )}

      {/* ── Sección Alertas ── */}
      {alertas.length > 0 && (
        <div className="cad__section" role="list" aria-label="Alertas clínicas">
          <h3 className="cad__section-label cad__section-label--alert">
            Alertas
          </h3>
          {alertas.map((s, i) => (
            <SuggestionCard
              key={s.id}
              suggestion={s}
              index={i}
              state={cardState}
              onApply={handleApply}
              onEdit={handleEdit}
              onSave={handleSave}
              onDiscard={handleDiscard}
              onEditText={handleEditText}
            />
          ))}
        </div>
      )}

      {/* ── Sección Ajustes ── */}
      {ajustes.length > 0 && (
        <div className="cad__section" role="list" aria-label="Ajustes recomendados">
          <h3 className="cad__section-label cad__section-label--adjust">
            Ajustes recomendados
          </h3>
          {ajustes.map((s, i) => (
            <SuggestionCard
              key={s.id}
              suggestion={s}
              index={i}
              state={cardState}
              onApply={handleApply}
              onEdit={handleEdit}
              onSave={handleSave}
              onDiscard={handleDiscard}
              onEditText={handleEditText}
            />
          ))}
        </div>
      )}

      {/* ── Sección Recordatorios ── */}
      {recordatorios.length > 0 && (
        <div className="cad__section" role="list" aria-label="Recordatorios">
          <h3 className="cad__section-label cad__section-label--reminder">
            Recordatorios
          </h3>
          {recordatorios.map((s, i) => (
            <SuggestionCard
              key={s.id}
              suggestion={s}
              index={i}
              state={cardState}
              onApply={handleApply}
              onEdit={handleEdit}
              onSave={handleSave}
              onDiscard={handleDiscard}
              onEditText={handleEditText}
            />
          ))}
        </div>
      )}

    </section>
  )
}

// ─── Íconos SVG inline ────────────────────────────────────────────────────────

function IconSparkle() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2 L13.5 8.5 L20 10 L13.5 11.5 L12 18 L10.5 11.5 L4 10 L10.5 8.5 Z" />
      <path d="M19 2 L19.8 4.2 L22 5 L19.8 5.8 L19 8 L18.2 5.8 L16 5 L18.2 4.2 Z" />
    </svg>
  )
}

function IconWarning() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function IconAlertDot() {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
      <circle cx="4" cy="4" r="4" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
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
