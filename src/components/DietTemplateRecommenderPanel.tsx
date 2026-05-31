/**
 * DietTemplateRecommenderPanel.tsx
 *
 * Panel de selección asistida de plantillas dietéticas.
 * Ejecuta el motor de puntuación local (templateRecommender.ts) y presenta
 * las plantillas elegibles con razones de priorización por IA.
 *
 * Seguridad: las plantillas incompatibles (alérgenos o sodio/HTA) son
 * excluidas por el servicio antes de llegar al render. El componente nunca
 * muestra plantillas que el motor descartó por criterio clínico.
 *
 * CSS inyectado una sola vez via useEffect (id="drp-styles").
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Sparkles } from 'lucide-react'
import {
  getTemplateRecommendations,
  type PatientProfile,
  type DietTemplate,
} from '../services/ai/templateRecommender'
import type { AgentSuggestion } from '../services/ai/agent'

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  patient: PatientProfile
  templates: DietTemplate[]
  onApplyTemplate: (template: DietTemplate) => void
}

// ─── CSS ─────────────────────────────────────────────────────────────────────

const COMPONENT_CSS = `
/* ══ Wrapper ═══════════════════════════════════════════════════════════════ */
.drp {
  font-family: var(--font-sans);
  animation: drp-in 280ms cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes drp-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ══ Header ═══════════════════════════════════════════════════════════════ */
.drp__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
  flex-wrap: wrap;
}
.drp__header-left {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.drp__icon {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, #7c3aed, #2563eb);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
  animation: drp-sparkle-pulse 3s ease-in-out infinite;
}
@keyframes drp-sparkle-pulse {
  0%   { filter: brightness(1)    drop-shadow(0 0 4px rgba(124,58,237,0.30)); }
  50%  { filter: brightness(1.14) drop-shadow(0 0 9px rgba(37,99,235,0.45)); }
  100% { filter: brightness(1)    drop-shadow(0 0 4px rgba(124,58,237,0.30)); }
}
.drp__title {
  font-size: var(--text-base);
  font-weight: 800;
  color: var(--color-text-high);
  letter-spacing: -0.015em;
  line-height: 1.2;
}
.drp__subtitle {
  font-size: var(--text-xs);
  color: var(--color-text-low);
  margin-top: 1px;
}

/* ══ Badges de conteo ═════════════════════════════════════════════════════ */
.drp__badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 700;
}
.drp__badge--found {
  background: rgba(124,58,237,0.10);
  color: #7c3aed;
  border: 1px solid rgba(124,58,237,0.22);
}
.drp__badge--empty {
  background: rgba(100,116,139,0.10);
  color: var(--color-text-low);
  border: 1px solid rgba(100,116,139,0.18);
}

/* ══ Lista ═════════════════════════════════════════════════════════════════ */
.drp__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

/* ══ Tarjeta ══════════════════════════════════════════════════════════════ */
.drp__card {
  border-radius: var(--radius-lg);
  border: 1.5px solid var(--color-border);
  background: var(--color-surface);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  animation: drp-card-in 220ms cubic-bezier(0.22, 1, 0.36, 1) both;
  transition: box-shadow var(--transition-fast);
}
.drp__card:hover { box-shadow: 0 4px 18px rgba(0,0,0,0.07); }
@keyframes drp-card-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.drp__card--alta {
  border-color: rgba(124,58,237,0.30);
  background: rgba(245,243,255,0.65);
}
.drp__card--media {
  border-color: rgba(59,130,246,0.28);
  background: rgba(239,246,255,0.55);
}
.dark .drp__card--alta  { background: rgba(46,16,101,0.55); }
.dark .drp__card--media { background: rgba(14,30,60,0.55); }

/* ══ Fila superior de la tarjeta ══════════════════════════════════════════ */
.drp__card-top {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.drp__priority-chip {
  flex-shrink: 0;
  margin-top: 2px;
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  line-height: 1.6;
}
.drp__card--alta  .drp__priority-chip {
  background: rgba(124,58,237,0.12);
  color: #7c3aed;
  border: 1px solid rgba(124,58,237,0.22);
}
.drp__card--media .drp__priority-chip {
  background: rgba(59,130,246,0.12);
  color: #2563eb;
  border: 1px solid rgba(59,130,246,0.22);
}
.drp__template-name {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--color-text-high);
  line-height: 1.4;
  flex: 1;
}
.drp__objetivo-chip {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background: rgba(100,116,139,0.09);
  color: var(--color-text-mid);
  border: 1px solid rgba(100,116,139,0.16);
  text-transform: capitalize;
  line-height: 1.6;
  margin-top: 2px;
}

/* ══ Etiqueta de razón IA ═════════════════════════════════════════════════ */
.drp__reason {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: var(--radius-full);
  line-height: 1.5;
  width: fit-content;
}
.drp__reason--match {
  background: rgba(22,163,74,0.10);
  color: #16a34a;
  border: 1px solid rgba(22,163,74,0.20);
}
.drp__reason--compat {
  background: rgba(59,130,246,0.10);
  color: #2563eb;
  border: 1px solid rgba(59,130,246,0.20);
}

/* ══ Descripción ══════════════════════════════════════════════════════════ */
.drp__desc {
  font-size: var(--text-sm);
  color: var(--color-text-mid);
  line-height: 1.65;
}
.drp__desc--applied {
  opacity: 0.5;
  text-decoration: line-through;
}
.drp__applied-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-success, #16a34a);
  background: rgba(22,163,74,0.10);
  border: 1px solid rgba(22,163,74,0.20);
  border-radius: var(--radius-full);
  padding: 2px 8px;
  margin-top: var(--space-1);
}

/* ══ Textarea edición ═════════════════════════════════════════════════════ */
.drp__textarea {
  width: 100%;
  resize: none;
  border: 1.5px solid #7c3aed;
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  line-height: 1.6;
  background: rgba(124,58,237,0.04);
  color: var(--color-text-high);
  outline: none;
  min-height: 80px;
  box-sizing: border-box;
}
.drp__textarea:focus {
  border-color: #6d28d9;
  box-shadow: 0 0 0 3px rgba(124,58,237,0.14);
}

/* ══ Botones ══════════════════════════════════════════════════════════════ */
.drp__actions {
  display: flex;
  gap: var(--space-2);
}
.drp__btn {
  flex: 1;
  padding: 6px var(--space-2);
  border-radius: var(--radius-md);
  border: 1.5px solid var(--color-border);
  background: transparent;
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 600;
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
.drp__btn:disabled { opacity: 0.45; cursor: default; pointer-events: none; }
.drp__btn:active:not(:disabled) { transform: scale(0.96); }

.drp__btn--apply {
  background: linear-gradient(135deg, #7c3aed, #2563eb);
  border-color: transparent;
  color: #fff;
}
.drp__btn--apply:hover:not(:disabled) { filter: brightness(1.08); }

.drp__btn--edit:hover:not(:disabled) {
  border-color: #7c3aed;
  color: #7c3aed;
  background: rgba(124,58,237,0.07);
}
.drp__btn--discard:hover:not(:disabled) {
  border-color: var(--color-error, #dc2626);
  color: var(--color-error, #dc2626);
  background: rgba(220,38,38,0.06);
}

/* ══ Empty state ══════════════════════════════════════════════════════════ */
.drp__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-10) var(--space-4);
  text-align: center;
}
.drp__empty-icon {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, rgba(124,58,237,0.10), rgba(37,99,235,0.08));
  border: 1.5px solid rgba(124,58,237,0.16);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #7c3aed;
}
.drp__empty-title {
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--color-text-high);
  line-height: 1.3;
}
.drp__empty-desc {
  font-size: var(--text-sm);
  color: var(--color-text-low);
  line-height: 1.6;
  max-width: 290px;
}
`

// ─── Componente principal ─────────────────────────────────────────────────────

export default function DietTemplateRecommenderPanel({
  patient,
  templates,
  onApplyTemplate,
}: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set())
  const [applied,   setApplied]   = useState<Set<string>>(() => new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNotes, setEditNotes] = useState<Record<string, string>>({})

  useEffect(() => {
    if (document.getElementById('drp-styles')) return
    const tag = document.createElement('style')
    tag.id          = 'drp-styles'
    tag.textContent = COMPONENT_CSS
    document.head.appendChild(tag)
  }, [])

  useEffect(() => {
    setDismissed(new Set())
    setApplied(new Set())
    setEditingId(null)
    setEditNotes({})
  }, [patient.id])

  // Safety filters run inside the service — only safe, scored templates are returned
  const allSuggestions = useMemo(
    () => getTemplateRecommendations(patient, templates),
    [patient, templates],
  )

  const visible = useMemo(
    () => allSuggestions.filter(s => !dismissed.has(s.id)),
    [allSuggestions, dismissed],
  )

  const topCount = visible.filter(s => s.priority === 'alta').length

  const handleApply = useCallback(
    (suggestion: AgentSuggestion) => {
      const payload = suggestion.actionPayload
      if (payload.action !== 'apply_template') return
      const tpl = templates.find(t => t.id === payload.templateId)
      if (!tpl) return
      onApplyTemplate(tpl)
      setApplied(prev => new Set([...prev, suggestion.id]))
    },
    [templates, onApplyTemplate],
  )

  const handleEdit = useCallback((s: AgentSuggestion) => {
    setEditNotes(prev => ({ ...prev, [s.id]: prev[s.id] ?? s.description }))
    setEditingId(s.id)
  }, [])

  const handleSaveEdit = useCallback(() => setEditingId(null), [])

  const handleDiscard = useCallback((id: string) => {
    setDismissed(prev => new Set([...prev, id]))
    setEditingId(prev => (prev === id ? null : prev))
  }, [])

  const handleNoteChange = useCallback((id: string, text: string) => {
    setEditNotes(prev => ({ ...prev, [id]: text }))
  }, [])

  return (
    <div className="drp" role="region" aria-label="Modelos de Plan Sugeridos">

      {/* ── Header ── */}
      <div className="drp__header">
        <div className="drp__header-left">
          <div className="drp__icon" aria-hidden="true">
            <Sparkles size={16} strokeWidth={2} />
          </div>
          <div>
            <div className="drp__title">Asistente de Selección Base</div>
            <div className="drp__subtitle">
              {patient.nombre}{patient.apellido ? ` ${patient.apellido}` : ''} · Modelos sugeridos por IA
            </div>
          </div>
        </div>

        {visible.length > 0 ? (
          <span className="drp__badge drp__badge--found" aria-live="polite">
            <IconSparkleSmall />
            {topCount > 0
              ? `${topCount} modelo${topCount > 1 ? 's' : ''} recomendado${topCount > 1 ? 's' : ''}`
              : `${visible.length} compatible${visible.length > 1 ? 's' : ''}`}
          </span>
        ) : (
          <span className="drp__badge drp__badge--empty">
            Sin coincidencias
          </span>
        )}
      </div>

      {/* ── Lista de tarjetas ── */}
      <div className="drp__list" role="list">
        {visible.length === 0 ? (
          <EmptyState
            totalTemplates={templates.length}
            safeCount={allSuggestions.length}
          />
        ) : (
          visible.map((s, i) => (
            <TemplateCard
              key={s.id}
              suggestion={s}
              index={i}
              isEditing={editingId === s.id}
              noteText={editNotes[s.id] ?? s.description}
              isApplied={applied.has(s.id)}
              onApply={handleApply}
              onEdit={handleEdit}
              onSaveEdit={handleSaveEdit}
              onDiscard={handleDiscard}
              onNoteChange={handleNoteChange}
            />
          ))
        )}
      </div>

    </div>
  )
}

// ─── Tarjeta de plantilla ──────────────────────────────────────────────────────

interface CardProps {
  suggestion: AgentSuggestion
  index: number
  isEditing: boolean
  noteText: string
  isApplied: boolean
  onApply: (s: AgentSuggestion) => void
  onEdit: (s: AgentSuggestion) => void
  onSaveEdit: () => void
  onDiscard: (id: string) => void
  onNoteChange: (id: string, text: string) => void
}

function TemplateCard({
  suggestion,
  index,
  isEditing,
  noteText,
  isApplied,
  onApply,
  onEdit,
  onSaveEdit,
  onDiscard,
  onNoteChange,
}: CardProps) {
  const { id, priority, description } = suggestion

  // Service encodes the name as "Plantilla sugerida: <nombre>"
  const templateName = suggestion.title.replace(/^Plantilla sugerida:\s*/i, '')

  // Extract optional "Orientada a: X" from description
  const objetivoMatch = description.match(/Orientada a:\s*(.+?)\./)
  const objetivoLabel = objetivoMatch?.[1] ?? null

  const isTopMatch = priority === 'alta'

  return (
    <div
      className={`drp__card drp__card--${priority}`}
      role="listitem"
      style={{ animationDelay: `${index * 55}ms` }}
    >
      {/* Fila superior: chip de prioridad + nombre + objetivo */}
      <div className="drp__card-top">
        <span className="drp__priority-chip" aria-label={`Prioridad ${priority}`}>
          {isTopMatch ? 'Recomendada' : 'Compatible'}
        </span>
        <span className="drp__template-name">{templateName}</span>
        {objetivoLabel && (
          <span className="drp__objetivo-chip">{objetivoLabel}</span>
        )}
      </div>

      {/* Etiqueta de razón IA */}
      <span className={`drp__reason drp__reason--${isTopMatch ? 'match' : 'compat'}`}>
        {isTopMatch ? <IconCheckSmall /> : <IconInfoSmall />}
        {isTopMatch
          ? 'Objetivo coincidente con el perfil del paciente'
          : 'Sin coincidencia directa de objetivo — disponible'}
      </span>

      {/* Descripción o textarea de edición */}
      {isEditing ? (
        <textarea
          className="drp__textarea"
          value={noteText}
          onChange={e => onNoteChange(id, e.target.value)}
          onBlur={onSaveEdit}
          rows={4}
          aria-label="Editar notas de la plantilla"
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
        />
      ) : (
        <div>
          <p className={`drp__desc${isApplied ? ' drp__desc--applied' : ''}`}>
            {noteText}
          </p>
          {isApplied && (
            <span className="drp__applied-chip" aria-live="polite">
              <IconCheckSmall />
              Plantilla aplicada al plan alimentario
            </span>
          )}
        </div>
      )}

      {/* Acciones */}
      <div className="drp__actions">
        <button
          type="button"
          className="drp__btn drp__btn--apply"
          onClick={() => onApply(suggestion)}
          disabled={isApplied}
          aria-label={isApplied ? 'Ya aplicada' : `Aplicar plantilla ${templateName}`}
        >
          {isApplied ? '✓ Aplicada' : 'Aplicar'}
        </button>
        <button
          type="button"
          className="drp__btn drp__btn--edit"
          onClick={isEditing ? onSaveEdit : () => onEdit(suggestion)}
          aria-label={isEditing ? 'Guardar notas' : `Editar notas de ${templateName}`}
        >
          {isEditing ? 'Guardar' : 'Editar'}
        </button>
        <button
          type="button"
          className="drp__btn drp__btn--discard"
          onClick={() => onDiscard(id)}
          aria-label={`Descartar plantilla ${templateName}`}
        >
          Descartar
        </button>
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

interface EmptyStateProps {
  totalTemplates: number
  safeCount: number
}

function EmptyState({ totalTemplates, safeCount }: EmptyStateProps) {
  const title = totalTemplates === 0
    ? 'Sin plantillas disponibles'
    : safeCount === 0
      ? 'Sin plantillas clínicamente compatibles'
      : 'Todos los modelos fueron descartados'

  const desc = totalTemplates === 0
    ? 'Aún no existen plantillas en la biblioteca. Cree una plantilla para comenzar a usarlas.'
    : safeCount === 0
      ? 'Todas las plantillas disponibles fueron descartadas por incompatibilidad clínica (alérgenos o restricción de sodio). Revise las condiciones registradas o añada nuevas plantillas.'
      : 'Descartaste todos los modelos sugeridos. Recargue la vista para reiniciar las sugerencias.'

  return (
    <div className="drp__empty" role="status">
      <div className="drp__empty-icon" aria-hidden="true">
        <Sparkles size={24} strokeWidth={1.5} />
      </div>
      <p className="drp__empty-title">{title}</p>
      <p className="drp__empty-desc">{desc}</p>
    </div>
  )
}

// ─── Íconos SVG inline ────────────────────────────────────────────────────────

function IconSparkleSmall() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
         aria-hidden="true">
      <path d="M12 2 L13.5 8.5 L20 10 L13.5 11.5 L12 18 L10.5 11.5 L4 10 L10.5 8.5 Z" />
    </svg>
  )
}

function IconCheckSmall() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
         aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function IconInfoSmall() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
         aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8"  x2="12.01" y2="8" />
    </svg>
  )
}
