/**
 * HistoriaClinica.jsx — Panel de control clínico premium.
 *
 * Arquitectura visual:
 *   · MetricCard   — efecto 3D tilt con CSS custom props (--rx, --ry)
 *                    calculados por mouse/touch sin requestAnimationFrame ni libs
 *   · ImcGauge     — SVG semicircular con aguja cromática animada
 *                    Matemática: ángulos [180°, 360°] CW mapean IMC [10, 45]
 *                    Transición: cubic-bezier spring (0.34, 1.56, 0.64, 1)
 *   · Timeline     — IntersectionObserver + clase CSS → translate3d(0)
 *                    Delay escalonado para efecto cinemático sin JS de scroll
 *
 * GPU:
 *   will-change: transform   solo en elementos que se animan (cards + needle + tl-items)
 *   backface-visibility: hidden  elimina overhead de repintado del reverso
 *   translateZ(0)  promueve la tarjeta a capa de composición propia
 *
 * Persistencia: tabla `historias` (Dexie v3) + queueSyncTask (outbox at-least-once)
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
// ESTILOS — inyectados una vez; componente auto-contenido (sin CSS Module)
// ═══════════════════════════════════════════════════════════════════════════════

const COMPONENT_CSS = `
/* ── Wrapper principal ───────────────────────────────────────────────── */
.hc {
  max-width: 680px;
  margin-inline: auto;
  padding: var(--space-4);
  padding-bottom: var(--space-10);
}
.hc-section-title {
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--color-primary);
  margin-bottom: var(--space-4);
}

/* ── MetricCard — dashboard 3D ───────────────────────────────────────── */
.hc-dashboard {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}
@media (max-width: 520px) {
  .hc-dashboard { grid-template-columns: 1fr; }
}

.mc {
  position: relative;
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  cursor: default;
  user-select: none;
  overflow: hidden;
  /* GPU: promoted composite layer */
  will-change: transform;
  backface-visibility: hidden;
  transform:
    perspective(1000px)
    rotateX(var(--rx, 0deg))
    rotateY(var(--ry, 0deg))
    translateZ(0);
  transition: transform 0.5s ease, box-shadow 0.5s ease;
  box-shadow: var(--shadow-md);
}
.mc:hover { box-shadow: 0 20px 40px rgba(0,0,0,.22); }

/* Texturas de fondo por variante */
.mc--peso {
  background: linear-gradient(140deg, #1B5E20 0%, #2E7D32 55%, #43A047 100%);
}
.mc--grasa {
  background: linear-gradient(140deg, #BF360C 0%, #E64A19 55%, #FF7043 100%);
}
.mc--musculo {
  background: linear-gradient(140deg, #1A237E 0%, #283593 55%, #3F51B5 100%);
}
/* Grid sutil superpuesto — profundidad sin peso visual */
.mc::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    repeating-linear-gradient(45deg, transparent 0 10px, rgba(255,255,255,.025) 10px 11px),
    repeating-linear-gradient(-45deg, transparent 0 10px, rgba(255,255,255,.015) 10px 11px);
  pointer-events: none;
  border-radius: inherit;
}
/* Brillo en borde superior */
.mc::after {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.4), transparent);
  border-radius: inherit;
}

/* Contenido elevado (translateZ para sensación de profundidad) */
.mc__inner {
  position: relative;
  transform: translateZ(24px);
  color: #fff;
}
.mc__icon {
  font-size: 1.75rem;
  line-height: 1;
  margin-bottom: var(--space-2);
  filter: drop-shadow(0 2px 4px rgba(0,0,0,.3));
}
.mc__label {
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  opacity: .7;
  margin-bottom: var(--space-1);
}
.mc__value {
  font-size: var(--text-3xl);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -.03em;
  margin-bottom: var(--space-2);
  text-shadow: 0 2px 8px rgba(0,0,0,.2);
}
.mc__unit {
  font-size: var(--text-sm);
  font-weight: 400;
  opacity: .65;
  margin-left: 3px;
  letter-spacing: 0;
}
.mc__trend {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: var(--text-xs);
  font-weight: 700;
  padding: 3px 8px;
  border-radius: var(--radius-full);
  background: rgba(255,255,255,.18);
  backdrop-filter: blur(4px);
}
.mc__empty { font-size: var(--text-xs); opacity: .45; }

/* ── IMC Gauge ────────────────────────────────────────────────────────── */
.hc-gauge-section {
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  padding: var(--space-5) var(--space-4) var(--space-4);
  box-shadow: var(--shadow-md);
  margin-bottom: var(--space-5);
  overflow: hidden;
}
.hc-gauge-wrap {
  width: 100%;
  max-width: 300px;
  margin-inline: auto;
}
.hc-gauge-svg { width: 100%; height: auto; overflow: visible; display: block; }

/* Aguja: will-change + transition spring con rebote suave */
.gauge-needle {
  will-change: transform;
  transform-origin: 140px 155px;
  transition: transform .9s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.gauge-needle-shadow {
  will-change: transform;
  transform-origin: 140px 155px;
  transition: transform .9s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.hc-imc-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  margin-top: var(--space-1);
  animation: fade-in .4s both;
}
.hc-imc-value {
  font-size: var(--text-3xl);
  font-weight: 800;
  letter-spacing: -.03em;
  line-height: 1;
}
.hc-imc-label {
  font-size: var(--text-xs);
  font-weight: 700;
  padding: 3px 12px;
  border-radius: var(--radius-full);
  color: #fff;
  letter-spacing: .04em;
  text-transform: uppercase;
  box-shadow: 0 2px 8px rgba(0,0,0,.2);
}
.hc-imc-empty {
  font-size: var(--text-sm);
  color: var(--color-text-low);
  text-align: center;
  padding: var(--space-4) 0;
}

/* ── Formulario ──────────────────────────────────────────────────────── */
.hc-form-section {
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  padding: var(--space-5) var(--space-4);
  box-shadow: var(--shadow-sm);
  margin-bottom: var(--space-5);
}
.hc-form { display: flex; flex-direction: column; gap: var(--space-3); }
.hc-g2 { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
.hc-g3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3); }
@media (max-width: 420px) {
  .hc-g2, .hc-g3 { grid-template-columns: 1fr; }
}
.hf { display: flex; flex-direction: column; gap: 4px; }
.hf label {
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--color-text-mid);
  text-transform: uppercase;
  letter-spacing: .05em;
  user-select: none;
}
.hf input, .hf textarea {
  padding: var(--space-3);
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
  box-shadow: 0 0 0 3px rgba(46,125,50,.15);
  background: var(--color-surface);
}
.hf textarea { resize: vertical; min-height: 64px; }
.hc-submit {
  align-self: flex-start;
  padding: var(--space-3) var(--space-6);
  background: var(--color-primary);
  color: #fff;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 700;
  letter-spacing: .01em;
  box-shadow: 0 4px 14px rgba(46,125,50,.35);
  transition: opacity var(--transition-fast), transform var(--transition-fast), box-shadow var(--transition-fast);
}
.hc-submit:hover:not(:disabled) {
  opacity: .92;
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(46,125,50,.4);
}
.hc-submit:active:not(:disabled) { transform: translateY(0); }
.hc-submit:disabled { opacity: .5; cursor: not-allowed; }
.hc-saved-notice {
  font-size: var(--text-xs);
  color: var(--color-success);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
  animation: fade-in .2s both;
}

/* ── Timeline ────────────────────────────────────────────────────────── */
.hc-timeline {
  position: relative;
  padding-left: var(--space-8);
}
/* Línea vertical de la timeline */
.hc-timeline::before {
  content: '';
  position: absolute;
  left: 11px;
  top: 10px;
  bottom: 10px;
  width: 2px;
  background: linear-gradient(
    to bottom,
    var(--color-primary-light),
    var(--color-divider) 85%,
    transparent
  );
  border-radius: 1px;
}

/* Item: arranca invisible y abajo; entra con translate3d + opacity */
.tl-item {
  position: relative;
  margin-bottom: var(--space-5);
  opacity: 0;
  transform: translate3d(0, 28px, 0);
  transition:
    opacity  .5s ease,
    transform .5s ease;
  will-change: transform, opacity;
}
.tl-item--visible {
  opacity: 1;
  transform: translate3d(0, 0, 0);
}

/* Punto en la línea */
.tl-dot {
  position: absolute;
  left: calc(-1 * var(--space-8) + 5px);
  top: 16px;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: var(--color-primary);
  border: 2.5px solid var(--color-bg);
  box-shadow: 0 0 0 2px var(--color-primary);
  z-index: 1;
  transition: background .3s, box-shadow .3s;
}

/* Tarjeta de la timeline */
.tl-card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  border-left: 3px solid var(--color-primary-light);
  box-shadow: var(--shadow-sm);
  transition: box-shadow var(--transition-fast), transform var(--transition-fast);
}
.tl-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateX(2px);
}
.tl-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  flex-wrap: wrap;
}
.tl-card__date {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--color-primary);
  text-transform: capitalize;
}
.tl-imc-badge {
  font-size: var(--text-xs);
  font-weight: 700;
  padding: 2px 9px;
  border-radius: var(--radius-full);
  color: #fff;
  white-space: nowrap;
  box-shadow: 0 1px 4px rgba(0,0,0,.2);
}
.tl-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}
.tl-metric {
  background: var(--color-surface-raised);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3);
}
.tl-metric__val { font-size: var(--text-base); font-weight: 700; line-height: 1.2; }
.tl-metric__lbl {
  font-size: .6rem;
  color: var(--color-text-low);
  text-transform: uppercase;
  letter-spacing: .05em;
  margin-top: 1px;
}
.tl-card__notas {
  font-size: var(--text-sm);
  color: var(--color-text-mid);
  font-style: italic;
  margin-top: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-divider);
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
  padding: var(--space-10) 0;
  color: var(--color-text-low);
}
.tl-empty__icon { font-size: 2.5rem; margin-bottom: var(--space-3); }
`

function injectStyles() {
  if (typeof document === 'undefined') return
  if (document.getElementById('hc-styles')) return
  const el = document.createElement('style')
  el.id = 'hc-styles'
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
// HOOK: useTilt — inclinación 3D con CSS custom properties
// ═══════════════════════════════════════════════════════════════════════════════

function useTilt() {
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
      ((y - height / 2) / (height / 2)) * -11,
      ((x - width  / 2) / (width  / 2)) *  11,
    )
  }, [apply])

  const handleTouchMove = useCallback((e) => {
    const el = ref.current
    const touch = e.touches[0]
    if (!el || !touch) return
    const { left, top, width, height } = el.getBoundingClientRect()
    apply(
      ((touch.clientY - top  - height / 2) / (height / 2)) * -11,
      ((touch.clientX - left - width  / 2) / (width  / 2)) *  11,
    )
  }, [apply])

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
// CONSTANTES DE GAUGE
// ═══════════════════════════════════════════════════════════════════════════════

//  ViewBox: 0 0 280 185
//  Centro de la aguja: (140, 155)
//  Radio del track externo: 110  →  los arcos de color tienen stroke-width 28
//  El arco va de 180° a 360° en sentido HORARIO (sweep=1, CW).
//    · 180° → (-1, 0) → punto LEFT  (30, 155)
//    · 270° → ( 0,-1) → punto TOP   (140, 45)  [porque sin(270°)=-1 y y↓]
//    · 360° → ( 1, 0) → punto RIGHT (250, 155)
//  IMC [10, 45] → ángulos [180°, 360°], fórmula: 180 + ((imc-10)/35)*180

const GCX   = 140   // gauge center X
const GCY   = 155   // gauge center Y
const GR    = 110   // radio del track

const IMC_MIN = 10
const IMC_MAX = 45

function imcToAngle(imc) {
  const c = Math.max(IMC_MIN, Math.min(IMC_MAX, imc))
  return 180 + ((c - IMC_MIN) / (IMC_MAX - IMC_MIN)) * 180
}

// Punto en coordenadas cartesianas SVG para un radio y ángulo dados
function pt(r, deg) {
  const rad = (deg * Math.PI) / 180
  return { x: GCX + r * Math.cos(rad), y: GCY + r * Math.sin(rad) }
}

// Descripción de arco SVG (CW: sweep=1)
function arc(r, a1, a2) {
  const s = pt(r, a1)
  const e = pt(r, a2)
  const large = a2 - a1 > 180 ? 1 : 0
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`
}

// Zonas del IMC con sus ángulos precalculados
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
  return IMC_ZONES.find((z) => imc >= z.min && imc < z.max) ?? IMC_ZONES.at(-1)
}

function calcImc(peso, altura) {
  if (!peso || !altura || altura <= 0) return null
  return peso / ((altura / 100) ** 2)
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORM
// ═══════════════════════════════════════════════════════════════════════════════

const FORM_INIT = {
  fecha:           () => new Date().toISOString().slice(0, 10),
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
}

const buildForm = (overrides = {}) => ({
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
})

const n = (v) => (v !== '' ? Number(v) : null)

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function HistoriaClinica({ pacienteId = 'local' }) {
  useEffect(() => { injectStyles() }, [])

  // ── Carga reactiva desde Dexie ──────────────────────────────────────────────
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

  const ultima   = historias[0]  ?? null
  const anterior = historias[1]  ?? null

  // ── Form ────────────────────────────────────────────────────────────────────
  const [form,      setForm]      = useState(() => buildForm())
  const [guardando, setGuardando] = useState(false)
  const [savedId,   setSavedId]   = useState(null)

  const imc  = useMemo(() => calcImc(Number(form.peso), Number(form.altura)), [form.peso, form.altura])
  const zone = imc ? getZone(imc) : null

  const handleChange = useCallback((e) => {
    const { name, value } = e.target
    setForm((p) => ({ ...p, [name]: value }))
    setSavedId(null)
  }, [])

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
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
      // Mantener altura entre registros consecutivos
      setForm(buildForm({ altura: form.altura }))
    } finally {
      setGuardando(false)
    }
  }, [form, imc, pacienteId])

  return (
    <div className="hc">

      {/* ── Encabezado ── */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{
          fontSize: 'var(--text-2xl)',
          fontWeight: 800,
          letterSpacing: '-.02em',
          lineHeight: 1.1,
        }}>
          Historia Clínica
        </h1>
        {ultima && (
          <p style={{
            color: 'var(--color-text-mid)',
            fontSize: 'var(--text-sm)',
            marginTop: 'var(--space-1)',
          }}>
            Última consulta:{' '}
            {new Date(ultima.fecha + 'T12:00:00').toLocaleDateString('es-AR', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>
        )}
      </div>

      {/* ── Dashboard de métricas ── */}
      <p className="hc-section-title">Métricas actuales</p>
      <div className="hc-dashboard">
        <MetricCard
          variant="peso"  icon="⚖️"  label="Peso"
          value={ultima?.peso}  unit="kg"  prev={anterior?.peso}
          lowerIsBetter
        />
        <MetricCard
          variant="grasa"  icon="🔥"  label="Masa Grasa"
          value={ultima?.masaGrasa}  unit="%"  prev={anterior?.masaGrasa}
          lowerIsBetter
        />
        <MetricCard
          variant="musculo"  icon="💪"  label="Músculo"
          value={ultima?.masaMuscular}  unit="%"  prev={anterior?.masaMuscular}
          lowerIsBetter={false}
        />
      </div>

      {/* ── Gauge IMC ── */}
      <div className="hc-gauge-section">
        <p className="hc-section-title" style={{ marginBottom: 'var(--space-1)' }}>
          Índice de masa corporal
        </p>
        <ImcGauge imc={imc} zone={zone} />
      </div>

      {/* ── Formulario ── */}
      <div className="hc-form-section">
        <p className="hc-section-title">Registrar consulta</p>
        <form className="hc-form" onSubmit={handleSubmit} noValidate>

          <div className="hc-g2">
            <HField id="fecha" name="fecha" label="Fecha" type="date"
              value={form.fecha} onChange={handleChange} />
            <div />
          </div>

          <div className="hc-g2">
            <HField id="peso" name="peso" label="Peso (kg)" type="number"
              min="0" max="500" step="0.1" placeholder="70.5" inputMode="decimal"
              value={form.peso} onChange={handleChange} />
            <HField id="altura" name="altura" label="Altura (cm)" type="number"
              min="0" max="300" step="0.5" placeholder="170" inputMode="decimal"
              value={form.altura} onChange={handleChange} />
          </div>

          {/* Preview IMC en tiempo real */}
          {imc && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-md)',
              background: zone ? zone.color + '22' : 'var(--color-surface-raised)',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              animation: 'fade-in .2s both',
            }}>
              <span style={{ color: zone?.color ?? 'inherit' }}>
                IMC {imc.toFixed(1)}
              </span>
              <span style={{
                padding: '1px 8px',
                borderRadius: 'var(--radius-full)',
                background: zone?.color,
                color: '#fff',
                fontSize: 'var(--text-xs)',
              }}>
                {zone?.label}
              </span>
            </div>
          )}

          <div className="hc-g3">
            <HField id="masaGrasa" name="masaGrasa" label="Grasa (%)" type="number"
              min="0" max="100" step="0.1" placeholder="22" inputMode="decimal"
              value={form.masaGrasa} onChange={handleChange} />
            <HField id="masaMuscular" name="masaMuscular" label="Músculo (%)" type="number"
              min="0" max="100" step="0.1" placeholder="38" inputMode="decimal"
              value={form.masaMuscular} onChange={handleChange} />
            <HField id="aguaCorporal" name="aguaCorporal" label="Agua (%)" type="number"
              min="0" max="100" step="0.1" placeholder="55" inputMode="decimal"
              value={form.aguaCorporal} onChange={handleChange} />
          </div>

          <div className="hc-g3">
            <HField id="cintura" name="cintura" label="Cintura (cm)" type="number"
              min="0" step="0.5" placeholder="80" inputMode="decimal"
              value={form.cintura} onChange={handleChange} />
            <HField id="cadera" name="cadera" label="Cadera (cm)" type="number"
              min="0" step="0.5" placeholder="95" inputMode="decimal"
              value={form.cadera} onChange={handleChange} />
            <HField id="glucosa" name="glucosa" label="Glucosa (mg/dL)" type="number"
              min="0" step="1" placeholder="95" inputMode="numeric"
              value={form.glucosa} onChange={handleChange} />
          </div>

          <div className="hc-g2">
            <HField id="presionArterial" name="presionArterial"
              label="Presión arterial" placeholder="120/80"
              value={form.presionArterial} onChange={handleChange} />
            <div />
          </div>

          <div className="hf">
            <label htmlFor="notas">Notas clínicas</label>
            <textarea
              id="notas" name="notas"
              placeholder="Observaciones, indicaciones, estado general…"
              value={form.notas} onChange={handleChange}
              rows={3}
            />
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            flexWrap: 'wrap',
          }}>
            <button type="submit" className="hc-submit" disabled={guardando}>
              {guardando ? 'Guardando…' : 'Registrar consulta'}
            </button>
            {savedId && (
              <span className="hc-saved-notice">
                <IconCheck /> Guardado localmente
              </span>
            )}
          </div>
        </form>
      </div>

      {/* ── Timeline ── */}
      <p className="hc-section-title">Historial de consultas</p>
      <Timeline historias={historias} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MetricCard — tarjeta 3D tilt
// ═══════════════════════════════════════════════════════════════════════════════

function MetricCard({ variant, icon, label, value, unit, prev, lowerIsBetter }) {
  const tilt = useTilt()

  const trend = useMemo(() => {
    if (value == null || prev == null) return null
    const diff = value - prev
    if (Math.abs(diff) < 0.01) return null
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
    >
      <div className="mc__inner">
        <div className="mc__icon" aria-hidden="true">{icon}</div>
        <div className="mc__label">{label}</div>
        <div className="mc__value">
          {value != null
            ? <>{value.toFixed(1)}<span className="mc__unit">{unit}</span></>
            : '—'}
        </div>
        {trend && (
          <div
            className="mc__trend"
            style={{ color: trend.good ? 'rgba(255,255,255,.92)' : 'rgba(255,190,190,.9)' }}
            aria-label={`${trend.label} respecto a consulta anterior`}
          >
            <span aria-hidden="true">{trend.arrow}</span>
            <span>{trend.label}</span>
          </div>
        )}
        {value == null && <div className="mc__empty">Sin datos aún</div>}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ImcGauge — medidor SVG semicircular con aguja cromática
// ═══════════════════════════════════════════════════════════════════════════════

function ImcGauge({ imc, zone }) {
  // Ángulo del IMC en [180°, 360°]; en reposo (sin IMC) la aguja descansa en 180°
  const needleAngle = imc != null ? imcToAngle(imc) : 180

  return (
    <div className="hc-gauge-wrap">
      <svg
        className="hc-gauge-svg"
        viewBox="0 0 280 185"
        aria-hidden="true"
      >
        <defs>
          {/* Gradiente cromático de la aguja */}
          <linearGradient id="hc-needle-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="rgba(255,255,255,0)" />
            <stop offset="35%"  stopColor="rgba(255,255,255,0.5)" />
            <stop offset="100%" stopColor={zone?.color ?? '#BDBDBD'} />
          </linearGradient>
          {/* Glow suave en la punta */}
          <filter id="hc-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Sombra suave para depth */}
          <filter id="hc-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="1" dy="2" stdDeviation="2" floodOpacity="0.2" />
          </filter>
        </defs>

        {/* Track gris (fondo del arco) */}
        <path
          d={arc(GR, 180, 360)}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth="30"
          strokeLinecap="round"
        />

        {/* Segmentos de color por zona */}
        {GAUGE_ZONES.map((z, i) => (
          <path
            key={i}
            d={arc(GR, z.a1, z.a2)}
            fill="none"
            stroke={z.color}
            strokeWidth="30"
            strokeLinecap={i === 0 ? 'round' : i === GAUGE_ZONES.length - 1 ? 'round' : 'butt'}
            opacity=".88"
          />
        ))}

        {/* Anillo interior — efecto de profundidad */}
        <path
          d={arc(GR - 16, 181, 359)}
          fill="none"
          stroke="var(--color-surface)"
          strokeWidth="3"
          opacity=".45"
        />

        {/* Marcas de umbral IMC */}
        {[18.5, 25, 30, 35].map((v) => {
          const a   = imcToAngle(v)
          const tip = pt(GR + 4,  a)
          const lbl = pt(GR + 22, a)
          return (
            <g key={v}>
              <circle cx={tip.x} cy={tip.y} r="2" fill="rgba(255,255,255,.7)" />
              <text
                x={lbl.x} y={lbl.y + 3}
                textAnchor="middle"
                fill="var(--color-text-low)"
                fontSize="8.5"
                fontWeight="600"
                fontFamily="var(--font-sans)"
              >
                {v}
              </text>
            </g>
          )
        })}

        {/* Sombra de la aguja (depth) */}
        <line
          className="gauge-needle-shadow"
          x1={GCX} y1={GCY}
          x2={GCX + GR - 14} y2={GCY}
          stroke="rgba(0,0,0,.18)"
          strokeWidth="6"
          strokeLinecap="round"
          style={{ transform: `rotate(${needleAngle}deg)`, filter: 'blur(3px)' }}
        />

        {/* Aguja cromática */}
        <line
          className="gauge-needle"
          x1={GCX - 9} y1={GCY}
          x2={GCX + GR - 10} y2={GCY}
          stroke="url(#hc-needle-grad)"
          strokeWidth="3.5"
          strokeLinecap="round"
          filter="url(#hc-glow)"
          style={{ transform: `rotate(${needleAngle}deg)` }}
        />

        {/* Hub central */}
        <circle cx={GCX} cy={GCY} r="9"  fill="var(--color-surface)" filter="url(#hc-shadow)" />
        <circle cx={GCX} cy={GCY} r="5"  fill={zone?.color ?? 'var(--color-border)'} />
        <circle cx={GCX} cy={GCY} r="2"  fill="rgba(255,255,255,.6)" />

        {/* Etiqueta de zona central inferior */}
        <text
          x={GCX} y={GCY + 26}
          textAnchor="middle"
          fill="var(--color-text-low)"
          fontSize="10"
          fontFamily="var(--font-sans)"
          fontWeight="500"
        >
          {imc != null ? `${imc.toFixed(1)} kg/m²` : 'Ingresá peso y altura'}
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
        <p className="hc-imc-empty">Completá peso y altura para ver el IMC</p>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Timeline — historial de consultas con animación IntersectionObserver
// ═══════════════════════════════════════════════════════════════════════════════

function Timeline({ historias }) {
  const containerRef = useRef(null)

  // Observar items nuevos (y existentes sin clase visible) cada vez que cambia la lista
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
      { threshold: 0.1, rootMargin: '0px 0px -32px 0px' },
    )

    const items = root.querySelectorAll('.tl-item:not(.tl-item--visible)')
    items.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [historias])

  if (!historias.length) {
    return (
      <div className="tl-empty">
        <div className="tl-empty__icon">📋</div>
        <p>Sin consultas registradas aún</p>
        <p style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--space-1)' }}>
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
          delay={Math.min(i * 55, 280)}
        />
      ))}
    </div>
  )
}

function TimelineItem({ historia: h, delay }) {
  const zone    = h.imc != null ? getZone(h.imc) : null
  const dateStr = new Date(h.fecha + 'T12:00:00').toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div
      className="tl-item"
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Punto de la línea con color de zona */}
      <div
        className="tl-dot"
        style={zone ? {
          background:  zone.color,
          boxShadow:   `0 0 0 2px ${zone.color}44`,
        } : {}}
      />

      <div className="tl-card" style={zone ? { borderLeftColor: zone.color + '88' } : {}}>
        <div className="tl-card__header">
          <span className="tl-card__date">{dateStr}</span>
          {zone && h.imc != null && (
            <span className="tl-imc-badge" style={{ background: zone.color }}>
              IMC {h.imc.toFixed(1)} · {zone.label}
            </span>
          )}
        </div>

        {/* Grid de métricas */}
        <div className="tl-metrics">
          {h.peso          != null && <TlMetric v={`${h.peso} kg`}        l="Peso"     />}
          {h.masaGrasa     != null && <TlMetric v={`${h.masaGrasa}%`}     l="Grasa"    />}
          {h.masaMuscular  != null && <TlMetric v={`${h.masaMuscular}%`}  l="Músculo"  />}
          {h.aguaCorporal  != null && <TlMetric v={`${h.aguaCorporal}%`}  l="Agua"     />}
          {h.cintura       != null && <TlMetric v={`${h.cintura} cm`}     l="Cintura"  />}
          {h.cadera        != null && <TlMetric v={`${h.cadera} cm`}      l="Cadera"   />}
          {h.glucosa       != null && <TlMetric v={`${h.glucosa} mg/dL`}  l="Glucosa"  />}
          {h.presionArterial       && <TlMetric v={h.presionArterial}     l="Presión"  />}
        </div>

        {/* Notas */}
        {h.notas && (
          <p className="tl-card__notas">"{h.notas}"</p>
        )}

        {/* Indicador de sync */}
        <div className="tl-sync">
          {h.sincronizado
            ? <><IconCheck /> Sincronizado</>
            : <><IconCloud /> Guardado localmente</>
          }
        </div>
      </div>
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

// ─── Micro-íconos ─────────────────────────────────────────────────────────────

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
