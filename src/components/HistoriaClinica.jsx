/**
 * HistoriaClinica.jsx — Ficha clínica premium con evolución de paciente.
 *
 * Arquitectura visual:
 *   · MetricCard   — efecto 3D tilt (CSS custom props --rx / --ry)
 *                    perspective(1000px) + transition: transform 0.4s ease
 *                    sin libs externas, GPU-only vía will-change: transform
 *
 *   · ImcGauge     — SVG semicircular con arcos de color por zona OMS
 *                    Aguja: transform-origin en el centro del pivote,
 *                    spring cubic-bezier(0.34, 1.56, 0.64, 1)
 *
 *   · ImcMeter     — Barra cromática horizontal inline (form)
 *                    Feedback en tiempo real: indicador flota sobre gradiente
 *                    transition: left 0.4s ease
 *
 *   · Timeline     — IntersectionObserver → clase CSS → translate3d(0,0,0)
 *                    Delay escalonado — efecto cinemático sin JS de scroll
 *
 * GPU-budget:
 *   will-change: transform   solo en .mc, .gauge-needle, .tl-item
 *   backface-visibility: hidden   en .mc — evita repintado del reverso
 *   translateZ(0)   promueve tarjeta a capa de composición propia
 *
 * Persistencia:
 *   Dexie tabla `historias` (v2) + queueSyncTask — patrón outbox at-least-once
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useSyncExternalStore,
  useMemo,
} from 'react'
import { liveQuery } from 'dexie'
import { db, genId, queueSyncTask } from '@/db/database'

// ═══════════════════════════════════════════════════════════════════════════════
// ESTILOS — inyectados una sola vez; componente autocontenido (sin CSS Module)
// ═══════════════════════════════════════════════════════════════════════════════

const COMPONENT_CSS = `

/* ══ Wrapper principal ════════════════════════════════════════════════════════ */
.hc {
  max-width: 700px;
  margin-inline: auto;
  padding: var(--space-4);
  padding-bottom: var(--space-12);
  animation: fade-in var(--transition-normal) both;
}

/* ══ Encabezado ══════════════════════════════════════════════════════════════ */
.hc-header {
  margin-bottom: var(--space-6);
}
.hc-title {
  font-size: var(--text-2xl);
  font-weight: 800;
  letter-spacing: -.025em;
  color: var(--color-text-high);
  line-height: 1.1;
}
.hc-subtitle {
  font-size: var(--text-sm);
  color: var(--color-text-mid);
  margin-top: var(--space-1);
  line-height: 1.5;
}
.hc-section-title {
  font-size: var(--text-xs);
  font-weight: 800;
  letter-spacing: .09em;
  text-transform: uppercase;
  color: var(--color-primary);
  margin-bottom: var(--space-3);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.hc-section-title::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--color-divider);
}

/* ══ Dashboard 3D ════════════════════════════════════════════════════════════ */
.hc-dashboard {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}
@media (max-width: 560px) {
  .hc-dashboard { grid-template-columns: 1fr; gap: var(--space-3); }
}

/* ── MetricCard 3D ─────────────────────────────────────────────────────────── */
.mc {
  position: relative;
  border-radius: var(--radius-xl);
  padding: var(--space-5) var(--space-4) var(--space-4);
  cursor: default;
  user-select: none;
  overflow: hidden;

  /* GPU: layer de composición propia — sin layout, sin paint */
  will-change: transform;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;

  /* Inclinación 3D desde CSS custom properties actualizadas por JS */
  transform:
    perspective(1000px)
    rotateX(var(--rx, 0deg))
    rotateY(var(--ry, 0deg))
    translateZ(0);
  transition: transform 0.4s ease, box-shadow 0.4s ease;
  box-shadow:
    0 8px 24px rgba(0,0,0,.14),
    0 2px 8px  rgba(0,0,0,.10);
}
.mc:hover {
  box-shadow:
    0 22px 48px rgba(0,0,0,.22),
    0 6px 18px  rgba(0,0,0,.14);
}

/* Variantes cromáticas */
.mc--peso {
  background: linear-gradient(145deg, #1B5E20 0%, #2E7D32 55%, #43A047 100%);
}
.mc--grasa {
  background: linear-gradient(145deg, #BF360C 0%, #E64A19 55%, #FF7043 100%);
}
.mc--musculo {
  background: linear-gradient(145deg, #1A237E 0%, #283593 55%, #3F51B5 100%);
}

/* Textura de cuadrícula sutil (profundidad sin peso) */
.mc::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    repeating-linear-gradient(45deg, transparent 0 10px, rgba(255,255,255,.025) 10px 11px),
    repeating-linear-gradient(-45deg, transparent 0 10px, rgba(255,255,255,.02) 10px 11px);
  pointer-events: none;
  border-radius: inherit;
}
/* Brillo en borde superior */
.mc::after {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.45), transparent);
  border-radius: inherit;
}

/* Contenido elevado (sensación de profundidad) */
.mc__inner {
  position: relative;
  transform: translateZ(20px);
  color: #fff;
}
.mc__icon {
  font-size: 1.65rem;
  line-height: 1;
  margin-bottom: var(--space-2);
  filter: drop-shadow(0 2px 4px rgba(0,0,0,.28));
}
.mc__label {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: .09em;
  text-transform: uppercase;
  opacity: .72;
  margin-bottom: var(--space-1);
}
.mc__value {
  font-size: var(--text-3xl);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -.035em;
  margin-bottom: var(--space-2);
  text-shadow: 0 2px 10px rgba(0,0,0,.22);
}
.mc__unit {
  font-size: var(--text-sm);
  font-weight: 400;
  opacity: .68;
  margin-left: 3px;
  letter-spacing: 0;
}
.mc__trend {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-xs);
  font-weight: 700;
  padding: 3px 9px;
  border-radius: var(--radius-full);
  background: rgba(255,255,255,.2);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}
.mc__empty {
  font-size: var(--text-xs);
  opacity: .45;
  margin-top: var(--space-1);
}

/* ══ IMC Gauge (SVG) ══════════════════════════════════════════════════════════ */
.hc-gauge-section {
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  padding: var(--space-5) var(--space-4) var(--space-5);
  box-shadow: var(--shadow-md);
  margin-bottom: var(--space-5);
  overflow: hidden;
  position: relative;
}
/* Acento decorativo */
.hc-gauge-section::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: linear-gradient(90deg,
    #4ECDC4 0%, #2ECC71 28%, #F1C40F 52%, #E67E22 72%, #E74C3C 88%, #C0392B 100%);
}
.hc-gauge-wrap {
  width: 100%;
  max-width: 290px;
  margin-inline: auto;
}
.hc-gauge-svg {
  width: 100%;
  height: auto;
  overflow: visible;
  display: block;
}
/* Aguja animada con spring suave */
.gauge-needle {
  will-change: transform;
  transform-origin: 140px 152px;
  transition: transform .95s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.gauge-needle-shadow {
  will-change: transform;
  transform-origin: 140px 152px;
  transition: transform .95s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.hc-imc-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  margin-top: var(--space-2);
  animation: fade-in .35s both;
}
.hc-imc-value {
  font-size: var(--text-3xl);
  font-weight: 800;
  letter-spacing: -.035em;
  line-height: 1;
}
.hc-imc-label {
  font-size: var(--text-xs);
  font-weight: 700;
  padding: 3px 14px;
  border-radius: var(--radius-full);
  color: #fff;
  letter-spacing: .05em;
  text-transform: uppercase;
  box-shadow: 0 2px 8px rgba(0,0,0,.22);
}
.hc-imc-empty {
  font-size: var(--text-sm);
  color: var(--color-text-low);
  text-align: center;
  padding: var(--space-3) 0 var(--space-2);
  font-style: italic;
}

/* ══ IMC Meter — barra cromática inline ══════════════════════════════════════ */
.hc-imc-meter {
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface-raised);
  border: 1px solid var(--color-divider);
  animation: fade-in .2s both;
}
.hc-imc-meter__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-2);
  gap: var(--space-2);
}
.hc-imc-meter__reading {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.hc-imc-meter__num {
  font-size: var(--text-xl);
  font-weight: 800;
  letter-spacing: -.03em;
  line-height: 1;
}
.hc-imc-meter__unit {
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-text-low);
}
.hc-imc-meter__zone {
  font-size: var(--text-xs);
  font-weight: 700;
  padding: 2px 10px;
  border-radius: var(--radius-full);
  color: #fff;
  letter-spacing: .04em;
  text-transform: uppercase;
  box-shadow: 0 1px 6px rgba(0,0,0,.2);
  white-space: nowrap;
}
/* Barra de gradiente */
.hc-imc-track {
  position: relative;
  height: 10px;
  border-radius: var(--radius-full);
  background: linear-gradient(90deg,
    #4ECDC4 0%,        /* bajo peso */
    #2ECC71 22%,       /* normal inicio */
    #2ECC71 43%,       /* normal fin */
    #F1C40F 58%,       /* sobrepeso */
    #E67E22 72%,       /* obesidad I */
    #E74C3C 85%,       /* obesidad II */
    #C0392B 100%       /* obesidad III */
  );
  box-shadow: inset 0 1px 3px rgba(0,0,0,.15);
  overflow: visible;
}
/* Indicador flotante sobre la barra */
.hc-imc-thumb {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--color-surface);
  border: 3px solid #fff;
  box-shadow:
    0 0 0 2px rgba(0,0,0,.18),
    0 2px 8px rgba(0,0,0,.22);
  transition: left 0.4s ease;
  pointer-events: none;
  z-index: 1;
}
/* Tic-marks de umbrales */
.hc-imc-ticks {
  display: flex;
  justify-content: space-between;
  margin-top: 5px;
  padding-inline: 2px;
}
.hc-imc-tick {
  font-size: 0.6rem;
  color: var(--color-text-low);
  font-weight: 600;
  letter-spacing: 0;
}

/* ══ Formulario ══════════════════════════════════════════════════════════════ */
.hc-form-section {
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  padding: var(--space-5) var(--space-5);
  box-shadow: var(--shadow-sm);
  margin-bottom: var(--space-6);
  position: relative;
  overflow: hidden;
}
.hc-form-section::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: linear-gradient(90deg,
    var(--color-primary-dark),
    var(--color-primary),
    var(--color-primary-light));
}
.hc-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin-top: var(--space-1);
}
.hc-g2 { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
.hc-g3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3); }
.hc-g4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-3); }
@media (max-width: 540px) {
  .hc-g2 { grid-template-columns: 1fr; }
  .hc-g3 { grid-template-columns: 1fr 1fr; }
  .hc-g4 { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 380px) {
  .hc-g3, .hc-g4 { grid-template-columns: 1fr; }
}

/* Campo individual */
.hf {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.hf label {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--color-text-mid);
  text-transform: uppercase;
  letter-spacing: .06em;
  user-select: none;
  display: flex;
  align-items: center;
  gap: var(--space-1);
}
.hf input, .hf textarea {
  padding: var(--space-3) var(--space-3);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  color: var(--color-text-high);
  font-size: var(--text-sm);
  line-height: 1.4;
  -webkit-appearance: none;
  appearance: none;
  transition:
    border-color var(--transition-fast),
    box-shadow   var(--transition-fast),
    background   var(--transition-fast);
}
.hf input:focus, .hf textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(46,125,50,.14);
  background: var(--color-surface);
}
.hf textarea {
  resize: vertical;
  min-height: 68px;
}
.hf input[type="date"]::-webkit-calendar-picker-indicator {
  filter: invert(.4);
  cursor: pointer;
}

/* Separador de sección */
.hc-form-divider {
  height: 1px;
  background: var(--color-divider);
  margin-block: var(--space-1);
}
.hc-subsection-label {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: .07em;
  text-transform: uppercase;
  color: var(--color-text-low);
  margin-bottom: var(--space-1);
}

/* Botón submit premium */
.hc-submit {
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
  font-size: var(--text-sm);
  font-weight: 700;
  letter-spacing: -.01em;
  box-shadow:
    0 4px 16px rgba(46,125,50,.38),
    0 2px 6px  rgba(0,0,0,.12);
  transition:
    background-position 350ms ease,
    transform           var(--transition-fast),
    box-shadow          var(--transition-fast),
    opacity             var(--transition-fast);
}
.hc-submit:hover:not(:disabled) {
  background-position: 100% center;
  transform: translateY(-2px);
  box-shadow:
    0 8px 28px rgba(46,125,50,.48),
    0 4px 12px rgba(0,0,0,.15);
}
.hc-submit:active:not(:disabled) {
  transform: translateY(0) scale(0.98);
}
.hc-submit:disabled {
  opacity: .55;
  cursor: not-allowed;
  transform: none !important;
}
.hc-saved-notice {
  font-size: var(--text-xs);
  color: var(--color-success);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  animation: fade-in .2s both;
}

/* ══ Timeline ════════════════════════════════════════════════════════════════ */
.hc-timeline {
  position: relative;
  padding-left: var(--space-8);
}
/* Línea vertical degradada */
.hc-timeline::before {
  content: '';
  position: absolute;
  left: 10px;
  top: 12px;
  bottom: 12px;
  width: 2px;
  background: linear-gradient(
    to bottom,
    var(--color-primary-light) 0%,
    var(--color-primary)       30%,
    var(--color-divider)       80%,
    transparent                100%
  );
  border-radius: 1px;
}

/* Item: invisible y abajo → visible con IntersectionObserver */
.tl-item {
  position: relative;
  margin-bottom: var(--space-5);
  opacity: 0;
  transform: translate3d(0, 24px, 0);
  transition: opacity .45s ease, transform .45s ease;
  will-change: transform, opacity;
}
.tl-item--visible {
  opacity: 1;
  transform: translate3d(0, 0, 0);
}

/* Punto en la línea */
.tl-dot {
  position: absolute;
  left: calc(-1 * var(--space-8) + 4px);
  top: 18px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--color-primary);
  border: 2.5px solid var(--color-bg);
  box-shadow: 0 0 0 2.5px var(--color-primary);
  z-index: 1;
  transition: background .3s ease, box-shadow .3s ease;
}

/* Tarjeta de la timeline */
.tl-card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border-left: 3px solid var(--color-primary-light);
  padding: var(--space-4) var(--space-4) var(--space-3);
  box-shadow: var(--shadow-sm);
  transition:
    box-shadow var(--transition-fast),
    transform  var(--transition-fast);
}
.tl-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateX(3px);
}
.tl-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  flex-wrap: wrap;
}
.tl-card__date {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--color-primary);
  text-transform: capitalize;
  line-height: 1.3;
}
.tl-imc-badge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: var(--radius-full);
  color: #fff;
  white-space: nowrap;
  box-shadow: 0 1px 5px rgba(0,0,0,.22);
}
.tl-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}
.tl-metric {
  background: var(--color-surface-raised);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3);
}
.tl-metric__val {
  font-size: var(--text-sm);
  font-weight: 700;
  line-height: 1.2;
  color: var(--color-text-high);
  font-variant-numeric: tabular-nums;
}
.tl-metric__lbl {
  font-size: .6rem;
  color: var(--color-text-low);
  text-transform: uppercase;
  letter-spacing: .06em;
  margin-top: 2px;
}
.tl-card__notas {
  font-size: var(--text-sm);
  color: var(--color-text-mid);
  font-style: italic;
  margin-top: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-divider);
  line-height: 1.55;
}
.tl-sync {
  font-size: var(--text-xs);
  color: var(--color-text-low);
  margin-top: var(--space-2);
  display: flex;
  align-items: center;
  gap: 4px;
}
.tl-empty {
  text-align: center;
  padding: var(--space-12) 0;
  color: var(--color-text-low);
  animation: fade-in var(--transition-slow) both;
}
.tl-empty__icon {
  font-size: 2.8rem;
  margin-bottom: var(--space-3);
  filter: grayscale(.3);
}
.tl-empty__title {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-text-mid);
  margin-bottom: var(--space-1);
}
.tl-empty__hint {
  font-size: var(--text-sm);
  color: var(--color-text-low);
}
`

function injectStyles() {
  if (typeof document === 'undefined') return
  if (document.getElementById('hc-styles-v3')) return
  const el = document.createElement('style')
  el.id = 'hc-styles-v3'
  el.textContent = COMPONENT_CSS
  document.head.appendChild(el)
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK: useDexieLive — liveQuery ↔ useSyncExternalStore (sin dexie-react-hooks)
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK: useTilt — inclinación 3D con CSS custom properties (sin RAF extra)
// ═══════════════════════════════════════════════════════════════════════════════

function useTilt(maxDeg = 12) {
  const ref = useRef(null)

  const apply = useCallback((rx, ry) => {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--rx', `${rx.toFixed(2)}deg`)
    el.style.setProperty('--ry', `${ry.toFixed(2)}deg`)
  }, [])

  const handleMouseMove = useCallback((e) => {
    const el = ref.current
    if (!el) return
    const { left, top, width, height } = el.getBoundingClientRect()
    const x = e.clientX - left
    const y = e.clientY - top
    apply(
      ((y - height / 2) / (height / 2)) * -maxDeg,
      ((x - width  / 2) / (width  / 2)) *  maxDeg,
    )
  }, [apply, maxDeg])

  const handleTouchMove = useCallback((e) => {
    const el  = ref.current
    const t   = e.touches[0]
    if (!el || !t) return
    const { left, top, width, height } = el.getBoundingClientRect()
    apply(
      ((t.clientY - top  - height / 2) / (height / 2)) * -maxDeg,
      ((t.clientX - left - width  / 2) / (width  / 2)) *  maxDeg,
    )
  }, [apply, maxDeg])

  const reset = useCallback(() => { apply(0, 0) }, [apply])

  return {
    ref,
    onMouseMove:  handleMouseMove,
    onMouseLeave: reset,
    onTouchMove:  handleTouchMove,
    onTouchEnd:   reset,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// IMC — CONSTANTES Y UTILIDADES
// ═══════════════════════════════════════════════════════════════════════════════

//  ViewBox del gauge: 0 0 280 180
//  Centro de la aguja: (140, 152)   Radio del track: 108
//  El arco va de 180° a 360° en sentido HORARIO (sweep=1)
//    · 180° → punto izquierdo  (32, 152)
//    · 270° → punto superior  (140, 44)
//    · 360° → punto derecho   (248, 152)
//  IMC [10, 45] → ángulos [180°, 360°]

const GCX     = 140    // gauge center X
const GCY     = 152    // gauge center Y
const GR      = 108    // radio del track
const IMC_MIN = 10
const IMC_MAX = 45

function imcToAngle(imc) {
  const c = Math.max(IMC_MIN, Math.min(IMC_MAX, imc))
  return 180 + ((c - IMC_MIN) / (IMC_MAX - IMC_MIN)) * 180
}

/** Convierte IMC a porcentaje [0, 100] para la barra horizontal. */
function imcToPct(imc) {
  if (imc == null) return null
  return Math.max(0, Math.min(100, ((imc - IMC_MIN) / (IMC_MAX - IMC_MIN)) * 100))
}

/** Punto SVG cartesiano para ángulo y radio dados. */
function pt(r, deg) {
  const rad = (deg * Math.PI) / 180
  return { x: GCX + r * Math.cos(rad), y: GCY + r * Math.sin(rad) }
}

/** Descripción de arco SVG clockwise (sweep=1). */
function arc(r, a1, a2) {
  const s = pt(r, a1)
  const e = pt(r, a2)
  const large = a2 - a1 > 180 ? 1 : 0
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`
}

/** Zonas de IMC (clasificación OMS). */
const IMC_ZONES = [
  { label: 'Bajo peso',    min: 0,    max: 18.5, color: '#4ECDC4' },
  { label: 'Normal',       min: 18.5, max: 25,   color: '#2ECC71' },
  { label: 'Sobrepeso',    min: 25,   max: 30,   color: '#F1C40F' },
  { label: 'Obesidad I',   min: 30,   max: 35,   color: '#E67E22' },
  { label: 'Obesidad II',  min: 35,   max: 40,   color: '#E74C3C' },
  { label: 'Obesidad III', min: 40,   max: Infinity, color: '#C0392B' },
]

const GAUGE_ZONES = IMC_ZONES.map((z) => {
  const s = Math.max(IMC_MIN, z.min)
  const e = Math.min(IMC_MAX, z.max === Infinity ? IMC_MAX : z.max)
  if (s >= e) return null
  return { ...z, a1: imcToAngle(s), a2: imcToAngle(e) }
}).filter(Boolean)

function getZone(imc) {
  if (imc == null) return null
  return IMC_ZONES.find((z) => imc >= z.min && imc < z.max) ?? IMC_ZONES.at(-1)
}

function calcImc(peso, altura) {
  if (!peso || !altura || altura <= 0) return null
  return peso / ((altura / 100) ** 2)
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO INICIAL DEL FORMULARIO
// ═══════════════════════════════════════════════════════════════════════════════

function buildForm(overrides = {}) {
  return {
    fecha:           new Date().toISOString().slice(0, 10),
    peso:            '',
    altura:          '',
    masaGrasa:       '',
    masaMuscular:    '',
    aguaCorporal:    '',
    cintura:         '',
    cadera:          '',
    presionArterial: '',
    glucosa:         '',
    notas:           '',
    ...overrides,
  }
}

/** Convierte string a number o null si vacío. */
const n = (v) => (v !== '' && v != null ? Number(v) : null)

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function HistoriaClinica({ pacienteId = 'local' }) {
  useEffect(() => { injectStyles() }, [])

  // ── Historial reactivo desde Dexie ──────────────────────────────────────────
  const historias = useDexieLive(
    () =>
      db.historias
        .where('pacienteId').equals(pacienteId)
        .toArray()
        .then((arr) =>
          [...arr].sort((a, b) => b.fecha.localeCompare(a.fecha))
        ),
    [pacienteId],
    [],
  )

  const ultima   = historias[0] ?? null
  const anterior = historias[1] ?? null

  // ── Form local ──────────────────────────────────────────────────────────────
  const [form,      setForm]      = useState(() => buildForm())
  const [guardando, setGuardando] = useState(false)
  const [savedId,   setSavedId]   = useState(null)

  // IMC calculado en tiempo real desde los inputs del form
  const imc  = useMemo(
    () => calcImc(Number(form.peso), Number(form.altura)),
    [form.peso, form.altura],
  )
  const zone = useMemo(() => getZone(imc), [imc])

  const handleChange = useCallback((e) => {
    const { name, value } = e.target
    setForm((p) => ({ ...p, [name]: value }))
    setSavedId(null)
  }, [])

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    // Al menos debe haber peso o grasa para guardar
    if (!form.peso && !form.masaGrasa) return
    setGuardando(true)
    try {
      const id = genId()
      const record = {
        id,
        pacienteId,
        fecha:           form.fecha,
        peso:            n(form.peso),
        altura:          n(form.altura),
        imc:             imc != null ? Math.round(imc * 100) / 100 : null,
        masaGrasa:       n(form.masaGrasa),
        masaMuscular:    n(form.masaMuscular),
        aguaCorporal:    n(form.aguaCorporal),
        cintura:         n(form.cintura),
        cadera:          n(form.cadera),
        presionArterial: form.presionArterial || null,
        glucosa:         n(form.glucosa),
        notas:           form.notas || null,
        sincronizado:    0,
        creadoEn:        new Date().toISOString(),
      }
      await db.historias.add(record)
      await queueSyncTask('historias', 'CREATE', record)
      setSavedId(id)
      // Conservar altura para registros sucesivos de la misma consulta
      setForm(buildForm({ altura: form.altura }))
    } finally {
      setGuardando(false)
    }
  }, [form, imc, pacienteId])

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="hc">

      {/* ── Encabezado ─────────────────────────────────────────────────────── */}
      <div className="hc-header">
        <h1 className="hc-title">Historia Clínica</h1>
        {ultima ? (
          <p className="hc-subtitle">
            Última consulta:{' '}
            {new Date(ultima.fecha + 'T12:00:00').toLocaleDateString('es-AR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        ) : (
          <p className="hc-subtitle">Sin consultas registradas aún</p>
        )}
      </div>

      {/* ── Dashboard de métricas 3D ────────────────────────────────────────── */}
      <p className="hc-section-title">
        <span>Métricas actuales</span>
      </p>
      <div className="hc-dashboard">
        <MetricCard
          variant="peso"
          icon="⚖️"
          label="Peso"
          value={ultima?.peso}
          unit="kg"
          prev={anterior?.peso}
          lowerIsBetter
        />
        <MetricCard
          variant="grasa"
          icon="🔥"
          label="Masa Grasa"
          value={ultima?.masaGrasa}
          unit="%"
          prev={anterior?.masaGrasa}
          lowerIsBetter
        />
        <MetricCard
          variant="musculo"
          icon="💪"
          label="Músculo"
          value={ultima?.masaMuscular}
          unit="%"
          prev={anterior?.masaMuscular}
          lowerIsBetter={false}
        />
      </div>

      {/* ── Gauge IMC (medidor semicircular) ───────────────────────────────── */}
      <div className="hc-gauge-section">
        <p className="hc-section-title" style={{ marginBottom: 'var(--space-1)' }}>
          <span>Índice de Masa Corporal</span>
        </p>
        <ImcGauge imc={imc} zone={zone} />
      </div>

      {/* ── Formulario de nueva consulta ────────────────────────────────────── */}
      <div className="hc-form-section">
        <p className="hc-section-title" style={{ marginBottom: 'var(--space-4)' }}>
          <span>Registrar consulta</span>
        </p>

        <form className="hc-form" onSubmit={handleSubmit} noValidate>

          {/* Fecha */}
          <div className="hc-g2">
            <HField
              id="fecha" name="fecha" label="📅 Fecha" type="date"
              value={form.fecha} onChange={handleChange}
            />
            <div /> {/* espacio */}
          </div>

          {/* Peso y Altura */}
          <div className="hc-g2">
            <HField
              id="peso" name="peso" label="⚖️ Peso (kg)"
              type="number" min="0" max="500" step="0.1"
              placeholder="70.5" inputMode="decimal"
              value={form.peso} onChange={handleChange}
            />
            <HField
              id="altura" name="altura" label="📏 Altura (cm)"
              type="number" min="0" max="300" step="0.5"
              placeholder="170" inputMode="decimal"
              value={form.altura} onChange={handleChange}
            />
          </div>

          {/* IMC en tiempo real — medidor cromático inline */}
          {imc != null && (
            <ImcMeter imc={imc} zone={zone} />
          )}

          {/* % Grasa y % Músculo */}
          <div className="hc-g2">
            <HField
              id="masaGrasa" name="masaGrasa" label="🔥 Grasa (%)"
              type="number" min="0" max="100" step="0.1"
              placeholder="22.0" inputMode="decimal"
              value={form.masaGrasa} onChange={handleChange}
            />
            <HField
              id="masaMuscular" name="masaMuscular" label="💪 Músculo (%)"
              type="number" min="0" max="100" step="0.1"
              placeholder="38.0" inputMode="decimal"
              value={form.masaMuscular} onChange={handleChange}
            />
          </div>

          {/* ── Campos secundarios ── */}
          <div className="hc-form-divider" />
          <p className="hc-subsection-label">Datos adicionales (opcional)</p>

          <div className="hc-g3">
            <HField
              id="aguaCorporal" name="aguaCorporal" label="💧 Agua (%)"
              type="number" min="0" max="100" step="0.1"
              placeholder="55.0" inputMode="decimal"
              value={form.aguaCorporal} onChange={handleChange}
            />
            <HField
              id="cintura" name="cintura" label="📐 Cintura (cm)"
              type="number" min="0" step="0.5"
              placeholder="80" inputMode="decimal"
              value={form.cintura} onChange={handleChange}
            />
            <HField
              id="cadera" name="cadera" label="📐 Cadera (cm)"
              type="number" min="0" step="0.5"
              placeholder="95" inputMode="decimal"
              value={form.cadera} onChange={handleChange}
            />
          </div>

          <div className="hc-g2">
            <HField
              id="presionArterial" name="presionArterial" label="🩺 Presión arterial"
              placeholder="120/80"
              value={form.presionArterial} onChange={handleChange}
            />
            <HField
              id="glucosa" name="glucosa" label="🩸 Glucosa (mg/dL)"
              type="number" min="0" step="1"
              placeholder="95" inputMode="numeric"
              value={form.glucosa} onChange={handleChange}
            />
          </div>

          <div className="hf">
            <label htmlFor="notas">📝 Notas clínicas</label>
            <textarea
              id="notas" name="notas"
              placeholder="Observaciones, estado general, indicaciones…"
              value={form.notas}
              onChange={handleChange}
              rows={3}
            />
          </div>

          {/* Footer de acciones */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-4)',
            flexWrap: 'wrap',
          }}>
            <button
              type="submit"
              className="hc-submit"
              disabled={guardando || (!form.peso && !form.masaGrasa)}
            >
              {guardando ? (
                <>
                  <IconSpinner />
                  <span>Guardando…</span>
                </>
              ) : (
                <>
                  <IconSave />
                  <span>Guardar consulta</span>
                </>
              )}
            </button>

            {savedId && (
              <span className="hc-saved-notice">
                <IconCheck />
                Guardado localmente · en cola de sync
              </span>
            )}
          </div>

        </form>
      </div>

      {/* ── Timeline de historial ───────────────────────────────────────────── */}
      <p className="hc-section-title">
        <span>Historial de consultas</span>
      </p>
      <Timeline historias={historias} />

    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MetricCard — tarjeta 3D tilt con perspectiva interactiva
// ═══════════════════════════════════════════════════════════════════════════════

function MetricCard({ variant, icon, label, value, unit, prev, lowerIsBetter }) {
  const tilt = useTilt(12)

  const trend = useMemo(() => {
    if (value == null || prev == null) return null
    const diff = value - prev
    if (Math.abs(diff) < 0.009) return null
    const up     = diff > 0
    const isGood = lowerIsBetter ? !up : up
    return {
      arrow: up ? '↑' : '↓',
      label: `${up ? '+' : ''}${diff.toFixed(1)} ${unit}`,
      good:  isGood,
    }
  }, [value, prev, unit, lowerIsBetter])

  return (
    <div
      className={`mc mc--${variant}`}
      ref={tilt.ref}
      onMouseMove={tilt.onMouseMove}
      onMouseLeave={tilt.onMouseLeave}
      onTouchMove={tilt.onTouchMove}
      onTouchEnd={tilt.onTouchEnd}
      aria-label={`${label}: ${value != null ? `${value.toFixed(1)} ${unit}` : 'Sin datos'}`}
    >
      <div className="mc__inner">
        <div className="mc__icon" aria-hidden="true">{icon}</div>
        <div className="mc__label">{label}</div>
        <div className="mc__value">
          {value != null ? (
            <>
              {value.toFixed(1)}
              <span className="mc__unit">{unit}</span>
            </>
          ) : (
            '—'
          )}
        </div>
        {trend && (
          <div
            className="mc__trend"
            style={{ color: trend.good ? 'rgba(255,255,255,.9)' : 'rgba(255,180,180,.9)' }}
            aria-label={`${trend.label} respecto a consulta anterior`}
          >
            <span aria-hidden="true">{trend.arrow}</span>
            <span>{trend.label}</span>
          </div>
        )}
        {value == null && (
          <div className="mc__empty">Sin datos aún</div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ImcGauge — medidor SVG semicircular con aguja cromática
// ═══════════════════════════════════════════════════════════════════════════════

function ImcGauge({ imc, zone }) {
  const needleAngle = imc != null ? imcToAngle(imc) : 180

  return (
    <div className="hc-gauge-wrap">
      <svg
        className="hc-gauge-svg"
        viewBox="0 0 280 180"
        aria-label={
          imc != null
            ? `IMC: ${imc.toFixed(1)} — ${zone?.label ?? ''}`
            : 'Ingresá peso y altura para calcular el IMC'
        }
        role="img"
      >
        <defs>
          {/* Gradiente cromático de la aguja */}
          <linearGradient id="hc-ng" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="rgba(255,255,255,0)" />
            <stop offset="30%"  stopColor="rgba(255,255,255,.45)" />
            <stop offset="100%" stopColor={zone?.color ?? '#9E9E9E'} />
          </linearGradient>
          {/* Glow de la punta */}
          <filter id="hc-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Sombra del hub */}
          <filter id="hc-hub-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodOpacity=".22" />
          </filter>
        </defs>

        {/* Track fondo */}
        <path
          d={arc(GR, 180, 360)}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth="30"
          strokeLinecap="round"
        />

        {/* Segmentos cromáticos por zona */}
        {GAUGE_ZONES.map((z, i) => (
          <path
            key={i}
            d={arc(GR, z.a1, z.a2)}
            fill="none"
            stroke={z.color}
            strokeWidth="30"
            strokeLinecap={
              i === 0
                ? 'round'
                : i === GAUGE_ZONES.length - 1
                  ? 'round'
                  : 'butt'
            }
            opacity=".88"
          />
        ))}

        {/* Anillo interior — efecto de profundidad */}
        <path
          d={arc(GR - 16, 182, 358)}
          fill="none"
          stroke="var(--color-surface)"
          strokeWidth="2.5"
          opacity=".38"
        />

        {/* Marcas de umbral */}
        {[18.5, 25, 30, 35].map((v) => {
          const a   = imcToAngle(v)
          const tip = pt(GR + 5,  a)
          const lbl = pt(GR + 23, a)
          return (
            <g key={v}>
              <circle cx={tip.x} cy={tip.y} r="2" fill="rgba(255,255,255,.65)" />
              <text
                x={lbl.x} y={lbl.y + 3}
                textAnchor="middle"
                fill="var(--color-text-low)"
                fontSize="8"
                fontWeight="600"
                fontFamily="var(--font-sans)"
              >
                {v}
              </text>
            </g>
          )
        })}

        {/* Sombra de la aguja */}
        <line
          className="gauge-needle-shadow"
          x1={GCX} y1={GCY}
          x2={GCX + GR - 12} y2={GCY}
          stroke="rgba(0,0,0,.15)"
          strokeWidth="7"
          strokeLinecap="round"
          style={{ transform: `rotate(${needleAngle}deg)`, filter: 'blur(3px)' }}
        />

        {/* Aguja cromática */}
        <line
          className="gauge-needle"
          x1={GCX - 10} y1={GCY}
          x2={GCX + GR - 8} y2={GCY}
          stroke="url(#hc-ng)"
          strokeWidth="3.5"
          strokeLinecap="round"
          filter="url(#hc-glow)"
          style={{ transform: `rotate(${needleAngle}deg)` }}
        />

        {/* Hub central */}
        <circle cx={GCX} cy={GCY} r="10" fill="var(--color-surface)" filter="url(#hc-hub-shadow)" />
        <circle cx={GCX} cy={GCY} r="6"  fill={zone?.color ?? 'var(--color-border)'} />
        <circle cx={GCX} cy={GCY} r="2"  fill="rgba(255,255,255,.55)" />

        {/* Etiqueta central inferior */}
        <text
          x={GCX} y={GCY + 28}
          textAnchor="middle"
          fill="var(--color-text-low)"
          fontSize="10"
          fontFamily="var(--font-sans)"
          fontWeight="500"
        >
          {imc != null ? `${imc.toFixed(1)} kg/m²` : 'Completá peso y altura'}
        </text>
      </svg>

      {/* Badge debajo del gauge */}
      {imc != null ? (
        <div className="hc-imc-badge">
          <span
            className="hc-imc-value"
            style={{ color: zone?.color ?? 'var(--color-text-high)' }}
          >
            {imc.toFixed(1)}
          </span>
          <span className="hc-imc-label" style={{ background: zone?.color }}>
            {zone?.label}
          </span>
        </div>
      ) : (
        <p className="hc-imc-empty">Ingresá peso y altura para ver el IMC</p>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ImcMeter — barra cromática inline (feedback en tiempo real en el formulario)
// ═══════════════════════════════════════════════════════════════════════════════

function ImcMeter({ imc, zone }) {
  const pct = imcToPct(imc)

  return (
    <div className="hc-imc-meter" role="status" aria-live="polite">
      <div className="hc-imc-meter__top">
        <div className="hc-imc-meter__reading">
          <span
            className="hc-imc-meter__num"
            style={{ color: zone?.color ?? 'var(--color-text-high)' }}
          >
            {imc.toFixed(1)}
          </span>
          <span className="hc-imc-meter__unit">kg/m²</span>
        </div>
        <span
          className="hc-imc-meter__zone"
          style={{ background: zone?.color ?? 'var(--color-text-low)' }}
          aria-label={`Clasificación: ${zone?.label ?? ''}`}
        >
          {zone?.label}
        </span>
      </div>

      {/* Barra de gradiente con indicador flotante */}
      <div className="hc-imc-track" aria-hidden="true">
        {pct != null && (
          <div
            className="hc-imc-thumb"
            style={{
              left: `${pct}%`,
              borderColor: zone?.color ?? '#fff',
              boxShadow: `0 0 0 2px ${zone?.color ?? '#999'}, 0 2px 8px rgba(0,0,0,.22)`,
            }}
          />
        )}
      </div>

      {/* Etiquetas de umbrales */}
      <div className="hc-imc-ticks" aria-hidden="true">
        <span className="hc-imc-tick">10</span>
        <span className="hc-imc-tick">18.5</span>
        <span className="hc-imc-tick">25</span>
        <span className="hc-imc-tick">30</span>
        <span className="hc-imc-tick">35</span>
        <span className="hc-imc-tick">40</span>
        <span className="hc-imc-tick">45</span>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Timeline — historial de consultas con IntersectionObserver
// ═══════════════════════════════════════════════════════════════════════════════

function Timeline({ historias }) {
  const containerRef = useRef(null)

  // Anima los items nuevos (no visibles) en cada actualización de la lista
  useEffect(() => {
    const root = containerRef.current
    if (!root) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('tl-item--visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.08, rootMargin: '0px 0px -28px 0px' },
    )

    const items = root.querySelectorAll('.tl-item:not(.tl-item--visible)')
    items.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [historias])

  if (!historias.length) {
    return (
      <div className="tl-empty">
        <div className="tl-empty__icon">📋</div>
        <p className="tl-empty__title">Sin consultas registradas</p>
        <p className="tl-empty__hint">
          Completá el formulario para registrar la primera.
        </p>
      </div>
    )
  }

  return (
    <div className="hc-timeline" ref={containerRef}>
      {historias.map((h, i) => (
        <TimelineItem
          key={h.id}
          historia={h}
          delay={Math.min(i * 50, 250)}
        />
      ))}
    </div>
  )
}

function TimelineItem({ historia: h, delay }) {
  const zone    = h.imc != null ? getZone(h.imc) : null
  const dateStr = new Date(h.fecha + 'T12:00:00').toLocaleDateString('es-AR', {
    weekday: 'long',
    day:     'numeric',
    month:   'long',
    year:    'numeric',
  })

  return (
    <div
      className="tl-item"
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Punto cromático en la línea */}
      <div
        className="tl-dot"
        style={zone ? {
          background: zone.color,
          boxShadow:  `0 0 0 2.5px ${zone.color}55`,
        } : {}}
        aria-hidden="true"
      />

      <article
        className="tl-card"
        style={zone ? { borderLeftColor: zone.color + 'AA' } : {}}
        aria-label={`Consulta del ${dateStr}`}
      >
        <div className="tl-card__header">
          <time className="tl-card__date" dateTime={h.fecha}>{dateStr}</time>
          {zone && h.imc != null && (
            <span
              className="tl-imc-badge"
              style={{ background: zone.color }}
              aria-label={`IMC ${h.imc.toFixed(1)}, ${zone.label}`}
            >
              IMC {h.imc.toFixed(1)} · {zone.label}
            </span>
          )}
        </div>

        {/* Grid de métricas */}
        <div className="tl-metrics">
          {h.peso          != null && <TlMetric v={`${h.peso} kg`}       l="Peso"      />}
          {h.masaGrasa     != null && <TlMetric v={`${h.masaGrasa}%`}    l="Grasa"     />}
          {h.masaMuscular  != null && <TlMetric v={`${h.masaMuscular}%`} l="Músculo"   />}
          {h.aguaCorporal  != null && <TlMetric v={`${h.aguaCorporal}%`} l="Agua"      />}
          {h.cintura       != null && <TlMetric v={`${h.cintura} cm`}    l="Cintura"   />}
          {h.cadera        != null && <TlMetric v={`${h.cadera} cm`}     l="Cadera"    />}
          {h.glucosa       != null && <TlMetric v={`${h.glucosa} mg/dL`} l="Glucosa"   />}
          {h.presionArterial       && <TlMetric v={h.presionArterial}    l="Presión"   />}
        </div>

        {/* Notas clínicas */}
        {h.notas && (
          <blockquote className="tl-card__notas">"{h.notas}"</blockquote>
        )}

        {/* Estado de sincronización */}
        <div className="tl-sync" aria-label={h.sincronizado ? 'Sincronizado' : 'Pendiente de sync'}>
          {h.sincronizado
            ? <><IconCheck /> Sincronizado</>
            : <><IconCloud /> Guardado localmente · pendiente de sync</>
          }
        </div>
      </article>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sub-componentes auxiliares
// ═══════════════════════════════════════════════════════════════════════════════

function HField({ id, name, label, ...rest }) {
  return (
    <div className="hf">
      <label htmlFor={id}>{label}</label>
      <input id={id} name={name} {...rest} />
    </div>
  )
}

function TlMetric({ v, l }) {
  return (
    <div className="tl-metric">
      <div className="tl-metric__val">{v}</div>
      <div className="tl-metric__lbl">{l}</div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Micro-íconos SVG (inline, sin dependencias externas)
// ═══════════════════════════════════════════════════════════════════════════════

function IconCheck() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function IconCloud() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
    </svg>
  )
}

function IconSave() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  )
}

function IconSpinner() {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      style={{ animation: 'spin 1s linear infinite' }}
      aria-hidden="true"
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  )
}
