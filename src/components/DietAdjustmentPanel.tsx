/**
 * DietAdjustmentPanel.tsx
 *
 * Panel standalone de ajuste dietético. Recibe el plan actual y el perfil del
 * paciente, ejecuta el motor de sugerencias local (dietAdjustment.ts) y presenta
 * las recomendaciones en tarjetas con acciones Aplicar · Editar · Descartar.
 *
 * Colores de prioridad:
 *   · 'alta'  → borde rojo / fondo rosa claro
 *   · 'media' → borde azul / fondo azul claro
 *
 * CSS inyectado una sola vez via useEffect (id="dap-styles").
 * Integración Offline-First: onPlanUpdate recibe el plan actualizado para que
 * el padre lo persista en Dexie sin acoplar este componente a la DB.
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  analyzeDietBalance,
  type DietPlan,
  type PatientProfile,
  type DietAdjustmentSuggestion,
  type FilaRP,
} from '../services/ai/dietAdjustment'

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  currentPlan: DietPlan
  patientProfile: PatientProfile
  onPlanUpdate: (updatedPlan: DietPlan) => void
}

// ─── Mapa nutriente → fila de alimento sugerido ───────────────────────────────

interface FoodSeed {
  grupo: string
  alimento: string
  caracteristicas: string
  cantidad: string
}

const NUTRIENT_FOOD: Record<string, FoodSeed> = {
  'proteína': {
    grupo: 'Carnes y aves',
    alimento: 'Pollo (pechuga)',
    caracteristicas: 'al horno o hervido',
    cantidad: '100 g',
  },
  'hierro': {
    grupo: 'Carnes y aves',
    alimento: 'Carne vacuna magra',
    caracteristicas: 'grillada, sin sal',
    cantidad: '100 g',
  },
  'calcio': {
    grupo: 'Lácteos',
    alimento: 'Yogur natural',
    caracteristicas: 'sin azúcar',
    cantidad: '200 g',
  },
  'calcio / intolerancia a lactosa': {
    grupo: 'Hortalizas',
    alimento: 'Brócoli',
    caracteristicas: 'al vapor',
    cantidad: '150 g',
  },
  'sodio / hipertensión': {
    grupo: 'Hortalizas',
    alimento: 'Espinaca fresca',
    caracteristicas: 'sin sal agregada',
    cantidad: '100 g',
  },
  'potasio / plan DASH': {
    grupo: 'Frutas',
    alimento: 'Banana',
    caracteristicas: 'fresca',
    cantidad: '1 unidad mediana (~120 g)',
  },
}

function getFoodSeed(nutrient: string): FoodSeed {
  return NUTRIENT_FOOD[nutrient] ?? {
    grupo: 'Otros',
    alimento: `Alimento sugerido (${nutrient})`,
    caracteristicas: 'ver recomendación IA',
    cantidad: 'a definir',
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genRowId(): string {
  return `ia-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

function parseTablaRP(raw: FilaRP[] | string): FilaRP[] {
  if (!raw) return []
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return [] }
  }
  return raw
}

/** Inserta una nueva fila después del último ítem del mismo grupo (o al final). */
function insertFoodRow(rows: FilaRP[], seed: FoodSeed): FilaRP[] {
  const newRow: FilaRP = { id: genRowId(), ...seed }
  const lastIdx = rows.reduce<number>(
    (acc, r, i) => (r.grupo === seed.grupo ? i : acc),
    -1,
  )
  const next = [...rows]
  if (lastIdx >= 0) {
    next.splice(lastIdx + 1, 0, newRow)
  } else {
    next.push(newRow)
  }
  return next
}

// ─── CSS ─────────────────────────────────────────────────────────────────────

const COMPONENT_CSS = `
/* ══ Wrapper ══════════════════════════════════════════════════════════════ */
.dap {
  font-family: var(--font-sans);
  animation: dap-in 280ms cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes dap-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ══ Header ═══════════════════════════════════════════════════════════════ */
.dap__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
  flex-wrap: wrap;
}
.dap__header-left {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.dap__icon {
  width: 30px;
  height: 30px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--color-durazno, #E8956A), #E8C870);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #7a4a10;
  flex-shrink: 0;
}
.dap__title {
  font-size: var(--text-base);
  font-weight: 800;
  color: var(--color-text-high);
  letter-spacing: -0.015em;
  line-height: 1.2;
}
.dap__subtitle {
  font-size: var(--text-xs);
  color: var(--color-text-low);
  margin-top: 1px;
}
.dap__count-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 700;
  background: rgba(220,38,38,0.10);
  color: #dc2626;
  border: 1px solid rgba(220,38,38,0.20);
}
.dap__count-badge--ok {
  background: rgba(22,163,74,0.10);
  color: var(--color-success, #16a34a);
  border-color: rgba(22,163,74,0.18);
}

/* ══ Lista de tarjetas ════════════════════════════════════════════════════ */
.dap__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

/* ══ Tarjeta ══════════════════════════════════════════════════════════════ */
.dap__card {
  border-radius: var(--radius-lg);
  border: 1.5px solid var(--color-border);
  background: var(--color-surface);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  animation: dap-card-in 220ms cubic-bezier(0.22, 1, 0.36, 1) both;
  transition: box-shadow var(--transition-fast);
}
.dap__card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.06);
}
@keyframes dap-card-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Prioridad alta — rojo/naranja */
.dap__card--alta {
  border-color: rgba(220,38,38,0.35);
  background: rgba(254,242,242,0.65);
}
/* Prioridad media — azul/verde */
.dap__card--media {
  border-color: rgba(59,130,246,0.30);
  background: rgba(239,246,255,0.55);
}

/* dark mode */
.dark .dap__card--alta  { background: rgba(60,14,14,0.60); }
.dark .dap__card--media { background: rgba(14,30,60,0.60); }

/* ══ Card header ══════════════════════════════════════════════════════════ */
.dap__card-top {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
}
.dap__priority-badge {
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
.dap__card--alta  .dap__priority-badge {
  background: rgba(220,38,38,0.12);
  color: #dc2626;
  border: 1px solid rgba(220,38,38,0.22);
}
.dap__card--media .dap__priority-badge {
  background: rgba(59,130,246,0.12);
  color: #2563eb;
  border: 1px solid rgba(59,130,246,0.22);
}

.dap__nutrient {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--color-text-high);
  line-height: 1.4;
  flex: 1;
  text-transform: capitalize;
}

/* ══ Recomendación ════════════════════════════════════════════════════════ */
.dap__rec {
  font-size: var(--text-sm);
  color: var(--color-text-mid);
  line-height: 1.65;
  padding-top: var(--space-1);
}
.dap__rec--applied {
  opacity: 0.5;
  text-decoration: line-through;
}

.dap__applied-chip {
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
.dap__textarea {
  width: 100%;
  resize: none;
  border: 1.5px solid var(--color-primary, #E8956A);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  line-height: 1.6;
  background: var(--color-primary-surface, rgba(232,149,106,0.06));
  color: var(--color-text-high);
  outline: none;
  min-height: 80px;
  box-sizing: border-box;
}
.dap__textarea:focus {
  border-color: var(--color-durazno-dark, #c56b3a);
  box-shadow: 0 0 0 3px rgba(232,149,106,0.15);
}

/* ══ Botones ══════════════════════════════════════════════════════════════ */
.dap__actions {
  display: flex;
  gap: var(--space-2);
}
.dap__btn {
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
.dap__btn:disabled {
  opacity: 0.45;
  cursor: default;
  pointer-events: none;
}
.dap__btn:active:not(:disabled) { transform: scale(0.96); }

.dap__btn--apply {
  background: linear-gradient(
    135deg,
    var(--color-durazno-deep, #c96a2a),
    var(--color-durazno-dark, #e8845a)
  );
  border-color: transparent;
  color: #fff;
}
.dap__btn--apply:hover:not(:disabled) { filter: brightness(1.08); }

.dap__btn--edit:hover:not(:disabled) {
  border-color: var(--color-primary, #E8956A);
  color: var(--color-primary, #E8956A);
  background: var(--color-primary-surface, rgba(232,149,106,0.08));
}

.dap__btn--discard:hover:not(:disabled) {
  border-color: var(--color-error, #dc2626);
  color: var(--color-error, #dc2626);
  background: rgba(220,38,38,0.06);
}

/* ══ Empty state ══════════════════════════════════════════════════════════ */
.dap__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-10) var(--space-4);
  text-align: center;
}
.dap__empty-icon {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, rgba(22,163,74,0.12), rgba(59,130,246,0.10));
  border: 1.5px solid rgba(22,163,74,0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-success, #16a34a);
  font-size: 24px;
}
.dap__empty-title {
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--color-text-high);
  line-height: 1.3;
}
.dap__empty-desc {
  font-size: var(--text-sm);
  color: var(--color-text-low);
  line-height: 1.6;
  max-width: 280px;
}
`

// ─── Componente principal ─────────────────────────────────────────────────────

export default function DietAdjustmentPanel({
  currentPlan,
  patientProfile,
  onPlanUpdate,
}: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set())
  const [applied,   setApplied]   = useState<Set<string>>(() => new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTexts, setEditTexts] = useState<Record<string, string>>({})

  // Inyectar CSS una sola vez
  useEffect(() => {
    if (document.getElementById('dap-styles')) return
    const tag = document.createElement('style')
    tag.id          = 'dap-styles'
    tag.textContent = COMPONENT_CSS
    document.head.appendChild(tag)
  }, [])

  // Reset al cambiar de plan o paciente
  useEffect(() => {
    setDismissed(new Set())
    setApplied(new Set())
    setEditingId(null)
    setEditTexts({})
  }, [currentPlan.id, patientProfile.id])

  const allSuggestions = useMemo(
    () => analyzeDietBalance(currentPlan, patientProfile),
    [currentPlan, patientProfile],
  )

  const visible = useMemo(
    () => allSuggestions.filter((s) => !dismissed.has(s.id)),
    [allSuggestions, dismissed],
  )

  const altaCount = visible.filter((s) => s.priority === 'alta').length

  const handleApply = useCallback(
    (suggestion: DietAdjustmentSuggestion) => {
      const rows    = parseTablaRP(currentPlan.tablaRP)
      const seed    = getFoodSeed(suggestion.nutrient)
      const newRows = insertFoodRow(rows, seed)

      onPlanUpdate({
        ...currentPlan,
        tablaRP: JSON.stringify(newRows),
      })

      setApplied((prev) => new Set([...prev, suggestion.id]))
    },
    [currentPlan, onPlanUpdate],
  )

  const handleEdit = useCallback((s: DietAdjustmentSuggestion) => {
    setEditTexts((prev) => ({
      ...prev,
      [s.id]: prev[s.id] ?? s.recommendation,
    }))
    setEditingId(s.id)
  }, [])

  const handleSaveEdit = useCallback(() => setEditingId(null), [])

  const handleDiscard = useCallback((id: string) => {
    setDismissed((prev) => new Set([...prev, id]))
    setEditingId((prev) => (prev === id ? null : prev))
  }, [])

  const handleEditText = useCallback((id: string, text: string) => {
    setEditTexts((prev) => ({ ...prev, [id]: text }))
  }, [])

  return (
    <div className="dap" role="region" aria-label="Sugerencias de ajuste dietético">

      {/* ── Header ── */}
      <div className="dap__header">
        <div className="dap__header-left">
          <div className="dap__icon" aria-hidden="true">
            <IconSparkle />
          </div>
          <div>
            <div className="dap__title">Ajuste Dietético IA</div>
            <div className="dap__subtitle">
              {patientProfile.nombre} · Plan {currentPlan.fecha}
            </div>
          </div>
        </div>

        {visible.length > 0 ? (
          <span className="dap__count-badge" aria-live="polite">
            <IconAlert />
            {altaCount > 0
              ? `${altaCount} prioritaria${altaCount > 1 ? 's' : ''}`
              : `${visible.length} sugerencia${visible.length > 1 ? 's' : ''}`}
          </span>
        ) : (
          <span className="dap__count-badge dap__count-badge--ok">
            <IconCheck />
            Óptimo
          </span>
        )}
      </div>

      {/* ── Lista de sugerencias ── */}
      <div className="dap__list" role="list">
        {visible.length === 0 ? (
          <EmptyState />
        ) : (
          visible.map((s, i) => (
            <SuggestionCard
              key={s.id}
              suggestion={s}
              index={i}
              isEditing={editingId === s.id}
              editText={editTexts[s.id] ?? s.recommendation}
              isApplied={applied.has(s.id)}
              onApply={handleApply}
              onEdit={handleEdit}
              onSaveEdit={handleSaveEdit}
              onDiscard={handleDiscard}
              onEditText={handleEditText}
            />
          ))
        )}
      </div>

    </div>
  )
}

// ─── Tarjeta de sugerencia ────────────────────────────────────────────────────

interface CardProps {
  suggestion: DietAdjustmentSuggestion
  index: number
  isEditing: boolean
  editText: string
  isApplied: boolean
  onApply: (s: DietAdjustmentSuggestion) => void
  onEdit: (s: DietAdjustmentSuggestion) => void
  onSaveEdit: () => void
  onDiscard: (id: string) => void
  onEditText: (id: string, text: string) => void
}

function SuggestionCard({
  suggestion,
  index,
  isEditing,
  editText,
  isApplied,
  onApply,
  onEdit,
  onSaveEdit,
  onDiscard,
  onEditText,
}: CardProps) {
  const { id, nutrient, recommendation, priority } = suggestion
  const displayText = editText !== recommendation ? editText : recommendation

  return (
    <div
      className={`dap__card dap__card--${priority}`}
      role="listitem"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Badge + nutriente */}
      <div className="dap__card-top">
        <span className="dap__priority-badge" aria-label={`Prioridad ${priority}`}>
          {priority === 'alta' ? 'Alta' : 'Media'}
        </span>
        <span className="dap__nutrient">{nutrient}</span>
      </div>

      {/* Texto de recomendación o textarea de edición */}
      {isEditing ? (
        <textarea
          className="dap__textarea"
          value={editText}
          onChange={(e) => onEditText(id, e.target.value)}
          onBlur={onSaveEdit}
          rows={4}
          aria-label="Editar recomendación"
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
        />
      ) : (
        <div>
          <p className={`dap__rec${isApplied ? ' dap__rec--applied' : ''}`}>
            {displayText}
          </p>
          {isApplied && (
            <span className="dap__applied-chip" aria-live="polite">
              <IconCheckSmall />
              Alimento añadido al plan
            </span>
          )}
        </div>
      )}

      {/* Acciones */}
      <div className="dap__actions">
        <button
          type="button"
          className="dap__btn dap__btn--apply"
          onClick={() => onApply(suggestion)}
          disabled={isApplied}
          aria-label={isApplied ? 'Ya aplicada' : `Aplicar sugerencia de ${nutrient}`}
        >
          {isApplied ? '✓ Aplicada' : 'Aplicar'}
        </button>
        <button
          type="button"
          className="dap__btn dap__btn--edit"
          onClick={isEditing ? onSaveEdit : () => onEdit(suggestion)}
          aria-label={isEditing ? 'Guardar edición' : `Editar sugerencia de ${nutrient}`}
        >
          {isEditing ? 'Guardar' : 'Editar'}
        </button>
        <button
          type="button"
          className="dap__btn dap__btn--discard"
          onClick={() => onDiscard(id)}
          aria-label={`Descartar sugerencia de ${nutrient}`}
        >
          Descartar
        </button>
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="dap__empty" role="status">
      <div className="dap__empty-icon" aria-hidden="true">✨</div>
      <p className="dap__empty-title">Plan nutricional óptimo</p>
      <p className="dap__empty-desc">
        No hay sugerencias de la IA. El plan cubre los grupos de alimentos
        y restricciones clínicas registradas para este paciente.
      </p>
    </div>
  )
}

// ─── Íconos SVG inline ────────────────────────────────────────────────────────

function IconSparkle() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
         aria-hidden="true">
      <path d="M12 2 L13.5 8.5 L20 10 L13.5 11.5 L12 18 L10.5 11.5 L4 10 L10.5 8.5 Z" />
      <path d="M19 2 L19.8 4.2 L22 5 L19.8 5.8 L19 8 L18.2 5.8 L16 5 L18.2 4.2 Z" />
    </svg>
  )
}

function IconAlert() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
         aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
         aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
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
