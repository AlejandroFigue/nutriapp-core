/**
 * AppointmentSchedulerPanel.tsx
 *
 * Optimización de Turnos — NutriApp Profesional
 *
 * Recibe existingAppointments[], workingHours y targetDate.
 * Consume getSmartAvailability para calcular bloques de 1 hora y alertas
 * de conflicto (colisiones / saturación de agenda).
 *
 * Botonera reglamentaria para alertas: [Aplicar] · [Editar] · [Descartar]
 * Branding: Sparkles con degradado violeta→azul. Sin "copiloto" en la UI.
 */

import { useState, useMemo, useCallback, useEffect } from 'react'
import { Sparkles, CheckCircle2, Clock, AlertTriangle, CalendarDays, ChevronDown, ChevronUp } from 'lucide-react'
import { getSmartAvailability } from '../services/ai/appointmentScheduler'
import type { Appointment, WorkingHours, TimeSlot } from '../services/ai/appointmentScheduler'
import type { AgentSuggestion } from '../services/ai/agent'

// ─── Props ────────────────────────────────────────────────────────────────────

interface AppointmentSchedulerPanelProps {
  existingAppointments: Appointment[]
  workingHours: WorkingHours
  targetDate: Date
}

// ─── Alert action state ───────────────────────────────────────────────────────

type AlertAction = 'applied' | 'editing' | 'discarded'

// ─── CSS ──────────────────────────────────────────────────────────────────────

const COMPONENT_CSS = `
/* ══ Wrapper ══════════════════════════════════════════════════════════════ */
.asp {
  font-family: var(--font-sans);
  border-radius: var(--radius-xl);
  border: 1.5px solid var(--color-border);
  background: var(--color-surface);
  overflow: hidden;
  animation: asp-fade-in 280ms cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes asp-fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ══ Header ══════════════════════════════════════════════════════════════ */
.asp__header {
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-divider);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}
.asp__brand {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.asp__icon-wrap {
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
.asp__title {
  font-size: var(--text-base);
  font-weight: 800;
  color: var(--color-text-high);
  letter-spacing: -0.015em;
  line-height: 1.2;
}
.asp__subtitle {
  font-size: 10px;
  font-weight: 600;
  color: var(--color-text-low);
  text-transform: uppercase;
  letter-spacing: 0.09em;
  margin-top: 1px;
}
.asp__date-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: var(--radius-full);
  background: rgba(99, 102, 241, 0.07);
  border: 1px solid rgba(99, 102, 241, 0.18);
  font-size: 12px;
  font-weight: 600;
  color: #4f46e5;
  white-space: nowrap;
  flex-shrink: 0;
}

/* ══ Stat bar ════════════════════════════════════════════════════════════ */
.asp__stats {
  padding: var(--space-3) var(--space-5);
  border-bottom: 1px solid var(--color-divider);
  display: flex;
  gap: var(--space-4);
  align-items: center;
  flex-wrap: wrap;
}
.asp__stat {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-mid);
}
.asp__stat-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.asp__stat-dot--free     { background: #22c55e; }
.asp__stat-dot--occupied { background: #94a3b8; }
.asp__stat-dot--conflict { background: #ef4444; }
.asp__capacity-bar {
  flex: 1;
  min-width: 80px;
  height: 4px;
  border-radius: 2px;
  background: var(--color-border);
  overflow: hidden;
}
.asp__capacity-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 400ms cubic-bezier(0.22, 1, 0.36, 1);
}

/* ══ Alertas de conflicto ════════════════════════════════════════════════ */
.asp__alerts {
  padding: var(--space-3) var(--space-4) 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.asp-alert {
  border-radius: var(--radius-lg);
  border: 1.5px solid rgba(220, 38, 38, 0.30);
  background: rgba(255, 241, 241, 0.75);
  padding: var(--space-3) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  animation: asp-card-in 240ms cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes asp-card-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.asp-alert--applied {
  border-color: rgba(34, 197, 94, 0.35);
  background: rgba(240, 253, 244, 0.75);
  opacity: 0.85;
}
.asp-alert--discarded {
  opacity: 0.4;
  pointer-events: none;
}
.asp-alert__header {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
}
.asp-alert__icon {
  margin-top: 1px;
  flex-shrink: 0;
}
.asp-alert__title {
  font-size: 13px;
  font-weight: 700;
  color: #b91c1c;
  line-height: 1.3;
  flex: 1;
}
.asp-alert--applied .asp-alert__title { color: #166534; }
.asp-alert__desc {
  font-size: 12px;
  color: var(--color-text-mid);
  line-height: 1.5;
  padding-left: calc(16px + var(--space-2));
}
.asp-alert__edit-area {
  padding-left: calc(16px + var(--space-2));
}
.asp-alert__edit-input {
  width: 100%;
  border-radius: var(--radius-md);
  border: 1px solid rgba(99, 102, 241, 0.35);
  background: white;
  padding: 6px 10px;
  font-size: 12px;
  color: var(--color-text-high);
  outline: none;
  resize: vertical;
  min-height: 56px;
  font-family: var(--font-sans);
}
.asp-alert__edit-input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}
.asp-alert__actions {
  display: flex;
  gap: var(--space-2);
  padding-left: calc(16px + var(--space-2));
  flex-wrap: wrap;
}
.asp-alert__btn {
  padding: 4px 14px;
  border-radius: var(--radius-full);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  border: 1.5px solid transparent;
  cursor: pointer;
  transition: all 120ms ease;
  white-space: nowrap;
}
.asp-alert__btn--apply {
  background: linear-gradient(135deg, #7c3aed, #6366f1, #3b82f6);
  color: white;
  border-color: transparent;
  box-shadow: 0 2px 6px rgba(99, 102, 241, 0.30);
}
.asp-alert__btn--apply:hover {
  filter: brightness(1.08);
  transform: translateY(-1px);
}
.asp-alert__btn--edit {
  background: rgba(99, 102, 241, 0.07);
  color: #4f46e5;
  border-color: rgba(99, 102, 241, 0.28);
}
.asp-alert__btn--edit:hover {
  background: rgba(99, 102, 241, 0.13);
}
.asp-alert__btn--discard {
  background: transparent;
  color: var(--color-text-low);
  border-color: var(--color-border);
}
.asp-alert__btn--discard:hover {
  color: var(--color-text-mid);
  border-color: var(--color-text-low);
}
.asp-alert__btn--save {
  background: #166534;
  color: white;
  border-color: transparent;
}
.asp-alert__btn--save:hover {
  background: #15803d;
}

/* ══ Grid de bloques ═════════════════════════════════════════════════════ */
.asp__slots {
  padding: var(--space-4) var(--space-4) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.asp__slots-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-1) 0 var(--space-2);
}
.asp__slots-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-low);
}
.asp__toggle-btn {
  font-size: 11px;
  font-weight: 600;
  color: #6366f1;
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 0;
  opacity: 0.85;
}
.asp__toggle-btn:hover { opacity: 1; }

/* Bloque individual */
.asp-slot {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  border-radius: var(--radius-md);
  padding: 9px var(--space-3);
  border: 1px solid transparent;
  transition: background 160ms ease, border-color 160ms ease;
}
.asp-slot--free {
  background: rgba(240, 253, 244, 0.65);
  border-color: rgba(34, 197, 94, 0.20);
}
.asp-slot--free:hover {
  background: rgba(220, 252, 231, 0.85);
  border-color: rgba(34, 197, 94, 0.38);
}
.asp-slot--occupied {
  background: rgba(248, 250, 252, 0.75);
  border-color: rgba(148, 163, 184, 0.22);
}
.asp-slot--conflict {
  background: rgba(255, 241, 241, 0.80);
  border-color: rgba(220, 38, 38, 0.28);
}
.asp-slot__time {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-high);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
  min-width: 90px;
  flex-shrink: 0;
}
.asp-slot__divider {
  flex: 1;
  height: 1px;
  background: var(--color-border);
  opacity: 0.6;
}
.asp-slot--free    .asp-slot__divider { background: rgba(34, 197, 94, 0.25); }
.asp-slot--conflict .asp-slot__divider { background: rgba(220, 38, 38, 0.25); }
.asp-slot__badge {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 2px 10px;
  border-radius: var(--radius-full);
  white-space: nowrap;
  flex-shrink: 0;
}
.asp-slot--free     .asp-slot__badge {
  background: rgba(34, 197, 94, 0.13);
  color: #166534;
  border: 1px solid rgba(34, 197, 94, 0.28);
}
.asp-slot--occupied .asp-slot__badge {
  background: rgba(148, 163, 184, 0.12);
  color: var(--color-text-low);
  border: 1px solid rgba(148, 163, 184, 0.22);
}
.asp-slot--conflict .asp-slot__badge {
  background: rgba(220, 38, 38, 0.10);
  color: #b91c1c;
  border: 1px solid rgba(220, 38, 38, 0.28);
}
.asp-slot__count {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-low);
  white-space: nowrap;
  flex-shrink: 0;
}

/* ══ Empty state ═════════════════════════════════════════════════════════ */
.asp__empty {
  padding: var(--space-8) var(--space-5);
  text-align: center;
  color: var(--color-text-low);
  font-size: 13px;
}

/* ══ Scrollable list ═════════════════════════════════════════════════════ */
.asp__scroll {
  max-height: 420px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: var(--color-border) transparent;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.asp__scroll::-webkit-scrollbar { width: 4px; }
.asp__scroll::-webkit-scrollbar-track { background: transparent; }
.asp__scroll::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 4px;
}
`

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTargetDate(d: Date): string {
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function capacityColor(ratio: number): string {
  if (ratio >= 0.9) return '#ef4444'
  if (ratio >= 0.7) return '#f59e0b'
  return '#22c55e'
}

// ─── Sub-component: alerta de conflicto ───────────────────────────────────────

interface ConflictAlertProps {
  alert: AgentSuggestion
}

function ConflictAlert({ alert }: ConflictAlertProps) {
  const [action, setAction] = useState<AlertAction | null>(null)
  const [editText, setEditText] = useState(alert.description)

  const handleApply = useCallback(() => setAction('applied'), [])
  const handleDiscard = useCallback(() => setAction('discarded'), [])
  const handleEdit = useCallback(() => setAction('editing'), [])
  const handleSaveEdit = useCallback(() => setAction('applied'), [])

  const variantClass =
    action === 'applied' ? 'asp-alert--applied' :
    action === 'discarded' ? 'asp-alert--discarded' : ''

  return (
    <div className={`asp-alert ${variantClass}`}>
      <div className="asp-alert__header">
        <span className="asp-alert__icon">
          {action === 'applied'
            ? <CheckCircle2 size={16} color="#22c55e" />
            : <AlertTriangle size={16} color="#dc2626" />}
        </span>
        <span className="asp-alert__title">{alert.title}</span>
      </div>

      {action === 'editing' ? (
        <div className="asp-alert__edit-area">
          <textarea
            className="asp-alert__edit-input"
            value={editText}
            onChange={e => setEditText(e.target.value)}
            autoFocus
          />
        </div>
      ) : (
        <p className="asp-alert__desc">
          {action === 'editing' ? editText : alert.description}
        </p>
      )}

      {action !== 'discarded' && (
        <div className="asp-alert__actions">
          {action === 'editing' ? (
            <>
              <button className="asp-alert__btn asp-alert__btn--save" onClick={handleSaveEdit}>
                Guardar
              </button>
              <button className="asp-alert__btn asp-alert__btn--discard" onClick={() => setAction(null)}>
                Cancelar
              </button>
            </>
          ) : action === 'applied' ? (
            <button className="asp-alert__btn asp-alert__btn--discard" onClick={handleDiscard}>
              Descartar
            </button>
          ) : (
            <>
              <button className="asp-alert__btn asp-alert__btn--apply" onClick={handleApply}>
                Aplicar
              </button>
              <button className="asp-alert__btn asp-alert__btn--edit" onClick={handleEdit}>
                Editar
              </button>
              <button className="asp-alert__btn asp-alert__btn--discard" onClick={handleDiscard}>
                Descartar
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Sub-component: bloque de tiempo ─────────────────────────────────────────

interface SlotRowProps {
  slot: TimeSlot
  conflictCount: number
}

function SlotRow({ slot, conflictCount }: SlotRowProps) {
  const isConflict = conflictCount >= 2
  const variantClass = isConflict
    ? 'asp-slot--conflict'
    : slot.available ? 'asp-slot--free' : 'asp-slot--occupied'

  const badgeLabel = isConflict
    ? 'Conflicto'
    : slot.available ? 'Disponible' : 'Ocupado'

  return (
    <div className={`asp-slot ${variantClass}`}>
      <span className="asp-slot__time">
        {slot.start} – {slot.end}
      </span>
      <span className="asp-slot__divider" />
      {!slot.available && !isConflict && (
        <span className="asp-slot__count">1 turno</span>
      )}
      {isConflict && (
        <span className="asp-slot__count">{conflictCount} turnos</span>
      )}
      <span className="asp-slot__badge">{badgeLabel}</span>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AppointmentSchedulerPanel({
  existingAppointments,
  workingHours,
  targetDate,
}: AppointmentSchedulerPanelProps) {
  // Inyectar CSS una sola vez
  useEffect(() => {
    const ID = 'asp-styles'
    if (document.getElementById(ID)) return
    const tag = document.createElement('style')
    tag.id = ID
    tag.textContent = COMPONENT_CSS
    document.head.appendChild(tag)
  }, [])

  const { slots, alerts } = useMemo(
    () => getSmartAvailability(workingHours, existingAppointments, targetDate),
    [workingHours, existingAppointments, targetDate],
  )

  const [showAllSlots, setShowAllSlots] = useState(false)

  // Mapa hora → cantidad de turnos para detectar conflictos en la vista
  const conflictMap = useMemo(() => {
    const pad = (n: number) => n.toString().padStart(2, '0')
    const dateStr = `${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(targetDate.getDate())}`
    const map = new Map<string, number>()
    for (const a of existingAppointments) {
      if (a.fecha !== dateStr || a.estado === 'cancelado') continue
      const hora = a.hora?.slice(0, 5) ?? ''
      const h = parseInt(hora.slice(0, 2), 10)
      const key = `${pad(h)}:00`
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return map
  }, [existingAppointments, targetDate])

  const freeCount = slots.filter(s => s.available).length
  const occupiedCount = slots.filter(s => !s.available).length
  const conflictCount = alerts.filter(a => a.id.startsWith('sched-collision')).length
  const capacityRatio = slots.length > 0 ? occupiedCount / slots.length : 0

  const visibleSlots = showAllSlots ? slots : slots.slice(0, 6)
  const hasMore = slots.length > 6

  const dateLabel = formatTargetDate(targetDate)

  return (
    <div className="asp">
      {/* ── Header ── */}
      <div className="asp__header">
        <div className="asp__brand">
          <div className="asp__icon-wrap">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <defs>
                <linearGradient id="asp-sparkles-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%"   stopColor="#7c3aed" />
                  <stop offset="50%"  stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
              <Sparkles size={18} color="url(#asp-sparkles-grad)" strokeWidth={2} />
            </svg>
          </div>
          <div>
            <div className="asp__title">Optimización de Turnos</div>
            <div className="asp__subtitle">Asistente de Agenda Inteligente</div>
          </div>
        </div>
        <div className="asp__date-badge">
          <CalendarDays size={13} />
          <span style={{ textTransform: 'capitalize' }}>{dateLabel}</span>
        </div>
      </div>

      {/* ── Stat bar ── */}
      {slots.length > 0 && (
        <div className="asp__stats">
          <div className="asp__stat">
            <span className="asp__stat-dot asp__stat-dot--free" />
            {freeCount} libre{freeCount !== 1 ? 's' : ''}
          </div>
          <div className="asp__stat">
            <span className="asp__stat-dot asp__stat-dot--occupied" />
            {occupiedCount} ocupado{occupiedCount !== 1 ? 's' : ''}
          </div>
          {conflictCount > 0 && (
            <div className="asp__stat">
              <span className="asp__stat-dot asp__stat-dot--conflict" />
              {conflictCount} conflicto{conflictCount !== 1 ? 's' : ''}
            </div>
          )}
          <div className="asp__capacity-bar" style={{ minWidth: 72 }}>
            <div
              className="asp__capacity-fill"
              style={{
                width: `${Math.round(capacityRatio * 100)}%`,
                background: capacityColor(capacityRatio),
              }}
            />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: capacityColor(capacityRatio) }}>
            {Math.round(capacityRatio * 100)}%
          </span>
        </div>
      )}

      {/* ── Alertas de conflicto ── */}
      {alerts.length > 0 && (
        <div className="asp__alerts" style={{ paddingBottom: 'var(--space-3)' }}>
          {alerts.map(alert => (
            <ConflictAlert key={alert.id} alert={alert} />
          ))}
        </div>
      )}

      {/* ── Grid de bloques ── */}
      <div className="asp__slots">
        {slots.length === 0 ? (
          <div className="asp__empty">
            No hay bloques horarios configurados para esta jornada.
          </div>
        ) : (
          <>
            <div className="asp__slots-header">
              <span className="asp__slots-label">
                Bloques de la jornada · {workingHours.startHour}:00 – {workingHours.endHour}:00
              </span>
              {hasMore && (
                <button
                  className="asp__toggle-btn"
                  onClick={() => setShowAllSlots(v => !v)}
                >
                  {showAllSlots ? (
                    <><ChevronUp size={13} /> Mostrar menos</>
                  ) : (
                    <><ChevronDown size={13} /> Ver todos ({slots.length})</>
                  )}
                </button>
              )}
            </div>
            <div className="asp__scroll">
              {visibleSlots.map(slot => (
                <SlotRow
                  key={slot.start}
                  slot={slot}
                  conflictCount={conflictMap.get(slot.start) ?? 0}
                />
              ))}
            </div>
            {!showAllSlots && hasMore && (
              <div style={{
                textAlign: 'center',
                fontSize: 11,
                color: 'var(--color-text-low)',
                paddingTop: 'var(--space-1)',
              }}>
                y {slots.length - 6} bloque{slots.length - 6 !== 1 ? 's' : ''} más
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
