/**
 * ManagementRemindersPanel.tsx
 *
 * Panel "Asistente de Gestión Operativa" — NutriApp Profesional
 *
 * Recibe patients[] y appointments[], ejecuta generateManagementReminders y
 * presenta las alertas en tarjetas con acciones contextuales según tipo:
 *
 *   · mgmt-plan-pending  → [Aplicar Plan]  (simula apertura del canal de envío)
 *   · mgmt-inactive      → [Aplicar] · [Editar] · [Descartar]
 *   · mgmt-seasonal      → [Descartar]
 *
 * Branding: Sparkles violeta-600 → azul-500 (estilo diamante Gemini).
 * CSS inyectado una sola vez (id="mrp-styles"). Sin "copiloto" en la UI.
 */

import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  generateManagementReminders,
  type PatientProfile,
  type Appointment,
} from '../services/ai/managementReminders'
import type { AgentSuggestion, ActionPayload } from '../services/ai/agent'

// ─── Props ────────────────────────────────────────────────────────────────────

interface ManagementRemindersPanelProps {
  patients:     PatientProfile[]
  appointments: Appointment[]
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const COMPONENT_CSS = `
/* ══ Wrapper ══════════════════════════════════════════════════════════════ */
.mrp {
  font-family: var(--font-sans);
  border-radius: var(--radius-xl);
  border: 1.5px solid var(--color-border);
  background: var(--color-surface);
  overflow: hidden;
  animation: mrp-fade-in 260ms cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes mrp-fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ══ Header ══════════════════════════════════════════════════════════════ */
.mrp__header {
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-divider);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}
.mrp__brand {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.mrp__icon-wrap {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, #eef2ff 0%, #eff6ff 50%, #f0f9ff 100%);
  border: 1.5px solid rgba(99, 102, 241, 0.22);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.10);
}
.mrp__title {
  font-size: var(--text-base);
  font-weight: 800;
  color: var(--color-text-high);
  letter-spacing: -0.015em;
  line-height: 1.2;
}
.mrp__subtitle {
  font-size: 10px;
  font-weight: 600;
  color: var(--color-text-low);
  text-transform: uppercase;
  letter-spacing: 0.09em;
  margin-top: 1px;
}
.mrp__badge {
  min-width: 22px;
  height: 22px;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, #7c3aed, #6366f1, #3b82f6);
  color: white;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(79, 70, 229, 0.28);
}

/* ══ Etiquetas de sección ════════════════════════════════════════════════ */
.mrp__section-label {
  padding: var(--space-3) var(--space-5) var(--space-1);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-low);
}

/* ══ Lista ════════════════════════════════════════════════════════════════ */
.mrp__list {
  padding: var(--space-3) var(--space-4) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-height: 540px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: var(--color-border) transparent;
}
.mrp__list::-webkit-scrollbar { width: 4px; }
.mrp__list::-webkit-scrollbar-track { background: transparent; }
.mrp__list::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 4px;
}

/* ══ Tarjeta ══════════════════════════════════════════════════════════════ */
.mrp-card {
  border-radius: var(--radius-lg);
  border: 1.5px solid var(--color-border);
  background: var(--color-surface);
  padding: var(--space-3) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  animation: mrp-card-in 220ms cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes mrp-card-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Variantes de prioridad */
.mrp-card--critical {
  border-color: rgba(209, 119, 119, 0.45);
  background: rgba(255, 240, 240, 0.55);
}
.mrp-card--warning {
  border-color: rgba(212, 146, 74, 0.45);
  background: rgba(255, 248, 225, 0.60);
}
.mrp-card--info {
  border-color: rgba(99, 102, 241, 0.22);
  background: rgba(238, 242, 255, 0.45);
}

/* ── Badges ── */
.mrp-card__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-1);
}
.mrp-card__priority-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.mrp-card--critical .mrp-card__priority-dot { background: var(--color-error); }
.mrp-card--warning  .mrp-card__priority-dot { background: var(--color-warning); }
.mrp-card--info     .mrp-card__priority-dot { background: #6366f1; }
.mrp-card__type-badge {
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  line-height: 1.6;
  flex-shrink: 0;
}
.mrp-card--critical .mrp-card__type-badge {
  background: rgba(209, 119, 119, 0.15);
  color: var(--color-error);
}
.mrp-card--warning .mrp-card__type-badge {
  background: rgba(232, 200, 112, 0.40);
  color: var(--color-warning);
}
.mrp-card--info .mrp-card__type-badge {
  background: rgba(99, 102, 241, 0.14);
  color: #4f46e5;
}

/* ── Título y estado ── */
.mrp-card__title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-2);
}
.mrp-card__title {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--color-text-high);
  line-height: 1.45;
  flex: 1;
}
.mrp-card__title--applied {
  text-decoration: line-through;
  opacity: 0.5;
}
.mrp-card__applied-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-success);
  flex-shrink: 0;
}

/* ── Descripción ── */
.mrp-card__desc {
  font-size: var(--text-xs);
  color: var(--color-text-mid);
  line-height: 1.65;
}
.mrp-card__expand-btn {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-top: 3px;
  font-size: 11px;
  font-weight: 700;
  color: #4f46e5;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  transition: color var(--transition-fast);
}
.mrp-card__expand-btn:hover { color: #3730a3; }

/* ── Payload detail ── */
.mrp-card__detail {
  font-size: var(--text-xs);
  color: var(--color-text-low);
  line-height: 1.6;
  border-top: 1px dashed var(--color-divider);
  padding-top: var(--space-2);
}

/* ── Confirmación canal de envío (plan pendiente) ── */
.mrp-send-toast {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  background: rgba(59, 130, 246, 0.10);
  border: 1px solid rgba(59, 130, 246, 0.25);
  font-size: 12px;
  font-weight: 600;
  color: #1d4ed8;
  animation: mrp-toast-in 200ms ease both;
}
@keyframes mrp-toast-in {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Textarea de edición ── */
.mrp-card__edit {
  width: 100%;
  resize: none;
  border: 1.5px solid #6366f1;
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  background: rgba(238, 242, 255, 0.70);
  color: var(--color-text-high);
  line-height: 1.5;
  outline: none;
  min-height: 64px;
  transition: box-shadow var(--transition-fast);
}
.mrp-card__edit:focus { box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.22); }

/* ── Botonera ── */
.mrp-card__actions {
  display: flex;
  gap: var(--space-2);
  padding-top: var(--space-1);
}
.mrp-btn {
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
.mrp-btn:disabled {
  opacity: 0.40;
  cursor: default;
  pointer-events: none;
}
.mrp-btn:active:not(:disabled) { transform: scale(0.95); }

/* Aplicar — degradado violeta→azul (Gemini) */
.mrp-btn--apply {
  background: linear-gradient(135deg, #7c3aed, #6366f1, #3b82f6);
  border-color: transparent;
  color: white;
}
.mrp-btn--apply:hover:not(:disabled) { filter: brightness(1.10); }

/* Editar */
.mrp-btn--edit:hover:not(:disabled) {
  border-color: #6366f1;
  color: #4f46e5;
  background: rgba(238, 242, 255, 0.60);
}

/* Descartar */
.mrp-btn--discard:hover:not(:disabled) {
  border-color: var(--color-error);
  color: var(--color-error);
  background: var(--color-error-surface, rgba(255, 240, 240, 0.6));
}

/* ══ Estado vacío ════════════════════════════════════════════════════════ */
.mrp__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-10) var(--space-4);
  text-align: center;
}
.mrp__empty-icon {
  font-size: 32px;
  line-height: 1;
}
.mrp__empty-msg {
  font-size: var(--text-sm);
  color: var(--color-text-low);
  line-height: 1.6;
  max-width: 240px;
}

/* ══ Footer ══════════════════════════════════════════════════════════════ */
.mrp__footer {
  padding: var(--space-3) var(--space-5);
  border-top: 1px solid var(--color-divider);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.mrp__footer-meta {
  font-size: 11px;
  color: var(--color-text-low);
}
.mrp__footer-count {
  font-size: 11px;
  font-weight: 700;
  color: #4f46e5;
}

/* ══ Dark mode ═══════════════════════════════════════════════════════════ */
.dark .mrp {
  border-color: rgba(255,255,255,0.08);
  background: var(--color-surface);
}
.dark .mrp__icon-wrap {
  background: linear-gradient(135deg, rgba(79,70,229,0.22), rgba(99,102,241,0.18), rgba(59,130,246,0.15));
  border-color: rgba(99,102,241,0.18);
}
.dark .mrp-card            { background: var(--color-surface-raised); }
.dark .mrp-card--critical  { background: rgba(40,16,16,0.75);  border-color: rgba(209,119,119,0.30); }
.dark .mrp-card--warning   { background: rgba(42,32,10,0.75);  border-color: rgba(212,146,74,0.30); }
.dark .mrp-card--info      { background: rgba(16,20,48,0.60);  border-color: rgba(99,102,241,0.18); }
.dark .mrp-card--info .mrp-card__type-badge { color: #a5b4fc; }
.dark .mrp-card__edit      { background: rgba(16,20,48,0.55);  border-color: #6366f1; }
.dark .mrp-card__expand-btn       { color: #a5b4fc; }
.dark .mrp-card__expand-btn:hover { color: #818cf8; }
.dark .mrp__footer-count   { color: #a5b4fc; }
.dark .mrp-send-toast {
  background: rgba(59,130,246,0.12);
  border-color: rgba(59,130,246,0.20);
  color: #93c5fd;
}
`

// ─── Tipos de tarjeta ─────────────────────────────────────────────────────────

type CardVariant = 'critical' | 'warning' | 'info'
type CardKind = 'plan-pending' | 'inactive-patient' | 'seasonal'

function getVariant(s: AgentSuggestion): CardVariant {
  if (s.priority === 'alta') return 'critical'
  if (s.priority === 'media') return 'warning'
  return 'info'
}

function getCardKind(s: AgentSuggestion): CardKind {
  if (s.id.includes('mgmt-plan-pending')) return 'plan-pending'
  if (s.id.includes('mgmt-inactive'))     return 'inactive-patient'
  return 'seasonal'
}

// ─── Helpers de presentación ──────────────────────────────────────────────────

function formatPayloadDetail(p: ActionPayload): string {
  if (p.action === 'schedule_followup')
    return p.days === 0
      ? p.reason
      : `Programar contacto en ${p.days} día${p.days !== 1 ? 's' : ''}. ${p.reason}`
  if (p.action === 'lifestyle')
    return p.recommendation
  if (p.action === 'adjust_macro' && p.note)
    return p.note
  return ''
}

const TYPE_LABEL: Record<AgentSuggestion['type'], string> = {
  alerta:       'Alerta',
  ajuste:       'Ajuste',
  recordatorio: 'Recordatorio',
}

// ─── Icono Sparkles con degradado violeta-600→azul-500 (diamante Gemini) ─────

function SparklesGradient({ size = 18 }: { size?: number }) {
  const gid = 'mrp-sparkles-grad'
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
        <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#7c3aed" />
          <stop offset="50%"  stopColor="#6366f1" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <path stroke={`url(#${gid})`} d="M12 3 L13.5 8.5 L19 10 L13.5 11.5 L12 17 L10.5 11.5 L5 10 L10.5 8.5 Z" />
      <path stroke={`url(#${gid})`} d="M19 2 L19.9 4.1 L22 5 L19.9 5.9 L19 8 L18.1 5.9 L16 5 L18.1 4.1 Z" />
      <path stroke={`url(#${gid})`} d="M6 17 L6.7 18.7 L8 19.3 L6.7 20 L6 21.7 L5.3 20 L4 19.3 L5.3 18.7 Z" />
    </svg>
  )
}

// ─── Tarjeta de alerta ────────────────────────────────────────────────────────

interface AlertCardProps {
  suggestion:   AgentSuggestion
  index:        number
  applied:      boolean
  sendOpen:     boolean
  editingId:    string | null
  editText:     string
  onApply:      (id: string) => void
  onEdit:       (id: string) => void
  onDiscard:    (id: string) => void
  onEditChange: (text: string) => void
  onEditSave:   () => void
}

function AlertCard({
  suggestion,
  index,
  applied,
  sendOpen,
  editingId,
  editText,
  onApply,
  onEdit,
  onDiscard,
  onEditChange,
  onEditSave,
}: AlertCardProps) {
  const [expanded, setExpanded] = useState(false)
  const variant   = getVariant(suggestion)
  const kind      = getCardKind(suggestion)
  const isEditing = editingId === suggestion.id
  const detail    = formatPayloadDetail(suggestion.actionPayload)
  const descFull  = suggestion.description
  const TRUNCATE  = 130
  const isLong    = descFull.length > TRUNCATE

  return (
    <div
      className={`mrp-card mrp-card--${variant}`}
      role="article"
      style={{ animationDelay: `${index * 55}ms` }}
    >
      {/* Meta: punto de prioridad + tipo */}
      <div className="mrp-card__meta">
        <span className="mrp-card__priority-dot" aria-hidden="true" />
        <span className="mrp-card__type-badge">{TYPE_LABEL[suggestion.type]}</span>
      </div>

      {/* Título o textarea de edición */}
      <div className="mrp-card__title-row">
        {isEditing ? (
          <textarea
            className="mrp-card__edit"
            value={editText}
            onChange={e => onEditChange(e.target.value)}
            onBlur={onEditSave}
            rows={3}
            aria-label="Editar texto de la alerta"
            autoFocus
          />
        ) : (
          <p className={`mrp-card__title${applied ? ' mrp-card__title--applied' : ''}`}>
            {editText}
          </p>
        )}

        {applied && !isEditing && (
          <span className="mrp-card__applied-tag">
            <IconCheckSmall />
            {kind === 'plan-pending' ? 'Enviado' : 'Aplicado'}
          </span>
        )}
      </div>

      {/* Descripción expandible */}
      {!isEditing && descFull && (
        <div>
          <p className="mrp-card__desc">
            {expanded || !isLong ? descFull : descFull.slice(0, TRUNCATE) + '…'}
          </p>
          {isLong && (
            <button
              type="button"
              className="mrp-card__expand-btn"
              onClick={() => setExpanded(v => !v)}
            >
              {expanded ? '↑ Ver menos' : '↓ Ver más'}
            </button>
          )}
        </div>
      )}

      {/* Detalle del payload */}
      {!isEditing && detail && (
        <p className="mrp-card__detail">{detail}</p>
      )}

      {/* Confirmación visual de canal de envío (plan pendiente aplicado) */}
      {sendOpen && !isEditing && (
        <div className="mrp-send-toast" role="status" aria-live="polite">
          <IconSend />
          Canal de envío abierto — plan listo para despachar al paciente
        </div>
      )}

      {/* Botonera contextual */}
      <div className="mrp-card__actions">
        {/* [Aplicar Plan] para plan-pending · [Aplicar] para inactive-patient */}
        {kind !== 'seasonal' && (
          <button
            type="button"
            className="mrp-btn mrp-btn--apply"
            onClick={() => onApply(suggestion.id)}
            disabled={applied}
            aria-label={
              kind === 'plan-pending'
                ? (applied ? 'Plan ya enviado' : 'Abrir canal de envío del plan')
                : (applied ? 'Acción ya aplicada' : 'Aplicar: agendar o preparar contacto con el paciente')
            }
          >
            {applied
              ? (kind === 'plan-pending' ? 'Enviado' : 'Aplicado')
              : (kind === 'plan-pending' ? 'Aplicar Plan' : 'Aplicar')}
          </button>
        )}

        {/* [Editar] / [Guardar] — solo en inactive-patient */}
        {kind === 'inactive-patient' && (
          <button
            type="button"
            className="mrp-btn mrp-btn--edit"
            onClick={() => isEditing ? onEditSave() : onEdit(suggestion.id)}
            aria-label={isEditing ? 'Guardar edición' : 'Editar alerta'}
          >
            {isEditing ? 'Guardar' : 'Editar'}
          </button>
        )}

        {/* [Descartar] — en inactive-patient y seasonal */}
        {(kind === 'inactive-patient' || kind === 'seasonal') && (
          <button
            type="button"
            className="mrp-btn mrp-btn--discard"
            onClick={() => onDiscard(suggestion.id)}
            aria-label="Descartar alerta"
          >
            Descartar
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Estado vacío ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="mrp__empty">
      <div className="mrp__empty-icon">📅</div>
      <p className="mrp__empty-msg">
        Gestión al día. No hay alertas de agenda pendientes.
      </p>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ManagementRemindersPanel({
  patients,
  appointments,
}: ManagementRemindersPanelProps) {
  const [discarded, setDiscarded] = useState<Set<string>>(() => new Set())
  const [applied,   setApplied]   = useState<Set<string>>(() => new Set())
  const [sendOpen,  setSendOpen]  = useState<Set<string>>(() => new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTexts, setEditTexts] = useState<Record<string, string>>({})

  // Inyectar CSS una sola vez
  useEffect(() => {
    if (document.getElementById('mrp-styles')) return
    const tag       = document.createElement('style')
    tag.id          = 'mrp-styles'
    tag.textContent = COMPONENT_CSS
    document.head.appendChild(tag)
  }, [])

  const rawSuggestions = useMemo(
    () => generateManagementReminders(patients, appointments),
    [patients, appointments],
  )

  const suggestions = useMemo(
    () => rawSuggestions.filter(s => !discarded.has(s.id)),
    [rawSuggestions, discarded],
  )

  const patientAlerts  = suggestions.filter(s => !s.id.includes('mgmt-seasonal'))
  const seasonalAlerts = suggestions.filter(s =>  s.id.includes('mgmt-seasonal'))

  const urgentCount = suggestions.filter(
    s => s.priority === 'alta' || s.priority === 'media',
  ).length

  const handleApply = useCallback((id: string) => {
    setApplied(prev => new Set([...prev, id]))
    const s = rawSuggestions.find(r => r.id === id)
    if (s && getCardKind(s) === 'plan-pending') {
      setSendOpen(prev => new Set([...prev, id]))
    }
  }, [rawSuggestions])

  const handleEdit = useCallback((id: string) => {
    const s = rawSuggestions.find(r => r.id === id)
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

  const sharedCardProps = (s: AgentSuggestion, i: number) => ({
    suggestion:   s,
    index:        i,
    applied:      applied.has(s.id),
    sendOpen:     sendOpen.has(s.id),
    editingId,
    editText:     editTexts[s.id] ?? s.title,
    onApply:      handleApply,
    onEdit:       handleEdit,
    onDiscard:    handleDiscard,
    onEditChange: handleEditChange,
    onEditSave:   handleEditSave,
  })

  const footerMeta = [
    applied.size   > 0 && `${applied.size} aplicada${applied.size   !== 1 ? 's' : ''}`,
    discarded.size > 0 && `${discarded.size} descartada${discarded.size !== 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ') ||
    `${patients.length} paciente${patients.length !== 1 ? 's' : ''} · ${appointments.length} turno${appointments.length !== 1 ? 's' : ''}`

  return (
    <section className="mrp" aria-label="Asistente de Gestión Operativa">

      {/* ── Header ── */}
      <header className="mrp__header">
        <div className="mrp__brand">
          <div className="mrp__icon-wrap">
            <SparklesGradient size={18} />
          </div>
          <div>
            <h2 className="mrp__title">Asistente de Gestión Operativa</h2>
            <p className="mrp__subtitle">Insights de Agenda</p>
          </div>
        </div>
        {urgentCount > 0 && (
          <span
            className="mrp__badge"
            aria-label={`${urgentCount} alerta${urgentCount !== 1 ? 's' : ''} urgente${urgentCount !== 1 ? 's' : ''}`}
          >
            {urgentCount}
          </span>
        )}
      </header>

      {/* ── Lista de alertas ── */}
      <div
        className="mrp__list"
        role="list"
        aria-live="polite"
        aria-atomic="false"
      >
        {suggestions.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Alertas de pacientes (planes pendientes + inactivos) */}
            {patientAlerts.length > 0 && (
              <>
                <p className="mrp__section-label" role="presentation">
                  Alertas de Pacientes
                </p>
                {patientAlerts.map((s, i) => (
                  <div key={s.id} role="listitem">
                    <AlertCard {...sharedCardProps(s, i)} />
                  </div>
                ))}
              </>
            )}

            {/* Insights estacionales */}
            {seasonalAlerts.length > 0 && (
              <>
                <p className="mrp__section-label" role="presentation">
                  Contexto Estacional · Posadas
                </p>
                {seasonalAlerts.map((s, i) => (
                  <div key={s.id} role="listitem">
                    <AlertCard {...sharedCardProps(s, patientAlerts.length + i)} />
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* ── Footer ── */}
      {rawSuggestions.length > 0 && (
        <footer className="mrp__footer">
          <span className="mrp__footer-meta">{footerMeta}</span>
          <span className="mrp__footer-count">
            {suggestions.length} alerta{suggestions.length !== 1 ? 's' : ''} activa{suggestions.length !== 1 ? 's' : ''}
          </span>
        </footer>
      )}

    </section>
  )
}

// ─── Íconos SVG inline ────────────────────────────────────────────────────────

function IconCheckSmall() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function IconSend() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}
