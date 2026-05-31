/**
 * PatientMonitoringPanel.tsx
 *
 * Panel de "Insights de Evolución" del paciente.
 * Conecta con analyzePatientEvolution (patientMonitoring.ts) y renderiza
 * AgentSuggestion[] con tarjetas de prioridad visual y botonera
 * Aplicar · Editar · Descartar para que la nutricionista conserve el control.
 *
 * Branding: icono Sparkles de lucide-react con degradado violeta-indigo → fucsia.
 * Sin referencias a "copiloto" / "copilot" en la UI.
 * CSS inyectado una sola vez (id="pmp-styles") — mismo patrón que ClinicalAnalysisDashboard.
 */

import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  analyzePatientEvolution,
  type PatientProfile,
  type ConsultationRecord,
} from '../services/ai/patientMonitoring'
import type { AgentSuggestion, ActionPayload } from '../services/ai/agent'

// ─── Props ────────────────────────────────────────────────────────────────────

interface PatientMonitoringPanelProps {
  patientData:         PatientProfile
  consultationHistory: ConsultationRecord[]
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const COMPONENT_CSS = `
/* ══ Wrapper ══════════════════════════════════════════════════════════════ */
.pmp {
  font-family: var(--font-sans);
  border-radius: var(--radius-xl);
  border: 1.5px solid var(--color-border);
  background: var(--color-surface);
  overflow: hidden;
  animation: pmp-fade-in 260ms cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes pmp-fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ══ Header ══════════════════════════════════════════════════════════════ */
.pmp__header {
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-divider);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}
.pmp__brand {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.pmp__icon-wrap {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, #eef2ff 0%, #f5f3ff 50%, #fdf4ff 100%);
  border: 1.5px solid rgba(167, 139, 250, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.12);
}
.pmp__icon-wrap svg {
  /* SVG stroke se define inline via style para el degradado */
}
.pmp__title {
  font-size: var(--text-base);
  font-weight: 800;
  color: var(--color-text-high);
  letter-spacing: -0.015em;
  line-height: 1.2;
}
.pmp__subtitle {
  font-size: 10px;
  font-weight: 600;
  color: var(--color-text-low);
  text-transform: uppercase;
  letter-spacing: 0.09em;
  margin-top: 1px;
}
.pmp__badge {
  min-width: 22px;
  height: 22px;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, #818cf8, #a78bfa, #e879f9);
  color: white;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(139, 92, 246, 0.30);
}

/* ══ Sección "Análisis del Asistente" ══════════════════════════════════ */
.pmp__section-label {
  padding: var(--space-3) var(--space-5) var(--space-1);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-low);
}

/* ══ Lista de sugerencias ═════════════════════════════════════════════════ */
.pmp__list {
  padding: var(--space-3) var(--space-4) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-height: 520px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: var(--color-border) transparent;
}
.pmp__list::-webkit-scrollbar { width: 4px; }
.pmp__list::-webkit-scrollbar-track { background: transparent; }
.pmp__list::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 4px;
}

/* ══ Tarjeta ══════════════════════════════════════════════════════════════ */
.pmp-card {
  border-radius: var(--radius-lg);
  border: 1.5px solid var(--color-border);
  background: var(--color-surface);
  padding: var(--space-3) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  animation: pmp-card-in 220ms cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes pmp-card-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Variantes de prioridad */
.pmp-card--critical {
  border-color: rgba(209, 119, 119, 0.45);
  background: rgba(255, 240, 240, 0.55);
}
.pmp-card--warning {
  border-color: rgba(212, 146, 74, 0.45);
  background: rgba(255, 248, 225, 0.60);
}
.pmp-card--neutral {
  border-color: rgba(167, 139, 250, 0.25);
  background: rgba(245, 243, 255, 0.45);
}

/* ── Badges de tipo y evidencia ── */
.pmp-card__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-1);
}
.pmp-card__type-badge {
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  line-height: 1.6;
  flex-shrink: 0;
}
.pmp-card--critical .pmp-card__type-badge {
  background: rgba(209, 119, 119, 0.15);
  color: var(--color-error);
}
.pmp-card--warning .pmp-card__type-badge {
  background: rgba(232, 200, 112, 0.40);
  color: var(--color-warning);
}
.pmp-card--neutral .pmp-card__type-badge {
  background: rgba(167, 139, 250, 0.18);
  color: #7c3aed;
}
.pmp-card__evidence {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-low);
}

/* ── Título y estado ── */
.pmp-card__title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-2);
}
.pmp-card__title {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--color-text-high);
  line-height: 1.45;
  flex: 1;
}
.pmp-card__title--applied {
  text-decoration: line-through;
  opacity: 0.5;
}
.pmp-card__applied-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-success);
  flex-shrink: 0;
}

/* ── Descripción ── */
.pmp-card__desc {
  font-size: var(--text-xs);
  color: var(--color-text-mid);
  line-height: 1.65;
}
.pmp-card__expand-btn {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-top: 3px;
  font-size: 11px;
  font-weight: 700;
  color: #7c3aed;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  transition: color var(--transition-fast);
}
.pmp-card__expand-btn:hover { color: #5b21b6; }

/* ── Payload detail ── */
.pmp-card__detail {
  font-size: var(--text-xs);
  color: var(--color-text-low);
  line-height: 1.6;
  border-top: 1px dashed var(--color-divider);
  padding-top: var(--space-2);
}

/* ── Textarea de edición ── */
.pmp-card__edit {
  width: 100%;
  resize: none;
  border: 1.5px solid #a78bfa;
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  background: rgba(245, 243, 255, 0.70);
  color: var(--color-text-high);
  line-height: 1.5;
  outline: none;
  min-height: 64px;
  transition: box-shadow var(--transition-fast);
}
.pmp-card__edit:focus { box-shadow: 0 0 0 3px rgba(167, 139, 250, 0.25); }

/* ── Botonera ── */
.pmp-card__actions {
  display: flex;
  gap: var(--space-2);
  padding-top: var(--space-1);
}
.pmp-btn {
  flex: 1;
  padding: 5px var(--space-2);
  border-radius: var(--radius-md);
  border: 1.5px solid var(--color-border);
  background: transparent;
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  color: var(--color-text-mid);
  letter-spacing: 0.01em;
  line-height: 1.4;
  transition:
    background var(--transition-fast),
    color var(--transition-fast),
    border-color var(--transition-fast),
    transform var(--transition-fast);
}
.pmp-btn:disabled {
  opacity: 0.40;
  cursor: default;
  pointer-events: none;
}
.pmp-btn:active:not(:disabled) { transform: scale(0.95); }

/* Aplicar — degradado violeta→fucsia */
.pmp-btn--apply {
  background: linear-gradient(135deg, #6d28d9, #7c3aed, #a21caf);
  border-color: transparent;
  color: white;
}
.pmp-btn--apply:hover:not(:disabled) { filter: brightness(1.12); }

/* Editar */
.pmp-btn--edit:hover:not(:disabled) {
  border-color: #a78bfa;
  color: #7c3aed;
  background: rgba(245, 243, 255, 0.60);
}

/* Descartar */
.pmp-btn--discard:hover:not(:disabled) {
  border-color: var(--color-error);
  color: var(--color-error);
  background: var(--color-error-surface, rgba(255, 240, 240, 0.6));
}

/* ══ Estado vacío ═════════════════════════════════════════════════════════ */
.pmp__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-10) var(--space-4);
  text-align: center;
}
.pmp__empty-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-lg);
  background: var(--color-divider);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-success);
}
.pmp__empty-msg {
  font-size: var(--text-sm);
  color: var(--color-text-low);
  line-height: 1.6;
  max-width: 220px;
}

/* ══ Footer ═══════════════════════════════════════════════════════════════ */
.pmp__footer {
  padding: var(--space-3) var(--space-5);
  border-top: 1px solid var(--color-divider);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.pmp__footer-meta {
  font-size: 11px;
  color: var(--color-text-low);
}
.pmp__footer-count {
  font-size: 11px;
  font-weight: 700;
  color: #7c3aed;
}

/* ══ Dark mode ══════════════════════════════════════════════════════════ */
.dark .pmp {
  border-color: rgba(255,255,255,0.08);
  background: var(--color-surface);
}
.dark .pmp__icon-wrap {
  background: linear-gradient(135deg, rgba(67,56,202,0.25), rgba(109,40,217,0.22), rgba(162,28,175,0.18));
  border-color: rgba(167,139,250,0.20);
}
.dark .pmp-card            { background: var(--color-surface-raised); }
.dark .pmp-card--critical  { background: rgba(40, 16, 16, 0.75); border-color: rgba(209,119,119,0.30); }
.dark .pmp-card--warning   { background: rgba(42, 32, 10, 0.75); border-color: rgba(212,146,74,0.30); }
.dark .pmp-card--neutral   { background: rgba(30, 20, 50, 0.60); border-color: rgba(167,139,250,0.18); }
.dark .pmp-card__edit      { background: rgba(30, 20, 50, 0.55); border-color: #7c3aed; }
.dark .pmp-card--neutral .pmp-card__type-badge { color: #c4b5fd; }
.dark .pmp-card__expand-btn       { color: #c4b5fd; }
.dark .pmp-card__expand-btn:hover { color: #a78bfa; }
.dark .pmp__footer-count   { color: #c4b5fd; }
`

// ─── Helpers de presentación ──────────────────────────────────────────────────

type CardVariant = 'critical' | 'warning' | 'neutral'

function getVariant(s: AgentSuggestion): CardVariant {
  if (s.priority === 'alta') return 'critical'
  if (s.priority === 'media') return 'warning'
  return 'neutral'
}

function formatPayloadDetail(p: ActionPayload): string {
  if (p.action === 'restrict_food')
    return `Evitar: ${p.foods.join(', ')}.`
  if (p.action === 'add_supplement')
    return `Suplemento sugerido: ${p.supplement} — ${p.dose}`
  if (p.action === 'request_lab')
    return `Solicitar${p.urgency === 'urgent' ? ' [URGENTE]' : ''}: ${p.tests.join(', ')}.`
  if (p.action === 'adjust_macro' && p.note)
    return p.note
  if (p.action === 'schedule_followup')
    return `Programar seguimiento en ${p.days} días.`
  if (p.action === 'lifestyle')
    return p.recommendation
  if (p.action === 'adjust_plan_text')
    return `Ajuste en ${p.field}: ${p.suggestion}`
  return ''
}

const EVIDENCE_LABEL: Record<NonNullable<AgentSuggestion['evidenceLevel']>, string> = {
  A: 'Evidencia A',
  B: 'Evidencia B',
  C: 'Evidencia C',
}

const TYPE_LABEL: Record<AgentSuggestion['type'], string> = {
  alerta:       'Alerta clínica',
  ajuste:       'Ajuste sugerido',
  recordatorio: 'Recordatorio',
}

// ─── Icono Sparkles con degradado inline ──────────────────────────────────────
// lucide-react emite stroke="currentColor" y no soporta linearGradient nativo;
// para el efecto violeta→fucsia usamos SVG manual con <defs><linearGradient>.

function SparklesGradient({ size = 18 }: { size?: number }) {
  const gradId = 'pmp-sparkles-grad'
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#818cf8" />
          <stop offset="50%"  stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#e879f9" />
        </linearGradient>
      </defs>
      {/* Sparkles icon paths */}
      <path stroke={`url(#${gradId})`} d="M12 3 L13.5 8.5 L19 10 L13.5 11.5 L12 17 L10.5 11.5 L5 10 L10.5 8.5 Z" />
      <path stroke={`url(#${gradId})`} d="M19 2 L19.9 4.1 L22 5 L19.9 5.9 L19 8 L18.1 5.9 L16 5 L18.1 4.1 Z" />
      <path stroke={`url(#${gradId})`} d="M6 17 L6.7 18.7 L8 19.3 L6.7 20 L6 21.7 L5.3 20 L4 19.3 L5.3 18.7 Z" />
    </svg>
  )
}

// ─── Tarjeta de sugerencia ────────────────────────────────────────────────────

interface SuggestionCardProps {
  suggestion:   AgentSuggestion
  index:        number
  applied:      boolean
  editingId:    string | null
  editText:     string
  onApply:      (id: string) => void
  onEdit:       (id: string) => void
  onDiscard:    (id: string) => void
  onEditChange: (text: string) => void
  onEditSave:   () => void
}

function SuggestionCard({
  suggestion,
  index,
  applied,
  editingId,
  editText,
  onApply,
  onEdit,
  onDiscard,
  onEditChange,
  onEditSave,
}: SuggestionCardProps) {
  const [expanded, setExpanded] = useState(false)
  const variant   = getVariant(suggestion)
  const isEditing = editingId === suggestion.id
  const detail    = formatPayloadDetail(suggestion.actionPayload)
  const descFull  = suggestion.description
  const TRUNCATE  = 130
  const isLong    = descFull.length > TRUNCATE

  return (
    <div
      className={`pmp-card pmp-card--${variant}`}
      role="article"
      style={{ animationDelay: `${index * 55}ms` }}
    >
      {/* Meta: tipo + evidencia */}
      <div className="pmp-card__meta">
        <span className="pmp-card__type-badge">{TYPE_LABEL[suggestion.type]}</span>
        {suggestion.evidenceLevel && (
          <span className="pmp-card__evidence">{EVIDENCE_LABEL[suggestion.evidenceLevel]}</span>
        )}
      </div>

      {/* Título o textarea de edición */}
      <div className="pmp-card__title-row">
        {isEditing ? (
          <textarea
            className="pmp-card__edit"
            value={editText}
            onChange={e => onEditChange(e.target.value)}
            onBlur={onEditSave}
            rows={3}
            aria-label="Editar texto de la sugerencia"
            autoFocus
          />
        ) : (
          <p className={`pmp-card__title${applied ? ' pmp-card__title--applied' : ''}`}>
            {editText !== suggestion.title ? editText : suggestion.title}
          </p>
        )}

        {applied && !isEditing && (
          <span className="pmp-card__applied-tag">
            <IconCheckSmall /> Aplicada
          </span>
        )}
      </div>

      {/* Descripción expandible */}
      {!isEditing && descFull && (
        <div>
          <p className="pmp-card__desc">
            {expanded || !isLong ? descFull : descFull.slice(0, TRUNCATE) + '…'}
          </p>
          {isLong && (
            <button
              type="button"
              className="pmp-card__expand-btn"
              onClick={() => setExpanded(v => !v)}
            >
              {expanded ? '↑ Ver menos' : '↓ Ver más'}
            </button>
          )}
        </div>
      )}

      {/* Detalle del payload */}
      {!isEditing && detail && (
        <p className="pmp-card__detail">{detail}</p>
      )}

      {/* Botonera */}
      <div className="pmp-card__actions">
        <button
          type="button"
          className="pmp-btn pmp-btn--apply"
          onClick={() => onApply(suggestion.id)}
          disabled={applied}
          aria-label={applied ? 'Sugerencia ya aplicada' : 'Aplicar sugerencia'}
        >
          {applied ? 'Aplicada' : 'Aplicar'}
        </button>
        <button
          type="button"
          className="pmp-btn pmp-btn--edit"
          onClick={() => isEditing ? onEditSave() : onEdit(suggestion.id)}
          aria-label={isEditing ? 'Guardar edición' : 'Editar sugerencia'}
        >
          {isEditing ? 'Guardar' : 'Editar'}
        </button>
        <button
          type="button"
          className="pmp-btn pmp-btn--discard"
          onClick={() => onDiscard(suggestion.id)}
          aria-label="Descartar sugerencia"
        >
          Descartar
        </button>
      </div>
    </div>
  )
}

// ─── Estado vacío ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="pmp__empty">
      <div className="pmp__empty-icon">
        <IconCheck />
      </div>
      <p className="pmp__empty-msg">
        Sin hallazgos evolutivos activos. Los indicadores registrados están en orden.
      </p>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function PatientMonitoringPanel({
  patientData,
  consultationHistory,
}: PatientMonitoringPanelProps) {
  const [discarded, setDiscarded] = useState<Set<string>>(() => new Set())
  const [applied,   setApplied]   = useState<Set<string>>(() => new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTexts, setEditTexts] = useState<Record<string, string>>({})

  // Inyectar CSS una sola vez
  useEffect(() => {
    if (document.getElementById('pmp-styles')) return
    const tag       = document.createElement('style')
    tag.id          = 'pmp-styles'
    tag.textContent = COMPONENT_CSS
    document.head.appendChild(tag)
  }, [])

  // Resetear al cambiar de paciente
  useEffect(() => {
    setDiscarded(new Set())
    setApplied(new Set())
    setEditingId(null)
    setEditTexts({})
  }, [patientData.id])

  const rawSuggestions = useMemo(
    () => analyzePatientEvolution(patientData, consultationHistory),
    [patientData, consultationHistory],
  )

  const suggestions = useMemo(
    () => rawSuggestions.filter(s => !discarded.has(s.id)),
    [rawSuggestions, discarded],
  )

  const alertCount = suggestions.filter(
    s => s.priority === 'alta' || s.priority === 'media',
  ).length

  const handleApply = useCallback((id: string) => {
    setApplied(prev => new Set([...prev, id]))
  }, [])

  const handleEdit = useCallback((id: string) => {
    const s = rawSuggestions.find(s => s.id === id)
    if (!s) return
    setEditTexts(prev => ({ ...prev, [id]: prev[id] ?? s.title }))
    setEditingId(id)
  }, [rawSuggestions])

  const handleEditSave = useCallback(() => {
    setEditingId(null)
  }, [])

  const handleEditChange = useCallback((text: string) => {
    setEditingId(curr => {
      if (curr) setEditTexts(et => ({ ...et, [curr]: text }))
      return curr
    })
  }, [])

  const handleDiscard = useCallback((id: string) => {
    setDiscarded(prev => new Set([...prev, id]))
    setEditingId(prev => (prev === id ? null : prev))
  }, [])

  const patientLabel = patientData.nombre +
    (consultationHistory.length > 0
      ? ` · ${consultationHistory.length} consulta${consultationHistory.length !== 1 ? 's' : ''}`
      : '')

  return (
    <section className="pmp" aria-label="Insights de Evolución del paciente">

      {/* ── Header ── */}
      <header className="pmp__header">
        <div className="pmp__brand">
          <div className="pmp__icon-wrap">
            <SparklesGradient size={18} />
          </div>
          <div>
            <h2 className="pmp__title">Insights de Evolución</h2>
            <p className="pmp__subtitle">{patientLabel}</p>
          </div>
        </div>
        {alertCount > 0 && (
          <span
            className="pmp__badge"
            aria-label={`${alertCount} hallazgos activos`}
          >
            {alertCount}
          </span>
        )}
      </header>

      {/* ── Etiqueta "Análisis del Asistente" ── */}
      <p className="pmp__section-label">Análisis del Asistente</p>

      {/* ── Lista de sugerencias ── */}
      <div
        className="pmp__list"
        role="list"
        aria-live="polite"
        aria-atomic="false"
      >
        {suggestions.length === 0 ? (
          <EmptyState />
        ) : (
          suggestions.map((s, i) => (
            <div key={s.id} role="listitem">
              <SuggestionCard
                suggestion={s}
                index={i}
                applied={applied.has(s.id)}
                editingId={editingId}
                editText={editTexts[s.id] ?? s.title}
                onApply={handleApply}
                onEdit={handleEdit}
                onDiscard={handleDiscard}
                onEditChange={handleEditChange}
                onEditSave={handleEditSave}
              />
            </div>
          ))
        )}
      </div>

      {/* ── Footer ── */}
      {rawSuggestions.length > 0 && (
        <footer className="pmp__footer">
          <span className="pmp__footer-meta">
            {[
              applied.size   > 0 && `${applied.size} aplicada${applied.size   !== 1 ? 's' : ''}`,
              discarded.size > 0 && `${discarded.size} descartada${discarded.size !== 1 ? 's' : ''}`,
            ].filter(Boolean).join(' · ')}
          </span>
          <span className="pmp__footer-count">
            {suggestions.length} insight{suggestions.length !== 1 ? 's' : ''} activo{suggestions.length !== 1 ? 's' : ''}
          </span>
        </footer>
      )}

    </section>
  )
}

// ─── Íconos SVG inline ────────────────────────────────────────────────────────

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
