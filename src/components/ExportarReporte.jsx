/**
 * ExportarReporte.jsx — Motor de Impresión PDF · Prescripción Dietética Clínica
 *
 * Estructura de impresión (3 hojas A4):
 *   Hoja 1 → Encabezado del paciente (datos, objetivo, contacto) + Indicaciones Iniciales
 *   Hoja 2 → Tabla R/P detallada (precios visibles solo en pantalla — @media print los oculta)
 *   Hoja 3 → Menú semanal · Notas clínicas · Tabla Registros y Controles
 *
 * Pie de página (todas las hojas):
 *   Izquierda: {titulo} {nombre} {apellido} / {M.N.}
 *   Derecha:   {fecha de impresión} / Documento confidencial de uso exclusivo de {paciente}
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import db from '@/db/database'
import { useUIStore } from '@/store/useUIStore'
import { calcularCostoMenu, parsearCostoTexto } from '@/utils/costos'
import { GRUPOS_RP } from './PlanAlimentario'

// ─── Datos de la profesional ──────────────────────────────────────────────────
const PROFESIONAL = {
  titulo:    'Lic.',
  nombre:    'Nombre',
  apellido:  'Apellido',
  matricula: 'M.N. 00000',
}

// ─── IDs de estilos inyectados ────────────────────────────────────────────────
const STYLE_ID = 'nutriapp-reporte-css-v2'
const FONT_ID  = 'nutriapp-quicksand'

// ─── Días de la semana ────────────────────────────────────────────────────────
const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

// ─── Utilidades de fecha ─────────────────────────────────────────────────────

const titleCase = (str = '') => str.replace(/\b\w/g, c => c.toUpperCase())

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
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `NRP-${d.getFullYear()}${mm}-${dd}${String(d.getHours()).padStart(2, '0')}`
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

/** Devuelve los 7 ISO strings Lun→Dom de la semana actual */
function getSemanaActual() {
  const hoy = new Date()
  const dow  = hoy.getDay()
  const lunes = new Date(hoy)
  lunes.setDate(hoy.getDate() - (dow === 0 ? 6 : dow - 1))
  lunes.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunes)
    d.setDate(lunes.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

/** Resumen breve de un plan (max 4 alimentos) para el menú semanal */
function getPlanResumen(plan) {
  if (!plan) return '—'
  if (plan.tablaRP) {
    try {
      const rows = JSON.parse(plan.tablaRP)
      const con  = rows.filter(r => r.alimento?.trim())
      if (!con.length) return '—'
      const muestra = con.slice(0, 4).map(r => r.alimento.trim()).join(', ')
      return con.length > 4 ? muestra + '…' : muestra
    } catch { /* fall through */ }
  }
  const comidas = [plan.desayuno, plan.almuerzo, plan.merienda, plan.cena]
    .filter(Boolean).filter(s => s.trim())
  return comidas.length ? `${comidas.length} comidas registradas` : '—'
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
  return IMC_CATS.find(c => imc < c.max) ?? IMC_CATS.at(-1)
}

const OBJETIVO_LABELS = {
  bajar:    'Reducción de peso',
  mantener: 'Mantenimiento',
  subir:    'Aumento de peso',
  musculo:  'Ganancia muscular',
  salud:    'Salud general',
}

// ─── CSS ─────────────────────────────────────────────────────────────────────

const REPORT_CSS = `
  .rp-quicksand {
    font-family: 'Quicksand', 'Plus Jakarta Sans', system-ui, sans-serif;
  }

  /* Secciones de color */
  .rp-section--durazno {
    background: linear-gradient(180deg, var(--color-durazno, #FFE4D0) 0%, #FFF5EF 75%, #FFFFFF 100%) !important;
  }
  .rp-section--verde {
    background: linear-gradient(180deg, var(--color-verde, #D9EDD0) 0%, #F2F9EE 70%, #FFFFFF 100%) !important;
  }
  .rp-section--amarillo {
    background: linear-gradient(180deg, var(--color-amarillo, #FFF3BF) 0%, #FFFDF5 60%, #FFFFFF 100%) !important;
  }

  /* Saltos de página */
  .rp-print-page { break-after: always; page-break-after: always; }
  .rp-print-page:last-child { break-after: auto; page-break-after: auto; }

  .rp-page-title {
    padding: 20px 32px 14px;
    border-bottom: 1px solid #F0EAE2;
  }
  .rp-page-title__heading {
    font-size: 1.25rem; font-weight: 700;
    color: var(--color-durazno-dark, #C87040);
    letter-spacing: -0.02em; line-height: 1.2;
    font-family: 'Quicksand', 'Plus Jakarta Sans', Georgia, serif;
  }
  .rp-page-title__sub {
    font-size: 0.8125rem; color: #757575; margin-top: 4px; line-height: 1.55;
  }

  /* ── Tabla R/P ─────────────────────────────────────────────────────────── */
  .rp-rp-table-wrap { overflow-x: auto; padding: 0 32px 20px; }
  .rp-rp-table {
    width: 100%; border-collapse: collapse;
    font-size: 0.8125rem;
  }
  .rp-rp-table thead tr {
    background: var(--color-primary, #2E7D32); color: #fff;
  }
  .rp-rp-table th {
    padding: 8px 10px;
    font-size: 9px; font-weight: 800; letter-spacing: .09em;
    text-transform: uppercase; text-align: left;
  }
  .rp-rp-table th.rp-th--alimento { width: 28%; }
  .rp-rp-table th.rp-th--caract   { width: 47%; }
  .rp-rp-table th.rp-th--cant     { width: 16%; }
  .rp-rp-table th.rp-th--precio   { width: 9%; text-align: right; }

  .rp-rp-group td {
    padding: 5px 10px;
    font-size: 10px; font-weight: 800; letter-spacing: .04em;
    color: var(--color-text-high, #1A1A1A);
    border-top: 1px solid rgba(0,0,0,.07);
    border-bottom: 1px solid rgba(0,0,0,.07);
  }
  .rp-rp-item td {
    padding: 5px 10px;
    border-bottom: 1px solid #F0F0F0;
    vertical-align: top; color: #333;
    line-height: 1.45;
  }
  .rp-rp-item td:last-child { text-align: right; font-variant-numeric: tabular-nums; }
  .rp-rp-item--alt td { background: rgba(0,0,0,.018); }

  /* Precio — oculto en impresión */
  .rp-precio { color: #C87040; font-weight: 600; font-size: 0.75rem; }

  /* ── Menú semanal ──────────────────────────────────────────────────────── */
  .rp-menu-section { padding: 0 32px 20px; }
  .rp-menu-table {
    width: 100%; border-collapse: collapse; font-size: 0.8rem;
  }
  .rp-menu-table th {
    background: var(--color-primary, #2E7D32); color: #fff;
    padding: 7px 10px; font-size: 9px; font-weight: 800;
    letter-spacing: .08em; text-transform: uppercase; text-align: left;
  }
  .rp-menu-table td {
    padding: 7px 10px;
    border-bottom: 1px solid #F0EAE2;
    vertical-align: top; line-height: 1.5;
  }
  .rp-menu-table tr:nth-child(even) td { background: #FAFAF8; }
  .rp-menu-dia { font-weight: 700; color: var(--color-primary, #2E7D32); display: block; }
  .rp-menu-fecha { font-size: 0.7rem; color: #9E9E9E; display: block; }
  .rp-menu-vacio { color: #BDBDBD; font-style: italic; }

  /* ── Registros y Controles ─────────────────────────────────────────────── */
  .rp-reg-section { padding: 0 32px 24px; }

  /* ── Notas clínicas ────────────────────────────────────────────────────── */
  .rp-notas-box {
    background: #FAFAF8; border: 1px solid #EEE8E2;
    border-radius: 8px; padding: 14px 16px;
    font-size: 0.8125rem; line-height: 1.75; color: #424242;
    white-space: pre-wrap; word-break: break-word;
  }

  /* ── Presupuesto ───────────────────────────────────────────────────────── */
  .rp-budget-box {
    background: rgba(255,255,255,.75);
    border: 2px solid var(--color-amarillo-deep, #E8C870);
    border-radius: 12px; padding: 20px 28px;
    display: flex; flex-direction: column; align-items: center; gap: 10px;
    box-shadow: 0 4px 20px rgba(232,200,112,.22);
    max-width: 420px; margin: 0 auto var(--space-4, 16px);
  }
  .rp-budget-box__label { font-size: 0.67rem; font-weight: 800; text-transform: uppercase; letter-spacing: .12em; color: var(--color-durazno-dark, #C87040); }
  .rp-budget-box__total { font-size: 2rem; font-weight: 800; color: var(--color-durazno-dark, #C87040); font-variant-numeric: tabular-nums; letter-spacing: -0.03em; font-family: 'Quicksand', system-ui, sans-serif; }
  .rp-budget-box__daily { font-size: 0.8125rem; color: #757575; font-style: italic; }
  .rp-budget-note { background: rgba(255,255,255,.55); border: 1px solid var(--color-amarillo-deep, #E8C870); border-radius: 6px; padding: 8px 14px; font-size: 0.72rem; color: #6D5F40; line-height: 1.65; text-align: center; margin: 0 32px; }

  /* ── Pie de página ─────────────────────────────────────────────────────── */
  .rp-footer {
    padding: 12px 32px 16px;
    background: #FDFAF8; margin-top: 20px;
    position: relative;
  }
  .rp-footer::before {
    content: ''; position: absolute; top: 0; left: 32px; right: 32px; height: 1.5px;
    background: linear-gradient(90deg, var(--color-durazno-dark, #C87040) 0%, var(--color-durazno, #FFB87A) 55%, transparent 100%);
    border-radius: 1px;
  }
  .rp-footer__row {
    display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;
  }
  .rp-footer__profesional { display: flex; flex-direction: column; gap: 2px; }
  .rp-footer__nombre { font-size: 0.75rem; font-weight: 700; color: var(--color-durazno-dark, #C87040); letter-spacing: 0.01em; }
  .rp-footer__mn { font-size: 0.67rem; color: #757575; letter-spacing: 0.07em; text-transform: uppercase; font-weight: 600; }
  .rp-footer__derecha { text-align: right; display: flex; flex-direction: column; gap: 3px; }
  .rp-footer__fecha { font-size: 0.72rem; font-weight: 700; color: #424242; letter-spacing: 0.04em; font-variant-numeric: tabular-nums; }
  .rp-footer__conf { font-size: 0.67rem; color: #9E9E9E; letter-spacing: 0.03em; font-style: italic; }

  /* ── Overrides de impresión ─────────────────────────────────────────────── */
  @media print {
    .reporte-doc {
      position: static  !important;
      inset:    auto    !important;
      overflow: visible !important;
      padding:  0       !important;
    }
    .rp-print-page { break-after: always !important; page-break-after: always !important; }
    .rp-print-page:last-child { break-after: auto !important; page-break-after: auto !important; }
    .rp-footer { break-inside: avoid !important; page-break-inside: avoid !important; }
    .rp-budget-box, .rp-budget-note { break-inside: avoid !important; page-break-inside: avoid !important; }

    /* ─── REGLA ESTRICTA: ocultar todos los precios ─────────────────────── */
    .rp-precio,
    .rp-th--precio,
    .rp-costo-col,
    .rp-budget-box,
    .rp-budget-note { display: none !important; }

    .rp-page-title { padding-inline: 10mm !important; }
    .rp-rp-table-wrap, .rp-menu-section, .rp-reg-section { padding-inline: 10mm !important; }
  }
`

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ExportarReporte() {
  const pacienteId                = useUIStore(s => s.pacienteId)
  const [datos, setDatos]         = useState(null)
  const [cargando, setCargando]   = useState(false)
  const [generando, setGenerando] = useState(false)
  const numeroRef                 = useRef(generarRef())
  const fechaStr                  = fCompleta()
  const fechaCorta                = fDDMMAAAA()

  // Inyectar fuente + estilos
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
    return () => { document.getElementById(STYLE_ID)?.remove() }
  }, [])

  // Carga de datos
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

        // Menú semanal
        const diasSemana  = getSemanaActual()
        const plansSemana = diasSemana.map(d => planesArr.find(p => p.fecha === d) ?? null)

        setDatos({ paciente, historias, ultimaHistoria, ultimoPlan, productos: productosArr, diasSemana, plansSemana })
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

  // ── Sin paciente ──────────────────────────────────────────────────────────
  if (!pacienteId) {
    return (
      <div className="reporte-wrapper">
        <div className="reporte-no-patient" role="status" aria-live="polite">
          <div className="reporte-no-patient__orb" aria-hidden="true" />
          <p className="reporte-no-patient__title">Ningún paciente seleccionado</p>
          <p className="reporte-no-patient__text">
            Seleccioná un paciente en la pestaña <strong>Pacientes</strong> para
            generar su prescripción dietética imprimible.
          </p>
          <Link to="/pacientes" className="reporte-no-patient__cta">Ir a Pacientes</Link>
        </div>
      </div>
    )
  }

  // ── Cargando ──────────────────────────────────────────────────────────────
  if (cargando || datos === null) {
    return (
      <div className="reporte-loading" role="status" aria-live="polite">
        <span className="loading-screen" aria-hidden="true" style={{ width: 28, height: 28, minHeight: 'unset' }} />
        Preparando reporte…
      </div>
    )
  }

  // ── Derivaciones ──────────────────────────────────────────────────────────
  const { paciente, historias, ultimaHistoria, ultimoPlan, productos, diasSemana, plansSemana } = datos

  const nombreCompleto = [paciente?.nombre, paciente?.apellido].filter(Boolean).join(' ') || 'Paciente sin nombre'
  const edad           = calcularEdad(paciente?.fechaNacimiento)
  const cat            = imcInfo(ultimaHistoria?.imc)

  const { costoDiario, costoMensual } = (ultimoPlan && productos?.length)
    ? calcularCostoMenu(ultimoPlan, productos)
    : { costoDiario: 0, costoMensual: 0 }

  const tablaRP = (() => {
    if (!ultimoPlan?.tablaRP) return []
    try { return JSON.parse(ultimoPlan.tablaRP) } catch { return [] }
  })()

  const indicacionesIniciales = ultimoPlan?.indicacionesIniciales
    ?? ultimoPlan?.indicaciones
    ?? ''

  const metricas = [
    { tipo: 'IMC',           val: ultimaHistoria?.imc          != null ? Number(ultimaHistoria.imc).toFixed(1)  : null, unidad: '',        esIMC: true },
    { tipo: 'Peso',          val: ultimaHistoria?.peso         != null ? ultimaHistoria.peso                     : null, unidad: 'kg'    },
    { tipo: 'Talla',         val: ultimaHistoria?.altura       != null ? `${ultimaHistoria.altura}`              : null, unidad: 'cm'    },
    { tipo: 'Masa Grasa',    val: ultimaHistoria?.masaGrasa    != null ? ultimaHistoria.masaGrasa                : null, unidad: '%'     },
    { tipo: 'Masa Muscular', val: ultimaHistoria?.masaMuscular != null ? ultimaHistoria.masaMuscular             : null, unidad: 'kg'    },
    { tipo: 'Cintura',       val: ultimaHistoria?.cintura      != null ? ultimaHistoria.cintura                  : null, unidad: 'cm'    },
    { tipo: 'Cadera',        val: ultimaHistoria?.cadera       != null ? ultimaHistoria.cadera                   : null, unidad: 'cm'    },
    { tipo: 'Agua Corporal', val: ultimaHistoria?.aguaCorporal != null ? ultimaHistoria.aguaCorporal             : null, unidad: '%'     },
  ].filter(m => m.val !== null)

  const tendencia = (() => {
    if (historias.length < 2) return null
    const diff = (historias[0].imc ?? 0) - (historias[1].imc ?? 0)
    if (Math.abs(diff) < 0.1) return { dir: 'stable', label: 'Estable' }
    return diff < 0
      ? { dir: 'down', label: `↓ ${Math.abs(diff).toFixed(1)} pts` }
      : { dir: 'up',   label: `↑ ${Math.abs(diff).toFixed(1)} pts` }
  })()

  const fmtARS = n => n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="reporte-wrapper">

      {/* Barra de acciones — oculta al imprimir */}
      <div className="reporte-actions">
        <Link to="/pacientes" className="reporte-back-btn">← Cambiar paciente</Link>
        <button
          className="reporte-print-btn"
          onClick={handlePrint}
          disabled={generando}
          type="button"
        >
          {generando ? 'Preparando…' : <><IconPrint aria-hidden="true" /> Imprimir · Guardar PDF</>}
        </button>
      </div>

      <div className="reporte-doc" id="reporte-documento">

        {/* Membrete compartido */}
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
            <p className="reporte-letterhead__date" style={{ textTransform: 'capitalize' }}>{fechaStr}</p>
            <p className="reporte-letterhead__ref">{numeroRef.current}</p>
          </div>
        </header>

        <div className="reporte-rule" aria-hidden="true" />

        {/* ════════════════════════════════════════════════════════════════
            HOJA 1 — DATOS DEL PACIENTE + INDICACIONES INICIALES
            ════════════════════════════════════════════════════════════════ */}
        <div className="rp-print-page">

          <div className="rp-page-title reporte-title-section">
            <h1 className="reporte-main-title rp-quicksand">Prescripción Dietética del Paciente</h1>
            <p className="reporte-main-subtitle">
              Datos clínicos, objetivo y prescripción inicial de{' '}
              <strong>{nombreCompleto}</strong>{' · '}{fechaStr}
            </p>
          </div>

          {/* 01 — Datos personales y de contacto */}
          <section className="reporte-section rp-section--durazno" aria-label="Datos del paciente">
            <h2 className="reporte-section__title">
              <span className="reporte-section__num">01</span>
              Datos del Paciente
            </h2>
            <div className="reporte-patient-grid">
              <div className="reporte-patient-col">
                <Field label="Nombre completo" value={nombreCompleto} />
                <Field label="Edad" value={edad != null ? `${edad} años` : paciente?.fechaNacimiento ? fCorta(paciente.fechaNacimiento) : null} />
                <Field label="Sexo biológico" value={paciente?.genero ? titleCase(paciente.genero.replace(/-/g, ' ')) : null} />
                <Field label="Objetivo clínico" value={paciente?.objetivo ? (OBJETIVO_LABELS[paciente.objetivo] ?? titleCase(paciente.objetivo)) : null} />
              </div>
              <div className="reporte-patient-col">
                <Field label="Correo electrónico" value={paciente?.email} />
                <Field label="Teléfono" value={paciente?.telefono} />
                <Field label="Fecha de ingreso" value={paciente?.creadoEn ? fCorta(paciente.creadoEn) : null} />
                <Field label="Última consulta" value={ultimaHistoria?.fecha ? fCorta(ultimaHistoria.fecha) : null} />
              </div>
            </div>

            {/* Métricas principales inline */}
            {metricas.length > 0 && (
              <div className="reporte-mediciones" style={{ marginTop: 'var(--space-3)' }}>
                {metricas.map(m => (
                  <div key={m.tipo} className={`reporte-medicion-card${m.esIMC ? ' reporte-medicion-card--imc' : ''}`}>
                    <span className="reporte-medicion-card__tipo">{m.tipo}</span>
                    <span className="reporte-medicion-card__valor">
                      {m.val}{m.unidad && <span className="reporte-medicion-card__unidad"> {m.unidad}</span>}
                    </span>
                    {m.esIMC && (
                      <span className={`reporte-imc-badge reporte-imc-badge--${cat.cls}`}>{cat.label}</span>
                    )}
                    {tendencia && m.esIMC && (
                      <span className={`reporte-imc-trend reporte-imc-trend--${tendencia.dir}`}>{tendencia.label}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 02 — Indicaciones Iniciales */}
          <section
            className="reporte-section rp-section--verde"
            aria-label="Indicaciones iniciales del plan"
          >
            <h2 className="reporte-section__title">
              <span className="reporte-section__num">02</span>
              Indicaciones Iniciales
            </h2>
            {indicacionesIniciales.trim() ? (
              <div className="rp-notas-box">{indicacionesIniciales.trim()}</div>
            ) : (
              <p className="reporte-empty">
                Sin indicaciones iniciales registradas. Creá la prescripción desde la pestaña <strong>Planes</strong>.
              </p>
            )}
          </section>

          <PageFooter nombreCompleto={nombreCompleto} fechaCorta={fechaCorta} />
        </div>

        {/* ════════════════════════════════════════════════════════════════
            HOJA 2 — TABLA R/P DETALLADA
            ════════════════════════════════════════════════════════════════ */}
        <div className="rp-print-page">

          <div className="rp-page-title reporte-title-section">
            <h1 className="reporte-main-title rp-quicksand">Tabla R/P — Prescripción Alimentaria</h1>
            <p className="reporte-main-subtitle">
              Prescripción nutricional vigente para <strong>{nombreCompleto}</strong>
              {ultimoPlan?.fecha && <>{' · '}Fecha del plan: <strong>{fCorta(ultimoPlan.fecha)}</strong></>}
            </p>
          </div>

          <section
            className="reporte-section"
            aria-label="Tabla de prescripción alimentaria"
            style={{ background: 'linear-gradient(180deg, #FFFAF7 0%, #FFFFFF 100%)' }}
          >
            <h2 className="reporte-section__title">
              <span className="reporte-section__num">03</span>
              Prescripción Dietética — R/P
              <span style={{ marginLeft: 8, fontSize: '0.72rem', fontWeight: 500, color: '#9E9E9E' }}>
                (precios de góndola: visibles solo para el profesional)
              </span>
            </h2>

            {tablaRP.length === 0 ? (
              <p className="reporte-empty" style={{ padding: '0 32px 20px' }}>
                Sin prescripción registrada. Completá la tabla R/P en la pestaña <strong>Planes</strong>.
              </p>
            ) : (
              <div className="rp-rp-table-wrap">
                <table className="rp-rp-table">
                  <colgroup>
                    <col style={{ width: '28%' }} />
                    <col style={{ width: '47%' }} />
                    <col style={{ width: '16%' }} />
                    <col className="rp-costo-col" style={{ width: '9%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="rp-th--alimento">Alimentos</th>
                      <th className="rp-th--caract">Características</th>
                      <th className="rp-th--cant">Cantidades</th>
                      <th className="rp-th--precio rp-costo-col">Costo est.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {GRUPOS_RP.map(grupo => {
                      const rows = tablaRP.filter(r => r.grupo === grupo.label && r.alimento?.trim())
                      if (rows.length === 0) return null
                      return (
                        <RpGrupoRows
                          key={grupo.id}
                          grupo={grupo}
                          rows={rows}
                          productos={productos}
                        />
                      )
                    })}
                  </tbody>
                </table>

                {/* Costo diario estimado — screen only */}
                {costoDiario > 0 && (
                  <p className="rp-precio" style={{ textAlign: 'right', padding: '8px 0', fontSize: '0.75rem', fontWeight: 700 }}>
                    Costo diario estimado (Posadas): ${fmtARS(costoDiario)}
                  </p>
                )}
              </div>
            )}
          </section>

          <PageFooter nombreCompleto={nombreCompleto} fechaCorta={fechaCorta} />
        </div>

        {/* ════════════════════════════════════════════════════════════════
            HOJA 3 — MENÚ SEMANAL · NOTAS · REGISTROS Y CONTROLES
            ════════════════════════════════════════════════════════════════ */}
        <div className="rp-print-page">

          <div className="rp-page-title reporte-title-section">
            <h1 className="reporte-main-title rp-quicksand">Menú Semanal y Seguimiento Clínico</h1>
            <p className="reporte-main-subtitle">
              Planificación semanal, notas y evolución de <strong>{nombreCompleto}</strong>
            </p>
          </div>

          {/* 04 — Menú semanal */}
          <section className="reporte-section" aria-label="Menú semanal">
            <h2 className="reporte-section__title">
              <span className="reporte-section__num">04</span>
              Menú Semanal
            </h2>
            <div className="rp-menu-section">
              <table className="rp-menu-table">
                <thead>
                  <tr>
                    <th style={{ width: '18%' }}>Día</th>
                    <th style={{ width: '62%' }}>Alimentos destacados</th>
                    <th style={{ width: '20%' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {DIAS_SEMANA.map((dia, i) => {
                    const plan   = plansSemana[i]
                    const resumen = getPlanResumen(plan)
                    return (
                      <tr key={dia}>
                        <td>
                          <span className="rp-menu-dia">{dia}</span>
                          <span className="rp-menu-fecha">{diasSemana[i]}</span>
                        </td>
                        <td>
                          {resumen === '—'
                            ? <span className="rp-menu-vacio">Sin plan registrado</span>
                            : resumen}
                        </td>
                        <td>
                          {plan
                            ? <span style={{ color: 'var(--color-primary, #2E7D32)', fontWeight: 700, fontSize: '0.75rem' }}>Registrado</span>
                            : <span style={{ color: '#BDBDBD', fontSize: '0.75rem' }}>Pendiente</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* 05 — Notas clínicas */}
          <section className="reporte-section" aria-label="Notas clínicas">
            <h2 className="reporte-section__title">
              <span className="reporte-section__num">05</span>
              Notas Clínicas
            </h2>
            <div style={{ padding: '0 32px 16px' }}>
              {ultimaHistoria?.notas?.trim() ? (
                <>
                  <p className="reporte-section__desc" style={{ marginBottom: 8 }}>
                    Notas de consulta del <strong>{fCorta(ultimaHistoria.fecha)}</strong>:
                  </p>
                  <div className="rp-notas-box">{ultimaHistoria.notas.trim()}</div>
                </>
              ) : (
                <p className="reporte-empty" style={{ padding: 0 }}>Sin notas clínicas registradas en la última consulta.</p>
              )}
            </div>
          </section>

          {/* 06 — Registros y Controles */}
          <section className="reporte-section" aria-label="Registros y controles antropométricos">
            <h2 className="reporte-section__title">
              <span className="reporte-section__num">06</span>
              Registros y Controles
            </h2>
            <div className="rp-reg-section">
              {historias.length === 0 ? (
                <p className="reporte-empty" style={{ padding: 0 }}>Sin consultas registradas para este paciente.</p>
              ) : (
                <>
                  <p className="reporte-section__desc" style={{ marginBottom: 10 }}>
                    Historial de{' '}
                    <strong>{Math.min(historias.length, 10)} {historias.length === 1 ? 'consulta' : 'consultas'}</strong>
                    {historias.length > 10 && ` (de ${historias.length} totales)`}
                    {' '}en orden descendente.
                  </p>
                  <table className="reporte-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Peso</th>
                        <th>IMC</th>
                        <th>C.C. (Cintura)</th>
                        <th>Categoría</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historias.slice(0, 10).map((h, i) => {
                        const info     = imcInfo(h.imc)
                        const esAlerta = info.cls === 'sobrepeso' || info.cls === 'obesidad'
                        return (
                          <tr
                            key={h.id}
                            className={esAlerta ? 'reporte-evolucion-row--alerta' : 'reporte-evolucion-row--normal'}
                          >
                            <td>
                              <strong>{fCorta(h.fecha)}</strong>
                              {i === 0 && <span className="reporte-table__detail">Más reciente</span>}
                            </td>
                            <td>{h.peso   != null ? `${h.peso} kg`   : '—'}</td>
                            <td>{h.imc    != null ? <strong>{Number(h.imc).toFixed(1)}</strong> : '—'}</td>
                            <td>{h.cintura != null ? `${h.cintura} cm` : '—'}</td>
                            <td>
                              {h.imc != null ? (
                                <span className={`reporte-badge reporte-imc-badge--${info.cls}`}>{info.label}</span>
                              ) : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {historias.length > 10 && (
                    <p className="reporte-footnote">
                      Se muestran las 10 consultas más recientes de {historias.length} registros totales.
                    </p>
                  )}
                </>
              )}
            </div>
          </section>

          {/* Presupuesto mensual — visible solo en pantalla */}
          {costoDiario > 0 && (
            <section className="reporte-section rp-section--amarillo" aria-label="Presupuesto alimentario mensual">
              <h2 className="reporte-section__title">
                <span className="reporte-section__num">07</span>
                Presupuesto Alimentario Mensual Estimado
              </h2>
              <div className="rp-budget-box" role="region" aria-label="Total mensual estimado">
                <p className="rp-budget-box__label">Presupuesto Mensual Estimado — Posadas, Misiones</p>
                <p className="rp-budget-box__total">${fmtARS(costoMensual)}</p>
                <p className="rp-budget-box__daily">≈ ${fmtARS(costoDiario)} por día · calculado sobre 30 días</p>
              </div>
              <p className="rp-budget-note">
                Estimación basada en relevamiento de precios de góndola (Hipermercado Libertad/ChangoMás y Mercado Central de Misiones).
                Los precios no forman parte del informe clínico impreso. Uso orientativo para la economía familiar.
              </p>
            </section>
          )}

          <PageFooter nombreCompleto={nombreCompleto} fechaCorta={fechaCorta} />
        </div>

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
      <span className={`reporte-patient-field__value${isEmpty ? ' reporte-patient-field__value--empty' : ''}`}>
        {isEmpty ? '—' : value}
      </span>
    </div>
  )
}

/** Filas de un grupo en la tabla R/P */
function RpGrupoRows({ grupo, rows, productos }) {
  const fmtARS = n => n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  function estimarCosto(alimento, cantidad) {
    if (!alimento?.trim() || !cantidad?.trim() || !productos?.length) return 0
    const m = cantidad.match(/(\d+(?:[.,]\d+)?)\s*(kg|l|g|ml)?/i)
    if (!m) return 0
    let porcion = parseFloat(m[1].replace(',', '.'))
    const unit = (m[2] ?? 'g').toLowerCase()
    if (unit === 'kg' || unit === 'l') porcion *= 1000
    if (!porcion || isNaN(porcion)) return 0
    const normA = alimento.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
    let best = null, bestLen = 0
    for (const p of (productos ?? [])) {
      if (!p.precioRef || !p.cantidadRefGramo) continue
      const pN = p.nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      if (normA.includes(pN) && pN.length > bestLen) { best = p; bestLen = pN.length }
    }
    if (!best) return 0
    return (best.precioRef / best.cantidadRefGramo) * porcion
  }

  return (
    <>
      <tr className="rp-rp-group">
        <td colSpan={4} style={{ background: grupo.color }}>
          {grupo.emoji} {grupo.label}
        </td>
      </tr>
      {rows.map((row, i) => {
        const costo = estimarCosto(row.alimento, row.cantidad)
        return (
          <tr key={row.id} className={`rp-rp-item${i % 2 === 1 ? ' rp-rp-item--alt' : ''}`}>
            <td>{row.alimento}</td>
            <td>{row.caracteristicas}</td>
            <td>{row.cantidad}</td>
            <td className="rp-costo-col">
              {costo > 0 && <span className="rp-precio">${fmtARS(costo)}</span>}
            </td>
          </tr>
        )
      })}
    </>
  )
}

/** Pie de página con datos del profesional y confidencialidad */
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
        <div className="rp-footer__derecha">
          <span className="rp-footer__fecha">{fechaCorta}</span>
          <span className="rp-footer__conf">
            Documento confidencial de uso exclusivo de {nombreCompleto}
          </span>
        </div>
      </div>
    </footer>
  )
}

function IconPrint() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  )
}
