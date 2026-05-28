/**
 * ExportarReporte — Reporte Membretado Premium de Alta Gama
 *
 * Estructura de impresión (3 páginas A4):
 *   Pág. 1 → Historia Clínica   : datos del paciente · métricas · evolución IMC
 *   Pág. 2 → Plan Alimentario   : R/P nutricional (4 comidas sin precios unitarios) · indicaciones
 *   Pág. 3 → Presupuesto        : estimación mensual consolidada en góndolas regionales de Posadas
 *
 * Colores por bloque:
 *   --color-durazno  → encabezado de datos personales del paciente
 *   --color-verde    → resumen de objetivos y métricas
 *   --color-amarillo → bloque de presupuesto económico familiar
 */
import { useEffect, useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import db from '@/db/database'
import { useUIStore } from '@/store/useUIStore'
import { calcularCostoMenu } from '@/utils/costos'

// ─── Datos de la profesional ──────────────────────────────────────────────────
// Actualizar con los datos reales antes del uso clínico.
const PROFESIONAL = {
  titulo:    'Lic.',
  nombre:    'Nombre',
  apellido:  'Apellido',
  matricula: 'M.N. 00000',
}

// ─── ID de los estilos inyectados ─────────────────────────────────────────────
const STYLE_ID = 'nutriapp-reporte-css'
const FONT_ID  = 'nutriapp-quicksand'

// ─── Utilidades ───────────────────────────────────────────────────────────────

const titleCase = (str = '') =>
  str.replace(/\b\w/g, (c) => c.toUpperCase())

function fCorta(iso) {
  if (!iso) return '—'
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso)
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fCompleta(d = new Date()) {
  return d.toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function fDDMMAAAA(d = new Date()) {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getFullYear()}`
}

function generarRef() {
  const d  = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  return `NRP-${d.getFullYear()}${mm}-${dd}${hh}`
}

function calcularEdad(fechaNacStr) {
  if (!fechaNacStr) return null
  const nac  = new Date(fechaNacStr + 'T12:00:00')
  const hoy  = new Date()
  let edad   = hoy.getFullYear() - nac.getFullYear()
  const diff = hoy.getMonth() - nac.getMonth()
  if (diff < 0 || (diff === 0 && hoy.getDate() < nac.getDate())) edad--
  return edad
}

// ─── Clasificación IMC ────────────────────────────────────────────────────────

const IMC_CATS = [
  { max: 18.5,     label: 'Bajo peso',    cls: 'bajo'      },
  { max: 25,       label: 'Peso normal',  cls: 'normal'    },
  { max: 30,       label: 'Sobrepeso',    cls: 'sobrepeso' },
  { max: 35,       label: 'Obesidad I',   cls: 'obesidad'  },
  { max: 40,       label: 'Obesidad II',  cls: 'obesidad'  },
  { max: Infinity, label: 'Obesidad III', cls: 'obesidad'  },
]

function imcInfo(imc) {
  if (!imc || imc <= 0) return { label: 'Sin dato', cls: 'normal' }
  return IMC_CATS.find((c) => imc < c.max) ?? IMC_CATS.at(-1)
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const OBJETIVO_LABELS = {
  bajar:    'Reducción de peso',
  mantener: 'Mantenimiento',
  subir:    'Aumento de peso',
  musculo:  'Ganancia muscular',
  salud:    'Salud general',
}

const MEALS = [
  { id: 'desayuno', label: 'Desayuno' },
  { id: 'almuerzo', label: 'Almuerzo' },
  { id: 'merienda', label: 'Merienda' },
  { id: 'cena',     label: 'Cena'     },
]

// ─── CSS inyectado (clases nuevas + overrides de impresión) ──────────────────

const REPORT_CSS = `
  /* Tipografía Quicksand para títulos del reporte */
  .rp-quicksand {
    font-family: 'Quicksand', 'Plus Jakarta Sans', system-ui, sans-serif;
  }

  /* Bloques de color por sección */
  .rp-section--durazno {
    background: linear-gradient(180deg,
      var(--color-durazno) 0%,
      #FFF5EF 75%,
      #FFFFFF 100%
    ) !important;
  }
  .rp-section--verde {
    background: linear-gradient(180deg,
      var(--color-verde) 0%,
      #F2F9EE 70%,
      #FFFFFF 100%
    ) !important;
  }
  .rp-section--amarillo {
    background: linear-gradient(180deg,
      var(--color-amarillo) 0%,
      #FFFDF5 60%,
      #FFFFFF 100%
    ) !important;
  }

  /* Página de impresión */
  .rp-print-page {
    break-after: always;
    page-break-after: always;
  }
  .rp-print-page:last-child {
    break-after: auto;
    page-break-after: auto;
  }

  /* Título de sección por página */
  .rp-page-title {
    padding: 20px 32px 14px;
    border-bottom: 1px solid #F0EAE2;
  }
  .rp-page-title__heading {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-durazno-dark);
    letter-spacing: -0.02em;
    line-height: 1.2;
    font-family: 'Quicksand', 'Plus Jakarta Sans', Georgia, serif;
  }
  .rp-page-title__sub {
    font-size: 0.8125rem;
    color: #757575;
    margin-top: 4px;
    line-height: 1.55;
  }

  /* Recuadro del presupuesto consolidado */
  .rp-budget-box {
    background: rgba(255, 255, 255, 0.75);
    border: 2px solid var(--color-amarillo-deep);
    border-radius: var(--radius-xl);
    padding: 28px 32px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    box-shadow: 0 4px 20px rgba(232, 200, 112, 0.22);
    max-width: 460px;
    margin: 0 auto var(--space-5);
  }
  .rp-budget-box__label {
    font-size: 0.67rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--color-durazno-dark);
  }
  .rp-budget-box__total {
    font-size: 2.25rem;
    font-weight: 800;
    color: var(--color-durazno-dark);
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.03em;
    line-height: 1;
    font-family: 'Quicksand', 'Plus Jakarta Sans', system-ui, sans-serif;
  }
  .rp-budget-box__daily {
    font-size: 0.875rem;
    color: #757575;
    font-style: italic;
  }

  .rp-budget-note {
    background: rgba(255, 255, 255, 0.55);
    border: 1px solid var(--color-amarillo-deep);
    border-radius: var(--radius-md);
    padding: 10px 16px;
    font-size: 0.75rem;
    color: #6D5F40;
    line-height: 1.70;
    text-align: center;
  }

  /* Pie de página profesional de dos líneas */
  .rp-footer {
    padding: 14px 32px 18px;
    background: #FDFAF8;
    margin-top: 20px;
    position: relative;
  }
  .rp-footer::before {
    content: '';
    position: absolute;
    top: 0;
    left: 32px;
    right: 32px;
    height: 1.5px;
    background: linear-gradient(
      90deg,
      var(--color-durazno-dark) 0%,
      var(--color-durazno) 55%,
      transparent 100%
    );
    border-radius: 1px;
  }
  .rp-footer__row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
  }
  .rp-footer__profesional {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .rp-footer__nombre {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--color-durazno-dark);
    letter-spacing: 0.01em;
  }
  .rp-footer__mn {
    font-size: 0.67rem;
    color: #757575;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    font-weight: 600;
  }
  .rp-footer__fecha {
    font-size: 0.75rem;
    font-weight: 700;
    color: #424242;
    letter-spacing: 0.05em;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    align-self: flex-start;
  }
  .rp-footer__confidencial {
    margin-top: 9px;
    text-align: center;
    font-size: 0.67rem;
    color: #9E9E9E;
    letter-spacing: 0.04em;
    font-style: italic;
  }

  /* ── Overrides de impresión ── */
  @media print {
    /* Anular position:fixed del index.css para habilitar saltos de página */
    .reporte-doc {
      position: static  !important;
      inset:    auto    !important;
      overflow: visible !important;
      padding:  0       !important;
    }

    .rp-print-page {
      break-after: always !important;
      page-break-after: always !important;
    }
    .rp-print-page:last-child {
      break-after: auto !important;
      page-break-after: auto !important;
    }

    .rp-footer {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }

    .rp-budget-box,
    .rp-budget-note {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }

    .rp-page-title {
      padding-inline: 10mm !important;
    }
  }
`

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ExportarReporte() {
  const pacienteId               = useUIStore((s) => s.pacienteId)
  const [datos, setDatos]        = useState(null)
  const [cargando, setCargando]  = useState(false)
  const [generando, setGenerando] = useState(false)
  const numeroRef                = useRef(generarRef())
  const fechaStr                 = fCompleta()
  const fechaCorta               = fDDMMAAAA()

  // Inyectar fuente Quicksand y los estilos específicos del reporte
  useEffect(() => {
    if (!document.getElementById(FONT_ID)) {
      const link = document.createElement('link')
      link.id   = FONT_ID
      link.rel  = 'stylesheet'
      link.href = 'https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap'
      document.head.appendChild(link)
    }
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style')
      style.id          = STYLE_ID
      style.textContent = REPORT_CSS
      document.head.appendChild(style)
    }
    return () => {
      document.getElementById(STYLE_ID)?.remove()
    }
  }, [])

  // Carga de datos desde IndexedDB
  useEffect(() => {
    if (!pacienteId) { setDatos(null); return }
    let cancelado = false
    setCargando(true)

    async function cargar() {
      try {
        const [paciente, historiasAsc, planesArr, productosArr] = await Promise.all([
          db.pacientes.get(pacienteId),
          db.historias.where('pacienteId').equals(pacienteId).sortBy('fecha'),
          db.planes.where('pacienteId').equals(pacienteId).toArray(),
          db.productos.toArray(),
        ])
        if (cancelado) return

        const historias      = [...historiasAsc].reverse()
        const ultimaHistoria = historias[0] ?? null
        const ultimoPlan     = [...planesArr]
          .sort((a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? ''))[0] ?? null

        setDatos({ paciente, historias, ultimaHistoria, ultimoPlan, productos: productosArr })
      } catch (err) {
        console.error('[ExportarReporte]', err)
        if (!cancelado) setDatos(null)
      } finally {
        if (!cancelado) setCargando(false)
      }
    }

    cargar()
    return () => { cancelado = true }
  }, [pacienteId])

  const handlePrint = useCallback(() => {
    setGenerando(true)
    setTimeout(() => { window.print(); setGenerando(false) }, 260)
  }, [])

  // ── Sin paciente seleccionado ───────────────────────────────────────────────
  if (!pacienteId) {
    return (
      <div className="reporte-wrapper">
        <div className="reporte-no-patient" role="status" aria-live="polite">
          <div className="reporte-no-patient__orb" aria-hidden="true" />
          <p className="reporte-no-patient__title">Ningún paciente seleccionado</p>
          <p className="reporte-no-patient__text">
            Seleccioná un paciente en la pestaña <strong>Pacientes</strong> para
            generar su reporte membretado con métricas antropométricas y plan alimentario.
          </p>
          <Link to="/pacientes" className="reporte-no-patient__cta">
            Ir a Pacientes
          </Link>
        </div>
      </div>
    )
  }

  // ── Cargando ────────────────────────────────────────────────────────────────
  if (cargando || datos === null) {
    return (
      <div className="reporte-loading" role="status" aria-live="polite">
        <span
          className="loading-screen"
          aria-hidden="true"
          style={{ width: 28, height: 28, minHeight: 'unset' }}
        />
        Preparando reporte…
      </div>
    )
  }

  // ── Derivaciones ────────────────────────────────────────────────────────────
  const { paciente, historias, ultimaHistoria, ultimoPlan, productos } = datos

  const nombreCompleto = [paciente?.nombre, paciente?.apellido]
    .filter(Boolean).join(' ') || 'Paciente sin nombre'

  const edad = calcularEdad(paciente?.fechaNacimiento)
  const cat  = imcInfo(ultimaHistoria?.imc)

  const { costoDiario, costoMensual } = (ultimoPlan && productos?.length)
    ? calcularCostoMenu(ultimoPlan, productos)
    : { costoDiario: 0, costoMensual: 0 }

  const tendencia = (() => {
    if (historias.length < 2) return null
    const diff = (historias[0].imc ?? 0) - (historias[1].imc ?? 0)
    if (Math.abs(diff) < 0.1) return { dir: 'stable', label: 'Estable' }
    return diff < 0
      ? { dir: 'down', label: `↓ ${Math.abs(diff).toFixed(1)} pts` }
      : { dir: 'up',   label: `↑ ${Math.abs(diff).toFixed(1)} pts` }
  })()

  const metricas = [
    { tipo: 'IMC',           val: ultimaHistoria?.imc          != null ? ultimaHistoria.imc.toFixed(1)  : null, unidad: '',        esIMC: true },
    { tipo: 'Peso',          val: ultimaHistoria?.peso         != null ? ultimaHistoria.peso             : null, unidad: 'kg'    },
    { tipo: 'Talla',         val: ultimaHistoria?.altura       != null ? `${ultimaHistoria.altura}`      : null, unidad: 'cm'    },
    { tipo: 'Masa Grasa',    val: ultimaHistoria?.masaGrasa    != null ? ultimaHistoria.masaGrasa        : null, unidad: '%'     },
    { tipo: 'Masa Muscular', val: ultimaHistoria?.masaMuscular != null ? ultimaHistoria.masaMuscular     : null, unidad: 'kg'    },
    { tipo: 'Cintura',       val: ultimaHistoria?.cintura      != null ? ultimaHistoria.cintura          : null, unidad: 'cm'    },
    { tipo: 'Cadera',        val: ultimaHistoria?.cadera       != null ? ultimaHistoria.cadera           : null, unidad: 'cm'    },
    { tipo: 'Agua Corporal', val: ultimaHistoria?.aguaCorporal != null ? ultimaHistoria.aguaCorporal     : null, unidad: '%'     },
    { tipo: 'Glucosa',       val: ultimaHistoria?.glucosa      != null ? ultimaHistoria.glucosa          : null, unidad: 'mg/dL' },
  ].filter((m) => m.val !== null)

  const fmtARS = (n) => n.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="reporte-wrapper">

      {/* Barra de acciones — oculta al imprimir */}
      <div className="reporte-actions">
        <Link to="/pacientes" className="reporte-back-btn">
          ← Cambiar paciente
        </Link>
        <button
          className="reporte-print-btn"
          onClick={handlePrint}
          disabled={generando}
          type="button"
        >
          {generando ? 'Preparando…' : (
            <><IconPrint aria-hidden="true" /> Imprimir · Guardar PDF</>
          )}
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          DOCUMENTO — único bloque visible al imprimir
          ════════════════════════════════════════════════════════════════════ */}
      <div className="reporte-doc" id="reporte-documento">

        {/* MEMBRETE SUPERIOR — encabezado durazno compartido entre páginas */}
        <header className="reporte-letterhead">
          <div className="reporte-letterhead__brand">
            <div className="reporte-letterhead__logo" aria-hidden="true">NP</div>
            <div>
              <p className="reporte-letterhead__title rp-quicksand">
                {PROFESIONAL.titulo} {PROFESIONAL.nombre} {PROFESIONAL.apellido}
              </p>
              <p className="reporte-letterhead__subtitle">
                {PROFESIONAL.matricula} · Licenciada en Nutrición · NutriApp Profesional
              </p>
            </div>
          </div>
          <div className="reporte-letterhead__meta">
            <p className="reporte-letterhead__date" style={{ textTransform: 'capitalize' }}>
              {fechaStr}
            </p>
            <p className="reporte-letterhead__ref">{numeroRef.current}</p>
          </div>
        </header>

        {/* Franja tricolor */}
        <div className="reporte-rule" aria-hidden="true" />

        {/* ══════════════════════════════════════════════════════════════════
            PÁGINA 1 — HISTORIA CLÍNICA
            ══════════════════════════════════════════════════════════════════ */}
        <div className="rp-print-page">

          <div className="rp-page-title reporte-title-section">
            <h1 className="reporte-main-title rp-quicksand">
              Historia Clínica del Paciente
            </h1>
            <p className="reporte-main-subtitle">
              Resumen clínico y evolución antropométrica de{' '}
              <strong>{nombreCompleto}</strong>
              {' · '}{fechaStr}
            </p>
          </div>

          {/* 01 — Datos del paciente · durazno pastel */}
          <section
            className="reporte-section rp-section--durazno"
            aria-label="Datos del paciente"
          >
            <h2 className="reporte-section__title">
              <span className="reporte-section__num">01</span>
              Datos del Paciente
            </h2>
            <div className="reporte-patient-grid">
              <div className="reporte-patient-col">
                <Field label="Nombre completo" value={nombreCompleto} />
                <Field
                  label="Edad"
                  value={
                    edad != null
                      ? `${edad} años`
                      : paciente?.fechaNacimiento ? fCorta(paciente.fechaNacimiento) : null
                  }
                />
                <Field
                  label="Sexo biológico"
                  value={
                    paciente?.genero
                      ? titleCase(paciente.genero.replace(/-/g, ' '))
                      : null
                  }
                />
                <Field
                  label="Objetivo clínico"
                  value={
                    paciente?.objetivo
                      ? (OBJETIVO_LABELS[paciente.objetivo] ?? titleCase(paciente.objetivo))
                      : null
                  }
                />
              </div>
              <div className="reporte-patient-col">
                <Field label="Correo electrónico" value={paciente?.email}    />
                <Field label="Teléfono"            value={paciente?.telefono} />
                <Field
                  label="Fecha de ingreso"
                  value={paciente?.creadoEn ? fCorta(paciente.creadoEn) : null}
                />
                <Field
                  label="Última consulta"
                  value={ultimaHistoria?.fecha ? fCorta(ultimaHistoria.fecha) : null}
                />
              </div>
            </div>
          </section>

          {/* 02 — Métricas y Objetivos · verde pastel */}
          <section
            className="reporte-section rp-section--verde"
            aria-label="Métricas antropométricas y objetivos"
          >
            <h2 className="reporte-section__title">
              <span className="reporte-section__num">02</span>
              Resumen de Objetivos y Métricas Antropométricas
            </h2>
            {metricas.length === 0 ? (
              <p className="reporte-empty">
                No se registraron mediciones clínicas. Agregue una consulta desde{' '}
                <strong>Historia Clínica</strong>.
              </p>
            ) : (
              <>
                <p className="reporte-section__desc">
                  Última consulta: <strong>{fCorta(ultimaHistoria?.fecha)}</strong>.
                  {historias.length > 1 && (
                    <> Total de consultas registradas: <strong>{historias.length}</strong>.</>
                  )}
                  {tendencia && (
                    <> Tendencia IMC:{' '}
                      <span className={`reporte-imc-trend reporte-imc-trend--${tendencia.dir}`}>
                        {tendencia.label}
                      </span>.
                    </>
                  )}
                  {paciente?.objetivo && (
                    <> Objetivo vigente:{' '}
                      <strong>
                        {OBJETIVO_LABELS[paciente.objetivo] ?? paciente.objetivo}
                      </strong>.
                    </>
                  )}
                </p>
                <div className="reporte-mediciones">
                  {metricas.map((m) => (
                    <div
                      key={m.tipo}
                      className={`reporte-medicion-card${m.esIMC ? ' reporte-medicion-card--imc' : ''}`}
                    >
                      <span className="reporte-medicion-card__tipo">{m.tipo}</span>
                      <span className="reporte-medicion-card__valor">
                        {m.val}
                        {m.unidad && (
                          <span className="reporte-medicion-card__unidad"> {m.unidad}</span>
                        )}
                      </span>
                      {m.esIMC && (
                        <span className={`reporte-imc-badge reporte-imc-badge--${cat.cls}`}>
                          {cat.label}
                        </span>
                      )}
                      <time
                        className="reporte-medicion-card__fecha"
                        dateTime={ultimaHistoria?.fecha}
                      >
                        {fCorta(ultimaHistoria?.fecha)}
                      </time>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          {/* 03 — Evolución IMC */}
          <section className="reporte-section" aria-label="Evolución IMC">
            <h2 className="reporte-section__title">
              <span className="reporte-section__num">03</span>
              Evolución IMC — Historial de Consultas
            </h2>
            {historias.length === 0 ? (
              <p className="reporte-empty">Sin consultas registradas para este paciente.</p>
            ) : (
              <>
                <p className="reporte-section__desc">
                  Historial de{' '}
                  <strong>
                    {Math.min(historias.length, 8)}{' '}
                    {historias.length === 1 ? 'consulta' : 'consultas'}
                  </strong>
                  {historias.length > 8 && ` (de ${historias.length} totales)`}
                  {' '}en orden descendente.
                </p>
                <table className="reporte-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Peso</th>
                      <th>Talla</th>
                      <th>IMC</th>
                      <th>Categoría</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historias.slice(0, 8).map((h, i) => {
                      const info     = imcInfo(h.imc)
                      const esAlerta = info.cls === 'sobrepeso' || info.cls === 'obesidad'
                      return (
                        <tr
                          key={h.id}
                          className={
                            esAlerta
                              ? 'reporte-evolucion-row--alerta'
                              : 'reporte-evolucion-row--normal'
                          }
                        >
                          <td>
                            <strong>{fCorta(h.fecha)}</strong>
                            {i === 0 && (
                              <span className="reporte-table__detail">Más reciente</span>
                            )}
                          </td>
                          <td>{h.peso   != null ? `${h.peso} kg`   : '—'}</td>
                          <td>{h.altura != null ? `${h.altura} cm` : '—'}</td>
                          <td>
                            {h.imc != null
                              ? <strong>{Number(h.imc).toFixed(1)}</strong>
                              : '—'}
                          </td>
                          <td>
                            {h.imc != null ? (
                              <span className={`reporte-badge reporte-imc-badge--${info.cls}`}>
                                {info.label}
                              </span>
                            ) : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {historias.length > 8 && (
                  <p className="reporte-footnote">
                    Se muestran las 8 consultas más recientes de {historias.length} registros totales.
                  </p>
                )}
              </>
            )}
          </section>

          <PageFooter nombreCompleto={nombreCompleto} fechaCorta={fechaCorta} />
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            PÁGINA 2 — PLAN ALIMENTARIO / R·P NUTRICIONAL
            ══════════════════════════════════════════════════════════════════ */}
        <div className="rp-print-page">

          <div className="rp-page-title reporte-title-section">
            <h1 className="reporte-main-title rp-quicksand">
              Plan Alimentario · R/P Nutricional
            </h1>
            <p className="reporte-main-subtitle">
              Prescripción nutricional vigente para{' '}
              <strong>{nombreCompleto}</strong>
              {ultimoPlan?.fecha && (
                <>{' · '}Fecha del plan: <strong>{fCorta(ultimoPlan.fecha)}</strong></>
              )}
            </p>
          </div>

          {/* 04 — Plan Alimentario (sin precios unitarios) */}
          <section
            className="reporte-section"
            aria-label="Plan alimentario asignado"
            style={{ background: 'linear-gradient(180deg, #FFFAF7 0%, #FFFFFF 100%)' }}
          >
            <h2 className="reporte-section__title">
              <span className="reporte-section__num">04</span>
              Plan Alimentario Asignado
            </h2>
            {!ultimoPlan ? (
              <p className="reporte-empty">
                Sin plan alimentario asignado. Creá uno desde la pestaña <strong>Planes</strong>.
              </p>
            ) : (
              <div className="reporte-plan-grid">
                {MEALS.map((meal) => (
                  <MealCard
                    key={meal.id}
                    title={meal.label}
                    content={ultimoPlan[meal.id]}
                  />
                ))}
              </div>
            )}
          </section>

          {/* 05 — Indicaciones y Notas Clínicas */}
          <section className="reporte-section" aria-label="Indicaciones clínicas">
            <h2 className="reporte-section__title">
              <span className="reporte-section__num">05</span>
              Indicaciones y Notas Clínicas
            </h2>
            {!ultimaHistoria?.notas?.trim() && !ultimoPlan?.indicaciones?.trim() ? (
              <p className="reporte-empty">
                Sin observaciones clínicas registradas en la última consulta.
              </p>
            ) : (
              <>
                {ultimoPlan?.indicaciones?.trim() && (
                  <>
                    <p className="reporte-section__desc" style={{ marginBottom: 'var(--space-2)' }}>
                      Indicaciones generales del plan:
                    </p>
                    <div className="reporte-notas" style={{ marginBottom: 'var(--space-4)' }}>
                      {ultimoPlan.indicaciones}
                    </div>
                  </>
                )}
                {ultimaHistoria?.notas?.trim() && (
                  <>
                    <p className="reporte-section__desc" style={{ marginBottom: 'var(--space-2)' }}>
                      Notas de consulta del{' '}
                      <strong>{fCorta(ultimaHistoria.fecha)}</strong>:
                    </p>
                    <div className="reporte-notas">{ultimaHistoria.notas}</div>
                  </>
                )}
              </>
            )}
            {ultimaHistoria?.presionArterial && (
              <div className="reporte-objetivo-row" style={{ marginTop: 'var(--space-3)' }}>
                <span>Presión arterial registrada</span>
                <strong>{ultimaHistoria.presionArterial}</strong>
              </div>
            )}
            {ultimaHistoria?.glucosa != null && (
              <div className="reporte-objetivo-row">
                <span>Glucosa en sangre</span>
                <strong>{ultimaHistoria.glucosa} mg/dL</strong>
              </div>
            )}
          </section>

          <PageFooter nombreCompleto={nombreCompleto} fechaCorta={fechaCorta} />
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            PÁGINA 3 — PRESUPUESTO ALIMENTARIO MENSUAL
            (renderiza solo si se calculó un costo para el plan)
            ══════════════════════════════════════════════════════════════════ */}
        {ultimoPlan && costoDiario > 0 && (
          <div className="rp-print-page">

            <div className="rp-page-title reporte-title-section">
              <h1 className="reporte-main-title rp-quicksand">
                Presupuesto Alimentario Mensual
              </h1>
              <p className="reporte-main-subtitle">
                Estimación económica orientativa de apoyo para la economía familiar de{' '}
                <strong>{nombreCompleto}</strong>
              </p>
            </div>

            {/* 06 — Presupuesto consolidado · amarillo pastel */}
            <section
              className="reporte-section rp-section--amarillo"
              aria-label="Presupuesto alimentario mensual estimado"
            >
              <h2 className="reporte-section__title">
                <span className="reporte-section__num">06</span>
                Presupuesto Alimentario Mensual Estimado en Góndolas Regionales (Posadas)
              </h2>

              <p className="reporte-section__desc">
                Estimación basada en relevamiento de precios de góndola de la ciudad de{' '}
                <strong>Posadas, Misiones (CP 3300)</strong>. Fuentes: Hipermercado
                Libertad/ChangoMás y Mercado Central de Misiones. Los costos unitarios por
                alimento no forman parte de este informe clínico.
              </p>

              {/* Recuadro principal del presupuesto */}
              <div className="rp-budget-box" role="region" aria-label="Total mensual estimado">
                <p className="rp-budget-box__label">
                  Presupuesto Mensual Estimado
                </p>
                <p className="rp-budget-box__total" aria-label={`$${fmtARS(costoMensual)} pesos argentinos`}>
                  ${fmtARS(costoMensual)}
                </p>
                <p className="rp-budget-box__daily">
                  ≈ ${fmtARS(costoDiario)} por día · calculado sobre 30 días
                </p>
              </div>

              <p className="rp-budget-note">
                Este presupuesto refleja el costo estimado de los alimentos del plan
                nutricional vigente, considerando las porciones indicadas. No incluye
                gastos de preparación, transporte ni higiene personal. Los valores pueden
                variar según promociones del comercio, estacionalidad y punto de venta.
                Uso exclusivo como referencia orientativa de apoyo familiar.
              </p>
            </section>

            <PageFooter nombreCompleto={nombreCompleto} fechaCorta={fechaCorta} />
          </div>
        )}

      </div>
    </div>
  )
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function Field({ label, value }) {
  const isEmpty = value == null || value === ''
  return (
    <div className="reporte-patient-field">
      <span className="reporte-patient-field__label">{label}</span>
      <span
        className={`reporte-patient-field__value${isEmpty ? ' reporte-patient-field__value--empty' : ''}`}
      >
        {isEmpty ? '—' : value}
      </span>
    </div>
  )
}

function MealCard({ title, content }) {
  return (
    <div className="reporte-meal-card">
      <div className="reporte-meal-card__header">
        <span className="reporte-meal-card__title">{title}</span>
      </div>
      {content?.trim() ? (
        <div className="reporte-meal-card__body">{content.trim()}</div>
      ) : (
        <div className="reporte-meal-card__empty">Sin alimentos registrados</div>
      )}
    </div>
  )
}

function PageFooter({ nombreCompleto, fechaCorta }) {
  return (
    <footer className="rp-footer" aria-label="Pie de página profesional">
      <div className="rp-footer__row">
        <div className="rp-footer__profesional">
          <span className="rp-footer__nombre">
            {PROFESIONAL.titulo} {PROFESIONAL.nombre} {PROFESIONAL.apellido}
          </span>
          <span className="rp-footer__mn">{PROFESIONAL.matricula}</span>
        </div>
        <span className="rp-footer__fecha">{fechaCorta}</span>
      </div>
      <p className="rp-footer__confidencial">
        Documento confidencial de uso exclusivo de {nombreCompleto}
      </p>
    </footer>
  )
}

function IconPrint() {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  )
}
