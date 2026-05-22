/**
 * ExportarReporte — Reporte ejecutivo de lujo para NutriApp Profesional.
 *
 * Pantalla:
 *   Muestra un documento de aspecto membretado corporativo con:
 *     · Encabezado verde oscuro con datos del profesional y referencia
 *     · Franja dorada separadora
 *     · Sección 01 — Gestión de Pacientes (tabla)
 *     · Sección 02 — Mediciones Antropométricas (grilla de tarjetas)
 *     · Sección 03 — Seguimiento Nutricional del mes (macros + objetivo)
 *     · Pie de página con línea gradiente y texto legal
 *
 * Impresión (window.print() + @media print en index.css):
 *   · Toda la UI de la app queda oculta (visibility: hidden)
 *   · Solo .reporte-doc se vuelve visible y ocupa la página completa
 *   · Configurado para A4 con márgenes 14/12/16 mm
 *   · page-break-inside: avoid en secciones y tarjetas
 *
 * Props: ninguna — carga todos sus datos de IndexedDB al montar.
 */
import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import db from '@/db/database'

// ─── Utilidades de formato ────────────────────────────────────────────────────

/** Capitaliza la primera letra de cada palabra. */
const titleCase = (str) =>
  str.replace(/\b\w/g, (c) => c.toUpperCase())

/** Formatea una fecha ISO (YYYY-MM-DD o ISO completo) en español. */
function formatFechaCorta(isoStr) {
  const d = new Date(isoStr.length === 10 ? `${isoStr}T12:00:00` : isoStr)
  return d.toLocaleDateString('es-AR', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

/** Formatea la fecha actual completa en español. */
function formatFechaCompleta(d = new Date()) {
  return d.toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

/**
 * Genera un número de referencia reproducible para el día actual,
 * sin Math.random() para que no cambie al re-renderizar.
 * Ej: NRP-202605-0522
 */
function generarNumeroRef() {
  const d    = new Date()
  const anio = d.getFullYear()
  const mes  = String(d.getMonth() + 1).padStart(2, '0')
  const dia  = String(d.getDate()).padStart(2, '0')
  const hora = String(d.getHours()).padStart(2, '0')
  return `NRP-${anio}${mes}-${dia}${hora}`
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const TIPOS_MEDICION = ['peso', 'cintura', 'cadera', 'cuello', 'grasa_corporal']

const ETIQUETAS_MEDICION = {
  peso:          'Peso',
  cintura:       'Cintura',
  cadera:        'Cadera',
  cuello:        'Cuello',
  grasa_corporal: 'Grasa Corporal',
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ExportarReporte() {
  const navigate       = useNavigate()
  const [datos, setDatos]       = useState(null)
  const [generando, setGenerando] = useState(false)
  const numeroRef = useRef(generarNumeroRef())

  const fechaStr = formatFechaCompleta()

  // ── Carga de datos ────────────────────────────────────────────────────────
  useEffect(() => {
    async function cargar() {
      const hoy         = new Date()
      const inicioMes   = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
        .toISOString().slice(0, 10)

      const [usuario, pacientes, progreso, registros] = await Promise.all([
        db.usuario.get('local'),
        db.pacientes.limit(50).toArray(),
        db.progreso.orderBy('fecha').reverse().limit(60).toArray(),
        db.registros.where('fecha').aboveOrEqual(inicioMes).toArray(),
      ])

      setDatos({ usuario, pacientes, progreso, registros })
    }
    cargar()
  }, [])

  // ── Imprimir ──────────────────────────────────────────────────────────────
  const handlePrint = useCallback(() => {
    setGenerando(true)
    // Pequeño delay para que el estado "Preparando…" se pinte antes de print()
    setTimeout(() => {
      window.print()
      setGenerando(false)
    }, 280)
  }, [])

  // ── Loading ───────────────────────────────────────────────────────────────
  if (!datos) {
    return (
      <div className="reporte-loading" role="status" aria-live="polite">
        <span className="loading-screen" aria-hidden="true"
              style={{ width: 28, height: 28, minHeight: 'unset' }} />
        Preparando reporte…
      </div>
    )
  }

  // ── Derivaciones ─────────────────────────────────────────────────────────
  const { usuario, pacientes, progreso, registros } = datos

  // Nombre del profesional
  const nombrePro = usuario?.nombre?.trim() || 'Profesional'

  // Última medición por tipo
  const ultimasMediciones = TIPOS_MEDICION.reduce((acc, tipo) => {
    const match = progreso.find((r) => r.tipo === tipo)
    if (match) acc[tipo] = match
    return acc
  }, {})

  // Resumen nutricional del mes
  const diasSet        = new Set(registros.map((r) => r.fecha))
  const diasRegistrados = diasSet.size
  const totalEntradas  = registros.length

  const sumaMacros = registros.reduce(
    (acc, r) => ({
      calorias:      acc.calorias      + (r.calorias      ?? 0),
      proteinas:     acc.proteinas     + (r.proteinas     ?? 0),
      carbohidratos: acc.carbohidratos + (r.carbohidratos ?? 0),
      grasas:        acc.grasas        + (r.grasas        ?? 0),
    }),
    { calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0 },
  )

  const promedio = diasRegistrados > 0
    ? {
        calorias:      Math.round(sumaMacros.calorias      / diasRegistrados),
        proteinas:     Math.round(sumaMacros.proteinas     / diasRegistrados),
        carbohidratos: Math.round(sumaMacros.carbohidratos / diasRegistrados),
        grasas:        Math.round(sumaMacros.grasas        / diasRegistrados),
      }
    : null

  const config = usuario?.configuracion ?? {}

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="reporte-wrapper">

      {/* ── Barra de acciones — se oculta al imprimir ── */}
      <div className="reporte-actions">
        <button className="reporte-back-btn" onClick={() => navigate(-1)}>
          ← Volver
        </button>
        <button
          className="reporte-print-btn"
          onClick={handlePrint}
          disabled={generando}
        >
          {generando ? 'Preparando…' : '🖨  Imprimir / Descargar PDF'}
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          DOCUMENTO — única sección que se imprime (.reporte-doc)
          ════════════════════════════════════════════════════════════════════ */}
      <div className="reporte-doc" id="reporte-documento">

        {/* ── Membrete / Letterhead ── */}
        <header className="reporte-letterhead">
          <div className="reporte-letterhead__brand">
            <div className="reporte-letterhead__logo" aria-hidden="true">🥗</div>
            <div>
              <p className="reporte-letterhead__title">NutriApp Profesional</p>
              <p className="reporte-letterhead__subtitle">
                Sistema de Gestión Nutricional Clínica
              </p>
            </div>
          </div>
          <div className="reporte-letterhead__meta">
            <p className="reporte-letterhead__professional">{nombrePro}</p>
            <p className="reporte-letterhead__date">{fechaStr}</p>
            <p className="reporte-letterhead__ref">{numeroRef.current}</p>
          </div>
        </header>

        {/* Franja dorada separadora */}
        <div className="reporte-rule" aria-hidden="true" />

        {/* ── Título del reporte ── */}
        <div className="reporte-title-section">
          <h1 className="reporte-main-title">Reporte Clínico Integral</h1>
          <p className="reporte-main-subtitle">
            Resumen de actividad, seguimiento de pacientes y evolución nutricional
          </p>
        </div>

        {/* ────────────────────────────────────────────────────────────────
            SECCIÓN 01 — GESTIÓN DE PACIENTES
            ──────────────────────────────────────────────────────────────── */}
        <section className="reporte-section" aria-label="Gestión de Pacientes">
          <h2 className="reporte-section__title">
            <span className="reporte-section__num">01</span>
            Gestión de Pacientes
          </h2>

          {pacientes.length === 0 ? (
            <p className="reporte-empty">
              No se han registrado pacientes en el sistema. Use la sección «Registrar»
              para agregar el primer paciente.
            </p>
          ) : (
            <>
              <p className="reporte-section__desc">
                Total de pacientes registrados en el sistema:{' '}
                <strong>{pacientes.length}</strong>.
                {pacientes.length > 10 && ' Se muestran los 10 más recientes.'}
              </p>

              <table className="reporte-table">
                <thead>
                  <tr>
                    <th>Paciente</th>
                    <th>Contacto</th>
                    <th>Alta</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {pacientes.slice(0, 10).map((p) => {
                    const nombre = [p.nombre, p.apellido]
                      .filter(Boolean)
                      .join(' ') || 'Sin nombre'
                    const contacto = p.email || p.telefono || '—'
                    const fechaAlta = p.creadoEn
                      ? formatFechaCorta(p.creadoEn)
                      : '—'

                    return (
                      <tr key={p.id}>
                        <td>
                          <strong>{nombre}</strong>
                          {p.genero && (
                            <span className="reporte-table__detail">
                              {titleCase(p.genero.replace(/-/g, ' '))}
                            </span>
                          )}
                        </td>
                        <td>{contacto}</td>
                        <td>{fechaAlta}</td>
                        <td>
                          <span
                            className={`reporte-badge ${
                              p.sincronizado
                                ? 'reporte-badge--ok'
                                : 'reporte-badge--pending'
                            }`}
                          >
                            {p.sincronizado ? 'Sincronizado' : 'Local'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {pacientes.length > 10 && (
                <p className="reporte-footnote">
                  Mostrando 10 de {pacientes.length} pacientes. Para el listado
                  completo, aplique filtros desde la sección Pacientes.
                </p>
              )}
            </>
          )}
        </section>

        {/* ────────────────────────────────────────────────────────────────
            SECCIÓN 02 — MEDICIONES ANTROPOMÉTRICAS
            ──────────────────────────────────────────────────────────────── */}
        <section className="reporte-section" aria-label="Mediciones antropométricas">
          <h2 className="reporte-section__title">
            <span className="reporte-section__num">02</span>
            Mediciones Antropométricas
          </h2>

          {Object.keys(ultimasMediciones).length === 0 ? (
            <p className="reporte-empty">
              No se han registrado mediciones corporales. Use la sección «Progreso»
              para comenzar el seguimiento.
            </p>
          ) : (
            <>
              <p className="reporte-section__desc">
                Últimas mediciones registradas en el sistema, ordenadas por recencia.
                {progreso.length > 0 && (
                  <> Total de registros acumulados: <strong>{progreso.length}</strong>.</>
                )}
              </p>

              <div className="reporte-mediciones">
                {TIPOS_MEDICION.filter((t) => ultimasMediciones[t]).map((tipo) => {
                  const r = ultimasMediciones[tipo]
                  return (
                    <div key={tipo} className="reporte-medicion-card">
                      <span className="reporte-medicion-card__tipo">
                        {ETIQUETAS_MEDICION[tipo]}
                      </span>
                      <span className="reporte-medicion-card__valor">
                        {r.valor}
                        <span className="reporte-medicion-card__unidad">
                          {' '}{r.unidad ?? ''}
                        </span>
                      </span>
                      <time
                        className="reporte-medicion-card__fecha"
                        dateTime={r.fecha}
                      >
                        {formatFechaCorta(r.fecha)}
                      </time>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </section>

        {/* ────────────────────────────────────────────────────────────────
            SECCIÓN 03 — SEGUIMIENTO NUTRICIONAL (mes actual)
            ──────────────────────────────────────────────────────────────── */}
        <section className="reporte-section" aria-label="Seguimiento nutricional">
          <h2 className="reporte-section__title">
            <span className="reporte-section__num">03</span>
            Seguimiento Nutricional — Mes Actual
          </h2>

          {diasRegistrados === 0 ? (
            <p className="reporte-empty">
              No se han registrado entradas en el diario alimentario durante el mes
              actual. Los datos aparecerán aquí a medida que se registren comidas.
            </p>
          ) : (
            <>
              <p className="reporte-section__desc">
                Datos registrados durante{' '}
                <strong>
                  {diasRegistrados} {diasRegistrados === 1 ? 'día' : 'días'}
                </strong>{' '}
                en el mes actual, con un total de{' '}
                <strong>{totalEntradas}</strong>{' '}
                {totalEntradas === 1 ? 'entrada' : 'entradas'} en el diario
                alimentario. Los valores representan promedios diarios.
              </p>

              <div className="reporte-macros">
                <MacroCard
                  label="Calorías Promedio / Día"
                  value={promedio.calorias}
                  unit="kcal"
                  primary
                />
                <MacroCard
                  label="Proteínas"
                  value={promedio.proteinas}
                  unit="g / día"
                />
                <MacroCard
                  label="Carbohidratos"
                  value={promedio.carbohidratos}
                  unit="g / día"
                />
                <MacroCard
                  label="Grasas"
                  value={promedio.grasas}
                  unit="g / día"
                />
              </div>

              {/* Comparativa con objetivos configurados */}
              {config.caloriasObjetivo && (
                <div className="reporte-objetivo-row">
                  <span>Objetivos configurados</span>
                  <span>
                    <strong>{config.caloriasObjetivo}</strong> kcal ·{' '}
                    P: <strong>{config.proteinas ?? '—'}g</strong> ·{' '}
                    C: <strong>{config.carbohidratos ?? '—'}g</strong> ·{' '}
                    G: <strong>{config.grasas ?? '—'}g</strong>
                  </span>
                </div>
              )}

              <p className="reporte-footnote">
                Adherencia estimada al objetivo calórico:{' '}
                {config.caloriasObjetivo
                  ? `${Math.round((promedio.calorias / config.caloriasObjetivo) * 100)}%`
                  : 'objetivo no configurado'}
                . Los registros pueden incluir alimentos sin todos los macros
                completados, lo que podría subestimar los totales.
              </p>
            </>
          )}
        </section>

        {/* ── Pie de página del documento ── */}
        <footer className="reporte-footer">
          <div className="reporte-footer__rule" aria-hidden="true" />
          <div className="reporte-footer__content">
            <p className="reporte-footer__brand">
              <span aria-hidden="true">🥗</span> NutriApp Profesional
            </p>
            <p className="reporte-footer__legal">
              Documento generado el {fechaStr}. Ref.&nbsp;{numeroRef.current}.<br />
              Información confidencial de uso exclusivo del profesional habilitado.
              Prohibida su reproducción sin autorización.
            </p>
          </div>
        </footer>

      </div>{/* .reporte-doc */}
    </div> /* .reporte-wrapper */
  )
}

// ─── Subcomponente: tarjeta de macro ─────────────────────────────────────────

function MacroCard({ label, value, unit, primary = false }) {
  return (
    <div
      className={`reporte-macro-card${primary ? ' reporte-macro-card--primary' : ''}`}
    >
      <span className="reporte-macro-card__label">{label}</span>
      <span className="reporte-macro-card__value">
        {value.toLocaleString('es-AR')}
      </span>
      <span className="reporte-macro-card__unit">{unit}</span>
    </div>
  )
}
