/**
 * PlanAlimentario.jsx — Prescripción Dietética Clínica
 *
 * Estructura:
 *   1. Header: paciente + navegador de fecha
 *   2. Toolbar: sistema de plantillas
 *   3. Indicaciones Iniciales: textarea editable con viñetas predecibles
 *   4. Tabla R/P: 3 columnas (Alimentos · Características · Cantidades)
 *      agrupadas por tipo. Motor de costos invisible en columna Características.
 *   5. Footer: guardar plan
 *
 * Persistencia (db.planes):
 *   · indicacionesIniciales → string
 *   · tablaRP               → JSON.stringify(FilaRP[])
 *
 * Optimización:
 *   · FilaRP = React.memo con comparador custom → sin re-renders de filas vecinas
 *   · CaractInput: autocomplete in-memory (sin queries extra a Dexie)
 */

import {
  useState, useEffect, useRef, useMemo,
  useCallback, memo, useSyncExternalStore,
  Fragment,
} from 'react'
import { liveQuery } from 'dexie'
import { db, genId, queueSyncTask } from '@/db/database'

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

export const GRUPOS_RP = [
  { id: 'lacteos',    label: 'Lácteos',               emoji: '🥛', color: '#FFF8E1' },
  { id: 'huevos',     label: 'Huevos',                emoji: '🥚', color: '#FFF3E0' },
  { id: 'carnes',     label: 'Carnes y aves',          emoji: '🥩', color: '#FCE4EC' },
  { id: 'pescados',   label: 'Pescados y mariscos',    emoji: '🐟', color: '#E3F2FD' },
  { id: 'hortalizas', label: 'Hortalizas',             emoji: '🥦', color: '#E8F5E9' },
  { id: 'frutas',     label: 'Frutas',                 emoji: '🍎', color: '#F3E5F5' },
  { id: 'cereales',   label: 'Cereales y panificados', emoji: '🌾', color: '#FFFDE7' },
  { id: 'legumbres',  label: 'Legumbres',              emoji: '🫘', color: '#F1F8E9' },
  { id: 'grasas',     label: 'Aceites y grasas',       emoji: '🫒', color: '#FFF9C4' },
  { id: 'otros',      label: 'Otros',                  emoji: '🥗', color: '#F5F5F5' },
]

const DEFAULT_INDICACIONES =
`• Fraccioná las comidas en 4 a 6 tomas diarias: desayuno, colación, almuerzo, merienda y cena.
• Masticá lentamente y en un ambiente tranquilo, sin distracciones.
• Métodos de cocción recomendados: hervido, al vapor, grillado u horno. Evitá frituras y rebozados.
• Condimentá con hierbas aromáticas, limón y especias. Limitá la sal a 1 cucharadita por día (5 g).
• Hidratate con un mínimo de 2 litros de agua por día. Evitá bebidas azucaradas y alcohólicas.
• Evitá azúcares refinados, ultraprocesados y alimentos con conservantes artificiales.`

const hoy = () => new Date().toISOString().slice(0, 10)

function createRow(grupo = '') {
  return { id: genId(), grupo, alimento: '', caracteristicas: '', cantidad: '' }
}

function createDefaultTable() {
  return GRUPOS_RP.map(g => createRow(g.label))
}

function isoToHuman(iso) {
  if (!iso) return ''
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

function shiftDay(iso, delta) {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + delta)
  return d.toISOString().slice(0, 10)
}

function iniciales(nombre = '', apellido = '') {
  return ((nombre[0] ?? '') + (apellido[0] ?? '')).toUpperCase() || '🥗'
}

function normStr(s) {
  return (s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

function calcCostoFila(alimento, cantidad, productos) {
  if (!alimento.trim() || !cantidad.trim() || !productos?.length) return 0
  const m = cantidad.match(/(\d+(?:[.,]\d+)?)\s*(kg|l|g|ml)?/i)
  if (!m) return 0
  let porcion = parseFloat(m[1].replace(',', '.'))
  const unit = (m[2] ?? 'g').toLowerCase()
  if (unit === 'kg' || unit === 'l') porcion *= 1000
  if (!porcion || isNaN(porcion)) return 0
  const normA = normStr(alimento)
  let best = null, bestLen = 0
  for (const p of productos) {
    if (!p.precioRef || !p.cantidadRefGramo) continue
    const pN = normStr(p.nombre)
    if (normA.includes(pN) && pN.length > bestLen) { best = p; bestLen = pN.length }
  }
  if (!best) return 0
  return (best.precioRef / best.cantidadRefGramo) * porcion
}

// ═══════════════════════════════════════════════════════════════════════════
// useDexieLive — liveQuery ↔ useSyncExternalStore
// ═══════════════════════════════════════════════════════════════════════════

function useDexieLive(querier, deps, initial) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const obs  = useMemo(() => liveQuery(querier), deps)
  const snap = useRef(initial)
  return useSyncExternalStore(
    (notify) => {
      const sub = obs.subscribe({
        next:  v => { snap.current = v; notify() },
        error: ()  => notify(),
      })
      return () => sub.unsubscribe()
    },
    () => snap.current,
    () => initial,
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// CSS
// ═══════════════════════════════════════════════════════════════════════════

const PD_CSS = `
/* ── Raíz ──────────────────────────────────────────────────────────────── */
.pd {
  display: flex;
  flex-direction: column;
  padding-bottom: calc(var(--nav-h, 72px) + var(--space-8, 32px));
  animation: fade-in var(--transition-normal, 220ms) both;
  max-width: 780px;
  margin-inline: auto;
}

/* ── Sin paciente ─────────────────────────────────────────────────────── */
.pd-no-patient {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-16, 64px) var(--space-6, 24px);
  text-align: center;
  gap: var(--space-3, 12px);
  color: var(--color-text-low);
  font-size: var(--text-sm);
  font-weight: 500;
  line-height: 1.6;
}
.pd-no-patient span { font-size: 3rem; }

/* ── Header ─────────────────────────────────────────────────────────────── */
.pd-hdr {
  padding: var(--space-4) var(--space-4) 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.pd-patient-bar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.pd-avatar {
  width: 46px; height: 46px;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, var(--color-primary-dark), var(--color-primary-light));
  display: flex; align-items: center; justify-content: center;
  font-size: 1.1rem; font-weight: 800; color: #fff;
  flex-shrink: 0;
  box-shadow: 0 4px 14px rgba(46,125,50,.30);
  user-select: none;
}
.pd-patient-label {
  font-size: 10px; font-weight: 700;
  letter-spacing: .08em; text-transform: uppercase;
  color: var(--color-primary);
}
.pd-patient-name {
  font-size: var(--text-base); font-weight: 700;
  color: var(--color-text-high);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* ── Navegador de fecha ────────────────────────────────────────────────── */
.pd-date-nav {
  display: flex; align-items: center; gap: var(--space-2);
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  padding: var(--space-3) var(--space-4);
  box-shadow: 0 2px 4px rgba(0,0,0,.04), 0 6px 14px rgba(0,0,0,.06);
}
.pd-date-btn {
  width: 34px; height: 34px;
  border-radius: var(--radius-full);
  border: 1.5px solid var(--color-border);
  background: transparent;
  color: var(--color-text-mid);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0;
  transition: background var(--transition-fast), color var(--transition-fast),
              transform 200ms cubic-bezier(.34,1.56,.64,1);
  -webkit-tap-highlight-color: transparent;
}
.pd-date-btn:hover  { background: var(--color-primary-surface); color: var(--color-primary); transform: scale(1.08); }
.pd-date-btn:active { transform: scale(.92); }
.pd-date-info  { flex: 1; text-align: center; }
.pd-date-dow   { font-size: 9px; font-weight: 800; text-transform: capitalize; letter-spacing: .09em; color: var(--color-primary); }
.pd-date-full  { font-size: var(--text-sm); font-weight: 600; color: var(--color-text-high); text-transform: capitalize; }
.pd-date-today {
  display: inline-block; margin-top: 2px;
  font-size: 9px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase;
  color: #fff; background: var(--color-primary);
  padding: 1px 8px; border-radius: var(--radius-full);
}

/* ── Toolbar plantillas ────────────────────────────────────────────────── */
.pd-toolbar {
  margin: var(--space-3) var(--space-4) 0;
  display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap;
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-divider);
  position: relative; overflow: hidden;
}
.pd-toolbar::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, var(--color-primary-dark), var(--color-primary-light), var(--color-accent-light, #ffd966), transparent);
}
.pd-tpl-select-wrap { flex: 1; min-width: 0; display: flex; align-items: center; gap: var(--space-2); }
.pd-tpl-select {
  flex: 1; min-width: 0;
  padding: var(--space-2) var(--space-3);
  border: 1.5px solid var(--color-border); border-radius: var(--radius-md);
  background: var(--color-bg); color: var(--color-text-high);
  font-size: var(--text-sm); font-weight: 500; cursor: pointer;
  -webkit-appearance: none; appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239E9E9E' stroke-width='2.5' stroke-linecap='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 10px center; padding-right: 30px;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  text-overflow: ellipsis;
}
.pd-tpl-select:focus { outline: none; border-color: var(--color-primary); box-shadow: 0 0 0 3px rgba(46,125,50,.14); }
.pd-tpl-select:disabled { opacity: .55; cursor: not-allowed; }
.pd-btn-tpl {
  display: inline-flex; align-items: center; gap: 5px;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-full);
  border: 1.5px solid var(--color-accent, #E8A838);
  background: transparent; color: var(--color-accent, #E8A838);
  font-size: var(--text-sm); font-weight: 700; cursor: pointer;
  white-space: nowrap; flex-shrink: 0;
  transition: background var(--transition-fast), transform 200ms cubic-bezier(.34,1.56,.64,1);
  -webkit-tap-highlight-color: transparent;
}
.pd-btn-tpl:hover { background: var(--color-accent-surface, #FFF8E1); transform: scale(1.03) translateY(-1px); }
.pd-tpl-save-row { display: flex; align-items: center; gap: var(--space-2); flex: 1; animation: fade-in 160ms both; }
.pd-tpl-name-input {
  flex: 1; min-width: 0;
  padding: var(--space-2) var(--space-3);
  border: 1.5px solid var(--color-primary); border-radius: var(--radius-md);
  background: var(--color-bg); color: var(--color-text-high);
  font-size: var(--text-sm); font-weight: 500;
  box-shadow: 0 0 0 3px rgba(46,125,50,.12); outline: none;
}
.pd-tpl-confirm-btn {
  width: 34px; height: 34px; border-radius: var(--radius-full);
  border: none; background: var(--color-primary); color: #fff;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0; font-size: 1rem;
  transition: background var(--transition-fast), transform 200ms cubic-bezier(.34,1.56,.64,1);
}
.pd-tpl-confirm-btn:hover:not(:disabled) { background: var(--color-primary-dark); transform: scale(1.08); }
.pd-tpl-confirm-btn:disabled { opacity: .40; cursor: not-allowed; }
.pd-tpl-cancel-btn {
  width: 34px; height: 34px; border-radius: var(--radius-full);
  border: 1.5px solid var(--color-border); background: transparent;
  color: var(--color-text-mid); display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0; font-size: 1.1rem;
  transition: background var(--transition-fast), border-color var(--transition-fast),
              color var(--transition-fast), transform var(--transition-fast);
}
.pd-tpl-cancel-btn:hover { background: var(--color-error-surface, #FEE2E2); border-color: var(--color-error, #EF4444); color: var(--color-error, #EF4444); transform: rotate(90deg); }
.pd-tpl-saved { display: inline-flex; align-items: center; gap: 5px; font-size: var(--text-xs); font-weight: 600; color: var(--color-success, #16A34A); animation: fade-in 200ms both; flex-shrink: 0; }

/* ── Secciones ─────────────────────────────────────────────────────────── */
.pd-section {
  margin: var(--space-4) var(--space-4) 0;
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-divider);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}
.pd-section-hdr {
  display: flex; align-items: center; gap: var(--space-3);
  padding: var(--space-4) var(--space-4) var(--space-3);
  border-bottom: 1px solid var(--color-divider);
  background: var(--color-surface);
}
.pd-section-num {
  width: 28px; height: 28px; border-radius: var(--radius-full);
  background: var(--color-primary); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 800; letter-spacing: .04em;
  flex-shrink: 0; user-select: none;
}
.pd-section-title {
  flex: 1; font-size: var(--text-base); font-weight: 700;
  color: var(--color-text-high); letter-spacing: -.01em; margin: 0;
}
.pd-costo-total {
  font-size: var(--text-xs); font-weight: 700;
  color: #C87040; background: #FFF8E1;
  border: 1px solid #E8C870; border-radius: var(--radius-full);
  padding: 2px 10px; white-space: nowrap; flex-shrink: 0;
}

/* ── Indicaciones ──────────────────────────────────────────────────────── */
.pd-indic-area {
  display: block; width: 100%; box-sizing: border-box;
  min-height: 168px; resize: vertical;
  padding: var(--space-4);
  border: none; outline: none;
  background: var(--color-bg);
  color: var(--color-text-high);
  font-family: var(--font-sans); font-size: var(--text-sm); line-height: 1.8;
  -webkit-appearance: none; appearance: none;
}
.pd-indic-area::placeholder { color: var(--color-text-disabled); font-style: italic; }
.pd-indic-area:focus { background: var(--color-surface); }

/* ── Tabla R/P ─────────────────────────────────────────────────────────── */
.pd-table-container { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.pd-table {
  width: 100%; border-collapse: collapse; table-layout: fixed;
  min-width: 540px;
}

/* Cabecera de columnas */
.pd-thead-row { background: var(--color-primary); }
.pd-th {
  padding: 10px 12px;
  font-size: 10px; font-weight: 800; letter-spacing: .08em;
  text-transform: uppercase; color: #fff; text-align: left;
}
.pd-th--alimento { width: 30%; }
.pd-th--caract   { width: 45%; }
.pd-th--cant     { width: 20%; }
.pd-th--rm       { width: 5%; }

/* Grupo header */
.pd-group-hdr { }
.pd-group-cell {
  background: var(--_g-color, #F5F5F5);
  padding: 6px 12px;
  display: flex; align-items: center; gap: var(--space-2);
  border-top: 1px solid rgba(0,0,0,.06);
  border-bottom: 1px solid rgba(0,0,0,.06);
}
.pd-group-emoji { font-size: .95rem; line-height: 1; user-select: none; }
.pd-group-label { font-size: var(--text-xs); font-weight: 800; color: var(--color-text-high); letter-spacing: .02em; flex: 1; }
.pd-group-costo {
  font-size: 10px; font-weight: 700; color: #C87040;
  background: rgba(255,255,255,.65); border: 1px solid #E8C870;
  padding: 1px 8px; border-radius: var(--radius-full); white-space: nowrap;
}
.pd-btn-add-row {
  display: inline-flex; align-items: center; gap: 3px;
  padding: 3px 10px; border-radius: var(--radius-full);
  border: 1px dashed var(--color-primary-light, #81C784);
  background: rgba(255,255,255,.70); color: var(--color-primary);
  font-size: 10px; font-weight: 700; letter-spacing: .02em;
  cursor: pointer; white-space: nowrap; flex-shrink: 0;
  transition: background var(--transition-fast), transform 150ms ease;
  -webkit-tap-highlight-color: transparent;
}
.pd-btn-add-row:hover { background: var(--color-primary-surface); transform: scale(1.04); }

/* Filas de items */
.pd-row-item { border-bottom: 1px solid var(--color-divider); }
.pd-row-item:hover { background: rgba(46,125,50,.025); }
.pd-cell { padding: 5px 6px; vertical-align: middle; }
.pd-cell--rm { text-align: center; width: 42px; }

/* Inputs de celda */
.pd-cell-input {
  display: block; width: 100%; box-sizing: border-box;
  padding: 5px 8px;
  border: 1px solid transparent; border-radius: var(--radius-md);
  background: transparent; color: var(--color-text-high);
  font-family: var(--font-sans); font-size: var(--text-sm);
  -webkit-appearance: none; appearance: none;
  transition: border-color var(--transition-fast), background var(--transition-fast);
}
.pd-cell-input:focus {
  outline: none; border-color: var(--color-primary-light, #81C784);
  background: var(--color-surface); box-shadow: 0 0 0 2px rgba(76,175,80,.12);
}
.pd-cell-input::placeholder { color: var(--color-text-disabled); font-size: .8rem; }
.pd-cell-input--cant { font-variant-numeric: tabular-nums; }

/* Cant + badge de costo */
.pd-cant-row { display: flex; align-items: center; gap: 4px; }
.pd-costo-badge {
  font-size: 9px; font-weight: 700; color: #C87040;
  background: #FFF8E1; border: 1px solid #E8C870;
  padding: 1px 5px; border-radius: var(--radius-full);
  white-space: nowrap; flex-shrink: 0; user-select: none;
}

/* Botón eliminar fila */
.pd-btn-rm {
  width: 26px; height: 26px; border-radius: var(--radius-full);
  border: 1px solid var(--color-border); background: transparent;
  color: var(--color-text-low); display: flex; align-items: center; justify-content: center;
  cursor: pointer; margin: auto;
  transition: background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast), transform 150ms ease;
  -webkit-tap-highlight-color: transparent;
}
.pd-btn-rm:hover { background: var(--color-error-surface, #FEE2E2); color: var(--color-error, #EF4444); border-color: var(--color-error, #EF4444); transform: scale(1.1); }

/* ── CaractInput autocomplete ─────────────────────────────────────────── */
.pd-caract-wrap { position: relative; }
.pd-caract-drop {
  position: absolute; left: 0; right: 0; top: calc(100% + 3px); z-index: 200;
  background: rgba(255,255,255,.97);
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: 0 4px 20px rgba(0,0,0,.12);
  list-style: none; margin: 0; padding: 4px 0;
  max-height: 200px; overflow-y: auto;
  animation: fade-in 140ms ease both;
}
.pd-caract-opt {
  display: flex; align-items: baseline; gap: 6px;
  padding: 6px 12px; cursor: pointer;
  transition: background var(--transition-fast);
}
.pd-caract-opt:hover { background: var(--color-primary-surface); }
.pd-caract-opt__name { font-size: var(--text-sm); font-weight: 600; color: var(--color-text-high); }
.pd-caract-opt__orig { font-size: 10px; color: var(--color-text-low); white-space: nowrap; }

/* ── Print: ocultar costos ──────────────────────────────────────────────── */
@media print {
  .pd-costo-badge,
  .pd-costo-total,
  .pd-group-costo { display: none !important; }
}

/* ── Footer ────────────────────────────────────────────────────────────── */
.pd-footer {
  margin: var(--space-4) var(--space-4) 0;
  display: flex; align-items: center; gap: var(--space-4); flex-wrap: wrap;
}
.pd-btn-save {
  display: inline-flex; align-items: center; justify-content: center;
  gap: var(--space-2); padding: var(--space-3) var(--space-7);
  background: linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 50%, var(--color-primary-light) 100%);
  background-size: 200% 100%; background-position: 0% center;
  color: #fff; border-radius: var(--radius-lg);
  font-size: var(--text-base); font-weight: 700;
  box-shadow: 0 4px 16px rgba(46,125,50,.38), 0 2px 6px rgba(0,0,0,.12);
  transition: background-position 350ms ease, transform var(--transition-fast),
              box-shadow var(--transition-fast), opacity var(--transition-fast);
  -webkit-tap-highlight-color: transparent;
}
.pd-btn-save:hover:not(:disabled) { background-position: 100% center; transform: translateY(-2px); box-shadow: 0 8px 28px rgba(46,125,50,.48), 0 4px 12px rgba(0,0,0,.15); }
.pd-btn-save:active:not(:disabled) { transform: translateY(0) scale(.99); }
.pd-btn-save:disabled { opacity: .55; cursor: not-allowed; }
.pd-saved-notice { display: inline-flex; align-items: center; gap: var(--space-1); font-size: var(--text-xs); font-weight: 600; color: var(--color-success, #16A34A); animation: fade-in 200ms both; }

/* ── Loading dots ──────────────────────────────────────────────────────── */
.pd-loading { display: flex; align-items: center; justify-content: center; padding: var(--space-8) var(--space-4); gap: var(--space-2); }
.pd-loading-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--color-primary-light); animation: pd-bounce 1.2s ease-in-out infinite; }
.pd-loading-dot:nth-child(2) { animation-delay: .2s; }
.pd-loading-dot:nth-child(3) { animation-delay: .4s; }
@keyframes pd-bounce {
  0%, 80%, 100% { transform: scale(.75); opacity: .4; }
  40%           { transform: scale(1);   opacity: 1;  }
}
`

function injectStyles() {
  if (typeof document === 'undefined') return
  if (document.getElementById('pd-styles-v1')) return
  const el = document.createElement('style')
  el.id          = 'pd-styles-v1'
  el.textContent = PD_CSS
  document.head.appendChild(el)
}

// ═══════════════════════════════════════════════════════════════════════════
// ÍCONOS
// ═══════════════════════════════════════════════════════════════════════════

const IcoLeft = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)
const IcoRight = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
)
const IcoSave = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </svg>
)
const IcoCheck = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)
const IcoSpinner = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.9s linear infinite' }} aria-hidden="true">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
  </svg>
)
const IcoX = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)
const IcoStar = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
)
const IcoRmRow = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)

// ═══════════════════════════════════════════════════════════════════════════
// CaractInput — input de Características con autocomplete invisible
// ═══════════════════════════════════════════════════════════════════════════

function CaractInput({ value, onChange, productos }) {
  const [sugg,    setSugg]    = useState([])
  const [show,    setShow]    = useState(false)
  const wrapRef               = useRef(null)

  function handleChange(e) {
    const v = e.target.value
    onChange(v)
    if (v.length >= 2 && productos?.length) {
      const term = normStr(v)
      const matches = productos.filter(p => normStr(p.nombre).includes(term)).slice(0, 7)
      setSugg(matches)
      setShow(matches.length > 0)
    } else {
      setShow(false)
    }
  }

  function handleSelect(p) {
    onChange(p.nombre + (p.origen ? ' — ' + p.origen : ''))
    setShow(false)
    setSugg([])
  }

  useEffect(() => {
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setShow(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="pd-caract-wrap" ref={wrapRef}>
      <input
        className="pd-cell-input"
        value={value}
        onChange={handleChange}
        onFocus={() => sugg.length > 0 && setShow(true)}
        placeholder="Corte, marca, preparación…"
        spellCheck={false}
        autoComplete="off"
      />
      {show && (
        <ul className="pd-caract-drop" role="listbox" aria-label="Sugerencias de producto">
          {sugg.map(p => (
            <li
              key={p.id}
              role="option"
              className="pd-caract-opt"
              onMouseDown={() => handleSelect(p)}
            >
              <span className="pd-caract-opt__name">{p.nombre}</span>
              {p.origen && <span className="pd-caract-opt__orig">{p.origen}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// FilaRP — fila de la tabla, memoizada
// ═══════════════════════════════════════════════════════════════════════════

const FilaRP = memo(
  function FilaRP({ row, onUpdate, onRemove, productos }) {
    const costo = useMemo(
      () => calcCostoFila(row.alimento, row.cantidad, productos),
      [row.alimento, row.cantidad, productos],
    )

    const handleAlimento = useCallback(
      e => onUpdate(row.id, 'alimento', e.target.value),
      [row.id, onUpdate],
    )
    const handleCantidad = useCallback(
      e => onUpdate(row.id, 'cantidad', e.target.value),
      [row.id, onUpdate],
    )
    const handleCaract = useCallback(
      v => onUpdate(row.id, 'caracteristicas', v),
      [row.id, onUpdate],
    )
    const handleRemove = useCallback(
      () => onRemove(row.id),
      [row.id, onRemove],
    )

    const fmtCosto = n =>
      n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

    return (
      <tr className="pd-row-item">
        <td className="pd-cell pd-cell--alimento">
          <input
            className="pd-cell-input"
            value={row.alimento}
            onChange={handleAlimento}
            placeholder="Alimento…"
            spellCheck={false}
            autoComplete="off"
          />
        </td>
        <td className="pd-cell pd-cell--caract">
          <CaractInput
            value={row.caracteristicas}
            onChange={handleCaract}
            productos={productos}
          />
        </td>
        <td className="pd-cell pd-cell--cant">
          <div className="pd-cant-row">
            <input
              className="pd-cell-input pd-cell-input--cant"
              value={row.cantidad}
              onChange={handleCantidad}
              placeholder="200 ml"
              spellCheck={false}
              autoComplete="off"
            />
            {costo > 0 && (
              <span className="pd-costo-badge" aria-label={`Costo estimado $${fmtCosto(costo)}`}>
                ${fmtCosto(costo)}
              </span>
            )}
          </div>
        </td>
        <td className="pd-cell pd-cell--rm">
          <button
            className="pd-btn-rm"
            onClick={handleRemove}
            type="button"
            aria-label="Eliminar fila"
          >
            <IcoRmRow />
          </button>
        </td>
      </tr>
    )
  },
  (prev, next) =>
    prev.row.alimento        === next.row.alimento      &&
    prev.row.caracteristicas === next.row.caracteristicas &&
    prev.row.cantidad        === next.row.cantidad       &&
    prev.productos           === next.productos          &&
    prev.onUpdate            === next.onUpdate           &&
    prev.onRemove            === next.onRemove,
)

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export default function PlanAlimentario({ pacienteId }) {
  useEffect(() => { injectStyles() }, [])

  // ── UI state ─────────────────────────────────────────────────────────────
  const [fecha,        setFecha]        = useState(hoy)
  const [indic,        setIndic]        = useState(DEFAULT_INDICACIONES)
  const [tablaRP,      setTablaRP]      = useState(createDefaultTable)
  const [planLoading,  setPlanLoading]  = useState(false)
  const [guardando,    setGuardando]    = useState(false)
  const [savedOk,      setSavedOk]      = useState(false)

  // Template state
  const [showTplInput, setShowTplInput] = useState(false)
  const [tplNombre,    setTplNombre]    = useState('')
  const [guardandoTpl, setGuardandoTpl] = useState(false)
  const [tplSavedOk,   setTplSavedOk]   = useState(false)
  const [plantillaId,  setPlantillaId]  = useState('')

  const tplInputRef   = useRef(null)
  const lastLoadedKey = useRef('')

  // ── Reactive Dexie queries ────────────────────────────────────────────────
  const paciente  = useDexieLive(
    () => pacienteId ? db.pacientes.get(pacienteId) : Promise.resolve(null),
    [pacienteId], null,
  )
  const plantillas = useDexieLive(() => db.plantillas.toArray(), [], [])
  const productos  = useDexieLive(() => db.productos.toArray(), [], [])

  // ── Load plan (imperativo para no sobrescribir ediciones en curso) ────────
  useEffect(() => {
    if (!pacienteId) return
    const clave = `${pacienteId}|${fecha}`
    if (lastLoadedKey.current === clave) return

    let cancelled = false
    setPlanLoading(true)

    db.planes
      .where('[pacienteId+fecha]')
      .equals([pacienteId, fecha])
      .first()
      .then(plan => {
        if (cancelled) return
        lastLoadedKey.current = clave
        if (plan?.tablaRP) {
          try { setTablaRP(JSON.parse(plan.tablaRP)) }
          catch { setTablaRP(createDefaultTable()) }
        } else {
          setTablaRP(createDefaultTable())
        }
        setIndic(plan?.indicacionesIniciales ?? DEFAULT_INDICACIONES)
      })
      .catch(err => console.error('[PlanAlimentario] Error cargando:', err))
      .finally(() => { if (!cancelled) setPlanLoading(false) })

    return () => { cancelled = true }
  }, [pacienteId, fecha])

  useEffect(() => { lastLoadedKey.current = '' }, [pacienteId, fecha])

  // ── Costo total del día (screen only) ────────────────────────────────────
  const costoTotal = useMemo(
    () => tablaRP.reduce((sum, r) => sum + calcCostoFila(r.alimento, r.cantidad, productos), 0),
    [tablaRP, productos],
  )

  // ── Guardia sin paciente ──────────────────────────────────────────────────
  if (!pacienteId) {
    return (
      <section className="pd">
        <div className="pd-no-patient">
          <span aria-hidden="true">🥗</span>
          <p>Seleccioná un paciente para ver y editar su prescripción dietética</p>
        </div>
      </section>
    )
  }

  const nombreCompleto = [paciente?.nombre, paciente?.apellido].filter(Boolean).join(' ') || 'Paciente'
  const fechaHumana    = isoToHuman(fecha)
  const [diaNombre, ...restoFecha] = fechaHumana.split(' ')
  const esHoy          = fecha === hoy()
  const fmtARS         = n => n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  // ── Row handlers (estables con useCallback) ───────────────────────────────
  const handleUpdateRow = useCallback((id, field, value) => {
    setTablaRP(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
    setSavedOk(false)
  }, [])

  const handleRemoveRow = useCallback((id) => {
    setTablaRP(prev => prev.filter(r => r.id !== id))
    setSavedOk(false)
  }, [])

  const handleAddRow = useCallback((grupo) => {
    setTablaRP(prev => {
      const indices = prev.map((r, i) => r.grupo === grupo ? i : -1).filter(i => i >= 0)
      const insertAfter = indices.length > 0 ? indices[indices.length - 1] : prev.length - 1
      const newArr = [...prev]
      newArr.splice(insertAfter + 1, 0, createRow(grupo))
      return newArr
    })
    setSavedOk(false)
  }, [])

  // ── Guardar plan ──────────────────────────────────────────────────────────
  const handleGuardarPlan = useCallback(async () => {
    if (!pacienteId || guardando) return
    setGuardando(true)
    setSavedOk(false)
    try {
      const existing = await db.planes
        .where('[pacienteId+fecha]').equals([pacienteId, fecha]).first()

      const payload = {
        pacienteId,
        fecha,
        indicacionesIniciales: indic,
        tablaRP:               JSON.stringify(tablaRP),
        indicaciones:          indic,
        desayuno: '', almuerzo: '', merienda: '', cena: '',
        sincronizado:  0,
        actualizadoEn: new Date().toISOString(),
      }

      if (existing) {
        await db.planes.update(existing.id, payload)
        await queueSyncTask('planes', 'UPDATE', { id: existing.id, ...payload })
      } else {
        const id = genId()
        const nuevo = { id, creadoEn: new Date().toISOString(), ...payload }
        await db.planes.add(nuevo)
        await queueSyncTask('planes', 'CREATE', nuevo)
      }

      lastLoadedKey.current = `${pacienteId}|${fecha}`
      setSavedOk(true)
      setTimeout(() => setSavedOk(false), 3000)
    } catch (err) {
      console.error('[PlanAlimentario] Error al guardar:', err)
    } finally {
      setGuardando(false)
    }
  }, [pacienteId, fecha, indic, tablaRP, guardando])

  // ── Template handlers ─────────────────────────────────────────────────────
  const handleGuardarPlantilla = useCallback(async () => {
    if (!tplNombre.trim() || guardandoTpl) return
    setGuardandoTpl(true)
    try {
      await db.plantillas.add({
        id:                    genId(),
        nombre_plantilla:      tplNombre.trim(),
        indicacionesIniciales: indic,
        tablaRP:               JSON.stringify(tablaRP),
        indicaciones:          indic,
        desayuno: '', almuerzo: '', merienda: '', cena: '',
        creadoEn: new Date().toISOString(),
      })
      setTplNombre('')
      setShowTplInput(false)
      setTplSavedOk(true)
      setTimeout(() => setTplSavedOk(false), 2800)
    } catch (err) {
      console.error('[PlanAlimentario] Error guardando plantilla:', err)
    } finally {
      setGuardandoTpl(false)
    }
  }, [tplNombre, guardandoTpl, indic, tablaRP])

  const handleCargarPlantilla = useCallback(e => {
    const id = e.target.value
    setPlantillaId(id)
    if (!id) return
    const p = plantillas.find(p => p.id === id)
    if (!p) return
    setIndic(p.indicacionesIniciales ?? p.indicaciones ?? DEFAULT_INDICACIONES)
    if (p.tablaRP) {
      try { setTablaRP(JSON.parse(p.tablaRP)) }
      catch { setTablaRP(createDefaultTable()) }
    } else {
      setTablaRP(createDefaultTable())
    }
    setSavedOk(false)
  }, [plantillas])

  const goPrev = useCallback(() => setFecha(f => shiftDay(f, -1)), [])
  const goNext = useCallback(() => setFecha(f => shiftDay(f, +1)), [])

  useEffect(() => {
    if (showTplInput) requestAnimationFrame(() => tplInputRef.current?.focus())
  }, [showTplInput])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <section className="pd" aria-label={`Prescripción dietética — ${nombreCompleto}`}>

      {/* ══ HEADER ══════════════════════════════════════════════════════ */}
      <div className="pd-hdr">
        <div className="pd-patient-bar">
          <div className="pd-avatar" aria-hidden="true">
            {iniciales(paciente?.nombre, paciente?.apellido)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="pd-patient-label">Prescripción Dietética</div>
            <div className="pd-patient-name">{nombreCompleto}</div>
          </div>
        </div>

        <nav className="pd-date-nav" aria-label="Navegar por fecha">
          <button className="pd-date-btn" onClick={goPrev} aria-label="Día anterior" type="button">
            <IcoLeft />
          </button>
          <div className="pd-date-info">
            <div className="pd-date-dow">{diaNombre}</div>
            <div className="pd-date-full">{restoFecha.join(' ')}</div>
            {esHoy && <span className="pd-date-today" role="status">Hoy</span>}
          </div>
          <button className="pd-date-btn" onClick={goNext} aria-label="Día siguiente" type="button">
            <IcoRight />
          </button>
        </nav>
      </div>

      {/* ══ TOOLBAR PLANTILLAS ══════════════════════════════════════════ */}
      <div className="pd-toolbar" role="toolbar" aria-label="Herramientas de plantilla">
        <div className="pd-tpl-select-wrap">
          <span aria-hidden="true">📂</span>
          <select
            className="pd-tpl-select"
            value={plantillaId}
            onChange={handleCargarPlantilla}
            disabled={!plantillas.length}
            aria-label="Cargar desde plantilla guardada"
          >
            <option value="">
              {plantillas.length
                ? `Cargar plantilla… (${plantillas.length})`
                : 'Sin plantillas guardadas'}
            </option>
            {plantillas.map(p => (
              <option key={p.id} value={p.id}>{p.nombre_plantilla}</option>
            ))}
          </select>
        </div>

        {!showTplInput ? (
          <button
            className="pd-btn-tpl"
            onClick={() => { setShowTplInput(true); setTplSavedOk(false) }}
            type="button"
          >
            <IcoStar />
            <span>Guardar como Plantilla</span>
          </button>
        ) : (
          <div className="pd-tpl-save-row" role="group" aria-label="Nombre de nueva plantilla">
            <input
              ref={tplInputRef}
              className="pd-tpl-name-input"
              type="text"
              value={tplNombre}
              onChange={e => setTplNombre(e.target.value)}
              placeholder="Nombre de la plantilla…"
              maxLength={60}
              onKeyDown={e => {
                if (e.key === 'Enter')  handleGuardarPlantilla()
                if (e.key === 'Escape') { setShowTplInput(false); setTplNombre('') }
              }}
            />
            <button
              className="pd-tpl-confirm-btn"
              type="button"
              onClick={handleGuardarPlantilla}
              disabled={!tplNombre.trim() || guardandoTpl}
              title="Guardar plantilla"
            >
              {guardandoTpl ? <IcoSpinner /> : <IcoCheck />}
            </button>
            <button
              className="pd-tpl-cancel-btn"
              type="button"
              onClick={() => { setShowTplInput(false); setTplNombre('') }}
              title="Cancelar"
            >
              <IcoX />
            </button>
          </div>
        )}

        {tplSavedOk && (
          <span className="pd-tpl-saved" role="status">
            <IcoCheck /> ¡Plantilla guardada!
          </span>
        )}
      </div>

      {/* ══ INDICACIONES INICIALES ══════════════════════════════════════ */}
      <div className="pd-section">
        <div className="pd-section-hdr">
          <span className="pd-section-num">I</span>
          <h2 className="pd-section-title">Indicaciones Iniciales</h2>
        </div>
        <textarea
          className="pd-indic-area"
          value={indic}
          onChange={e => { setIndic(e.target.value); setSavedOk(false) }}
          rows={7}
          placeholder="Ingresá las indicaciones iniciales del plan dietético…"
          aria-label="Indicaciones iniciales del plan dietético"
          spellCheck="true"
        />
      </div>

      {/* ══ TABLA R/P ════════════════════════════════════════════════════ */}
      <div className="pd-section pd-section--rp">
        <div className="pd-section-hdr">
          <span className="pd-section-num">R</span>
          <h2 className="pd-section-title">Tabla R/P — Prescripción Alimentaria</h2>
          {costoTotal > 0 && (
            <span className="pd-costo-total" aria-label={`Costo estimado total del día: $${fmtARS(costoTotal)}`}>
              Total día est.: ${fmtARS(costoTotal)}
            </span>
          )}
        </div>

        {planLoading ? (
          <div className="pd-loading" role="status" aria-live="polite" aria-label="Cargando prescripción…">
            <div className="pd-loading-dot" />
            <div className="pd-loading-dot" />
            <div className="pd-loading-dot" />
          </div>
        ) : (
          <div className="pd-table-container">
            <table className="pd-table">
              <colgroup>
                <col style={{ width: '30%' }} />
                <col style={{ width: '44%' }} />
                <col style={{ width: '21%' }} />
                <col style={{ width: '5%' }} />
              </colgroup>
              <thead>
                <tr className="pd-thead-row">
                  <th className="pd-th">Alimentos</th>
                  <th className="pd-th">Características</th>
                  <th className="pd-th">Cantidades</th>
                  <th className="pd-th" aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {GRUPOS_RP.map(grupo => {
                  const rows = tablaRP.filter(r => r.grupo === grupo.label)
                  const costoGrupo = rows.reduce(
                    (s, r) => s + calcCostoFila(r.alimento, r.cantidad, productos), 0,
                  )
                  return (
                    <Fragment key={grupo.id}>
                      <tr className="pd-group-hdr">
                        <td
                          colSpan={4}
                          className="pd-group-cell"
                          style={{ '--_g-color': grupo.color }}
                        >
                          <span className="pd-group-emoji" aria-hidden="true">{grupo.emoji}</span>
                          <span className="pd-group-label">{grupo.label}</span>
                          {costoGrupo > 0 && (
                            <span className="pd-group-costo" aria-label={`Subtotal ${grupo.label}`}>
                              ${costoGrupo.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                            </span>
                          )}
                          <button
                            className="pd-btn-add-row"
                            type="button"
                            onClick={() => handleAddRow(grupo.label)}
                            aria-label={`Agregar fila a ${grupo.label}`}
                          >
                            + Agregar fila
                          </button>
                        </td>
                      </tr>
                      {rows.map(row => (
                        <FilaRP
                          key={row.id}
                          row={row}
                          onUpdate={handleUpdateRow}
                          onRemove={handleRemoveRow}
                          productos={productos}
                        />
                      ))}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══ FOOTER ══════════════════════════════════════════════════════ */}
      <footer className="pd-footer">
        <button
          className="pd-btn-save"
          onClick={handleGuardarPlan}
          disabled={guardando}
          type="button"
          aria-label={`Guardar prescripción de ${nombreCompleto} del ${fechaHumana}`}
        >
          {guardando
            ? <><IcoSpinner /><span>Guardando…</span></>
            : <><IcoSave /><span>Guardar Prescripción</span></>
          }
        </button>

        {savedOk && (
          <span className="pd-saved-notice" role="status">
            <IcoCheck />
            Guardado · en cola de sync
          </span>
        )}
      </footer>

    </section>
  )
}
