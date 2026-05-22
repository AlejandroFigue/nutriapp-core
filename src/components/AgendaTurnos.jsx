/**
 * AgendaTurnos.jsx — Agenda de turnos ultra-premium para nutricionistas
 *
 * Arquitectura visual:
 *   · CalendarGrid  — CSS Grid 7 cols, sombras difuminadas en capas,
 *                     días seleccionados con gradiente luminoso + glow exterior
 *   · TurnoCard     — Tarjeta con barra de estado cromática lateral
 *   · WhatsApp btn  — Micro-interacción: scale(1.03) + destello de luz
 *                     interno (::after linear-gradient sweeping) + tono shift
 *                     Click → wa.me con mensaje personalizado, inmediato
 *
 * Persistencia: tablas `turnos` + `pacientes` (Dexie v3)
 * Semana ISO: Lunes = 0 … Domingo = 6
 */
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react'
import { liveQuery } from 'dexie'
import { db, genId, queueSyncTask } from '@/db/database'

// ═══════════════════════════════════════════════════════════════════════════
// ESTILOS — inyectados una sola vez; componente auto-contenido
// ═══════════════════════════════════════════════════════════════════════════

const COMPONENT_CSS = `

/* ── Raíz / layout ─────────────────────────────────────────────────────── */
.at {
  max-width: 940px;
  margin-inline: auto;
  padding: var(--space-4);
  padding-bottom: calc(var(--space-16) + var(--space-6));
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-5);
}
@media (min-width: 720px) {
  .at { grid-template-columns: minmax(320px, 400px) 1fr; align-items: start; }
}

/* ── PANEL: Calendario ─────────────────────────────────────────────────── */
.at-cal-panel {
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow:
    0 2px  4px  rgba(0,0,0,.04),
    0 8px  20px rgba(0,0,0,.07),
    0 24px 48px rgba(0,0,0,.06);
}
.dark .at-cal-panel {
  box-shadow:
    0 2px  4px  rgba(0,0,0,.25),
    0 8px  20px rgba(0,0,0,.30),
    0 24px 48px rgba(0,0,0,.35);
}

/* Header del mes */
.at-cal-hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-5) var(--space-5);
  background: linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 60%, var(--color-primary-light) 100%);
  position: relative;
  overflow: hidden;
}
/* Brillo decorativo fondo header */
.at-cal-hdr::before {
  content: '';
  position: absolute;
  top: -40%;
  right: -10%;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,255,255,.12) 0%, transparent 70%);
  pointer-events: none;
}

.at-cal-hdr__center { text-align: center; }
.at-cal-hdr__month {
  font-size: var(--text-xl);
  font-weight: 800;
  color: #fff;
  letter-spacing: -.025em;
  text-shadow: 0 1px 3px rgba(0,0,0,.25);
  display: block;
  line-height: 1.1;
}
.at-cal-hdr__year {
  font-size: var(--text-xs);
  color: rgba(255,255,255,.75);
  font-weight: 600;
  letter-spacing: .08em;
}
.at-cal-hdr__today-btn {
  display: inline-block;
  margin-top: 6px;
  padding: 2px 10px;
  border-radius: var(--radius-full);
  border: 1px solid rgba(255,255,255,.35);
  background: rgba(255,255,255,.14);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .06em;
  cursor: pointer;
  transition: background var(--transition-fast);
}
.at-cal-hdr__today-btn:hover { background: rgba(255,255,255,.25); }

/* Botones nav mes */
.at-nav-btn {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-full);
  border: 1.5px solid rgba(255,255,255,.30);
  background: rgba(255,255,255,.10);
  backdrop-filter: blur(4px);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background var(--transition-fast), transform 200ms cubic-bezier(.34,1.56,.64,1);
}
.at-nav-btn:hover  { background: rgba(255,255,255,.22); transform: scale(1.08); }
.at-nav-btn:active { transform: scale(.94); }

/* Cabecera días semana */
.at-dow {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  padding: var(--space-3) var(--space-3) var(--space-2);
  background: var(--color-primary-surface);
}
.at-dow__label {
  text-align: center;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .07em;
  text-transform: uppercase;
  color: var(--color-primary);
  padding: var(--space-1) 0;
}

/* Grid de días */
.at-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 5px;
  padding: var(--space-3);
}

/* Celda de día */
.at-day {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  cursor: pointer;
  position: relative;
  border: none;
  background: transparent;
  padding: 0;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  transition:
    transform   200ms cubic-bezier(.34,1.56,.64,1),
    background  180ms ease,
    box-shadow  180ms ease;
}
.at-day:not(.at-day--empty):not(.at-day--sel):hover {
  background: var(--color-primary-surface);
  transform: translateY(-2px) scale(1.06);
  box-shadow: 0 5px 14px rgba(46,125,50,.15);
}
.at-day--empty {
  pointer-events: none;
  opacity: 0;
}

/* Hoy (no seleccionado) */
.at-day--today:not(.at-day--sel) {
  outline: 2px solid var(--color-primary-light);
  outline-offset: -2px;
}
.at-day--today:not(.at-day--sel) .at-day__num {
  color: var(--color-primary);
  font-weight: 800;
}

/* Fin de semana */
.at-day--wknd:not(.at-day--sel):not(.at-day--today) .at-day__num {
  color: var(--color-text-mid);
}

/* SELECCIONADO — destello de degradado */
.at-day--sel {
  background: linear-gradient(
    148deg,
    var(--color-primary-dark)  0%,
    var(--color-primary)       45%,
    var(--color-primary-light) 100%
  );
  box-shadow:
    0  4px 12px rgba(46,125,50,.38),
    0  8px 24px rgba(46,125,50,.20),
    inset 0 1px 0 rgba(255,255,255,.22);
  transform: translateY(-2px) scale(1.09);
}
.at-day--sel .at-day__num {
  color: #fff;
  font-weight: 800;
  text-shadow: 0 1px 3px rgba(0,0,0,.22);
}
.at-day--sel:hover {
  transform: translateY(-3px) scale(1.12);
  box-shadow:
    0  6px 18px rgba(46,125,50,.48),
    0 12px 32px rgba(46,125,50,.25),
    inset 0 1px 0 rgba(255,255,255,.28);
}

.at-day__num {
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-text-high);
  line-height: 1;
  z-index: 1;
}

/* Puntos indicadores de turno */
.at-day__dots {
  position: absolute;
  bottom: 4px;
  display: flex;
  gap: 3px;
  align-items: center;
  z-index: 1;
}
.at-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  flex-shrink: 0;
}
.at-dot--pendiente  { background: var(--color-accent); }
.at-dot--confirmado { background: var(--color-primary-light); }
.at-dot--cancelado  { background: var(--color-error); }
.at-day--sel .at-dot { background: rgba(255,255,255,.80); }

/* ── PANEL: Turnos ─────────────────────────────────────────────────────── */
.at-turnos-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

/* Header fecha seleccionada */
.at-fecha-hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-5);
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  box-shadow:
    0 2px 4px  rgba(0,0,0,.04),
    0 6px 14px rgba(0,0,0,.06);
}
.at-fecha-hdr__info { display: flex; flex-direction: column; gap: 2px; }
.at-fecha-hdr__dow {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .09em;
  text-transform: uppercase;
  color: var(--color-primary);
}
.at-fecha-hdr__dia {
  font-size: var(--text-3xl);
  font-weight: 900;
  letter-spacing: -.04em;
  color: var(--color-text-high);
  line-height: 1;
}
.at-fecha-hdr__mes {
  font-size: var(--text-sm);
  color: var(--color-text-mid);
  font-weight: 500;
}

/* Botón nuevo turno */
.at-btn-new {
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-full);
  border: none;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%);
  color: #fff;
  font-size: var(--text-sm);
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 3px 10px rgba(46,125,50,.28);
  transition:
    transform   220ms cubic-bezier(.34,1.56,.64,1),
    box-shadow  220ms ease;
  white-space: nowrap;
}
.at-btn-new::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.14) 50%, rgba(255,255,255,0) 100%);
  opacity: 0;
  transition: opacity 200ms ease;
}
.at-btn-new:hover { transform: scale(1.05) translateY(-1px); box-shadow: 0 7px 20px rgba(46,125,50,.38); }
.at-btn-new:hover::after { opacity: 1; }
.at-btn-new:active { transform: scale(.97); }

/* Lista de turnos */
.at-list { display: flex; flex-direction: column; gap: var(--space-3); }

/* Estado vacío */
.at-empty {
  text-align: center;
  padding: var(--space-12) var(--space-6);
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
}
.at-empty__icon { font-size: 2.8rem; display: block; margin-bottom: var(--space-3); }
.at-empty__text { font-size: var(--text-sm); color: var(--color-text-low); font-weight: 500; }

/* Estado cargando */
.at-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-10);
  color: var(--color-text-low);
  font-size: var(--text-sm);
}

/* ── TurnoCard ─────────────────────────────────────────────────────────── */
.at-card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  overflow: hidden;
  display: grid;
  grid-template-columns: 4px 1fr;
  box-shadow:
    0 2px  4px rgba(0,0,0,.04),
    0 6px 16px rgba(0,0,0,.06);
  transition: box-shadow 200ms ease, transform 200ms ease;
}
.at-card:hover {
  box-shadow:
    0 4px  8px rgba(0,0,0,.06),
    0 14px 28px rgba(0,0,0,.09);
  transform: translateY(-2px);
}
.at-card__bar { width: 4px; flex-shrink: 0; }
.at-card__bar--pendiente  { background: var(--color-accent); }
.at-card__bar--confirmado { background: var(--color-primary-light); }
.at-card__bar--cancelado  { background: var(--color-error); }

.at-card__body {
  padding: var(--space-3) var(--space-4);
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

/* Avatar inicial */
.at-avatar {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-full);
  background: var(--color-primary-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-base);
  font-weight: 800;
  color: var(--color-primary);
  flex-shrink: 0;
  letter-spacing: -.01em;
}

/* Datos del turno */
.at-card__info { flex: 1; min-width: 0; }
.at-card__name {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--color-text-high);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 3px;
}
.at-card__meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.at-card__time {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-primary);
  display: flex;
  align-items: center;
  gap: 3px;
}
.at-badge {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: .07em;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: var(--radius-full);
  line-height: 1.4;
}
.at-badge--pendiente  { background: var(--color-accent-surface);  color: var(--color-accent); }
.at-badge--confirmado { background: var(--color-primary-surface); color: var(--color-primary); }
.at-badge--cancelado  { background: var(--color-error-surface);   color: var(--color-error); }

.at-card__notes {
  font-size: 11px;
  color: var(--color-text-low);
  margin-top: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Acciones */
.at-card__actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
}

/* ╔══════════════════════════════════════════╗
   ║  BOTÓN WHATSAPP — micro-interacción       ║
   ╚══════════════════════════════════════════╝ */
.at-btn-wa {
  position: relative;
  overflow: hidden;                        /* contiene el destello */
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 8px 13px;
  border-radius: var(--radius-full);
  border: none;
  background: linear-gradient(140deg, #25D366 0%, #128C7E 100%);
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .04em;
  white-space: nowrap;
  cursor: pointer;
  box-shadow: 0 3px 8px rgba(37,211,102,.28);
  -webkit-tap-highlight-color: transparent;
  /* Transición principal: scale + sombra + filtro */
  transition:
    transform   250ms cubic-bezier(.34,1.56,.64,1),
    box-shadow  250ms ease,
    background  250ms ease,
    filter      250ms ease;
}

/* Destello de luz interna reflectiva */
.at-btn-wa::after {
  content: '';
  position: absolute;
  top: 0;
  left: -90%;
  width: 55%;
  height: 100%;
  background: linear-gradient(
    to right,
    rgba(255,255,255,0)    0%,
    rgba(255,255,255,.32)  50%,
    rgba(255,255,255,0)    100%
  );
  transform: skewX(-18deg);
  pointer-events: none;
  /* Sweep animation on hover */
  transition: left 420ms cubic-bezier(.4,0,.2,1);
}

/* HOVER — expansión 3% + tono más vivo + sweep */
.at-btn-wa:hover {
  transform: scale(1.03) translateY(-1px);
  background: linear-gradient(140deg, #2EE372 0%, #18BF88 100%);
  box-shadow:
    0  6px 20px rgba(37,211,102,.42),
    0  2px  8px rgba(37,211,102,.22);
  filter: brightness(1.06);
}
.at-btn-wa:hover::after { left: 120%; }   /* sweep completo */

/* CLICK */
.at-btn-wa:active {
  transform: scale(.97);
  box-shadow: 0 2px 8px rgba(37,211,102,.20);
  filter: brightness(.98);
}

.at-btn-wa:disabled {
  opacity: .40;
  cursor: not-allowed;
  pointer-events: none;
}

/* Botón icono (editar / eliminar) */
.at-btn-icon {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-full);
  border: 1.5px solid var(--color-border);
  background: transparent;
  color: var(--color-text-mid);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition:
    background var(--transition-fast),
    color var(--transition-fast),
    border-color var(--transition-fast),
    transform 200ms cubic-bezier(.34,1.56,.64,1);
}
.at-btn-icon:hover { background: var(--color-surface-raised); color: var(--color-text-high); transform: scale(1.08); }
.at-btn-icon--del:hover { background: var(--color-error-surface); color: var(--color-error); border-color: var(--color-error); }

/* ── MODAL ─────────────────────────────────────────────────────────────── */
.at-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.46);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  z-index: var(--z-modal);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  animation: at-fade-in 180ms ease forwards;
}
@media (min-width: 580px) {
  .at-backdrop { align-items: center; padding: var(--space-4); }
}
@keyframes at-fade-in { from { opacity: 0; } to { opacity: 1; } }

.at-modal {
  background: var(--color-surface);
  width: 100%;
  max-width: 520px;
  max-height: 92vh;
  overflow-y: auto;
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  padding: var(--space-6);
  box-shadow:
    0 -4px 20px rgba(0,0,0,.08),
    0 -24px 60px rgba(0,0,0,.14);
  animation: at-slide-up 280ms cubic-bezier(.34,1.15,.64,1) forwards;
}
@media (min-width: 580px) {
  .at-modal {
    border-radius: var(--radius-xl);
    animation: at-scale-in 260ms cubic-bezier(.34,1.15,.64,1) forwards;
  }
}
@keyframes at-slide-up {
  from { opacity: 0; transform: translateY(48px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes at-scale-in {
  from { opacity: 0; transform: scale(.96) translateY(8px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

.at-modal__handle {
  width: 40px;
  height: 4px;
  background: var(--color-border);
  border-radius: var(--radius-full);
  margin: 0 auto var(--space-5);
}
@media (min-width: 580px) { .at-modal__handle { display: none; } }

.at-modal__title {
  font-size: var(--text-xl);
  font-weight: 900;
  letter-spacing: -.025em;
  color: var(--color-text-high);
  margin-bottom: var(--space-5);
}

/* Formulario */
.at-form  { display: flex; flex-direction: column; gap: var(--space-4); }
.at-field { display: flex; flex-direction: column; gap: var(--space-2); }
.at-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--color-primary);
}
.at-input, .at-select, .at-textarea {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  color: var(--color-text-high);
  font-size: var(--text-sm);
  font-family: var(--font-sans);
  outline: none;
  appearance: none;
  -webkit-appearance: none;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  box-sizing: border-box;
}
.at-input:focus, .at-select:focus, .at-textarea:focus {
  border-color: var(--color-primary-light);
  box-shadow: 0 0 0 3px rgba(76,175,80,.16);
}
.at-textarea { resize: vertical; min-height: 78px; }

.at-sel-wrap { position: relative; }
.at-sel-wrap::after {
  content: '';
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  width: 0; height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 5px solid var(--color-text-mid);
  pointer-events: none;
}

.at-form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.at-modal-actions {
  display: flex;
  gap: var(--space-3);
  margin-top: var(--space-2);
}
.at-btn-cancel {
  flex: 1;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  border: 1.5px solid var(--color-border);
  background: transparent;
  color: var(--color-text-mid);
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);
}
.at-btn-cancel:hover { background: var(--color-surface-raised); color: var(--color-text-high); }

.at-btn-save {
  flex: 2;
  position: relative;
  overflow: hidden;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  border: none;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%);
  color: #fff;
  font-size: var(--text-sm);
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 3px 10px rgba(46,125,50,.25);
  transition: transform 200ms cubic-bezier(.34,1.56,.64,1), box-shadow 200ms ease;
}
.at-btn-save:hover  { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(46,125,50,.35); }
.at-btn-save:active { transform: scale(.97); }
.at-btn-save:disabled { opacity: .5; cursor: not-allowed; pointer-events: none; }
`

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

const DIAS_CORTO  = ['L','M','X','J','V','S','D']
const DIAS_LARGO  = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']
const MESES       = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

// ═══════════════════════════════════════════════════════════════════════════
// HOOK: useLiveQuery
// ═══════════════════════════════════════════════════════════════════════════

function useLiveQuery(queryFn, deps) {
  const [result, setResult] = useState(undefined)
  const unmounted = useRef(false)

  useEffect(() => {
    unmounted.current = false
    let sub
    try {
      sub = liveQuery(queryFn).subscribe({
        next:  v => { if (!unmounted.current) setResult(v) },
        error: e => console.error('[AgendaTurnos liveQuery]', e),
      })
    } catch (e) {
      console.error('[AgendaTurnos liveQuery setup]', e)
    }
    return () => {
      unmounted.current = true
      sub?.unsubscribe()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return result
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILIDADES DE FECHA
// ═══════════════════════════════════════════════════════════════════════════

/** Date → 'YYYY-MM-DD' */
function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

/** 'YYYY-MM-DD' → Date local (sin timezone shift) */
function fromISO(s) {
  const [y,m,d] = s.split('-').map(Number)
  return new Date(y, m-1, d)
}

/**
 * Construye las celdas del mes de viewDate.
 * Semana comienza en Lunes (offset ISO).
 */
function buildCells(viewDate) {
  const y = viewDate.getFullYear()
  const m = viewDate.getMonth()
  const first  = new Date(y, m, 1)
  const last   = new Date(y, m+1, 0)
  const offset = (first.getDay() + 6) % 7          // lunes=0
  const total  = Math.ceil((offset + last.getDate()) / 7) * 7

  const cells = []
  for (let i = 0; i < total; i++) {
    const day = i - offset + 1
    if (day < 1 || day > last.getDate()) {
      cells.push({ empty: true, key: `e${i}` })
    } else {
      const date = new Date(y, m, day)
      cells.push({
        empty:   false,
        key:     toISO(date),
        iso:     toISO(date),
        day,
        weekend: date.getDay() === 0 || date.getDay() === 6,
      })
    }
  }
  return cells
}

/** Iniciales para el avatar */
function initials(nombre = '', apellido = '') {
  return ((nombre[0] ?? '') + (apellido[0] ?? '')).toUpperCase() || '?'
}

/** Construye la URL de WhatsApp con mensaje personalizado */
function buildWAUrl(telefono, nombreCompleto, fecha, hora) {
  const phone = telefono?.replace(/\D/g, '')
  if (!phone) return null
  const d    = fromISO(fecha)
  const dow  = DIAS_LARGO[(d.getDay() + 6) % 7]
  const mes  = MESES[d.getMonth()]
  const msg  =
    `Hola ${nombreCompleto}! 👋\n\n` +
    `Te recordamos tu *turno nutricional*:\n` +
    `📅 *${dow} ${d.getDate()} de ${mes}*\n` +
    `⏰ *${hora} hs*\n\n` +
    `Por favor confirmá tu asistencia. 🌿\n` +
    `_NutriApp Profesional_`
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
}

// ═══════════════════════════════════════════════════════════════════════════
// ÍCONOS SVG (inline, sin dependencias)
// ═══════════════════════════════════════════════════════════════════════════

const IcoLeft = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)
const IcoRight = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
)
const IcoPlus = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)
const IcoClock = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
)
const IcoWA = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
)
const IcoEdit = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)
const IcoTrash = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
)

// ═══════════════════════════════════════════════════════════════════════════
// TurnoCard
// ═══════════════════════════════════════════════════════════════════════════

function TurnoCard({ turno, paciente, onEdit, onDelete }) {
  const nombre   = paciente?.nombre   ?? 'Paciente'
  const apellido = paciente?.apellido ?? ''
  const telefono = paciente?.telefono ?? ''
  const nombreCompleto = `${nombre} ${apellido}`.trim()
  const waUrl = buildWAUrl(telefono, nombreCompleto, turno.fecha, turno.hora)

  /** Abre WhatsApp de forma inmediata al hacer clic */
  function handleWA() {
    if (waUrl) window.open(waUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <article className="at-card">
      <div className={`at-card__bar at-card__bar--${turno.estado}`} aria-hidden="true"/>
      <div className="at-card__body">
        <div className="at-avatar" aria-hidden="true">
          {initials(nombre, apellido)}
        </div>

        <div className="at-card__info">
          <div className="at-card__name">{nombreCompleto}</div>
          <div className="at-card__meta">
            <span className="at-card__time">
              <IcoClock/>{turno.hora} hs
            </span>
            <span className={`at-badge at-badge--${turno.estado}`}>
              {turno.estado}
            </span>
          </div>
          {turno.notas ? (
            <div className="at-card__notes">{turno.notas}</div>
          ) : null}
        </div>

        <div className="at-card__actions">
          <button
            className="at-btn-wa"
            onClick={handleWA}
            disabled={!waUrl}
            title={waUrl ? `Recordatorio WhatsApp a ${nombreCompleto}` : 'Sin número de teléfono registrado'}
            aria-label={`Enviar recordatorio por WhatsApp a ${nombreCompleto}`}
          >
            <IcoWA/>
            Recordar
          </button>

          <button
            className="at-btn-icon"
            onClick={() => onEdit(turno)}
            aria-label="Editar turno"
            title="Editar"
          >
            <IcoEdit/>
          </button>

          <button
            className="at-btn-icon at-btn-icon--del"
            onClick={() => onDelete(turno.id)}
            aria-label="Eliminar turno"
            title="Eliminar"
          >
            <IcoTrash/>
          </button>
        </div>
      </div>
    </article>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TurnoModal
// ═══════════════════════════════════════════════════════════════════════════

const FORM0 = { pacienteId: '', hora: '', estado: 'pendiente', notas: '' }

function TurnoModal({ open, fechaISO, editing, pacientes, onClose, onSave }) {
  const [form, setForm]         = useState(FORM0)
  const [saving, setSaving]     = useState(false)
  const firstRef                = useRef(null)

  useEffect(() => {
    if (!open) return
    setForm(editing
      ? { pacienteId: editing.pacienteId, hora: editing.hora, estado: editing.estado, notas: editing.notas ?? '' }
      : { ...FORM0 }
    )
    requestAnimationFrame(() => firstRef.current?.focus())
  }, [open, editing])

  function set(e) { setForm(f => ({ ...f, [e.target.name]: e.target.value })) }

  async function submit(e) {
    e.preventDefault()
    if (!form.pacienteId || !form.hora) return
    setSaving(true)
    try {
      await onSave({ ...(editing ?? {}), ...form, fecha: fechaISO })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="at-backdrop"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label={editing ? 'Editar turno' : 'Nuevo turno'}
    >
      <div className="at-modal">
        <div className="at-modal__handle" aria-hidden="true"/>
        <h2 className="at-modal__title">
          {editing ? '✏️ Editar turno' : '📅 Nuevo turno'}
        </h2>

        <form className="at-form" onSubmit={submit} noValidate>
          {/* Paciente */}
          <div className="at-field">
            <label className="at-label" htmlFor="at-pac">Paciente</label>
            <div className="at-sel-wrap">
              <select
                id="at-pac"
                name="pacienteId"
                className="at-select"
                value={form.pacienteId}
                onChange={set}
                required
                ref={firstRef}
              >
                <option value="">Seleccionar paciente…</option>
                {(pacientes ?? []).map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} {p.apellido ?? ''}
                    {p.telefono ? '' : ' (sin tel.)'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Hora + Estado en fila */}
          <div className="at-form-row">
            <div className="at-field">
              <label className="at-label" htmlFor="at-hora">Hora</label>
              <input
                id="at-hora"
                type="time"
                name="hora"
                className="at-input"
                value={form.hora}
                onChange={set}
                required
              />
            </div>
            <div className="at-field">
              <label className="at-label" htmlFor="at-est">Estado</label>
              <div className="at-sel-wrap">
                <select id="at-est" name="estado" className="at-select" value={form.estado} onChange={set}>
                  <option value="pendiente">Pendiente</option>
                  <option value="confirmado">Confirmado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notas */}
          <div className="at-field">
            <label className="at-label" htmlFor="at-notas">Notas (opcional)</label>
            <textarea
              id="at-notas"
              name="notas"
              className="at-textarea"
              value={form.notas}
              onChange={set}
              placeholder="Indicaciones, motivo de consulta…"
            />
          </div>

          <div className="at-modal-actions">
            <button type="button" className="at-btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className="at-btn-save"
              disabled={!form.pacienteId || !form.hora || saving}
            >
              {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear turno'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// AgendaTurnos — COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export default function AgendaTurnos() {

  // ── CSS (inyección única) ──────────────────────────────────────────────
  useEffect(() => {
    const ID = 'at-styles'
    if (document.getElementById(ID)) return
    const el = document.createElement('style')
    el.id = ID
    el.textContent = COMPONENT_CSS
    document.head.appendChild(el)
  }, [])

  // ── Estado de navegación ───────────────────────────────────────────────
  const todayISO   = useMemo(() => toISO(new Date()), [])
  const [viewDate, setViewDate] = useState(() => {
    const t = new Date()
    return new Date(t.getFullYear(), t.getMonth(), 1)
  })
  const [selISO, setSelISO]   = useState(todayISO)
  const [modalOpen, setModal] = useState(false)
  const [editing, setEditing] = useState(null)

  // ── Queries reactivas Dexie ───────────────────────────────────────────
  const mesInicio = toISO(viewDate)
  const mesFin    = toISO(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0))

  const turnos = useLiveQuery(
    () => db.turnos.where('fecha').between(mesInicio, mesFin, true, true).toArray(),
    [mesInicio, mesFin]
  )
  const pacientes = useLiveQuery(() => db.pacientes.toArray(), [])

  // ── Memos derivados ───────────────────────────────────────────────────

  /** fecha → turnos[] */
  const byFecha = useMemo(() => {
    const m = new Map()
    if (!turnos) return m
    for (const t of turnos) {
      const a = m.get(t.fecha) ?? []
      a.push(t)
      m.set(t.fecha, a)
    }
    return m
  }, [turnos])

  /** id → paciente */
  const pacMap = useMemo(() => {
    const m = new Map()
    ;(pacientes ?? []).forEach(p => m.set(p.id, p))
    return m
  }, [pacientes])

  /** Turnos del día seleccionado, por hora */
  const turnosDia = useMemo(() => {
    const lista = byFecha.get(selISO) ?? []
    return [...lista].sort((a, b) => a.hora.localeCompare(b.hora))
  }, [byFecha, selISO])

  /** Celdas del calendario */
  const cells = useMemo(() => buildCells(viewDate), [viewDate])

  // ── Navegación de mes ─────────────────────────────────────────────────
  const prevMonth = useCallback(() =>
    setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)), [])
  const nextMonth = useCallback(() =>
    setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)), [])
  const goToday   = useCallback(() => {
    const t = new Date()
    setViewDate(new Date(t.getFullYear(), t.getMonth(), 1))
    setSelISO(toISO(t))
  }, [])

  // ── Handlers CRUD ─────────────────────────────────────────────────────
  function openNew()    { setEditing(null); setModal(true) }
  function openEdit(t)  { setEditing(t);    setModal(true) }

  async function doDelete(id) {
    if (!window.confirm('¿Eliminar este turno?')) return
    await db.turnos.delete(id)
    await queueSyncTask('turnos', 'DELETE', { id })
  }

  async function doSave(data) {
    if (data.id) {
      const { id, ...cambios } = data
      await db.turnos.update(id, { ...cambios, sincronizado: 0 })
      await queueSyncTask('turnos', 'UPDATE', data)
    } else {
      const nuevo = { ...data, id: genId(), sincronizado: 0, creadoEn: new Date().toISOString() }
      await db.turnos.add(nuevo)
      await queueSyncTask('turnos', 'CREATE', nuevo)
    }
  }

  // ── Header del día seleccionado ───────────────────────────────────────
  const selDate = fromISO(selISO)
  const selDow  = DIAS_LARGO[(selDate.getDay() + 6) % 7]
  const selMes  = MESES[selDate.getMonth()]

  // ── Indicador de mes actual vs vista ─────────────────────────────────
  const showHoy = todayISO.slice(0, 7) !== selISO.slice(0, 7)
    || toISO(viewDate).slice(0, 7) !== todayISO.slice(0, 7)

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="at">

      {/* ══ PANEL IZQUIERDO: Calendario ══ */}
      <div className="at-cal-panel" role="region" aria-label="Calendario de turnos">

        {/* Header mes */}
        <div className="at-cal-hdr">
          <button className="at-nav-btn" onClick={prevMonth} aria-label="Mes anterior">
            <IcoLeft/>
          </button>

          <div className="at-cal-hdr__center">
            <span className="at-cal-hdr__month">{MESES[viewDate.getMonth()]}</span>
            <span className="at-cal-hdr__year">{viewDate.getFullYear()}</span>
            {showHoy && (
              <button className="at-cal-hdr__today-btn" onClick={goToday}>
                HOY
              </button>
            )}
          </div>

          <button className="at-nav-btn" onClick={nextMonth} aria-label="Mes siguiente">
            <IcoRight/>
          </button>
        </div>

        {/* Cabecera días de semana */}
        <div className="at-dow" aria-hidden="true">
          {DIAS_CORTO.map(d => (
            <div key={d} className="at-dow__label">{d}</div>
          ))}
        </div>

        {/* Grid de días */}
        <div className="at-days" role="grid" aria-label={`${MESES[viewDate.getMonth()]} ${viewDate.getFullYear()}`}>
          {cells.map(cell => {
            if (cell.empty) return <div key={cell.key} className="at-day at-day--empty" aria-hidden="true"/>

            const isSel    = cell.iso === selISO
            const isToday  = cell.iso === todayISO
            const dots     = (byFecha.get(cell.iso) ?? []).slice(0, 3)
            const cls      = ['at-day',
              isSel              && 'at-day--sel',
              isToday            && 'at-day--today',
              cell.weekend&&!isSel && 'at-day--wknd',
            ].filter(Boolean).join(' ')

            return (
              <button
                key={cell.iso}
                className={cls}
                onClick={() => setSelISO(cell.iso)}
                aria-label={`${cell.day} de ${MESES[viewDate.getMonth()]}${isToday ? ', hoy' : ''}${dots.length ? `, ${dots.length} turno${dots.length>1?'s':''}` : ''}`}
                aria-pressed={isSel}
                role="gridcell"
              >
                <span className="at-day__num">{cell.day}</span>
                {dots.length > 0 && (
                  <div className="at-day__dots" aria-hidden="true">
                    {dots.map((t, i) => (
                      <div key={i} className={`at-dot at-dot--${t.estado}`}/>
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ══ PANEL DERECHO: Turnos del día ══ */}
      <div className="at-turnos-panel" role="region" aria-label="Turnos del día seleccionado">

        {/* Header fecha */}
        <div className="at-fecha-hdr">
          <div className="at-fecha-hdr__info">
            <span className="at-fecha-hdr__dow">{selDow}</span>
            <span className="at-fecha-hdr__dia">{selDate.getDate()}</span>
            <span className="at-fecha-hdr__mes">{selMes} {selDate.getFullYear()}</span>
          </div>
          <button className="at-btn-new" onClick={openNew} aria-label="Agregar nuevo turno">
            <IcoPlus/>
            Nuevo turno
          </button>
        </div>

        {/* Lista */}
        <div className="at-list">
          {turnos === undefined ? (
            <div className="at-loading" role="status" aria-live="polite">
              Cargando turnos…
            </div>
          ) : turnosDia.length === 0 ? (
            <div className="at-empty">
              <span className="at-empty__icon">🗓️</span>
              <p className="at-empty__text">Sin turnos para este día.<br/>Tocá <strong>Nuevo turno</strong> para agendar.</p>
            </div>
          ) : (
            turnosDia.map(t => (
              <TurnoCard
                key={t.id}
                turno={t}
                paciente={pacMap.get(t.pacienteId)}
                onEdit={openEdit}
                onDelete={doDelete}
              />
            ))
          )}
        </div>
      </div>

      {/* ══ MODAL ══ */}
      <TurnoModal
        open={modalOpen}
        fechaISO={selISO}
        editing={editing}
        pacientes={pacientes}
        onClose={() => setModal(false)}
        onSave={doSave}
      />
    </div>
  )
}
