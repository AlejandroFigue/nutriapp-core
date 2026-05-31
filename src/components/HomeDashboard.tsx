/**
 * HomeDashboard.tsx — Vista principal de NutriApp Profesional
 *
 * Arquitectura:
 *   · Selector de período  — Hoy / Semana / Mes (estado local TimeRange)
 *   · Tres tarjetas        — Próximos Turnos · Trabajos Pendientes · Planes Alimentarios
 *   · Dexie reactivo       — liveQuery + useSyncExternalStore (sin dexie-react-hooks)
 *   · Prop onNewPatient    — delega al padre la apertura del formulario de alta
 *
 * Tablas consultadas: turnos · clinicalSuggestions · planes · pacientes (join en memoria)
 */

import { useState, useEffect, useRef, useMemo, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { liveQuery } from 'dexie'
import { db } from '@/db/database'
import { Calendar, CheckSquare, Apple, Plus } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

type TimeRange = 'daily' | 'weekly' | 'monthly'

interface Props { onNewPatient: () => void }

interface EnrichedTurno {
  id: string; pacienteNombre: string; fecha: string; hora?: string; estado: string
}
interface EnrichedTarea {
  id: string; pacienteNombre: string
}
interface EnrichedPlan {
  id: string; pacienteNombre: string; fecha: string; sincronizado?: number
}
interface DashData {
  turnos: EnrichedTurno[]
  tareas: EnrichedTarea[]
  planes: EnrichedPlan[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const toISO = (d: Date) => d.toISOString().split('T')[0]

function getRange(r: TimeRange): { start: string; end: string } {
  const now = new Date()
  const end = new Date(now)
  if (r === 'weekly')  end.setDate(end.getDate() + 6)
  else if (r === 'monthly') end.setDate(end.getDate() + 29)
  return { start: toISO(now), end: toISO(end) }
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-AR', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

function initials(name: string): string {
  return (name || '?')
    .split(' ')
    .slice(0, 2)
    .map(n => n[0] ?? '')
    .join('')
    .toUpperCase() || '?'
}

// ── useDexieLive — liveQuery ↔ useSyncExternalStore ──────────────────────────

function useDexieLive<T>(
  querier: () => T | Promise<T>,
  deps: unknown[],
  initial: T,
): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const obs  = useMemo(() => liveQuery(querier), deps)
  const snap = useRef<T>(initial)

  return useSyncExternalStore(
    (notify) => {
      const sub = obs.subscribe({
        next:  (v) => { snap.current = v as T; notify() },
        error: ()  => notify(),
      })
      return () => sub.unsubscribe()
    },
    () => snap.current,
    () => initial,
  )
}

// ── CSS injection (singleton) ─────────────────────────────────────────────────

let _stylesInjected = false
function injectStyles() {
  if (_stylesInjected) return
  _stylesInjected = true
  const el = document.createElement('style')
  el.dataset.id = 'home-dashboard'
  el.textContent = STYLES
  document.head.appendChild(el)
}

// ── Constants ─────────────────────────────────────────────────────────────────

const RANGE_TABS: { key: TimeRange; label: string }[] = [
  { key: 'daily',   label: 'Hoy'    },
  { key: 'weekly',  label: 'Semana' },
  { key: 'monthly', label: 'Mes'    },
]

const EMPTY_DATA: DashData = { turnos: [], tareas: [], planes: [] }

// ── Component ─────────────────────────────────────────────────────────────────

export default function HomeDashboard({ onNewPatient }: Props) {
  useEffect(() => { injectStyles() }, [])

  const [range, setRange] = useState<TimeRange>('daily')

  const data = useDexieLive(
    async (): Promise<DashData> => {
      const { start, end } = getRange(range)

      const [pacientes, rawTurnos, rawPlanes, rawTareas] = await Promise.all([
        db.pacientes.toArray(),
        db.turnos.where('fecha').between(start, end, true, true).toArray(),
        db.planes.where('fecha').between(start, end, true, true).toArray(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (db as any).clinicalSuggestions?.where('status').equals('pending').toArray() ?? [],
      ])

      const pm = new Map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (pacientes as any[]).map(p => [p.id, p.nombre as string]),
      )
      const nombre = (id: string) => pm.get(id) ?? 'Paciente'

      const turnos: EnrichedTurno[] = (rawTurnos as any[])
        .filter(t => t.estado !== 'cancelado')
        .sort((a, b) =>
          a.fecha.localeCompare(b.fecha) ||
          (a.hora ?? '').localeCompare(b.hora ?? ''),
        )
        .map(t => ({ id: t.id, pacienteNombre: nombre(t.pacienteId), fecha: t.fecha, hora: t.hora, estado: t.estado }))

      const planes: EnrichedPlan[] = (rawPlanes as any[])
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
        .map(p => ({ id: p.id, pacienteNombre: nombre(p.pacienteId), fecha: p.fecha, sincronizado: p.sincronizado }))

      const tareas: EnrichedTarea[] = (rawTareas as any[])
        .map(s => ({ id: s.id, pacienteNombre: nombre(s.pacienteId) }))

      return { turnos, tareas, planes }
    },
    [range],
    EMPTY_DATA,
  )

  const todayLabel = new Date().toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <section className="hd" aria-label="Panel de inicio">

      {/* ── Header ── */}
      <div className="hd-header">
        <div>
          <h1 className="hd-title">Bienvenido/a</h1>
          <p className="hd-subtitle">{todayLabel}</p>
        </div>
        <button
          className="hd-btn-new"
          onClick={onNewPatient}
          aria-label="Agregar nuevo paciente"
        >
          <Plus size={16} aria-hidden="true" />
          Nuevo paciente
        </button>
      </div>

      {/* ── Selector de período ── */}
      <div className="hd-range" role="group" aria-label="Selector de período">
        {RANGE_TABS.map(({ key, label }) => (
          <button
            key={key}
            className={`hd-range__btn${range === key ? ' hd-range__btn--on' : ''}`}
            onClick={() => setRange(key)}
            aria-pressed={range === key}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Cuadrícula de tarjetas ── */}
      <div className="hd-grid">

        {/* ── Próximos Turnos ── */}
        <article className="hd-card">
          <header className="hd-card__head">
            <span className="hd-card__icon hd-card__icon--cal" aria-hidden="true">
              <Calendar size={18} />
            </span>
            <span className="hd-card__label">Próximos Turnos</span>
            <span className="hd-badge" aria-label={`${data.turnos.length} turnos`}>
              {data.turnos.length}
            </span>
          </header>
          <div className="hd-card__body">
            {data.turnos.length === 0
              ? <Empty icon={<Calendar size={28} />} text="Sin turnos en este período" />
              : data.turnos.map(t => (
                  <div key={t.id} className="hd-item">
                    <span className="hd-avatar" aria-hidden="true">{initials(t.pacienteNombre)}</span>
                    <div className="hd-item__info">
                      <p className="hd-item__name">{t.pacienteNombre}</p>
                      <p className="hd-item__meta">
                        {fmtDate(t.fecha)}{t.hora ? ` · ${t.hora}` : ''}
                      </p>
                    </div>
                    <span className={`hd-pill hd-pill--${t.estado === 'confirmado' ? 'conf' : 'pend'}`}>
                      {t.estado}
                    </span>
                  </div>
                ))
            }
          </div>
        </article>

        {/* ── Trabajos Pendientes ── */}
        <article className="hd-card">
          <header className="hd-card__head">
            <span className="hd-card__icon hd-card__icon--check" aria-hidden="true">
              <CheckSquare size={18} />
            </span>
            <span className="hd-card__label">Trabajos Pendientes</span>
            <span className="hd-badge">{data.tareas.length}</span>
          </header>
          <div className="hd-card__body">
            {data.tareas.length === 0
              ? <Empty icon={<CheckSquare size={28} />} text="Sin tareas clínicas pendientes" />
              : data.tareas.map(t => (
                  <div key={t.id} className="hd-item">
                    <span className="hd-avatar" aria-hidden="true">{initials(t.pacienteNombre)}</span>
                    <div className="hd-item__info">
                      <p className="hd-item__name">{t.pacienteNombre}</p>
                      <p className="hd-item__meta">Sugerencia clínica pendiente</p>
                    </div>
                    <span className="hd-pill hd-pill--pend">Pendiente</span>
                  </div>
                ))
            }
          </div>
        </article>

        {/* ── Planes Alimentarios ── */}
        <article className="hd-card">
          <header className="hd-card__head">
            <span className="hd-card__icon hd-card__icon--apple" aria-hidden="true">
              <Apple size={18} />
            </span>
            <span className="hd-card__label">Planes Alimentarios</span>
            <span className="hd-badge">{data.planes.length}</span>
          </header>
          <div className="hd-card__body">
            {data.planes.length === 0
              ? <Empty icon={<Apple size={28} />} text="Sin planes en este período" />
              : data.planes.map(p => (
                  <div key={p.id} className="hd-item">
                    <span className="hd-avatar" aria-hidden="true">{initials(p.pacienteNombre)}</span>
                    <div className="hd-item__info">
                      <p className="hd-item__name">{p.pacienteNombre}</p>
                      <p className="hd-item__meta">{fmtDate(p.fecha)}</p>
                    </div>
                    <span className={`hd-pill ${p.sincronizado ? 'hd-pill--conf' : 'hd-pill--new'}`}>
                      {p.sincronizado ? 'Guardado' : 'En curso'}
                    </span>
                  </div>
                ))
            }
          </div>
        </article>

      </div>
    </section>
  )
}

// ── Sub-componente: estado vacío ──────────────────────────────────────────────

function Empty({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="hd-empty" role="status" aria-live="polite">
      <span className="hd-empty__icon" aria-hidden="true">{icon}</span>
      <p className="hd-empty__txt">{text}</p>
    </div>
  )
}

// ── Estilos autocontenidos ────────────────────────────────────────────────────

const STYLES = `
@keyframes hd-in {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

.hd {
  max-width: 1100px;
  margin-inline: auto;
  padding: var(--space-6) var(--space-4) calc(var(--space-16) + var(--space-6));
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  animation: hd-in var(--transition-normal) both;
}

/* ── Header ── */
.hd-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-4);
}
.hd-title {
  font-size: var(--text-2xl);
  font-weight: 800;
  color: var(--color-text-high);
  line-height: 1.2;
}
.hd-subtitle {
  font-size: var(--text-sm);
  color: var(--color-text-mid);
  margin-top: var(--space-1);
  text-transform: capitalize;
}

/* ── Botón nuevo paciente ── */
.hd-btn-new {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 10px var(--space-5);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, var(--color-durazno-deep) 0%, var(--color-durazno-dark) 100%);
  box-shadow: 0 4px 14px rgba(232, 149, 106, 0.36);
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
  outline-offset: 3px;
  flex-shrink: 0;
  white-space: nowrap;
  border: none;
  cursor: pointer;
}
.hd-btn-new:hover,
.hd-btn-new:focus-visible {
  transform: translateY(-2px) scale(1.03);
  box-shadow: 0 7px 20px rgba(232, 149, 106, 0.46);
}
.hd-btn-new:active { transform: scale(0.97); }

/* ── Selector de período ── */
.hd-range {
  display: flex;
  gap: 3px;
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  padding: 3px;
  align-self: flex-start;
}
.hd-range__btn {
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-mid);
  transition: color var(--transition-fast), background var(--transition-fast), box-shadow var(--transition-fast);
  outline-offset: 2px;
  white-space: nowrap;
  border: none;
  cursor: pointer;
  background: none;
}
.hd-range__btn--on {
  color: #fff;
  background: linear-gradient(135deg, var(--color-durazno-deep) 0%, var(--color-durazno-dark) 100%);
  box-shadow: var(--shadow-sm);
}
.hd-range__btn:not(.hd-range__btn--on):hover,
.hd-range__btn:not(.hd-range__btn--on):focus-visible {
  color: var(--color-text-high);
  background: var(--color-divider);
}

/* ── Cuadrícula ── */
.hd-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-5);
}
@media (min-width: 600px) { .hd-grid { grid-template-columns: 1fr 1fr; } }
@media (min-width: 900px) { .hd-grid { grid-template-columns: repeat(3, 1fr); } }

/* ── Tarjeta ── */
.hd-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: box-shadow var(--transition-normal), transform var(--transition-normal);
}
.hd-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}
.hd-card__head {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-5);
  border-bottom: 1px solid var(--color-divider);
}
.hd-card__icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.hd-card__icon--cal   { background: #EEF2FF; color: #4F6FDE; }
.hd-card__icon--check { background: #FFF7ED; color: var(--color-warning); }
.hd-card__icon--apple { background: var(--color-verde); color: var(--color-verde-dark); }
.dark .hd-card__icon--cal   { background: #1B243C; color: #7B96F0; }
.dark .hd-card__icon--check { background: #291C09; color: var(--color-warning); }
.dark .hd-card__icon--apple { background: var(--color-verde); color: var(--color-verde-deep); }
.hd-card__label {
  flex: 1;
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--color-text-high);
  line-height: 1.2;
}
.hd-badge {
  font-size: var(--text-xs);
  font-weight: 700;
  padding: 2px 9px;
  border-radius: var(--radius-full);
  background: var(--color-primary-surface);
  color: var(--color-primary);
  min-width: 26px;
  text-align: center;
}
.hd-card__body { flex: 1; overflow-y: auto; }

/* ── Ítems de lista ── */
.hd-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-5);
  border-bottom: 1px solid var(--color-divider);
  transition: background var(--transition-fast);
}
.hd-item:last-child { border-bottom: none; }
.hd-item:hover { background: var(--color-surface-raised); }

.hd-avatar {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, var(--color-durazno) 0%, var(--color-durazno-deep) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 800;
  color: #fff;
  flex-shrink: 0;
  letter-spacing: 0.04em;
}
.hd-item__info { flex: 1; min-width: 0; }
.hd-item__name {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-high);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.hd-item__meta {
  font-size: var(--text-xs);
  color: var(--color-text-mid);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 1px;
}

/* ── Píldoras de estado ── */
.hd-pill {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
  white-space: nowrap;
}
.hd-pill--pend { background: var(--color-warning-surface); color: var(--color-warning); }
.hd-pill--conf { background: var(--color-verde);           color: var(--color-verde-dark); }
.hd-pill--new  { background: var(--color-primary-surface); color: var(--color-primary); }

/* ── Estado vacío ── */
.hd-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-10) var(--space-4);
  color: var(--color-text-low);
}
.hd-empty__icon { opacity: 0.3; }
.hd-empty__txt  { font-size: var(--text-sm); text-align: center; line-height: 1.5; }
`
