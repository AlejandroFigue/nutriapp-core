/**
 * ExportarReporte — Resumen Ejecutivo Médico de Lujo · NutriApp Profesional
 *
 * Arquitectura y flujo de datos:
 *   1. Lee `pacienteId` desde UIStore global (establecido en /pacientes).
 *   2. Carga en paralelo desde IndexedDB (Dexie v2):
 *        · paciente        → tabla `pacientes` (datos personales, objetivo)
 *        · historias       → tabla `historias` (peso, IMC, medidas — desc. por fecha)
 *        · planes          → tabla `planes`    (último plan con desayuno, almuerzo…)
 *   3. Renderiza como un documento membretado corporativo:
 *        · Sección 01 — Datos del Paciente
 *        · Sección 02 — Métricas Antropométricas
 *        · Sección 03 — Evolución IMC (tabla de las últimas consultas)
 *        · Sección 04 — Plan Alimentario Asignado (comidas del último plan)
 *        · Sección 05 — Notas e Indicaciones Clínicas
 *
 * Impresión (window.print() + @media print en index.css):
 *   · Toda la UI de la app queda oculta (visibility: hidden en body *)
 *   · Solo .reporte-doc se revela y ocupa la página A4 completa
 *   · page-break-inside: avoid en secciones, tarjetas y comidas
 *   · Tablas con bordes sólidos para impresión clara
 *
 * Recibe: ninguna prop obligatoria — lee pacienteId desde UIStore.
 */
import { useEffect, useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import db from '@/db/database'
import { useUIStore } from '@/store/useUIStore'

// ─── Utilidades de formato ────────────────────────────────────────────────────

/** Capitaliza la primera letra de cada palabra. */
const titleCase = (str = '') =>
  str.replace(/\b\w/g, (c) => c.toUpperCase())

/** Formatea fecha ISO a "DD MMM YYYY" en español argentino. */
function fCorta(iso) {
  if (!iso) return '—'
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso)
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Formatea fecha completa con día de la semana. */
function fCompleta(d = new Date()) {
  return d.toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

/**
 * Genera número de referencia reproducible para el día actual.
 * No usa Math.random() para que no cambie en cada re-render.
 * Ej: NRP-202605-2714
 */
function generarRef() {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  return `NRP-${d.getFullYear()}${mm}-${dd}${hh}`
}

/** Calcula la edad en años a partir de una fecha de nacimiento ISO. */
function calcularEdad(fechaNacStr) {
  if (!fechaNacStr) return null
  const nac  = new Date(fechaNacStr + 'T12:00:00')
  const hoy  = new Date()
  let edad   = hoy.getFullYear() - nac.getFullYear()
  const diff = hoy.getMonth() - nac.getMonth()
  if (diff < 0 || (diff === 0 && hoy.getDate() < nac.getDate())) edad--
  return edad
}

// ─── Clasificación IMC (OMS) ─────────────────────────────────────────────────

const IMC_CATS = [
  { max: 18.5, label: 'Bajo peso',    cls: 'bajo'      },
  { max: 25,   label: 'Peso normal',  cls: 'normal'    },
  { max: 30,   label: 'Sobrepeso',    cls: 'sobrepeso' },
  { max: 35,   label: 'Obesidad I',   cls: 'obesidad'  },
  { max: 40,   label: 'Obesidad II',  cls: 'obesidad'  },
  { max: Infinity, label: 'Obesidad III', cls: 'obesidad' },
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
  { id: 'desayuno',  label: 'Desayuno',   emoji: '☀️'  },
  { id: 'almuerzo',  label: 'Almuerzo',   emoji: '🍽️' },
  { id: 'merienda',  label: 'Merienda',   emoji: '☕'  },
  { id: 'cena',      label: 'Cena',       emoji: '🌙'  },
]

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ExportarReporte() {
  const pacienteId   = useUIStore((s) => s.pacienteId)
  const [datos, setDatos]         = useState(null)
  const [cargando, setCargando]   = useState(false)
  const [generando, setGenerando] = useState(false)
  const numeroRef = useRef(generarRef())
  const fechaStr  = fCompleta()

  // ── Carga de datos desde IndexedDB ────────────────────────────────────────
  useEffect(() => {
    if (!pacienteId) { setDatos(null); return }

    let cancelado = false
    setCargando(true)

    async function cargar() {
      try {
        // Carga en paralelo desde Dexie v2
        const [paciente, historiasAsc, planesArr] = await Promise.all([
          db.pacientes.get(pacienteId),
          db.historias.where('pacienteId').equals(pacienteId).sortBy('fecha'),
          db.planes.where('pacienteId').equals(pacienteId).toArray(),
        ])

        if (cancelado) return

        // Historias en orden descendente (más reciente primero)
        const historias = [...historiasAsc].reverse()
        const ultimaHistoria = historias[0] ?? null

        // Plan más reciente (mayor fecha)
        const planesOrdenados = [...planesArr].sort((a, b) =>
          (b.fecha ?? '').localeCompare(a.fecha ?? '')
        )
        const ultimoPlan = planesOrdenados[0] ?? null

        setDatos({ paciente, historias, ultimaHistoria, ultimoPlan })
      } catch (err) {
        console.error('[ExportarReporte] Error cargando datos:', err)
        if (!cancelado) setDatos(null)
      } finally {
        if (!cancelado) setCargando(false)
      }
    }

    cargar()
    return () => { cancelado = true }
  }, [pacienteId])

  // ── Imprimir ──────────────────────────────────────────────────────────────
  const handlePrint = useCallback(() => {
    setGenerando(true)
    setTimeout(() => {
      window.print()
      setGenerando(false)
    }, 260)
  }, [])

  // ── Estado: ningún paciente seleccionado ─────────────────────────────────
  if (!pacienteId) {
    return (
      <div className="reporte-wrapper">
        <div className="reporte-no-patient" role="status" aria-live="polite">
          <div className="reporte-no-patient__orb" aria-hidden="true">🗂️</div>
          <p className="reporte-no-patient__title">
            Ningún paciente seleccionado
          </p>
          <p className="reporte-no-patient__text">
            Seleccioná un paciente en la pestaña <strong>Pacientes</strong> para
            generar su Reporte Ejecutivo personalizado con métricas
            antropométricas, evolución IMC y plan alimentario asignado.
          </p>
          <Link to="/pacientes" className="reporte-no-patient__cta">
            ← Ir a Pacientes
          </Link>
        </div>
      </div>
    )
  }

  // ── Estado: cargando ─────────────────────────────────────────────────────
  if (cargando || datos === null) {
    return (
      <div className="reporte-loading" role="status" aria-live="polite">
        <span
          className="loading-screen"
          aria-hidden="true"
          style={{ width: 28, height: 28, minHeight: 'unset' }}
        />
        Preparando reporte ejecutivo…
      </div>
    )
  }

  // ── Derivaciones de datos ─────────────────────────────────────────────────
  const { paciente, historias, ultimaHistoria, ultimoPlan } = datos

  const nombreCompleto = [paciente?.nombre, paciente?.apellido]
    .filter(Boolean).join(' ') || 'Paciente sin nombre'

  const edad  = calcularEdad(paciente?.fechaNacimiento)
  const cat   = imcInfo(ultimaHistoria?.imc)

  // Tendencia del IMC (últimas 2 consultas)
  const tendencia = (() => {
    if (historias.length < 2) return null
    const diff = (historias[0].imc ?? 0) - (historias[1].imc ?? 0)
    if (Math.abs(diff) < 0.1) return { dir: 'stable', label: 'Estable', sign: '' }
    return diff < 0
      ? { dir: 'down',   label: `↓ ${Math.abs(diff).toFixed(1)} pts`, sign: '↓' }
      : { dir: 'up',     label: `↑ ${Math.abs(diff).toFixed(1)} pts`, sign: '↑' }
  })()

  // Métricas de la última consulta (solo las que tienen valor)
  const metricasConValor = [
    { tipo: 'IMC',           val: ultimaHistoria?.imc         != null ? ultimaHistoria.imc.toFixed(1)          : null, unidad: '', esIMC: true },
    { tipo: 'Peso',          val: ultimaHistoria?.peso        != null ? ultimaHistoria.peso                     : null, unidad: 'kg'  },
    { tipo: 'Talla',         val: ultimaHistoria?.altura      != null ? `${ultimaHistoria.altura}`              : null, unidad: 'cm'  },
    { tipo: 'Masa Grasa',    val: ultimaHistoria?.masaGrasa   != null ? ultimaHistoria.masaGrasa                : null, unidad: '%'   },
    { tipo: 'Masa Muscular', val: ultimaHistoria?.masaMuscular!= null ? ultimaHistoria.masaMuscular             : null, unidad: 'kg'  },
    { tipo: 'Cintura',       val: ultimaHistoria?.cintura     != null ? ultimaHistoria.cintura                  : null, unidad: 'cm'  },
    { tipo: 'Cadera',        val: ultimaHistoria?.cadera      != null ? ultimaHistoria.cadera                   : null, unidad: 'cm'  },
    { tipo: 'Agua Corporal', val: ultimaHistoria?.aguaCorporal!= null ? ultimaHistoria.aguaCorporal             : null, unidad: '%'   },
    { tipo: 'Glucosa',       val: ultimaHistoria?.glucosa     != null ? ultimaHistoria.glucosa                  : null, unidad: 'mg/dL'},
  ].filter((m) => m.val !== null)

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="reporte-wrapper">

      {/* ── Barra de acciones — oculta al imprimir ── */}
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
          {generando
            ? 'Preparando…'
            : <><IconPrint aria-hidden="true" /> Imprimir / Guardar PDF</>
          }
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          DOCUMENTO — única sección que el navegador imprime
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="reporte-doc" id="reporte-documento">

        {/* ── MEMBRETE ───────────────────────────────────────────────────── */}
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
            <p className="reporte-letterhead__professional">
              Lic. en Nutrición
            </p>
            <p className="reporte-letterhead__date">{fechaStr}</p>
            <p className="reporte-letterhead__ref">{numeroRef.current}</p>
          </div>
        </header>

        {/* Franja dorada separadora */}
        <div className="reporte-rule" aria-hidden="true" />

        {/* ── Título del resumen ejecutivo ── */}
        <div className="reporte-title-section">
          <h1 className="reporte-main-title">
            Resumen Ejecutivo del Paciente
          </h1>
          <p className="reporte-main-subtitle">
            Informe clínico y nutricional de{' '}
            <strong>{nombreCompleto}</strong>
            {' · '}
            {fechaStr}
          </p>
        </div>

        {/* ────────────────────────────────────────────────────────────────
            SECCIÓN 01 — DATOS DEL PACIENTE
            ──────────────────────────────────────────────────────────────── */}
        <section className="reporte-section" aria-label="Datos del paciente">
          <h2 className="reporte-section__title">
            <span className="reporte-section__num">01</span>
            Datos del Paciente
          </h2>

          <div className="reporte-patient-grid">
            {/* Columna izquierda — datos personales */}
            <div className="reporte-patient-col">
              <Field label="Nombre completo"   value={nombreCompleto} />
              <Field
                label="Edad"
                value={
                  edad != null
                    ? `${edad} años`
                    : paciente?.fechaNacimiento
                      ? fCorta(paciente.fechaNacimiento)
                      : null
                }
              />
              <Field
                label="Sexo biológico"
                value={paciente?.genero ? titleCase(paciente.genero.replace(/-/g, ' ')) : null}
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

            {/* Columna derecha — contacto y admin */}
            <div className="reporte-patient-col">
              <Field label="Correo electrónico" value={paciente?.email}    />
              <Field label="Teléfono"            value={paciente?.telefono} />
              <Field
                label="Fecha de alta"
                value={paciente?.creadoEn ? fCorta(paciente.creadoEn) : null}
              />
              <Field
                label="Estado de sincronización"
                value={paciente?.sincronizado ? 'Sincronizado con el servidor' : 'Guardado localmente'}
              />
            </div>
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────────────
            SECCIÓN 02 — MÉTRICAS ANTROPOMÉTRICAS
            ──────────────────────────────────────────────────────────────── */}
        <section className="reporte-section" aria-label="Métricas antropométricas">
          <h2 className="reporte-section__title">
            <span className="reporte-section__num">02</span>
            Métricas Antropométricas
          </h2>

          {metricasConValor.length === 0 ? (
            <p className="reporte-empty">
              No se han registrado mediciones clínicas para este paciente.
              Agregue una consulta desde la sección <strong>Historia Clínica</strong>.
            </p>
          ) : (
            <>
              <p className="reporte-section__desc">
                Última consulta registrada el{' '}
                <strong>{fCorta(ultimaHistoria?.fecha)}</strong>.
                {historias.length > 1 && (
                  <> Total de consultas acumuladas: <strong>{historias.length}</strong>.</>
                )}
                {tendencia && (
                  <> Tendencia IMC:{' '}
                    <span className={`reporte-imc-trend reporte-imc-trend--${tendencia.dir}`}>
                      {tendencia.label}
                    </span>.
                  </>
                )}
              </p>

              <div className="reporte-mediciones">
                {metricasConValor.map((m) => (
                  <div
                    key={m.tipo}
                    className={`reporte-medicion-card${m.esIMC ? ' reporte-medicion-card--imc' : ''}`}
                  >
                    <span className="reporte-medicion-card__tipo">{m.tipo}</span>
                    <span className="reporte-medicion-card__valor">
                      {m.val}
                      {m.unidad && (
                        <span className="reporte-medicion-card__unidad">
                          {' '}{m.unidad}
                        </span>
                      )}
                    </span>
                    {m.esIMC && (
                      <span className={`reporte-imc-badge reporte-imc-badge--${cat.cls}`}>
                        {cat.label}
                      </span>
                    )}
                    <time className="reporte-medicion-card__fecha" dateTime={ultimaHistoria?.fecha}>
                      {fCorta(ultimaHistoria?.fecha)}
                    </time>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        {/* ────────────────────────────────────────────────────────────────
            SECCIÓN 03 — EVOLUCIÓN IMC
            ──────────────────────────────────────────────────────────────── */}
        <section className="reporte-section" aria-label="Evolución IMC">
          <h2 className="reporte-section__title">
            <span className="reporte-section__num">03</span>
            Evolución IMC — Historial de Consultas
          </h2>

          {historias.length === 0 ? (
            <p className="reporte-empty">
              Sin consultas registradas aún para este paciente.
            </p>
          ) : (
            <>
              <p className="reporte-section__desc">
                Historial de{' '}
                <strong>
                  {Math.min(historias.length, 8)}{' '}
                  {historias.length === 1 ? 'consulta' : 'consultas'}
                </strong>
                {historias.length > 8 && ` (de ${historias.length} totales)`}
                {' '}ordenado por fecha descendente.
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
                    const info = imcInfo(h.imc)
                    const esAlerta = info.cls === 'sobrepeso' || info.cls === 'obesidad'
                    return (
                      <tr
                        key={h.id}
                        className={esAlerta
                          ? 'reporte-evolucion-row--alerta'
                          : 'reporte-evolucion-row--normal'}
                      >
                        <td>
                          <strong>{fCorta(h.fecha)}</strong>
                          {i === 0 && (
                            <span className="reporte-table__detail">Más reciente</span>
                          )}
                        </td>
                        <td>{h.peso != null ? `${h.peso} kg` : '—'}</td>
                        <td>{h.altura != null ? `${h.altura} cm` : '—'}</td>
                        <td>
                          {h.imc != null ? (
                            <strong>{Number(h.imc).toFixed(1)}</strong>
                          ) : '—'}
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
                  Se muestran las 8 consultas más recientes de{' '}
                  {historias.length} registros totales.
                </p>
              )}
            </>
          )}
        </section>

        {/* ────────────────────────────────────────────────────────────────
            SECCIÓN 04 — PLAN ALIMENTARIO ASIGNADO
            ──────────────────────────────────────────────────────────────── */}
        <section className="reporte-section" aria-label="Plan alimentario asignado">
          <h2 className="reporte-section__title">
            <span className="reporte-section__num">04</span>
            Plan Alimentario Asignado
          </h2>

          {!ultimoPlan ? (
            <p className="reporte-empty">
              No se ha asignado un plan alimentario a este paciente.
              Creá uno desde la pestaña <strong>Planes</strong>.
            </p>
          ) : (
            <>
              <p className="reporte-section__desc">
                Plan vigente con fecha{' '}
                <strong>{fCorta(ultimoPlan.fecha)}</strong>.
                Completá o modificá el plan desde la pestaña Planes.
              </p>

              {/* Grid 2×2 de comidas */}
              <div className="reporte-plan-grid">
                {MEALS.map((meal) => (
                  <MealCard
                    key={meal.id}
                    emoji={meal.emoji}
                    title={meal.label}
                    content={ultimoPlan[meal.id]}
                  />
                ))}
              </div>

              {/* Indicaciones generales del plan */}
              {ultimoPlan.indicaciones?.trim() && (
                <>
                  <h3 style={{
                    marginTop: 'var(--space-4)',
                    marginBottom: 'var(--space-2)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    color: '#2E7D32',
                  }}>
                    💡 Indicaciones Generales
                  </h3>
                  <div className="reporte-notas">
                    {ultimoPlan.indicaciones}
                  </div>
                </>
              )}
            </>
          )}
        </section>

        {/* ────────────────────────────────────────────────────────────────
            SECCIÓN 05 — NOTAS CLÍNICAS
            ──────────────────────────────────────────────────────────────── */}
        <section className="reporte-section" aria-label="Notas clínicas">
          <h2 className="reporte-section__title">
            <span className="reporte-section__num">05</span>
            Notas e Indicaciones Clínicas
          </h2>

          {!ultimaHistoria?.notas?.trim() ? (
            <p className="reporte-empty">
              Sin observaciones clínicas registradas en la última consulta.
            </p>
          ) : (
            <>
              <p className="reporte-section__desc">
                Observaciones del{' '}
                <strong>{fCorta(ultimaHistoria.fecha)}</strong>.
              </p>
              <div className="reporte-notas">{ultimaHistoria.notas}</div>
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

        {/* ── Pie de página del documento ── */}
        <footer className="reporte-footer">
          <div className="reporte-footer__rule" aria-hidden="true" />
          <div className="reporte-footer__content">
            <p className="reporte-footer__brand">
              <span aria-hidden="true">🥗</span>
              NutriApp Profesional
            </p>
            <p className="reporte-footer__legal">
              Generado el {fechaStr}. Ref.&nbsp;{numeroRef.current}.<br />
              Documento confidencial de uso exclusivo del profesional habilitado.
              Prohibida su reproducción sin autorización expresa. La información
              contenida no reemplaza el criterio clínico del profesional tratante.
            </p>
          </div>
        </footer>

      </div>{/* .reporte-doc */}
    </div>/* .reporte-wrapper */
  )
}

// ─── Subcomponentes ──────────────────────────────────────────────────────────

/** Campo de un perfil: etiqueta + valor (o "—" si está vacío). */
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

/** Tarjeta de una comida del plan. */
function MealCard({ emoji, title, content }) {
  const hasContent = content?.trim()
  return (
    <div className="reporte-meal-card">
      <div className="reporte-meal-card__header">
        <span className="reporte-meal-card__emoji" aria-hidden="true">{emoji}</span>
        <span className="reporte-meal-card__title">{title}</span>
      </div>
      {hasContent ? (
        <div className="reporte-meal-card__body">{content.trim()}</div>
      ) : (
        <div className="reporte-meal-card__empty">Sin alimentos registrados</div>
      )}
    </div>
  )
}

/** Ícono de impresora. */
function IconPrint() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
         aria-hidden="true">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  )
}
