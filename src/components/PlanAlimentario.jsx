/**
 * PlanAlimentario.jsx — Creador de planes alimentarios inteligentes con plantillas
 *
 * ── Arquitectura visual ──────────────────────────────────────────────────────
 *
 *  TabBar 3D
 *    · Pill indicador deslizante: translate3d(calc(i × 100%), 0, 0)
 *    · Contenedor "hundido" con inset box-shadow → profundidad 3D
 *    · Pill "elevado" con sombra → efecto raised card
 *
 *  SlideTrack (desplazamiento horizontal)
 *    · overflow:hidden en .pa-viewport recorta el track
 *    · perspective(1200px) en el viewport da profundidad sutil
 *    · Track: display:flex + will-change:transform + backface-visibility:hidden
 *    · Transición: translate3d(calc(-i × 100%), 0, 0) con cubic-bezier 400 ms
 *    · Cada slide ocupa exactamente width:100% del viewport (flex-shrink:0)
 *
 *  BuscadorProductos flotante
 *    · Renderizado sólo en las 4 pestañas de comidas (no en Indicaciones)
 *    · Panel de resultados con backdrop-filter:blur(8px)
 *    · onAgregar → inserta texto formateado en el textarea al cursor activo
 *
 *  Sistema de Plantillas
 *    · "Guardar como Plantilla" → inline input de nombre → db.plantillas.add()
 *    · "Cargar desde Plantilla" → <select> reactivo sobre liveQuery(plantillas)
 *    · Al seleccionar: todos los textareas se rellenan inmediatamente (reactivo)
 *
 *  Persistencia offline-first
 *    · Plan del día: tabla `planes` (Dexie v2), PK UUID, índice [pacienteId+fecha]
 *    · Estructura de datos plana: desayuno, almuerzo, merienda, cena, indicaciones (strings)
 *    · Compatibilidad con formato antiguo comidas[]:Array → convierte a texto
 *    · Al guardar: db.planes.put() + queueSyncTask('planes', 'UPDATE'|'CREATE', ...)
 *
 *  GPU Budget
 *    · will-change:transform solo en .pa-track y .pa-tab-pill
 *    · backface-visibility:hidden en .pa-track → sin flickering en Safari/iOS
 *    · translate3d (no translateX) para forzar hardware acceleration en todos los browsers
 *
 * Props:
 *   pacienteId {string}  UUID del paciente (requerido)
 */

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useSyncExternalStore,
} from 'react'
import { liveQuery } from 'dexie'
import { db, genId, queueSyncTask } from '@/db/database'
import BuscadorProductos from './BuscadorProductos'

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

/** Las 5 pestañas del plan — 4 comidas + indicaciones */
const TABS = [
  {
    id:          'desayuno',
    label:       'Desayuno',
    emoji:       '☀️',
    color:       '#FF8F00',
    placeholder: 'Describí los alimentos del desayuno…\nEj: • Avena con banana (50g)\n    • Leche descremada (200ml)',
    esMeal:      true,
  },
  {
    id:          'almuerzo',
    label:       'Almuerzo',
    emoji:       '🍽️',
    color:       '#2E7D32',
    placeholder: 'Describí los alimentos del almuerzo…\nEj: • Pechuga de pollo (150g)\n    • Arroz integral (100g)\n    • Ensalada mixta',
    esMeal:      true,
  },
  {
    id:          'merienda',
    label:       'Merienda',
    emoji:       '☕',
    color:       '#7B1FA2',
    placeholder: 'Describí los alimentos de la merienda…\nEj: • Yogur griego (150g)\n    • Frutos secos (30g)',
    esMeal:      true,
  },
  {
    id:          'cena',
    label:       'Cena',
    emoji:       '🌙',
    color:       '#1565C0',
    placeholder: 'Describí los alimentos de la cena…\nEj: • Salmón al horno (180g)\n    • Vegetales salteados (200g)',
    esMeal:      true,
  },
  {
    id:          'indicaciones',
    label:       'Indicaciones',
    emoji:       '📋',
    color:       '#00695C',
    placeholder: 'Consejos nutricionales, indicaciones generales…\nEj: • Beber mínimo 2 litros de agua por día\n    • Evitar azúcares refinados\n    • Masticar despacio cada comida',
    esMeal:      false,
  },
]

const N_TABS   = TABS.length          // 5
const hoy      = () => new Date().toISOString().slice(0, 10)
const EMPTY_CAMPOS = () => ({
  desayuno:     '',
  almuerzo:     '',
  merienda:     '',
  cena:         '',
  indicaciones: '',
})

// ─── Helpers de fecha ────────────────────────────────────────────────────────

function isoToHuman(iso) {
  if (!iso) return ''
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', {
    weekday: 'long',
    day:     'numeric',
    month:   'long',
  })
}

function shiftDay(iso, delta) {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + delta)
  return d.toISOString().slice(0, 10)
}

// ─── Compatibilidad con plan formato antiguo (comidas: {id:[...items]}) ────

/**
 * Convierte el array de items del formato antiguo a texto plano.
 * Así los planes ya guardados no aparecen vacíos.
 */
function itemsToText(items) {
  if (!Array.isArray(items) || !items.length) return ''
  return items
    .map(it => `• ${it.nombre}${it.cantidad ? ` (${it.cantidad}${it.unidad ?? 'g'})` : ''}${it.calorias ? ` — ${it.calorias} kcal` : ''}`)
    .join('\n')
}

/**
 * Extrae campos de texto de un documento de plan, sea en formato
 * nuevo (strings planos) o antiguo (comidas: {id: items[]}).
 */
function extractCampos(plan) {
  if (!plan) return EMPTY_CAMPOS()
  return {
    desayuno:     plan.desayuno     ?? itemsToText(plan.comidas?.desayuno),
    almuerzo:     plan.almuerzo     ?? itemsToText(plan.comidas?.almuerzo),
    merienda:     plan.merienda     ?? itemsToText(plan.comidas?.merienda),
    cena:         plan.cena         ?? itemsToText(plan.comidas?.cena),
    indicaciones: plan.indicaciones ?? '',
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK: useDexieLive — liveQuery ↔ useSyncExternalStore (sin dexie-react-hooks)
// ═══════════════════════════════════════════════════════════════════════════

function useDexieLive(querier, deps, initial) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const obs  = useMemo(() => liveQuery(querier), deps)
  const snap = useRef(initial)

  return useSyncExternalStore(
    (notify) => {
      const sub = obs.subscribe({
        next:  (v) => { snap.current = v; notify() },
        error: ()  => notify(),
      })
      return () => sub.unsubscribe()
    },
    () => snap.current,
    () => initial,
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// CSS — inyectado una sola vez; componente autocontenido
// ═══════════════════════════════════════════════════════════════════════════

const PA_CSS = `

/* ══ Raíz ════════════════════════════════════════════════════════════════ */
.pa {
  display: flex;
  flex-direction: column;
  padding-bottom: calc(var(--nav-h) + var(--space-8));
  animation: fade-in var(--transition-normal) both;
  max-width: 700px;
  margin-inline: auto;
}

/* ══ Header — paciente + fecha ═══════════════════════════════════════════ */
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
  width: 46px;
  height: 46px;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, var(--color-primary-dark), var(--color-primary-light));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  font-weight: 800;
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 4px 14px rgba(46,125,50,.30);
  letter-spacing: -.01em;
  user-select: none;
}
.pa-patient-info  { flex: 1; min-width: 0; }
.pa-patient-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--color-primary);
}
.pa-patient-name {
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--color-text-high);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -.01em;
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
    background   var(--transition-fast),
    color        var(--transition-fast),
    transform    200ms cubic-bezier(.34,1.56,.64,1);
  -webkit-tap-highlight-color: transparent;
}
.pa-date-btn:hover  {
  background: var(--color-primary-surface);
  color: var(--color-primary);
  transform: scale(1.08);
}
.pa-date-btn:active { transform: scale(.92); }
.pa-date-info  { flex: 1; text-align: center; }
.pa-date-dow   {
  font-size: 9px;
  font-weight: 800;
  text-transform: capitalize;
  letter-spacing: .09em;
  color: var(--color-primary);
}
.pa-date-full  {
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
  color: #fff;
  background: var(--color-primary);
  padding: 1px 8px;
  border-radius: var(--radius-full);
}

/* ══ Barra de herramientas (plantillas) ══════════════════════════════════ */
.pa-toolbar {
  margin: var(--space-3) var(--space-4) 0;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-divider);
  position: relative;
  overflow: hidden;
}

/* Acento decorativo */
.pa-toolbar::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg,
    var(--color-primary-dark),
    var(--color-primary-light),
    var(--color-accent-light),
    transparent 100%);
}

/* Select de plantillas */
.pa-tpl-select-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.pa-tpl-icon {
  font-size: 1rem;
  flex-shrink: 0;
}
.pa-tpl-select {
  flex: 1;
  min-width: 0;
  padding: var(--space-2) var(--space-3);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  color: var(--color-text-high);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239E9E9E' stroke-width='2.5' stroke-linecap='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  padding-right: 30px;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  text-overflow: ellipsis;
}
.pa-tpl-select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(46,125,50,.14);
}
.pa-tpl-select:disabled {
  opacity: .55;
  cursor: not-allowed;
}

/* Botón guardar como plantilla */
.pa-btn-tpl {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-full);
  border: 1.5px solid var(--color-accent);
  background: transparent;
  color: var(--color-accent);
  font-size: var(--text-sm);
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition:
    background var(--transition-fast),
    color      var(--transition-fast),
    transform  200ms cubic-bezier(.34,1.56,.64,1);
  -webkit-tap-highlight-color: transparent;
}
.pa-btn-tpl:hover {
  background: var(--color-accent-surface);
  transform: scale(1.03) translateY(-1px);
}
.pa-btn-tpl:active { transform: scale(.97); }

/* Campo inline para nombre de plantilla */
.pa-tpl-save-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex: 1;
  animation: fade-in 160ms both;
}
.pa-tpl-name-input {
  flex: 1;
  min-width: 0;
  padding: var(--space-2) var(--space-3);
  border: 1.5px solid var(--color-primary);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  color: var(--color-text-high);
  font-size: var(--text-sm);
  font-weight: 500;
  box-shadow: 0 0 0 3px rgba(46,125,50,.12);
  outline: none;
  transition: box-shadow var(--transition-fast);
}
.pa-tpl-name-input:focus {
  box-shadow: 0 0 0 4px rgba(46,125,50,.18);
}
.pa-tpl-name-input::placeholder { color: var(--color-text-disabled); }

.pa-tpl-confirm-btn {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-full);
  border: none;
  background: var(--color-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  font-size: 1rem;
  font-weight: 700;
  transition:
    background var(--transition-fast),
    transform  200ms cubic-bezier(.34,1.56,.64,1),
    opacity    var(--transition-fast);
}
.pa-tpl-confirm-btn:hover:not(:disabled) {
  background: var(--color-primary-dark);
  transform: scale(1.08);
}
.pa-tpl-confirm-btn:disabled { opacity: .40; cursor: not-allowed; }

.pa-tpl-cancel-btn {
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
  font-size: 1.1rem;
  font-weight: 700;
  transition:
    background    var(--transition-fast),
    border-color  var(--transition-fast),
    color         var(--transition-fast),
    transform     200ms cubic-bezier(.34,1.56,.64,1);
}
.pa-tpl-cancel-btn:hover {
  background: var(--color-error-surface);
  border-color: var(--color-error);
  color: var(--color-error);
  transform: rotate(90deg);
}

/* Notificación plantilla guardada */
.pa-tpl-saved {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-success);
  animation: fade-in 200ms both;
  flex-shrink: 0;
}

/* ══ BARRA DE TABS 3D ═══════════════════════════════════════════════════ */

.pa-tabs-wrap {
  padding: var(--space-3) var(--space-4) 0;
}

/*
 * Contenedor "hundido" — inset-shadow crea la ilusión de profundidad
 * en la que las pestañas están recortadas dentro de una cavidad.
 */
.pa-tabs {
  position: relative;
  display: flex;
  background: var(--color-surface-raised);
  border-radius: var(--radius-xl);
  padding: 3px;
  box-shadow:
    inset 0 2px 6px rgba(0,0,0,.09),
    inset 0 1px 2px rgba(0,0,0,.06);
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}
.pa-tabs::-webkit-scrollbar { display: none; }

/*
 * PILL INDICADOR — se eleva sobre el track mediante box-shadow.
 * width = 100% / N_TABS (5 tabs)
 * translate3d garantiza la aceleración de hardware y la misma capa GPU que el slide-track.
 */
.pa-tab-pill {
  position: absolute;
  top: 3px;
  bottom: 3px;
  left: 3px;
  width: calc((100% - 6px) / ${N_TABS});
  border-radius: calc(var(--radius-xl) - 3px);
  background: var(--color-surface);
  box-shadow:
    0 3px  9px rgba(0,0,0,.13),
    0 1px  3px rgba(0,0,0,.09),
    inset 0 1px 0 rgba(255,255,255,.80);
  transition: transform 400ms cubic-bezier(.4, 0, .2, 1);
  will-change: transform;
  pointer-events: none;
  z-index: 0;
}
.dark .pa-tab-pill {
  background: var(--color-surface-raised);
  box-shadow:
    0 3px  9px rgba(0,0,0,.38),
    0 1px  3px rgba(0,0,0,.28),
    inset 0 1px 0 rgba(255,255,255,.06);
}

/* Botones de pestaña */
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
  user-select: none;
}
.pa-tab:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: -2px;
}
.pa-tab__emoji {
  font-size: .95rem;
  line-height: 1;
  display: block;
  transition: transform 280ms cubic-bezier(.34,1.56,.64,1);
}
.pa-tab--active .pa-tab__emoji { transform: scale(1.18); }

.pa-tab__label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: .01em;
  color: var(--color-text-low);
  transition: color var(--transition-fast);
  line-height: 1;
}
.pa-tab--active .pa-tab__label {
  font-weight: 800;
  color: var(--color-text-high);
}

/* ══ VIEWPORT + TRACK DE SLIDES ════════════════════════════════════════ */

/*
 * El viewport recorta el track y aporta perspectiva para la ilusión 3D
 * durante el desplazamiento.
 */
.pa-viewport {
  overflow: hidden;
  width: 100%;
  perspective: 1200px;
  perspective-origin: 50% 0;
}

/*
 * TRACK — el contenedor de los N slides en fila.
 *
 * GPU budget:
 *   will-change:transform          → browser crea una compositor layer propia
 *   backface-visibility:hidden     → evita flickering en Safari/iOS
 *   translate3d(x,0,0)             → fuerza hardware acceleration real
 *
 * Fórmula: translate3d(calc(-i × 100%), 0, 0)
 *   · i=0 → 0%   (primer slide alineado al borde izquierdo del viewport)
 *   · i=1 → -100% (segundo slide desplazado hacia la derecha, oculto)
 *   · i=N → -N×100%
 */
.pa-track {
  display: flex;
  width: 100%;
  will-change: transform;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  transition: transform 400ms cubic-bezier(.4, 0, .2, 1);
}

/* Cada slide = 100% del ancho del viewport */
.pa-slide {
  width: 100%;
  flex-shrink: 0;
  padding: var(--space-4) var(--space-4) var(--space-5);
}

/* ── Cabecera del slide ──────────────────────────────────────────────────── */
.pa-slide-hdr {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}
.pa-slide-emoji { font-size: 1.35rem; line-height: 1; }
.pa-slide-title {
  font-size: var(--text-lg);
  font-weight: 800;
  color: var(--color-text-high);
  letter-spacing: -.02em;
  flex: 1;
}

/* ── Contenedor de slide (card elevada) ─────────────────────────────────── */
.pa-slide-card {
  position: relative;
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  padding: var(--space-4);
  box-shadow:
    var(--shadow-md),
    0 0 0 1px rgba(0,0,0,.03);
  border: 1px solid var(--color-divider);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  overflow: visible;
}

/* Acento cromático por tab en el borde superior */
.pa-slide-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  background: var(--_tab-color, var(--color-primary));
}

/* ── Textarea de la comida ───────────────────────────────────────────────── */
.pa-slide-label {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--color-text-mid);
  user-select: none;
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.pa-slide-textarea {
  width: 100%;
  min-height: 160px;
  resize: vertical;
  padding: var(--space-3) var(--space-4);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-bg);
  color: var(--color-text-high);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  line-height: 1.75;
  -webkit-appearance: none;
  appearance: none;
  transition:
    border-color var(--transition-fast),
    box-shadow   var(--transition-fast),
    background   var(--transition-fast);
}
.pa-slide-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(46,125,50,.14);
  background: var(--color-surface);
}
.pa-slide-textarea::placeholder {
  color: var(--color-text-disabled);
  font-style: italic;
  line-height: 1.65;
}

/* Animación de flash al cargar desde plantilla */
@keyframes pa-campo-flash {
  0%   { background: rgba(76,175,80,.12); border-color: var(--color-primary-light); }
  60%  { background: rgba(76,175,80,.06); border-color: var(--color-primary-light); }
  100% { background: var(--color-bg);     border-color: var(--color-border); }
}
.pa-slide-textarea--flashed {
  animation: pa-campo-flash 900ms ease both;
}

/* ── Separador entre buscador y textarea ───────────────────────────────── */
.pa-bp-divider {
  height: 1px;
  background: var(--color-divider);
  margin: 0;
}
.pa-bp-label {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--color-text-low);
  user-select: none;
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

/* ══ Footer — guardar plan ═══════════════════════════════════════════════ */
.pa-footer {
  margin: var(--space-3) var(--space-4) 0;
  display: flex;
  align-items: center;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.pa-btn-save {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-7);
  background: linear-gradient(135deg,
    var(--color-primary-dark) 0%,
    var(--color-primary)      50%,
    var(--color-primary-light) 100%);
  background-size: 200% 100%;
  background-position: 0% center;
  color: #fff;
  border-radius: var(--radius-lg);
  font-size: var(--text-base);
  font-weight: 700;
  letter-spacing: -.01em;
  box-shadow:
    0 4px 16px rgba(46,125,50,.38),
    0 2px  6px rgba(0,0,0,.12);
  transition:
    background-position 350ms ease,
    transform           var(--transition-fast),
    box-shadow          var(--transition-fast),
    opacity             var(--transition-fast);
  -webkit-tap-highlight-color: transparent;
}
.pa-btn-save:hover:not(:disabled) {
  background-position: 100% center;
  transform: translateY(-2px);
  box-shadow:
    0 8px 28px rgba(46,125,50,.48),
    0 4px 12px rgba(0,0,0,.15);
}
.pa-btn-save:active:not(:disabled) {
  transform: translateY(0) scale(.99);
}
.pa-btn-save:disabled {
  opacity: .55;
  cursor: not-allowed;
  transform: none !important;
}

.pa-saved-notice {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-success);
  animation: fade-in 200ms both;
}

/* ══ Loading state ════════════════════════════════════════════════════════ */
.pa-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-12);
  gap: var(--space-2);
}
.pa-loading-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary-light);
  animation: pa-bounce 1.2s ease-in-out infinite;
}
.pa-loading-dot:nth-child(2) { animation-delay: .2s; }
.pa-loading-dot:nth-child(3) { animation-delay: .4s; }
@keyframes pa-bounce {
  0%, 80%, 100% { transform: scale(.75); opacity: .4; }
  40%           { transform: scale(1);   opacity: 1;  }
}

/* ══ Sin paciente ════════════════════════════════════════════════════════ */
.pa-no-patient {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-16) var(--space-6);
  text-align: center;
  gap: var(--space-3);
  color: var(--color-text-low);
}
.pa-no-patient__ico  { font-size: 3.5rem; }
.pa-no-patient__text { font-size: var(--text-sm); font-weight: 500; max-width: 300px; line-height: 1.6; }
`

// ─── Inyector de estilos ─────────────────────────────────────────────────────

function injectStyles() {
  if (typeof document === 'undefined') return
  if (document.getElementById('pa-styles-v2')) return
  const el = document.createElement('style')
  el.id          = 'pa-styles-v2'
  el.textContent = PA_CSS
  document.head.appendChild(el)
}

// ═══════════════════════════════════════════════════════════════════════════
// ÍCONOS SVG INLINE
// ═══════════════════════════════════════════════════════════════════════════

const IcoLeft = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"
       aria-hidden="true">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)
const IcoRight = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"
       aria-hidden="true">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
)
const IcoSave = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
       aria-hidden="true">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </svg>
)
const IcoCheck = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
       aria-hidden="true">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)
const IcoSpinner = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
       style={{ animation: 'spin 0.9s linear infinite' }}
       aria-hidden="true">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
  </svg>
)
const IcoX = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"
       aria-hidden="true">
    <line x1="18" y1="6"  x2="6" y2="18"/>
    <line x1="6"  y1="6" x2="18" y2="18"/>
  </svg>
)
const IcoStar = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
       aria-hidden="true">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
)
const IcoSearch = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"
       aria-hidden="true">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)

// ─── Iniciales del avatar ──────────────────────────────────────────────────

function iniciales(nombre = '', apellido = '') {
  return ((nombre[0] ?? '') + (apellido[0] ?? '')).toUpperCase() || '🥗'
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export default function PlanAlimentario({ pacienteId }) {
  // ── Inyección de estilos ──────────────────────────────────────────────
  useEffect(() => { injectStyles() }, [])

  // ── Estado de UI ──────────────────────────────────────────────────────
  const [fecha,          setFecha]          = useState(hoy)
  const [activeTab,      setActiveTab]      = useState(0)
  const [guardando,      setGuardando]      = useState(false)
  const [savedOk,        setSavedOk]        = useState(false)

  // Template: guardar
  const [showTplInput,   setShowTplInput]   = useState(false)
  const [tplNombre,      setTplNombre]      = useState('')
  const [guardandoTpl,   setGuardandoTpl]   = useState(false)
  const [tplSavedOk,     setTplSavedOk]     = useState(false)

  // Template: cargar
  const [plantillaId,    setPlantillaId]    = useState('')

  // Estado de flash (animación al cargar plantilla)
  const [flashKey,       setFlashKey]       = useState(0)

  // ── Campos de texto (fuente de verdad local) ───────────────────────────
  const [campos, setCampos] = useState(EMPTY_CAMPOS)

  // Refs a los textareas para inserción al cursor
  const textareaRefs = useRef({})   // { desayuno: <el>, almuerzo: <el>, … }
  const tplInputRef  = useRef(null)

  // Touch swipe
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)

  // Ref para evitar que liveQuery sobreescriba ediciones del usuario
  const lastLoadedKey = useRef('')

  // ── Queries reactivas Dexie ────────────────────────────────────────────

  /** Plantillas guardadas — se actualiza en tiempo real */
  const plantillas = useDexieLive(
    () => db.plantillas.toArray(),
    [],
    [],
  )

  /** Datos del paciente — nombre, apellido */
  const paciente = useDexieLive(
    () => pacienteId ? db.pacientes.get(pacienteId) : Promise.resolve(null),
    [pacienteId],
    null,
  )

  // ── Carga del plan del día desde Dexie (imperativa, no reactiva) ──────
  // Usamos efecto imperativo para evitar que liveQuery sobreescriba los
  // cambios no guardados del profesional mientras edita.

  const [planLoading, setPlanLoading] = useState(false)

  useEffect(() => {
    if (!pacienteId) return

    let cancelled = false
    const clave   = `${pacienteId}|${fecha}`

    // Evitar recargar si ya cargamos esta combinación
    if (lastLoadedKey.current === clave) return

    setPlanLoading(true)
    setCampos(EMPTY_CAMPOS())

    db.planes
      .where('[pacienteId+fecha]')
      .equals([pacienteId, fecha])
      .first()
      .then((plan) => {
        if (cancelled) return
        lastLoadedKey.current = clave
        setCampos(extractCampos(plan))
      })
      .catch((err) => console.error('[PlanAlimentario] Error cargando plan:', err))
      .finally(() => { if (!cancelled) setPlanLoading(false) })

    return () => { cancelled = true }
  }, [pacienteId, fecha])

  // Resetear clave al cambiar paciente o fecha
  useEffect(() => {
    lastLoadedKey.current = ''
  }, [pacienteId, fecha])

  // ── Handler de cambio en textareas ────────────────────────────────────
  const handleCampoChange = useCallback((tabId, value) => {
    setCampos(prev => ({ ...prev, [tabId]: value }))
    setSavedOk(false)
  }, [])

  // ── Insertar producto desde BuscadorProductos ──────────────────────────
  /**
   * Formatea un item del buscador como línea de texto y lo inserta
   * en el textarea de la pestaña activa, en la posición del cursor.
   */
  const handleInsertarProducto = useCallback((item, tabId) => {
    const partes = [
      `• ${item.nombre}`,
      `(${item.cantidad}${item.unidad ?? 'g'})`,
    ]
    if (item.calorias) partes.push(`— ${item.calorias} kcal`)
    if (item.proteinas || item.carbohidratos || item.grasas) {
      const macros = []
      if (item.proteinas     != null) macros.push(`P:${item.proteinas}g`)
      if (item.carbohidratos != null) macros.push(`C:${item.carbohidratos}g`)
      if (item.grasas        != null) macros.push(`G:${item.grasas}g`)
      partes.push(`[${macros.join(' ')}]`)
    }
    const linea = partes.join(' ') + '\n'

    const ref = textareaRefs.current[tabId]
    if (ref) {
      const start = ref.selectionStart ?? ref.value.length
      const end   = ref.selectionEnd   ?? ref.value.length
      const val   = campos[tabId] ?? ''
      const nuevo = val.substring(0, start) + linea + val.substring(end)
      setCampos(prev => ({ ...prev, [tabId]: nuevo }))
      setSavedOk(false)
      // Restaurar cursor tras el texto insertado
      requestAnimationFrame(() => {
        ref.focus()
        ref.setSelectionRange(start + linea.length, start + linea.length)
      })
    } else {
      setCampos(prev => ({ ...prev, [tabId]: (prev[tabId] ?? '') + linea }))
      setSavedOk(false)
    }
  }, [campos])

  // ── Guardar como plantilla ─────────────────────────────────────────────
  const handleGuardarPlantilla = useCallback(async () => {
    if (!tplNombre.trim() || guardandoTpl) return
    setGuardandoTpl(true)
    try {
      const id = genId()
      await db.plantillas.add({
        id,
        nombre_plantilla: tplNombre.trim(),
        desayuno:         campos.desayuno     ?? '',
        almuerzo:         campos.almuerzo     ?? '',
        merienda:         campos.merienda     ?? '',
        cena:             campos.cena         ?? '',
        indicaciones:     campos.indicaciones ?? '',
        creadoEn:         new Date().toISOString(),
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
  }, [tplNombre, guardandoTpl, campos])

  // ── Cargar desde plantilla ─────────────────────────────────────────────
  const handleCargarPlantilla = useCallback((e) => {
    const id = e.target.value
    setPlantillaId(id)
    if (!id) return
    const plantilla = plantillas.find(p => p.id === id)
    if (!plantilla) return
    // Rellenar todos los campos de forma reactiva
    setCampos({
      desayuno:     plantilla.desayuno     ?? '',
      almuerzo:     plantilla.almuerzo     ?? '',
      merienda:     plantilla.merienda     ?? '',
      cena:         plantilla.cena         ?? '',
      indicaciones: plantilla.indicaciones ?? '',
    })
    setSavedOk(false)
    // Disparar animación de flash en los textareas
    setFlashKey(k => k + 1)
  }, [plantillas])

  // ── Guardar plan del paciente ──────────────────────────────────────────
  const handleGuardarPlan = useCallback(async () => {
    if (!pacienteId || guardando) return
    setGuardando(true)
    setSavedOk(false)
    try {
      const existing = await db.planes
        .where('[pacienteId+fecha]')
        .equals([pacienteId, fecha])
        .first()

      const payload = {
        pacienteId,
        fecha,
        desayuno:      campos.desayuno     ?? '',
        almuerzo:      campos.almuerzo     ?? '',
        merienda:      campos.merienda     ?? '',
        cena:          campos.cena         ?? '',
        indicaciones:  campos.indicaciones ?? '',
        sincronizado:  0,
        actualizadoEn: new Date().toISOString(),
      }

      if (existing) {
        await db.planes.update(existing.id, payload)
        await queueSyncTask('planes', 'UPDATE', { id: existing.id, ...payload })
        lastLoadedKey.current = `${pacienteId}|${fecha}` // marcar como sincronizado
      } else {
        const id = genId()
        const nuevo = { id, creadoEn: new Date().toISOString(), ...payload }
        await db.planes.add(nuevo)
        await queueSyncTask('planes', 'CREATE', nuevo)
        lastLoadedKey.current = `${pacienteId}|${fecha}`
      }

      setSavedOk(true)
      setTimeout(() => setSavedOk(false), 3000)
    } catch (err) {
      console.error('[PlanAlimentario] Error al guardar plan:', err)
    } finally {
      setGuardando(false)
    }
  }, [pacienteId, fecha, campos, guardando])

  // ── Navegación de fecha ────────────────────────────────────────────────
  const goPrev = useCallback(() => setFecha(f => shiftDay(f, -1)), [])
  const goNext = useCallback(() => setFecha(f => shiftDay(f, +1)), [])

  // ── Touch / swipe horizontal ───────────────────────────────────────────
  function onTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }
  function onTouchEnd(e) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current)
    if (Math.abs(dx) > dy && Math.abs(dx) > 50) {
      if (dx < 0 && activeTab < N_TABS - 1) setActiveTab(t => t + 1)
      if (dx > 0 && activeTab > 0)          setActiveTab(t => t - 1)
    }
    touchStartX.current = null
    touchStartY.current = null
  }

  // ── Focus en input de plantilla ────────────────────────────────────────
  useEffect(() => {
    if (showTplInput) {
      requestAnimationFrame(() => tplInputRef.current?.focus())
    }
  }, [showTplInput])

  // ── Guardia: sin paciente ──────────────────────────────────────────────
  if (!pacienteId) {
    return (
      <section className="pa">
        <div className="pa-no-patient">
          <span className="pa-no-patient__ico" aria-hidden="true">🥗</span>
          <p className="pa-no-patient__text">
            Seleccioná un paciente para ver y editar su plan alimentario
          </p>
        </div>
      </section>
    )
  }

  // ── Datos de UI ────────────────────────────────────────────────────────
  const nombreCompleto = [paciente?.nombre, paciente?.apellido].filter(Boolean).join(' ') || 'Paciente'
  const fechaHumana    = isoToHuman(fecha)
  const [diaNombre, ...restoFecha] = fechaHumana.split(' ')
  const esHoy          = fecha === hoy()

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <section className="pa" aria-label={`Plan alimentario — ${nombreCompleto}`}>

      {/* ══ HEADER ══════════════════════════════════════════════════════ */}
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
        <nav className="pa-date-nav" aria-label="Navegar por fecha">
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
            {esHoy && <span className="pa-date-today" role="status">Hoy</span>}
          </div>

          <button
            className="pa-date-btn"
            onClick={goNext}
            aria-label="Día siguiente"
            type="button"
          >
            <IcoRight />
          </button>
        </nav>
      </div>

      {/* ══ BARRA DE HERRAMIENTAS — PLANTILLAS ══════════════════════════ */}
      <div className="pa-toolbar" role="toolbar" aria-label="Herramientas de plantilla">

        {/* Selector "Cargar desde Plantilla" */}
        <div className="pa-tpl-select-wrap">
          <span className="pa-tpl-icon" aria-hidden="true">📂</span>
          <select
            className="pa-tpl-select"
            value={plantillaId}
            onChange={handleCargarPlantilla}
            disabled={!plantillas.length}
            aria-label="Cargar desde plantilla guardada"
          >
            <option value="">
              {plantillas.length
                ? `Cargar desde plantilla… (${plantillas.length})`
                : 'Sin plantillas guardadas'
              }
            </option>
            {plantillas.map(p => (
              <option key={p.id} value={p.id}>{p.nombre_plantilla}</option>
            ))}
          </select>
        </div>

        {/* ── Guardar como plantilla ── */}
        {!showTplInput ? (
          <button
            className="pa-btn-tpl"
            onClick={() => { setShowTplInput(true); setTplSavedOk(false) }}
            type="button"
            aria-label="Guardar plan actual como plantilla reutilizable"
          >
            <IcoStar />
            <span>Guardar como Plantilla</span>
          </button>
        ) : (
          <div className="pa-tpl-save-row" role="group" aria-label="Nombre de la nueva plantilla">
            <input
              ref={tplInputRef}
              className="pa-tpl-name-input"
              type="text"
              value={tplNombre}
              onChange={e => setTplNombre(e.target.value)}
              placeholder="Nombre: ej. Plan Keto Inicial…"
              maxLength={60}
              aria-label="Nombre de la plantilla"
              onKeyDown={e => {
                if (e.key === 'Enter')  handleGuardarPlantilla()
                if (e.key === 'Escape') { setShowTplInput(false); setTplNombre('') }
              }}
            />
            <button
              className="pa-tpl-confirm-btn"
              type="button"
              onClick={handleGuardarPlantilla}
              disabled={!tplNombre.trim() || guardandoTpl}
              aria-label={guardandoTpl ? 'Guardando…' : 'Confirmar nombre y guardar plantilla'}
              title="Guardar plantilla"
            >
              {guardandoTpl ? <IcoSpinner /> : <IcoCheck />}
            </button>
            <button
              className="pa-tpl-cancel-btn"
              type="button"
              onClick={() => { setShowTplInput(false); setTplNombre('') }}
              aria-label="Cancelar"
              title="Cancelar"
            >
              <IcoX />
            </button>
          </div>
        )}

        {/* Confirmación de plantilla guardada */}
        {tplSavedOk && (
          <span className="pa-tpl-saved" role="status">
            <IcoCheck />
            ¡Plantilla guardada!
          </span>
        )}
      </div>

      {/* ══ BARRA DE TABS 3D ════════════════════════════════════════════ */}
      <div className="pa-tabs-wrap">
        <div
          className="pa-tabs"
          role="tablist"
          aria-label="Secciones del plan alimentario"
        >
          {/*
           * PILL INDICADOR
           * translate3d(calc(i × 100%), 0, 0)
           *   i=0 → translate3d(0,0,0)   — primer tab
           *   i=1 → translate3d(100%,0,0) — segundo tab
           *   etc.
           */}
          <div
            className="pa-tab-pill"
            aria-hidden="true"
            style={{
              transform: `translate3d(calc(${activeTab * 100}%), 0, 0)`,
            }}
          />

          {TABS.map((tab, i) => (
            <button
              key={tab.id}
              className={`pa-tab${activeTab === i ? ' pa-tab--active' : ''}`}
              role="tab"
              aria-selected={activeTab === i}
              aria-controls={`pa-slide-${tab.id}`}
              id={`pa-tab-${tab.id}`}
              onClick={() => setActiveTab(i)}
              type="button"
            >
              <span className="pa-tab__emoji" aria-hidden="true">{tab.emoji}</span>
              <span className="pa-tab__label">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ══ VIEWPORT + TRACK DE SLIDES ══════════════════════════════════ */}
      {planLoading ? (
        <div className="pa-loading" role="status" aria-live="polite" aria-label="Cargando plan…">
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
           * TRACK: translate3d(calc(-activeTab × 100%), 0, 0)
           *
           *   activeTab=0 → translate3d(0,0,0)     → Desayuno visible
           *   activeTab=1 → translate3d(-100%,0,0)  → Almuerzo visible
           *   activeTab=2 → translate3d(-200%,0,0)  → Merienda visible
           *   activeTab=3 → translate3d(-300%,0,0)  → Cena visible
           *   activeTab=4 → translate3d(-400%,0,0)  → Indicaciones visible
           *
           * La transición CSS de 400 ms emula la fluidez de Nutrium.
           */}
          <div
            className="pa-track"
            style={{
              transform: `translate3d(calc(-${activeTab * 100}%), 0, 0)`,
            }}
          >
            {TABS.map((tab, i) => (
              <SlidePanel
                key={tab.id}
                tab={tab}
                isActive={activeTab === i}
                value={campos[tab.id] ?? ''}
                flashKey={flashKey}
                textareaRef={el => { textareaRefs.current[tab.id] = el }}
                onChange={val => handleCampoChange(tab.id, val)}
                onInsert={item => handleInsertarProducto(item, tab.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ══ FOOTER — Guardar plan ════════════════════════════════════════ */}
      <footer className="pa-footer">
        <button
          className="pa-btn-save"
          onClick={handleGuardarPlan}
          disabled={guardando}
          type="button"
          aria-label={`Guardar plan alimentario de ${nombreCompleto} del ${fechaHumana}`}
        >
          {guardando ? (
            <><IcoSpinner /><span>Guardando…</span></>
          ) : (
            <><IcoSave /><span>Guardar Plan</span></>
          )}
        </button>

        {savedOk && (
          <span className="pa-saved-notice" role="status">
            <IcoCheck />
            Guardado localmente · en cola de sync
          </span>
        )}
      </footer>

    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SlidePanel — panel individual de cada pestaña
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Renderiza el contenido de una pestaña:
 *   · Textarea de texto libre para la comida / indicaciones
 *   · BuscadorProductos flotante (solo en tabs de comidas, no indicaciones)
 *
 * Recibe `isActive` para condicionar el renderizado del buscador
 * (evita paneles flotantes huérfanos en slides ocultos).
 */
function SlidePanel({ tab, isActive, value, flashKey, textareaRef, onChange, onInsert }) {
  // Clave de flash — cuando cambia, la animación se reinicia
  const [flashed, setFlashed] = useState(false)
  const prevFlashKey = useRef(flashKey)

  useEffect(() => {
    if (flashKey !== prevFlashKey.current) {
      prevFlashKey.current = flashKey
      setFlashed(true)
      const t = setTimeout(() => setFlashed(false), 950)
      return () => clearTimeout(t)
    }
  }, [flashKey])

  return (
    <article
      className="pa-slide"
      role="tabpanel"
      id={`pa-slide-${tab.id}`}
      aria-labelledby={`pa-tab-${tab.id}`}
      aria-hidden={!isActive}
      tabIndex={isActive ? 0 : -1}
    >
      {/* Cabecera del slide */}
      <header className="pa-slide-hdr">
        <span className="pa-slide-emoji" aria-hidden="true">{tab.emoji}</span>
        <span className="pa-slide-title">{tab.label}</span>
      </header>

      {/* Card con acento cromático */}
      <div
        className="pa-slide-card"
        style={{ '--_tab-color': tab.color }}
      >
        {/* ── BuscadorProductos (solo en pestañas de comidas) ── */}
        {tab.esMeal && isActive && (
          <>
            <div className="pa-bp-label">
              <IcoSearchInline />
              Buscar alimento para insertar
            </div>

            <BuscadorProductos
              comida={tab.id}
              placeholder={`Buscar para ${tab.label.toLowerCase()}…`}
              onAgregar={onInsert}
            />

            <div className="pa-bp-divider" aria-hidden="true" />
          </>
        )}

        {/* ── Textarea principal ── */}
        <label className="pa-slide-label" htmlFor={`pa-textarea-${tab.id}`}>
          {tab.esMeal ? '🍴 Detalle de alimentos' : '💡 Indicaciones y consejos'}
        </label>

        <textarea
          id={`pa-textarea-${tab.id}`}
          ref={textareaRef}
          className={`pa-slide-textarea${flashed ? ' pa-slide-textarea--flashed' : ''}`}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={tab.placeholder}
          aria-label={`Contenido de ${tab.label}`}
          rows={tab.esMeal ? 7 : 9}
          spellCheck="true"
          autoCorrect="on"
        />
      </div>
    </article>
  )
}

// Ícono de búsqueda inline (mini, para el label del buscador)
function IcoSearchInline() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"
         aria-hidden="true">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  )
}
