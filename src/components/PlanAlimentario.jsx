/**
 * PlanAlimentario.jsx — Plan nutricional diario por paciente
 *
 * Arquitectura visual:
 *   · TabBar     — barra de pestañas 3D con pill indicador deslizante
 *                  El pill se mueve con transform: translateX(${i * 100}%)
 *                  para mantener aceleración hardware en la misma capa GPU
 *   · SlideTrack — contenedor flex de slides; translate3d actualiza en cada cambio de tab
 *                  will-change: transform garantiza rasterización en capa propia
 *   · Cada slide — panel de comida (items + botón agregar)
 *   · AddSheet   — bottom sheet modal con BuscadorProductos flotante blur
 *   · DateNav    — navegador de fecha (día anterior / siguiente)
 *   · MacroBar   — barra resumen de macros del día activo
 *
 * Persistencia: tabla `planes` (Dexie v3)
 *   PK: UUID (genId)  |  Índice: [pacienteId+fecha]
 *   Estructura comidas: { desayuno: [...], almuerzo: [...], merienda: [...], cena: [...], snack: [...] }
 *   Cada item: { id, productoId, nombre, cantidad, unidad, calorias, proteinas, carbohidratos, grasas }
 *
 * Touch/swipe: detecta deslizamiento horizontal > 50 px para cambiar de tab
 *
 * Props:
 *   pacienteId   {string}  UUID del paciente (requerido)
 *   fechaInicial {string}  'YYYY-MM-DD' — opcional, default: hoy
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { liveQuery } from 'dexie'
import { db, genId, queueSyncTask } from '@/db/database'
import BuscadorProductos from './BuscadorProductos'

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

const TABS = [
  { id: 'desayuno', label: 'Desayuno', emoji: '☀️',  color: '#FF8F00' },
  { id: 'almuerzo', label: 'Almuerzo', emoji: '🍽️',  color: '#2E7D32' },
  { id: 'merienda', label: 'Merienda', emoji: '☕',   color: '#7B1FA2' },
  { id: 'cena',     label: 'Cena',     emoji: '🌙',   color: '#1565C0' },
  { id: 'snack',    label: 'Snack',    emoji: '🍎',   color: '#C62828' },
]
const N = TABS.length

const EMPTY_COMIDAS = () => Object.fromEntries(TABS.map(t => [t.id, []]))

const hoy = () => new Date().toISOString().slice(0, 10)

function isoToHuman(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function shiftDay(iso, delta) {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + delta)
  return d.toISOString().slice(0, 10)
}

function fmtMacro(v) { return Math.round(v * 10) / 10 }

// ═══════════════════════════════════════════════════════════════════════════
// CSS — inyectado una sola vez
// ═══════════════════════════════════════════════════════════════════════════

const PA_CSS = `

/* ══ Raíz ═════════════════════════════════════════════════════════════════ */
.pa {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding-bottom: var(--space-6);
  animation: fade-in var(--transition-normal) both;
}

/* ══ Header con info del paciente + fecha ════════════════════════════════ */
.pa-hdr {
  padding: var(--space-4) var(--space-4) 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.pa-patient-bar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.pa-patient-avatar {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, var(--color-primary-dark), var(--color-primary-light));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  font-weight: 800;
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 3px 10px rgba(46,125,50,.28);
  letter-spacing: -.01em;
}
.pa-patient-info { flex: 1; min-width: 0; }
.pa-patient-name {
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--color-text-high);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pa-patient-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: .07em;
  text-transform: uppercase;
  color: var(--color-primary);
}

/* ── Navegador de fecha ─────────────────────────────────────────────────── */
.pa-date-nav {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  padding: var(--space-3) var(--space-4);
  box-shadow:
    0 2px 4px  rgba(0,0,0,.04),
    0 6px 14px rgba(0,0,0,.06);
}
.pa-date-btn {
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
    background  var(--transition-fast),
    color       var(--transition-fast),
    transform   200ms cubic-bezier(.34,1.56,.64,1);
}
.pa-date-btn:hover  { background: var(--color-primary-surface); color: var(--color-primary); transform: scale(1.08); }
.pa-date-btn:active { transform: scale(.92); }
.pa-date-info { flex: 1; text-align: center; }
.pa-date-dow {
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .09em;
  color: var(--color-primary);
  text-transform: capitalize;
}
.pa-date-full {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-high);
  text-transform: capitalize;
}
.pa-date-today {
  display: inline-block;
  margin-top: 2px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: var(--color-primary-on);
  background: var(--color-primary);
  padding: 1px 8px;
  border-radius: var(--radius-full);
}

/* ══ Resumen de macros del día ═══════════════════════════════════════════ */
.pa-macro-bar {
  margin: var(--space-3) var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow:
    0 2px  4px rgba(0,0,0,.04),
    0 8px 20px rgba(0,0,0,.06);
}
.pa-macro-bar__hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  background: linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 60%, var(--color-primary-light) 100%);
  position: relative;
  overflow: hidden;
}
.pa-macro-bar__hdr::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -5%;
  width: 130px;
  height: 130px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,255,255,.12) 0%, transparent 70%);
  pointer-events: none;
}
.pa-macro-bar__title {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .09em;
  text-transform: uppercase;
  color: rgba(255,255,255,.85);
}
.pa-macro-bar__kcal {
  font-size: var(--text-xl);
  font-weight: 900;
  color: #fff;
  letter-spacing: -.025em;
  text-shadow: 0 1px 4px rgba(0,0,0,.20);
}
.pa-macro-bar__kcal-unit {
  font-size: var(--text-sm);
  font-weight: 500;
  opacity: .80;
  margin-left: 2px;
}
.pa-macro-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  padding: var(--space-3) var(--space-2);
  gap: 2px;
}
.pa-macro-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-2) var(--space-1);
}
.pa-macro-cell__val {
  font-size: var(--text-base);
  font-weight: 800;
  color: var(--color-text-high);
  letter-spacing: -.02em;
}
.pa-macro-cell__label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .07em;
  text-transform: uppercase;
  color: var(--color-text-low);
  margin-top: 1px;
}

/* ══ Barra de tabs 3D ════════════════════════════════════════════════════ */

.pa-tabs-wrap {
  padding: 0 var(--space-4);
  margin-bottom: var(--space-1);
}

/*
 * El contenedor de tabs tiene fondo "hundido" para dar profundidad 3D.
 * La pista de indicador flota encima con sombra propia.
 */
.pa-tabs {
  position: relative;
  display: flex;
  background: var(--color-surface-raised);
  border-radius: var(--radius-xl);
  padding: 3px;
  overflow: hidden;
  box-shadow:
    inset 0 2px 5px rgba(0,0,0,.08),
    inset 0 1px 2px rgba(0,0,0,.05);
  /* scroll horizontal en pantallas muy angostas */
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}
.pa-tabs::-webkit-scrollbar { display: none; }

/*
 * INDICADOR DESLIZANTE — pill que se mueve con translate3d.
 * width: 20% porque tenemos 5 tabs iguales.
 * Usa translate3d para activar la misma capa GPU que el track de slides.
 */
.pa-tab-pill {
  position: absolute;
  top: 3px;
  bottom: 3px;
  left: 3px;
  width: calc((100% - 6px) / ${N});
  border-radius: calc(var(--radius-xl) - 3px);
  background: var(--color-surface);
  box-shadow:
    0 3px  8px rgba(0,0,0,.12),
    0 1px  3px rgba(0,0,0,.08),
    inset 0 1px 0 rgba(255,255,255,.80);
  transition: transform 380ms cubic-bezier(.4, 0, .2, 1);
  will-change: transform;
  pointer-events: none;
  z-index: 0;
}
.dark .pa-tab-pill {
  background: var(--color-surface-raised);
  box-shadow:
    0 3px  8px rgba(0,0,0,.35),
    0 1px  3px rgba(0,0,0,.25),
    inset 0 1px 0 rgba(255,255,255,.08);
}

/* Cada botón de tab */
.pa-tab {
  position: relative;
  z-index: 1;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: var(--space-2) var(--space-1);
  border-radius: calc(var(--radius-xl) - 3px);
  border: none;
  background: transparent;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: opacity var(--transition-fast);
  white-space: nowrap;
}
.pa-tab:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: -2px;
}

.pa-tab__emoji {
  font-size: .95rem;
  line-height: 1;
  display: block;
  transition: transform 250ms cubic-bezier(.34,1.56,.64,1);
}
.pa-tab--active .pa-tab__emoji { transform: scale(1.14); }

.pa-tab__label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: .01em;
  color: var(--color-text-low);
  transition: color var(--transition-fast), font-weight var(--transition-fast);
  line-height: 1;
}
.pa-tab--active .pa-tab__label {
  font-weight: 800;
  color: var(--color-text-high);
}

.pa-tab__badge {
  font-size: 9px;
  font-weight: 700;
  color: var(--color-text-disabled);
  line-height: 1;
  letter-spacing: .01em;
  transition: color var(--transition-fast);
}
.pa-tab--active .pa-tab__badge {
  color: var(--color-primary);
}

/* ══ Viewport + Track de slides ══════════════════════════════════════════ */

/*
 * El viewport recorta el track.
 * overflow: hidden impide ver las slides adyacentes.
 */
.pa-viewport {
  overflow: hidden;
  width: 100%;
  /* perspective da sutileza de profundidad durante el slide */
  perspective: 1400px;
}

/*
 * El track contiene las N slides en fila.
 * La traducción horizontal cambia con JS vía style inline.
 *
 * Claves de performance GPU:
 *   will-change: transform  → el browser crea una capa de composición propia
 *   translate3d(x,0,0)      → fuerza hardware acceleration
 *   backface-visibility: hidden → evita flickering en Safari/iOS
 */
.pa-track {
  display: flex;
  width: 100%;
  will-change: transform;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  transition: transform 380ms cubic-bezier(.4, 0, .2, 1);
}

/* Cada slide ocupa exactamente el 100% del viewport */
.pa-slide {
  width: 100%;
  flex-shrink: 0;
  padding: var(--space-3) var(--space-4) var(--space-6);
  min-height: 260px;
}

/* ══ Cabecera de cada slide ══════════════════════════════════════════════ */
.pa-slide-hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}
.pa-slide-title-wrap { display: flex; align-items: center; gap: var(--space-2); }
.pa-slide-emoji { font-size: 1.4rem; }
.pa-slide-title {
  font-size: var(--text-lg);
  font-weight: 800;
  color: var(--color-text-high);
  letter-spacing: -.02em;
}
.pa-slide-kcal {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-mid);
}

/* ══ Botón "Agregar alimento" ════════════════════════════════════════════ */
.pa-btn-add {
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: var(--radius-full);
  border: none;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%);
  color: #fff;
  font-size: var(--text-sm);
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 3px 10px rgba(46,125,50,.28);
  transition:
    transform   230ms cubic-bezier(.34,1.56,.64,1),
    box-shadow  230ms ease;
  white-space: nowrap;
}
.pa-btn-add::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg,rgba(255,255,255,0) 0%,rgba(255,255,255,.16) 50%,rgba(255,255,255,0) 100%);
  opacity: 0;
  transition: opacity 200ms;
}
.pa-btn-add:hover { transform: scale(1.04) translateY(-1px); box-shadow: 0 7px 18px rgba(46,125,50,.36); }
.pa-btn-add:hover::after { opacity: 1; }
.pa-btn-add:active { transform: scale(.97); }

/* ══ Lista de alimentos en cada slide ════════════════════════════════════ */
.pa-items { display: flex; flex-direction: column; gap: var(--space-2); margin-bottom: var(--space-3); }

.pa-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-3);
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow:
    0 1px 3px rgba(0,0,0,.04),
    0 4px 10px rgba(0,0,0,.05);
  transition: box-shadow 200ms ease, transform 200ms ease;
  animation: fade-in 200ms both;
}
.pa-item:hover {
  box-shadow:
    0 2px 6px rgba(0,0,0,.06),
    0 8px 18px rgba(0,0,0,.08);
  transform: translateY(-1px);
}

.pa-item__ico {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-md);
  background: var(--color-primary-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15rem;
  flex-shrink: 0;
}

.pa-item__info { flex: 1; min-width: 0; }
.pa-item__name {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-high);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
}
.pa-item__qty {
  font-size: 11px;
  color: var(--color-text-low);
  font-weight: 500;
}

.pa-item__macros {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  flex-shrink: 0;
}
.pa-item__kcal {
  font-size: var(--text-sm);
  font-weight: 800;
  color: var(--color-primary);
  letter-spacing: -.01em;
}
.pa-item__macro-row {
  display: flex;
  gap: 3px;
}
.pa-mpill {
  font-size: 9px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: var(--radius-full);
  background: var(--color-surface-raised);
  color: var(--color-text-mid);
}

.pa-item__del {
  width: 30px;
  height: 30px;
  border-radius: var(--radius-full);
  border: 1.5px solid var(--color-border);
  background: transparent;
  color: var(--color-text-low);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition:
    background var(--transition-fast),
    color      var(--transition-fast),
    border-color var(--transition-fast),
    transform 200ms cubic-bezier(.34,1.56,.64,1);
}
.pa-item__del:hover {
  background: var(--color-error-surface);
  color: var(--color-error);
  border-color: var(--color-error);
  transform: scale(1.08);
}

/* Estado vacío del slide */
.pa-slide-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-8) var(--space-4);
  text-align: center;
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  border: 2px dashed var(--color-border);
  margin-bottom: var(--space-3);
  transition: border-color var(--transition-fast), background var(--transition-fast);
}
.pa-slide-empty__ico { font-size: 2rem; display: block; margin-bottom: var(--space-2); }
.pa-slide-empty__text {
  font-size: var(--text-sm);
  color: var(--color-text-low);
  font-weight: 500;
  line-height: 1.4;
}

/* ══ Bottom Sheet — buscador de alimentos ════════════════════════════════ */
.pa-sheet-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.48);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  z-index: var(--z-modal);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  animation: pa-fade 200ms ease both;
}
@media (min-width: 600px) {
  .pa-sheet-backdrop {
    align-items: center;
    padding: var(--space-4);
  }
}
@keyframes pa-fade { from { opacity: 0; } to { opacity: 1; } }

.pa-sheet {
  background: var(--color-surface);
  width: 100%;
  max-width: 540px;
  max-height: 85vh;
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  padding: var(--space-4) var(--space-4) var(--space-6);
  box-shadow:
    0 -4px 20px rgba(0,0,0,.08),
    0 -24px 60px rgba(0,0,0,.14);
  animation: pa-sheet-up 300ms cubic-bezier(.34,1.15,.64,1) both;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  overflow-y: auto;
}
@media (min-width: 600px) {
  .pa-sheet {
    border-radius: var(--radius-xl);
    animation: pa-scale-in 280ms cubic-bezier(.34,1.15,.64,1) both;
  }
}
@keyframes pa-sheet-up {
  from { opacity: 0; transform: translateY(52px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes pa-scale-in {
  from { opacity: 0; transform: scale(.96) translateY(10px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

.pa-sheet__handle {
  width: 40px;
  height: 4px;
  background: var(--color-border);
  border-radius: var(--radius-full);
  margin: 0 auto;
  flex-shrink: 0;
}
@media (min-width: 600px) { .pa-sheet__handle { display: none; } }

.pa-sheet__title {
  font-size: var(--text-xl);
  font-weight: 900;
  letter-spacing: -.025em;
  color: var(--color-text-high);
  flex-shrink: 0;
}
.pa-sheet__subtitle {
  font-size: var(--text-sm);
  color: var(--color-text-mid);
  font-weight: 500;
  margin-top: 2px;
}

.pa-sheet__close {
  position: absolute;
  top: var(--space-4);
  right: var(--space-4);
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
  transition: background var(--transition-fast), color var(--transition-fast);
}
.pa-sheet__close:hover { background: var(--color-surface-raised); color: var(--color-text-high); }

/* ══ Loading overlay ═════════════════════════════════════════════════════ */
.pa-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-10);
  color: var(--color-text-low);
  font-size: var(--text-sm);
  gap: var(--space-3);
}
.pa-loading-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary-light);
  animation: pa-pulse 1.2s ease-in-out infinite;
}
.pa-loading-dot:nth-child(2) { animation-delay: .2s; }
.pa-loading-dot:nth-child(3) { animation-delay: .4s; }
@keyframes pa-pulse {
  0%, 80%, 100% { transform: scale(.75); opacity: .4; }
  40%           { transform: scale(1);   opacity: 1; }
}

/* ══ Sin paciente ════════════════════════════════════════════════════════ */
.pa-no-patient {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-12) var(--space-6);
  text-align: center;
  gap: var(--space-3);
  color: var(--color-text-low);
}
.pa-no-patient__ico { font-size: 3rem; }
.pa-no-patient__text { font-size: var(--text-sm); font-weight: 500; }
`

// ═══════════════════════════════════════════════════════════════════════════
// HOOK: useLiveQuery (patrón Dexie — idéntico al de AgendaTurnos)
// ═══════════════════════════════════════════════════════════════════════════

function useLiveQuery(queryFn, deps) {
  const [result,  setResult]  = useState(undefined)
  const [loading, setLoading] = useState(true)
  const unmounted = useRef(false)

  useEffect(() => {
    unmounted.current = false
    setLoading(true)
    let sub
    try {
      sub = liveQuery(queryFn).subscribe({
        next:  v => {
          if (!unmounted.current) {
            setResult(v ?? null)   // normaliza undefined → null
            setLoading(false)
          }
        },
        error: e => {
          console.error('[PlanAlimentario liveQuery]', e)
          if (!unmounted.current) setLoading(false)
        },
      })
    } catch (e) {
      console.error('[PlanAlimentario liveQuery setup]', e)
      if (!unmounted.current) setLoading(false)
    }
    return () => {
      unmounted.current = true
      sub?.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return [result, loading]
}

// ═══════════════════════════════════════════════════════════════════════════
// ÍCONOS SVG
// ═══════════════════════════════════════════════════════════════════════════

const IcoLeft = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)
const IcoRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
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
const IcoTrash = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
)
const IcoX = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6"  x2="6" y2="18"/>
    <line x1="6"  y1="6" x2="18" y2="18"/>
  </svg>
)

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/** Iniciales para el avatar del paciente */
function iniciales(nombre = '', apellido = '') {
  return ((nombre[0] ?? '') + (apellido[0] ?? '')).toUpperCase() || '🥗'
}

/** Emoji representativo del tipo de alimento */
function emojiAlimento(nombre = '') {
  const n = nombre.toLowerCase()
  if (n.includes('pollo') || n.includes('pechuga'))   return '🍗'
  if (n.includes('carne') || n.includes('bife'))       return '🥩'
  if (n.includes('pescado') || n.includes('atún'))     return '🐟'
  if (n.includes('huevo'))                             return '🥚'
  if (n.includes('arroz') || n.includes('pasta'))      return '🍚'
  if (n.includes('pan') || n.includes('tostada'))      return '🍞'
  if (n.includes('leche') || n.includes('yogur'))      return '🥛'
  if (n.includes('queso'))                             return '🧀'
  if (n.includes('manzana') || n.includes('naranja'))  return '🍎'
  if (n.includes('banana') || n.includes('plátano'))   return '🍌'
  if (n.includes('ensalada') || n.includes('lechuga')) return '🥗'
  if (n.includes('aceite') || n.includes('manteca'))   return '🫒'
  if (n.includes('café') || n.includes('té'))          return '☕'
  if (n.includes('agua') || n.includes('jugo'))        return '🥤'
  return '🥗'
}

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTE: AlimentoItem
// ═══════════════════════════════════════════════════════════════════════════

function AlimentoItem({ item, onEliminar }) {
  return (
    <div className="pa-item">
      {/* Ícono */}
      <div className="pa-item__ico" aria-hidden="true">
        {emojiAlimento(item.nombre)}
      </div>

      {/* Info */}
      <div className="pa-item__info">
        <div className="pa-item__name">{item.nombre}</div>
        <div className="pa-item__qty">
          {item.cantidad} {item.unidad ?? 'g'}
        </div>
      </div>

      {/* Macros */}
      <div className="pa-item__macros">
        {item.calorias != null && (
          <span className="pa-item__kcal">{fmtMacro(item.calorias)} kcal</span>
        )}
        <div className="pa-item__macro-row">
          {item.proteinas     != null && <span className="pa-mpill">P {fmtMacro(item.proteinas)}g</span>}
          {item.carbohidratos != null && <span className="pa-mpill">C {fmtMacro(item.carbohidratos)}g</span>}
          {item.grasas        != null && <span className="pa-mpill">G {fmtMacro(item.grasas)}g</span>}
        </div>
      </div>

      {/* Eliminar */}
      <button
        className="pa-item__del"
        onClick={() => onEliminar(item.id)}
        aria-label={`Eliminar ${item.nombre}`}
        type="button"
      >
        <IcoTrash />
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export default function PlanAlimentario({ pacienteId, fechaInicial }) {
  const [fecha,        setFecha]        = useState(fechaInicial ?? hoy())
  const [activeTab,    setActiveTab]    = useState(0)
  const [sheetOpen,    setSheetOpen]    = useState(false)
  const [saving,       setSaving]       = useState(false)

  // Touch swipe
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)

  // ── Inyección de CSS ────────────────────────────────────────────────────
  useEffect(() => {
    const ID = 'pa-styles'
    if (document.getElementById(ID)) return
    const el = document.createElement('style')
    el.id   = ID
    el.textContent = PA_CSS
    document.head.appendChild(el)
  }, [])

  // ── Queries reactivas Dexie ────────────────────────────────────────────
  const [plan, planLoading] = useLiveQuery(
    () => db.planes
      .where('[pacienteId+fecha]')
      .equals([pacienteId, fecha])
      .first(),
    [pacienteId, fecha]
  )

  const [paciente] = useLiveQuery(
    () => pacienteId ? db.pacientes.get(pacienteId) : Promise.resolve(null),
    [pacienteId]
  )

  // ── Datos derivados ─────────────────────────────────────────────────────
  const comidas = useMemo(() => ({
    ...EMPTY_COMIDAS(),
    ...(plan?.comidas ?? {}),
  }), [plan])

  // Totales por comida
  const totalesPorTab = useMemo(() =>
    TABS.map(t => {
      const items = comidas[t.id] ?? []
      return items.reduce((acc, item) => ({
        calorias:      acc.calorias      + (item.calorias      ?? 0),
        proteinas:     acc.proteinas     + (item.proteinas     ?? 0),
        carbohidratos: acc.carbohidratos + (item.carbohidratos ?? 0),
        grasas:        acc.grasas        + (item.grasas        ?? 0),
      }), { calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0 })
    }),
  [comidas])

  // Totales del día
  const totalesDay = useMemo(() =>
    totalesPorTab.reduce((acc, t) => ({
      calorias:      acc.calorias      + t.calorias,
      proteinas:     acc.proteinas     + t.proteinas,
      carbohidratos: acc.carbohidratos + t.carbohidratos,
      grasas:        acc.grasas        + t.grasas,
    }), { calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0 }),
  [totalesPorTab])

  // ── Helpers de persistencia ────────────────────────────────────────────

  /** Obtiene el plan existente o crea uno nuevo */
  async function obtenerOCrearPlan() {
    // Leemos directamente de Dexie para evitar race condition con el state
    const existing = await db.planes
      .where('[pacienteId+fecha]')
      .equals([pacienteId, fecha])
      .first()
    if (existing) return existing

    const nuevo = {
      id:           genId(),
      pacienteId,
      fecha,
      comidas:      EMPTY_COMIDAS(),
      sincronizado: 0,
      creadoEn:     new Date().toISOString(),
    }
    await db.planes.add(nuevo)
    await queueSyncTask('planes', 'CREATE', nuevo)
    return nuevo
  }

  /** Agrega un alimento a la comida activa */
  async function handleAgregar(item) {
    if (!pacienteId) return
    setSaving(true)
    try {
      const planDoc = await obtenerOCrearPlan()
      const nuevasComidas = {
        ...EMPTY_COMIDAS(),
        ...(planDoc.comidas ?? {}),
      }
      const comidaId = TABS[activeTab].id
      nuevasComidas[comidaId] = [
        ...(nuevasComidas[comidaId] ?? []),
        { ...item, id: genId(), agregadoEn: new Date().toISOString() },
      ]
      await db.planes.update(planDoc.id, {
        comidas:      nuevasComidas,
        sincronizado: 0,
        actualizadoEn: new Date().toISOString(),
      })
      await queueSyncTask('planes', 'UPDATE', { id: planDoc.id, comidas: nuevasComidas })
      setSheetOpen(false)
    } catch (err) {
      console.error('[PlanAlimentario] Error al agregar alimento:', err)
    } finally {
      setSaving(false)
    }
  }

  /** Elimina un alimento de una comida */
  async function handleEliminar(comidaId, itemId) {
    if (!plan) return
    const nuevasComidas = {
      ...EMPTY_COMIDAS(),
      ...(plan.comidas ?? {}),
    }
    nuevasComidas[comidaId] = (nuevasComidas[comidaId] ?? []).filter(i => i.id !== itemId)
    await db.planes.update(plan.id, {
      comidas:      nuevasComidas,
      sincronizado: 0,
      actualizadoEn: new Date().toISOString(),
    })
    await queueSyncTask('planes', 'UPDATE', { id: plan.id, comidas: nuevasComidas })
  }

  // ── Navegación de fecha ─────────────────────────────────────────────────
  const goPrev = useCallback(() => setFecha(f => shiftDay(f, -1)), [])
  const goNext = useCallback(() => setFecha(f => shiftDay(f, +1)), [])
  const goHoy  = useCallback(() => setFecha(hoy()), [])

  // ── Cambio de tab ────────────────────────────────────────────────────────
  const goTab = useCallback((idx) => {
    setActiveTab(idx)
  }, [])

  // ── Touch / swipe horizontal ─────────────────────────────────────────────
  function onTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  function onTouchEnd(e) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current)
    // Solo swipe si el movimiento horizontal supera el vertical y los 50 px
    if (Math.abs(dx) > dy && Math.abs(dx) > 50) {
      if (dx < 0 && activeTab < N - 1) setActiveTab(t => t + 1)
      if (dx > 0 && activeTab > 0)     setActiveTab(t => t - 1)
    }
    touchStartX.current = null
    touchStartY.current = null
  }

  // ── Guardias ─────────────────────────────────────────────────────────────
  if (!pacienteId) {
    return (
      <section className="pa">
        <div className="pa-no-patient">
          <span className="pa-no-patient__ico" aria-hidden="true">🥗</span>
          <p className="pa-no-patient__text">Seleccioná un paciente para ver su plan alimentario</p>
        </div>
      </section>
    )
  }

  // ── Datos de UI ───────────────────────────────────────────────────────────
  const nombreCompleto = [paciente?.nombre, paciente?.apellido].filter(Boolean).join(' ') || 'Paciente'
  const [diaNombre, ...restoFecha] = isoToHuman(fecha).split(' ')
  const esHoy = fecha === hoy()

  const tab = TABS[activeTab]

  return (
    <section className="pa" aria-label={`Plan alimentario — ${nombreCompleto}`}>

      {/* ══ Header ══════════════════════════════════════════════════════ */}
      <div className="pa-hdr">

        {/* Paciente */}
        <div className="pa-patient-bar">
          <div className="pa-patient-avatar" aria-hidden="true">
            {iniciales(paciente?.nombre, paciente?.apellido)}
          </div>
          <div className="pa-patient-info">
            <div className="pa-patient-label">Plan Alimentario</div>
            <div className="pa-patient-name">{nombreCompleto}</div>
          </div>
        </div>

        {/* Navegador de fecha */}
        <div className="pa-date-nav">
          <button
            className="pa-date-btn"
            onClick={goPrev}
            aria-label="Día anterior"
            type="button"
          >
            <IcoLeft />
          </button>

          <div className="pa-date-info">
            <div className="pa-date-dow">{diaNombre}</div>
            <div className="pa-date-full">{restoFecha.join(' ')}</div>
            {esHoy && (
              <span className="pa-date-today" role="status">Hoy</span>
            )}
          </div>

          <button
            className="pa-date-btn"
            onClick={goNext}
            aria-label="Día siguiente"
            type="button"
          >
            <IcoRight />
          </button>
        </div>
      </div>

      {/* ══ Resumen de macros ════════════════════════════════════════════ */}
      <div className="pa-macro-bar" role="region" aria-label="Resumen nutricional del día">
        <div className="pa-macro-bar__hdr">
          <span className="pa-macro-bar__title">Total del día</span>
          <span className="pa-macro-bar__kcal" aria-label={`${Math.round(totalesDay.calorias)} kilocalorías`}>
            {Math.round(totalesDay.calorias)}
            <span className="pa-macro-bar__kcal-unit">kcal</span>
          </span>
        </div>
        <div className="pa-macro-grid">
          {[
            { label: 'Proteínas',   value: totalesDay.proteinas,     unit: 'g' },
            { label: 'Carbos',      value: totalesDay.carbohidratos, unit: 'g' },
            { label: 'Grasas',      value: totalesDay.grasas,        unit: 'g' },
          ].map(({ label, value, unit }) => (
            <div key={label} className="pa-macro-cell">
              <span className="pa-macro-cell__val">{fmtMacro(value)}{unit}</span>
              <span className="pa-macro-cell__label">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ══ TAB BAR 3D ══════════════════════════════════════════════════ */}
      <div className="pa-tabs-wrap">
        <div
          className="pa-tabs"
          role="tablist"
          aria-label="Comidas del día"
        >
          {/* Pill indicador deslizante — accelerado hardware con translate3d */}
          <div
            className="pa-tab-pill"
            aria-hidden="true"
            style={{
              transform: `translate3d(calc(${activeTab * 100}%), 0, 0)`,
            }}
          />

          {TABS.map((t, i) => {
            const isActive = i === activeTab
            const kcal     = totalesPorTab[i].calorias
            return (
              <button
                key={t.id}
                className={`pa-tab${isActive ? ' pa-tab--active' : ''}`}
                role="tab"
                aria-selected={isActive}
                aria-controls={`pa-slide-${t.id}`}
                id={`pa-tab-${t.id}`}
                onClick={() => goTab(i)}
                type="button"
              >
                <span className="pa-tab__emoji" aria-hidden="true">{t.emoji}</span>
                <span className="pa-tab__label">{t.label}</span>
                {kcal > 0 && (
                  <span className="pa-tab__badge" aria-label={`${Math.round(kcal)} kcal`}>
                    {Math.round(kcal)}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ══ VIEWPORT + TRACK DE SLIDES ══════════════════════════════════ */}
      {planLoading ? (
        <div className="pa-loading" role="status" aria-live="polite">
          <div className="pa-loading-dot" />
          <div className="pa-loading-dot" />
          <div className="pa-loading-dot" />
        </div>
      ) : (
        <div
          className="pa-viewport"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {/*
           * TRACK — translate3d activa composición hardware.
           * Fórmula: -activeTab * 100% = desplaza el track a la izquierda
           * tantas veces como el índice del tab activo × ancho del viewport.
           */}
          <div
            className="pa-track"
            style={{
              transform: `translate3d(calc(-${activeTab * 100}%), 0, 0)`,
            }}
          >
            {TABS.map((t, i) => {
              const items   = comidas[t.id] ?? []
              const totales = totalesPorTab[i]
              return (
                <div
                  key={t.id}
                  className="pa-slide"
                  role="tabpanel"
                  id={`pa-slide-${t.id}`}
                  aria-labelledby={`pa-tab-${t.id}`}
                  aria-hidden={activeTab !== i}
                  tabIndex={activeTab === i ? 0 : -1}
                >
                  {/* Cabecera del slide */}
                  <div className="pa-slide-hdr">
                    <div className="pa-slide-title-wrap">
                      <span className="pa-slide-emoji" aria-hidden="true">{t.emoji}</span>
                      <span className="pa-slide-title">{t.label}</span>
                    </div>
                    {totales.calorias > 0 && (
                      <span className="pa-slide-kcal" aria-label={`${Math.round(totales.calorias)} kcal en ${t.label}`}>
                        {Math.round(totales.calorias)} kcal
                      </span>
                    )}
                  </div>

                  {/* Lista de alimentos */}
                  {items.length > 0 ? (
                    <div className="pa-items" role="list" aria-label={`Alimentos en ${t.label}`}>
                      {items.map(item => (
                        <div key={item.id} role="listitem">
                          <AlimentoItem
                            item={item}
                            onEliminar={(itemId) => handleEliminar(t.id, itemId)}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="pa-slide-empty" aria-label={`Sin alimentos en ${t.label}`}>
                      <span className="pa-slide-empty__ico" aria-hidden="true">{t.emoji}</span>
                      <p className="pa-slide-empty__text">
                        Sin alimentos en {t.label.toLowerCase()}.<br/>
                        Tocá <strong>Agregar alimento</strong> para comenzar.
                      </p>
                    </div>
                  )}

                  {/* Botón agregar — solo se renderiza en el slide activo para evitar traps de foco */}
                  {activeTab === i && (
                    <button
                      className="pa-btn-add"
                      onClick={() => setSheetOpen(true)}
                      disabled={saving}
                      type="button"
                      aria-label={`Agregar alimento al ${t.label.toLowerCase()}`}
                    >
                      <IcoPlus />
                      Agregar alimento
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ══ BOTTOM SHEET — BuscadorProductos ═══════════════════════════ */}
      {sheetOpen && (
        <div
          className="pa-sheet-backdrop"
          onClick={e => { if (e.target === e.currentTarget) setSheetOpen(false) }}
          role="dialog"
          aria-modal="true"
          aria-label={`Agregar alimento al ${tab.label.toLowerCase()} de ${nombreCompleto}`}
        >
          <div className="pa-sheet" style={{ position: 'relative' }}>
            {/* Handle (mobile) */}
            <div className="pa-sheet__handle" aria-hidden="true" />

            {/* Botón cerrar */}
            <button
              className="pa-sheet__close"
              onClick={() => setSheetOpen(false)}
              aria-label="Cerrar buscador"
              type="button"
            >
              <IcoX />
            </button>

            {/* Título */}
            <div>
              <h2 className="pa-sheet__title">
                {tab.emoji} Agregar a {tab.label}
              </h2>
              <p className="pa-sheet__subtitle">
                {nombreCompleto} · {isoToHuman(fecha)}
              </p>
            </div>

            {/* Buscador con panel flotante blur */}
            <BuscadorProductos
              pacienteId={pacienteId}
              comida={tab.id}
              onAgregar={handleAgregar}
              placeholder={`Buscar para ${tab.label.toLowerCase()}…`}
              autoFocus={true}
            />
          </div>
        </div>
      )}
    </section>
  )
}
