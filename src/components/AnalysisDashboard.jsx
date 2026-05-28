/**
 * AnalysisDashboard.jsx — Panel de análisis clínico avanzado
 *
 * Layout: CSS Grid nativo 2 columnas simétricas.
 * Gráficos: conic-gradient + mask-image radial → donuts GPU-only, sin librerías JS.
 * Tipografía: Plus Jakarta Sans (ya cargada globalmente via index.css).
 * Costos: motor regional de Posadas integrado via calcularCostoMenu.
 */

import {
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react'
import { liveQuery } from 'dexie'
import { db } from '@/db/database'
import { useUIStore } from '@/store/useUIStore'
import { calcularCostoMenu, parsearCostoTexto } from '@/utils/costos'

// ─── CSS inyectado una sola vez ───────────────────────────────────────────────

const COMPONENT_CSS = `
/* ══ Wrapper ═══════════════════════════════════════════════════════════════ */
.adash {
  max-width: 1060px;
  margin-inline: auto;
  padding: var(--space-5) var(--space-4) var(--space-12);
  animation: fade-in var(--transition-normal) both;
}

/* ══ Header ══════════════════════════════════════════════════════════════════ */
.adash__header {
  margin-bottom: var(--space-6);
}
.adash__patient-name {
  font-size: var(--text-2xl);
  font-weight: 800;
  color: var(--color-text-high);
  letter-spacing: -0.025em;
  line-height: 1.15;
}
.adash__patient-meta {
  font-size: var(--text-sm);
  color: var(--color-text-mid);
  margin-top: var(--space-1);
  line-height: 1.55;
  letter-spacing: 0.01em;
}

/* ══ Section label ════════════════════════════════════════════════════════════ */
.adash__section-label {
  font-size: var(--text-xs);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: var(--color-primary);
  margin-bottom: var(--space-3);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.adash__section-label::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--color-divider);
}

/* ══ Main grid ════════════════════════════════════════════════════════════════ */
.adash__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-5);
  align-items: start;
  margin-bottom: var(--space-5);
}
@media (max-width: 740px) {
  .adash__grid { grid-template-columns: 1fr; }
}

/* ══ Left panel — gráficos ════════════════════════════════════════════════════ */
.adash__left {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.adash__chart-card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-divider);
  box-shadow: 0 4px 20px rgba(255, 208, 185, 0.14);
  padding: var(--space-5) var(--space-5) var(--space-4);
  position: relative;
  overflow: hidden;
  transition: box-shadow var(--transition-fast);
}
.adash__chart-card:hover {
  box-shadow: 0 8px 28px rgba(255, 208, 185, 0.22);
}
.adash__chart-card::before {
  content: '';
  position: absolute;
  inset-block-start: 0;
  inset-inline: 0;
  height: 3px;
  background: linear-gradient(90deg,
    var(--color-durazno-dark), var(--color-durazno), var(--color-amarillo-deep));
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}

.adash__chart-title {
  font-size: var(--text-xs);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: var(--color-text-mid);
  margin-bottom: var(--space-4);
}

/* ══ Donut chart — conic-gradient + mask-image radial ════════════════════════ */
.adash-donut {
  position: relative;
  width: var(--donut-size, 160px);
  height: var(--donut-size, 160px);
  margin-inline: auto;
}

.adash-donut__ring {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  will-change: transform;
  transform: translateZ(0);
}

.adash-donut__center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  padding-inline: 12%;
}

.adash-donut__value {
  font-size: var(--text-xl);
  font-weight: 800;
  color: var(--color-text-high);
  letter-spacing: -0.03em;
  line-height: 1;
  text-align: center;
}

.adash-donut__sub {
  font-size: 0.6rem;
  font-weight: 700;
  color: var(--color-text-low);
  margin-top: 3px;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  text-align: center;
  line-height: 1.3;
}

/* ── Leyenda del donut ── */
.adash-legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-4);
  justify-content: center;
  margin-top: var(--space-4);
}

.adash-legend__item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-xs);
  color: var(--color-text-mid);
  font-weight: 500;
  letter-spacing: 0.01em;
}

.adash-legend__dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* ═══ Right panel — tarjetas médicas ════════════════════════════════════════ */
.adash__right {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}
@media (max-width: 480px) {
  .adash__right { grid-template-columns: 1fr; }
}

/* ── Info card ── */
.adash__card {
  background: #ffffff;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-divider);
  box-shadow:
    0 2px 10px rgba(255, 208, 185, 0.12),
    0 1px 4px  rgba(0, 0, 0, 0.04);
  padding: var(--space-4) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition:
    transform var(--transition-fast),
    box-shadow var(--transition-fast);
}
.adash__card:hover {
  transform: translate3d(0, -2px, 0);
  box-shadow:
    0 8px 24px rgba(255, 208, 185, 0.20),
    0 2px 8px  rgba(0, 0, 0, 0.06);
}
.dark .adash__card { background: var(--color-surface); }

.adash__card--wide {
  grid-column: 1 / -1;
}

.adash__card__label {
  font-size: 0.64rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: var(--color-text-low);
  line-height: 1;
}

.adash__card__value {
  font-size: var(--text-xl);
  font-weight: 800;
  color: var(--color-text-high);
  letter-spacing: -0.03em;
  line-height: 1.15;
  font-variant-numeric: tabular-nums;
}

.adash__card__unit {
  font-size: var(--text-xs);
  font-weight: 400;
  color: var(--color-text-mid);
  letter-spacing: 0;
  margin-inline-start: 2px;
}

.adash__card__badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #fff;
  align-self: flex-start;
  white-space: nowrap;
  line-height: 1.5;
  margin-top: 2px;
}

.adash__card__empty {
  font-size: var(--text-xs);
  color: var(--color-text-disabled);
  font-style: italic;
  font-weight: 400;
}

/* ══ Bloque de costos regionales ═══════════════════════════════════════════ */
.adash__cost {
  background: var(--color-amarillo);
  border: 1px solid var(--color-amarillo-deep);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: var(--space-5);
  box-shadow:
    0 4px 20px rgba(232, 200, 112, 0.24),
    0 1px 6px  rgba(0, 0, 0, 0.04);
}
@media (max-width: 560px) {
  .adash__cost { grid-template-columns: 1fr; }
}

.dark .adash__cost {
  background: var(--color-accent-surface);
  border-color: var(--color-accent-light);
}

.adash__cost__header {
  font-size: 0.64rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: var(--color-warning);
  margin-bottom: var(--space-3);
}

.adash__cost__grid {
  display: flex;
  gap: var(--space-8);
  flex-wrap: wrap;
}

.adash__cost__item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.adash__cost__item-label {
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--texto-suave);
}

.adash__cost__amount {
  font-size: var(--text-2xl);
  font-weight: 800;
  color: var(--texto-principal);
  letter-spacing: -0.04em;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.adash__cost__provenance {
  font-size: var(--text-xs);
  color: var(--texto-muy-suave);
  font-style: italic;
  margin-top: var(--space-3);
  line-height: 1.5;
}

.adash__cost__desglose {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.adash__cost__desglose-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  font-size: var(--text-xs);
  color: var(--texto-suave);
}

.adash__cost__desglose-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-inline-end: 4px;
}

.adash__cost__desglose-name {
  display: flex;
  align-items: center;
  gap: 4px;
}

.adash__cost__desglose-val {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--texto-principal);
}

/* ══ Estado sin paciente ══════════════════════════════════════════════════════ */
.adash__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-16) var(--space-6);
  text-align: center;
  animation: fade-in var(--transition-slow) both;
}

.adash__empty__orb {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 40%,
    var(--color-durazno) 0%,
    var(--color-amarillo) 60%,
    transparent 100%);
  border: 2px solid var(--color-durazno);
  flex-shrink: 0;
}

.adash__empty__title {
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--color-text-mid);
  letter-spacing: -0.02em;
}

.adash__empty__text {
  font-size: var(--text-sm);
  color: var(--color-text-low);
  max-width: 320px;
  line-height: 1.75;
}
`

function injectCSS() {
  if (typeof document === 'undefined') return
  if (document.getElementById('adash-styles-v1')) return
  const el = document.createElement('style')
  el.id = 'adash-styles-v1'
  el.textContent = COMPONENT_CSS
  document.head.appendChild(el)
}

// ─── useLive: liveQuery ↔ useSyncExternalStore ────────────────────────────────

function useLive(querier, deps, initial) {
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

// ─── IMC zones ────────────────────────────────────────────────────────────────

const IMC_ZONES = [
  { label: 'Bajo peso',    min: 0,    max: 18.5, color: '#4ECDC4' },
  { label: 'Normal',       min: 18.5, max: 25,   color: '#2ECC71' },
  { label: 'Sobrepeso',    min: 25,   max: 30,   color: '#F1C40F' },
  { label: 'Obesidad I',   min: 30,   max: 35,   color: '#E67E22' },
  { label: 'Obesidad II',  min: 35,   max: 40,   color: '#E74C3C' },
  { label: 'Obesidad III', min: 40,   max: Infinity, color: '#C0392B' },
]

function getZone(imc) {
  if (imc == null) return null
  return IMC_ZONES.find((z) => imc >= z.min && imc < z.max) ?? IMC_ZONES.at(-1)
}

// ─── DonutChart — conic-gradient puro, acelerado por GPU ─────────────────────

function DonutChart({ segments, size = 164, holeRatio = 0.58, centerValue, centerLabel }) {
  const total = segments.reduce((s, g) => s + Math.max(0, g.value), 0)

  const gradientStr = useMemo(() => {
    if (total === 0) return 'var(--color-border) 0% 100%'
    let acc = 0
    return segments
      .filter((g) => g.value > 0)
      .map((g) => {
        const pct = (g.value / total) * 100
        const from = acc
        acc += pct
        return `${g.color} ${from.toFixed(2)}% ${acc.toFixed(2)}%`
      })
      .join(', ')
  }, [segments, total])

  const holePct = `${Math.round(holeRatio * 100)}%`

  return (
    <div className="adash-donut" style={{ '--donut-size': `${size}px` }}>
      <div
        className="adash-donut__ring"
        aria-hidden="true"
        style={{
          background:          `conic-gradient(${gradientStr})`,
          maskImage:           `radial-gradient(transparent ${holePct}, black ${holePct})`,
          WebkitMaskImage:     `radial-gradient(transparent ${holePct}, black ${holePct})`,
        }}
      />
      <div className="adash-donut__center" aria-hidden="true">
        {centerValue != null && (
          <span className="adash-donut__value">{centerValue}</span>
        )}
        {centerLabel && (
          <span className="adash-donut__sub">{centerLabel}</span>
        )}
      </div>
    </div>
  )
}

// ─── InfoCard ─────────────────────────────────────────────────────────────────

function InfoCard({ label, value, unit, badge, badgeColor, wide }) {
  return (
    <div className={`adash__card${wide ? ' adash__card--wide' : ''}`}>
      <span className="adash__card__label">{label}</span>
      {value != null ? (
        <>
          <span className="adash__card__value">
            {value}
            {unit && <span className="adash__card__unit">{unit}</span>}
          </span>
          {badge && (
            <span
              className="adash__card__badge"
              style={{ background: badgeColor ?? 'var(--color-primary)' }}
            >
              {badge}
            </span>
          )}
        </>
      ) : (
        <span className="adash__card__empty">Sin datos</span>
      )}
    </div>
  )
}

// ─── Objetivo labels ──────────────────────────────────────────────────────────

const OBJETIVO_MAP = {
  bajar:    'Bajar peso',
  mantener: 'Mantener',
  subir:    'Subir peso',
  musculo:  'Ganar músculo',
  salud:    'Salud general',
}

// ─── Colores para el desglose de comidas ─────────────────────────────────────

const COMIDA_COLORS = {
  desayuno: '#E8956A',
  almuerzo: '#7BAE70',
  merienda: '#E8C870',
  cena:     '#7EB8E0',
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AnalysisDashboard() {
  useEffect(() => { injectCSS() }, [])

  const pacienteId = useUIStore((s) => s.pacienteId)

  // ── Datos reactivos desde Dexie ───────────────────────────────────────────

  const paciente = useLive(
    () => pacienteId ? db.pacientes.get(pacienteId) : Promise.resolve(null),
    [pacienteId],
    null,
  )

  const historias = useLive(
    () =>
      pacienteId
        ? db.historias
            .where('pacienteId').equals(pacienteId)
            .toArray()
            .then((arr) => [...arr].sort((a, b) => b.fecha.localeCompare(a.fecha)))
        : Promise.resolve([]),
    [pacienteId],
    [],
  )

  const plan = useLive(
    () =>
      pacienteId
        ? db.planes
            .where('pacienteId').equals(pacienteId)
            .toArray()
            .then((arr) => arr.sort((a, b) => b.fecha.localeCompare(a.fecha))[0] ?? null)
        : Promise.resolve(null),
    [pacienteId],
    null,
  )

  const productos = useLive(
    () => db.productos.toArray(),
    [],
    [],
  )

  // ── Derivados ─────────────────────────────────────────────────────────────

  const ultima = historias[0] ?? null
  const imc    = ultima?.imc ?? null
  const zona   = useMemo(() => getZone(imc), [imc])

  // Composición corporal — segmentos del donut
  const grasa   = ultima?.masaGrasa    ?? 0
  const musculo = ultima?.masaMuscular ?? 0
  const agua    = ultima?.aguaCorporal ?? 0
  const otro    = Math.max(0, 100 - grasa - musculo - agua)
  const hasBio  = grasa > 0 || musculo > 0 || agua > 0

  const compSegments = useMemo(() => [
    { value: grasa,   color: '#E8956A', label: 'Grasa' },
    { value: musculo, color: '#7BAE70', label: 'Músculo' },
    { value: agua,    color: '#7EB8E0', label: 'Agua corporal' },
    { value: otro,    color: '#F0EAE2', label: 'Resto' },
  ], [grasa, musculo, agua, otro])

  // Costo estimado del plan alimentario
  const costos = useMemo(() => {
    if (!plan || !productos.length) {
      return { costoDiario: 0, costoMensual: 0, desglose: {} }
    }
    return calcularCostoMenu(plan, productos)
  }, [plan, productos])

  // Desglose por comida para el segundo donut
  const desgloseComidas = useMemo(() => {
    if (!plan || !productos.length) return []
    const comidas = ['desayuno', 'almuerzo', 'merienda', 'cena']
    return comidas.map((c) => {
      const { total } = parsearCostoTexto(plan[c] ?? '', productos)
      return { label: c.charAt(0).toUpperCase() + c.slice(1), value: total, color: COMIDA_COLORS[c] }
    }).filter((c) => c.value > 0)
  }, [plan, productos])

  const totalDesglose   = desgloseComidas.reduce((s, c) => s + c.value, 0)
  const tieneDesglose   = totalDesglose > 0

  // Relación cintura/cadera
  const rcc = ultima?.cintura && ultima?.cadera
    ? (ultima.cintura / ultima.cadera).toFixed(2)
    : null

  // ── Early return — sin paciente seleccionado ──────────────────────────────

  if (!pacienteId || !paciente) {
    return <NoPaciente />
  }

  const displayName = [paciente.nombre, paciente.apellido].filter(Boolean).join(' ')
  const ultimaFecha  = ultima
    ? new Date(ultima.fecha + 'T12:00:00').toLocaleDateString('es-AR', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null

  return (
    <div className="adash">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="adash__header">
        <h1 className="adash__patient-name">{displayName}</h1>
        <p className="adash__patient-meta">
          {ultimaFecha
            ? `Última consulta: ${ultimaFecha}`
            : 'Sin consultas registradas'}
          {paciente.objetivo
            ? ` · ${OBJETIVO_MAP[paciente.objetivo] ?? paciente.objetivo}`
            : ''}
        </p>
      </div>

      <p className="adash__section-label">Análisis clínico</p>

      {/* ── Grid principal ─────────────────────────────────────────────── */}
      <div className="adash__grid">

        {/* Columna izquierda: gráficos ─────────────────────────────────── */}
        <div className="adash__left">

          {/* Donut 1 — Composición corporal */}
          <div className="adash__chart-card">
            <p className="adash__chart-title">Composición corporal</p>
            <DonutChart
              segments={hasBio ? compSegments : [{ value: 1, color: 'var(--color-border)', label: '' }]}
              size={164}
              holeRatio={0.58}
              centerValue={hasBio && grasa > 0 ? `${grasa.toFixed(0)}%` : null}
              centerLabel={hasBio ? 'Grasa' : 'Sin datos'}
            />
            {hasBio && (
              <div className="adash-legend">
                {compSegments
                  .filter((s) => s.value > 0.5)
                  .map((s) => (
                    <div key={s.label} className="adash-legend__item">
                      <div className="adash-legend__dot" style={{ background: s.color }} />
                      <span>
                        {s.label}
                        {s.label !== 'Resto' ? ` ${s.value.toFixed(1)}%` : ''}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Donut 2 — Distribución del plan por comida */}
          <div className="adash__chart-card">
            <p className="adash__chart-title">Distribución del plan alimentario</p>
            <DonutChart
              segments={
                tieneDesglose
                  ? desgloseComidas
                  : [{ value: 1, color: 'var(--color-border)', label: '' }]
              }
              size={164}
              holeRatio={0.58}
              centerValue={
                tieneDesglose
                  ? `$${Math.round(totalDesglose).toLocaleString('es-AR')}`
                  : null
              }
              centerLabel={tieneDesglose ? 'Plan diario' : 'Sin plan'}
            />
            {tieneDesglose && (
              <div className="adash-legend">
                {desgloseComidas.map((c) => (
                  <div key={c.label} className="adash-legend__item">
                    <div className="adash-legend__dot" style={{ background: c.color }} />
                    <span>{c.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Columna derecha: tarjetas de información médica ─────────────── */}
        <div className="adash__right">

          <InfoCard
            label="Peso actual"
            value={ultima?.peso != null ? ultima.peso.toFixed(1) : null}
            unit="kg"
          />

          <InfoCard
            label="IMC"
            value={imc != null ? imc.toFixed(1) : null}
            unit="kg/m²"
            badge={zona?.label}
            badgeColor={zona?.color}
          />

          <InfoCard
            label="Masa grasa"
            value={ultima?.masaGrasa != null ? ultima.masaGrasa.toFixed(1) : null}
            unit="%"
          />

          <InfoCard
            label="Masa muscular"
            value={ultima?.masaMuscular != null ? ultima.masaMuscular.toFixed(1) : null}
            unit="%"
          />

          <InfoCard
            label="Agua corporal"
            value={ultima?.aguaCorporal != null ? ultima.aguaCorporal.toFixed(1) : null}
            unit="%"
          />

          <InfoCard
            label="Relación cintura / cadera"
            value={rcc}
          />

          <InfoCard
            label="Glucosa en sangre"
            value={ultima?.glucosa != null ? ultima.glucosa : null}
            unit="mg/dL"
          />

          <InfoCard
            label="Presión arterial"
            value={ultima?.presionArterial ?? null}
          />

        </div>

      </div>

      {/* ── Bloque flotante de costos regionales ───────────────────────── */}
      <p className="adash__section-label">Presupuesto alimentario</p>
      <div className="adash__cost">

        <div>
          <p className="adash__cost__header">
            Costo estimado del plan — Posadas, Misiones
          </p>
          <div className="adash__cost__grid">
            <div className="adash__cost__item">
              <span className="adash__cost__item-label">Por día</span>
              <span className="adash__cost__amount">
                {costos.costoDiario > 0
                  ? `$${costos.costoDiario.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`
                  : '—'}
              </span>
            </div>
            <div className="adash__cost__item">
              <span className="adash__cost__item-label">Proyección mensual</span>
              <span className="adash__cost__amount">
                {costos.costoMensual > 0
                  ? `$${costos.costoMensual.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`
                  : '—'}
              </span>
            </div>
          </div>
          <p className="adash__cost__provenance">
            Precios de referencia: Hipermercado Libertad y Mercado Central de Misiones
          </p>
        </div>

        {costos.costoDiario > 0 && (
          <div className="adash__cost__desglose" aria-label="Desglose por comida">
            {['desayuno', 'almuerzo', 'merienda', 'cena']
              .filter((c) => costos.desglose[c] > 0)
              .map((c) => (
                <div key={c} className="adash__cost__desglose-item">
                  <div className="adash__cost__desglose-name">
                    <div
                      className="adash__cost__desglose-dot"
                      style={{ background: COMIDA_COLORS[c] }}
                      aria-hidden="true"
                    />
                    <span style={{ textTransform: 'capitalize' }}>{c}</span>
                  </div>
                  <span className="adash__cost__desglose-val">
                    ${costos.desglose[c].toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              ))}
          </div>
        )}

        {costos.costoDiario === 0 && (
          <span style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--texto-suave)',
            fontStyle: 'italic',
            fontWeight: 400,
          }}>
            Cargá un plan alimentario para estimar el costo
          </span>
        )}

      </div>

    </div>
  )
}

// ─── Estado sin paciente seleccionado ─────────────────────────────────────────

function NoPaciente() {
  return (
    <div className="adash__empty" role="status" aria-live="polite">
      <div className="adash__empty__orb" aria-hidden="true" />
      <p className="adash__empty__title">Seleccioná un paciente</p>
      <p className="adash__empty__text">
        Accedé a la sección Pacientes, elegí un paciente de la lista y regresá aquí
        para ver su análisis clínico completo con composición corporal, métricas
        y estimación de costos del plan alimentario.
      </p>
    </div>
  )
}
