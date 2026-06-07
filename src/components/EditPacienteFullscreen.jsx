/**
 * EditPacienteFullscreen v2 — Historia Clínica pantalla entera
 *
 * Layout:
 *   ┌─ HEADER ─────────────────────────────────────────────────────┐
 *   ├─ 1/3 Datos Personales/Físicos ─┬─ 2/3 Evolución Antropom. ──┤
 *   │  nombre, apellido, email, tel  │  tabla de mediciones        │
 *   │  fecha nac, género, peso, alt  │  microformulario nueva med. │
 *   │  IMC automático                │  ── sticky footer ──────    │
 *   │  objetivos, notas              │  [⚗ Agregar análisis]       │
 *   └────────────────────────────────┴─────────────────────────────┘
 *   [Modal análisis médicos — accordion 6 grupos]
 *
 * Persistencia Dexie (sin migración de esquema):
 *   paciente.evoluciones      → array de mediciones antropométricas
 *   paciente.analisisMedicos  → array de análisis de laboratorio con fecha
 *   paciente.laboratorio      → objeto plano heredado (se pasa sin modificar)
 */
import {
  useState,
  useEffect,
  useReducer,
  useCallback,
  useSyncExternalStore,
  useMemo,
  useRef,
} from 'react'
import { liveQuery } from 'dexie'
import {
  Sparkles, X, Save, AlertCircle, Loader2, CheckCircle2,
  Plus, Trash2, FlaskConical, ChevronDown, ChevronUp,
} from 'lucide-react'
import { db, outbox, genId } from '@/db/database'

// ─── Hook: liveQuery → useSyncExternalStore ───────────────────────────────────

function useDexieLive(querier, deps, initial) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const obs  = useMemo(() => liveQuery(querier), deps)
  const snap = useRef(initial)

  return useSyncExternalStore(
    (notify) => {
      const sub = obs.subscribe({
        next:  (val) => { snap.current = val; notify() },
        error: ()    => notify(),
      })
      return () => sub.unsubscribe()
    },
    () => snap.current,
    () => initial,
  )
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const GENEROS = [
  { value: '',                  label: 'Seleccionar…' },
  { value: 'femenino',          label: 'Femenino' },
  { value: 'masculino',         label: 'Masculino' },
  { value: 'otro',              label: 'Otro' },
  { value: 'prefiero-no-decir', label: 'Prefiero no decir' },
]

const OBJETIVOS = [
  { value: '',         label: 'Seleccionar…' },
  { value: 'bajar',    label: 'Bajar de peso' },
  { value: 'mantener', label: 'Mantener peso' },
  { value: 'subir',    label: 'Subir de peso' },
  { value: 'musculo',  label: 'Ganar músculo' },
  { value: 'salud',    label: 'Mejorar salud general' },
]

const FORM_BASE_VACIO = {
  nombre:             '',
  apellido:           '',
  email:              '',
  telefono:           '',
  fechaNacimiento:    '',
  genero:             '',
  peso:               '',
  altura:             '',
  objetivo:           '',
  condicionesMedicas: '',
  alergias:           '',
  notas:              '',
}

const MEDICION_VACIA = () => ({
  fecha:              new Date().toISOString().split('T')[0],
  peso:               '',
  perimetroCintura:   '',
  perimetroAbdomen:   '',
  perimetroMuslo:     '',
})

const ANALISIS_VACIO = () => ({
  fechaAnalisis:       '',
  laboratorioNombre:   '',
  // Metabolismo
  glucosa:             '',
  hba1c:               '',
  insulina:            '',
  // Lípidos
  colesterolTotal:     '',
  hdl:                 '',
  ldl:                 '',
  trigliceridos:       '',
  // Hepáticos
  fosfatasaAlcalina:   '',
  bilirrubinaTotal:    '',
  bilirrubinaDirecta:  '',
  got:                 '',
  gpt:                 '',
  // Renal
  urea:                '',
  acidoUrico:          '',
  creatinina:          '',
  // Hemograma
  hemoglobina:         '',
  hematocrito:         '',
  globulosRojos:       '',
  globulosBlancos:     '',
  // Tiroideo
  tsh:                 '',
  t3:                  '',
  t4Libre:             '',
})

// ─── Grupos de análisis médicos ───────────────────────────────────────────────

const ANALISIS_GROUPS = [
  {
    key: 'metabolismo', label: 'Metabolismo', color: '#8B5CF6',
    bg: '#F5F3FF', border: '#DDD6FE',
    fields: [
      { key: 'glucosa',  label: 'Glucosa',                     unit: 'mg/dL',   ref: '70–99' },
      { key: 'hba1c',    label: 'Hemoglobina Glicosilada HbA1c', unit: '%',    ref: '< 5.7', step: '0.1' },
      { key: 'insulina', label: 'Insulina',                    unit: 'µUI/mL',  ref: '2–25',  step: '0.1' },
    ],
  },
  {
    key: 'lipidos', label: 'Lípidos', color: '#F59E0B',
    bg: '#FFFBEB', border: '#FDE68A',
    fields: [
      { key: 'colesterolTotal', label: 'Colesterol Total', unit: 'mg/dL', ref: '< 200' },
      { key: 'hdl',             label: 'HDL',              unit: 'mg/dL', ref: '♀>55 / ♂>45' },
      { key: 'ldl',             label: 'LDL',              unit: 'mg/dL', ref: '< 100' },
      { key: 'trigliceridos',   label: 'Triglicéridos',    unit: 'mg/dL', ref: '< 150' },
    ],
  },
  {
    key: 'hepaticos', label: 'Hepáticos', color: '#F97316',
    bg: '#FFF7ED', border: '#FED7AA',
    fields: [
      { key: 'fosfatasaAlcalina',  label: 'Fosfatasa Alcalina',  unit: 'U/L',   ref: '44–147' },
      { key: 'bilirrubinaTotal',   label: 'Bilirrubina Total',   unit: 'mg/dL', ref: '< 1.2',  step: '0.1' },
      { key: 'bilirrubinaDirecta', label: 'Bilirrubina Directa', unit: 'mg/dL', ref: '< 0.3',  step: '0.01' },
      { key: 'got',                label: 'GOT (AST)',            unit: 'U/L',   ref: '< 40' },
      { key: 'gpt',                label: 'GPT (ALT)',            unit: 'U/L',   ref: '< 41' },
    ],
  },
  {
    key: 'renal', label: 'Renal', color: '#10B981',
    bg: '#F0FDF4', border: '#BBF7D0',
    fields: [
      { key: 'urea',       label: 'Urea',        unit: 'mg/dL', ref: '10–50' },
      { key: 'acidoUrico', label: 'Ácido Úrico', unit: 'mg/dL', ref: '♀3.5–6.0 / ♂4.0–7.0', step: '0.1' },
      { key: 'creatinina', label: 'Creatinina',  unit: 'mg/dL', ref: '♀0.5–1.1 / ♂0.7–1.3',  step: '0.01' },
    ],
  },
  {
    key: 'hemograma', label: 'Hemograma', color: '#EF4444',
    bg: '#FFF5F5', border: '#FECACA',
    fields: [
      { key: 'hemoglobina',    label: 'Hemoglobina',    unit: 'g/dL',      ref: '♀12–16 / ♂13.5–17.5', step: '0.1' },
      { key: 'hematocrito',    label: 'Hematocrito',    unit: '%',          ref: '♀37–47 / ♂42–52',     step: '0.1' },
      { key: 'globulosRojos',  label: 'Glóbulos Rojos', unit: '×10⁶/µL',   ref: '♀4.2–5.4 / ♂4.6–6.2', step: '0.01' },
      { key: 'globulosBlancos',label: 'Glóbulos Blancos',unit: '×10³/µL',  ref: '4.5–11.0',             step: '0.1' },
    ],
  },
  {
    key: 'tiroideo', label: 'Tiroideo', color: '#6366F1',
    bg: '#EEF2FF', border: '#C7D2FE',
    fields: [
      { key: 'tsh',    label: 'TSH',      unit: 'mUI/L', ref: '0.4–4.0', step: '0.01' },
      { key: 't3',     label: 'T3 Libre', unit: 'pg/mL', ref: '2.3–4.2', step: '0.01' },
      { key: 't4Libre',label: 'T4 Libre', unit: 'ng/dL', ref: '0.8–1.8', step: '0.01' },
    ],
  },
]

// ─── Reducer de guardado ──────────────────────────────────────────────────────

function saveReducer(state, action) {
  switch (action.type) {
    case 'RESET':  return { phase: 'idle',   error: null }
    case 'SAVING': return { phase: 'saving', error: null }
    case 'SAVED':  return { phase: 'saved',  error: null, pacienteId: action.id }
    case 'ERROR':  return { phase: 'error',  error: action.message }
    default:       return state
  }
}

// ─── Validación ───────────────────────────────────────────────────────────────

function validar(fields) {
  const errs = {}
  if (!fields.nombre.trim())
    errs.nombre = 'El nombre es obligatorio.'
  if (fields.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email))
    errs.email = 'Email inválido.'
  if (fields.peso && (isNaN(Number(fields.peso)) || Number(fields.peso) <= 0))
    errs.peso = 'Peso inválido (kg).'
  if (fields.altura && (isNaN(Number(fields.altura)) || Number(fields.altura) <= 0))
    errs.altura = 'Altura inválida (cm).'
  return errs
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function numVal(str) {
  return str !== '' && !isNaN(Number(str)) ? Number(str) : null
}

function calcIMC(pesoStr, alturaStr) {
  const p = numVal(pesoStr)
  const a = numVal(alturaStr)
  if (!p || !a || a <= 0) return null
  return (p / Math.pow(a / 100, 2)).toFixed(1)
}

function imcLabel(imc) {
  if (!imc) return null
  const v = Number(imc)
  if (v < 18.5) return { label: 'Bajo peso', color: '#3B82F6' }
  if (v < 25)   return { label: 'Normal',    color: '#10B981' }
  if (v < 30)   return { label: 'Sobrepeso', color: '#F59E0B' }
  return              { label: 'Obesidad',   color: '#EF4444' }
}

function fmtFecha(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function calcEdad(fechaNacimiento) {
  if (!fechaNacimiento) return null
  const hoy = new Date()
  const nac = new Date(fechaNacimiento)
  let edad = hoy.getFullYear() - nac.getFullYear()
  if (
    hoy.getMonth() < nac.getMonth() ||
    (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())
  ) edad--
  return edad >= 0 && edad < 150 ? edad : null
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function EditPacienteFullscreen({ pacienteId, onClose, onSaved }) {
  const pacienteDB = useDexieLive(
    () => db.pacientes.get(pacienteId),
    [pacienteId],
    null,
  )

  // ── Estado formulario base ──────────────────────────────────────────────────
  const [base, setBase]       = useState(FORM_BASE_VACIO)
  const [errores, setErrores] = useState({})
  const [save, dispatchSave]  = useReducer(saveReducer, { phase: 'idle', error: null })

  // ── Estado evolución antropométrica ────────────────────────────────────────
  const [evoluciones,     setEvoluciones]     = useState([])
  const [nuevaMedicion,   setNuevaMedicion]   = useState(MEDICION_VACIA)
  const [medErrores,      setMedErrores]      = useState({})

  // ── Estado análisis médicos ────────────────────────────────────────────────
  const [analisisMedicos,   setAnalisisMedicos]   = useState([])
  const [modalOpen,         setModalOpen]         = useState(false)
  const [analisisActual,    setAnalisisActual]     = useState(ANALISIS_VACIO)
  const [analisisErrores,   setAnalisisErrores]   = useState({})
  const [accordionOpen,     setAccordionOpen]     = useState({ metabolismo: true })

  // ── Poblar formulario desde DB ─────────────────────────────────────────────
  useEffect(() => {
    if (!pacienteDB) return
    setBase({
      nombre:             pacienteDB.nombre             ?? '',
      apellido:           pacienteDB.apellido           ?? '',
      email:              pacienteDB.email              ?? '',
      telefono:           pacienteDB.telefono           ?? '',
      fechaNacimiento:    pacienteDB.fechaNacimiento    ?? '',
      genero:             pacienteDB.genero             ?? '',
      peso:               pacienteDB.peso   != null ? String(pacienteDB.peso)   : '',
      altura:             pacienteDB.altura != null ? String(pacienteDB.altura) : '',
      objetivo:           pacienteDB.objetivo           ?? '',
      condicionesMedicas: pacienteDB.condicionesMedicas ?? '',
      alergias:           pacienteDB.alergias           ?? '',
      notas:              pacienteDB.notas              ?? '',
    })
    setEvoluciones(pacienteDB.evoluciones    ?? [])
    setAnalisisMedicos(pacienteDB.analisisMedicos ?? [])
  }, [pacienteDB])

  // ── Stats de outbox ────────────────────────────────────────────────────────
  const outboxStats = useDexieLive(
    () => {
      const id = save.pacienteId ?? pacienteId
      if (!id) return Promise.resolve({ pendiente: 0, error: 0 })
      return db.outbox.where('tabla').equals('pacientes').toArray().then((rows) => {
        const propios = rows.filter((r) => {
          try { return JSON.parse(r.datos ?? '{}')?.id === id } catch { return false }
        })
        return {
          pendiente: propios.filter((r) => r.estado !== 'error' && r.estado !== 'completado').length,
          error:     propios.filter((r) => r.estado === 'error').length,
        }
      })
    },
    [save.pacienteId, pacienteId],
    { pendiente: 0, error: 0 },
  )

  const sincronizado = pacienteDB?.sincronizado === 1
  const imc          = calcIMC(base.peso, base.altura)
  const imcInfo      = imcLabel(imc)
  const edad         = calcEdad(base.fechaNacimiento)

  // ── Handlers formulario base ───────────────────────────────────────────────
  const handleBaseChange = useCallback((e) => {
    const { name, value } = e.target
    setBase((prev) => ({ ...prev, [name]: value }))
    if (errores[name]) setErrores((p) => { const n = { ...p }; delete n[name]; return n })
    if (save.phase === 'saved') dispatchSave({ type: 'RESET' })
  }, [errores, save.phase])

  // ── Handlers evolución ─────────────────────────────────────────────────────
  const handleMedicionChange = useCallback((e) => {
    const { name, value } = e.target
    setNuevaMedicion((prev) => ({ ...prev, [name]: value }))
    if (medErrores[name]) setMedErrores((p) => { const n = { ...p }; delete n[name]; return n })
  }, [medErrores])

  const agregarMedicion = useCallback(() => {
    if (!nuevaMedicion.fecha) {
      setMedErrores({ fecha: 'La fecha es obligatoria' })
      return
    }
    const entry = {
      id: genId(),
      ...nuevaMedicion,
      peso:             numVal(nuevaMedicion.peso),
      perimetroCintura: numVal(nuevaMedicion.perimetroCintura),
      perimetroAbdomen: numVal(nuevaMedicion.perimetroAbdomen),
      perimetroMuslo:   numVal(nuevaMedicion.perimetroMuslo),
    }
    setEvoluciones((prev) =>
      [entry, ...prev].sort((a, b) => b.fecha.localeCompare(a.fecha))
    )
    setNuevaMedicion(MEDICION_VACIA())
    setMedErrores({})
    if (save.phase === 'saved') dispatchSave({ type: 'RESET' })
  }, [nuevaMedicion, save.phase])

  const eliminarMedicion = useCallback((id) => {
    setEvoluciones((prev) => prev.filter((m) => m.id !== id))
    if (save.phase === 'saved') dispatchSave({ type: 'RESET' })
  }, [save.phase])

  // ── Handlers modal análisis ────────────────────────────────────────────────
  const abrirModal = useCallback(() => {
    setAnalisisActual(ANALISIS_VACIO())
    setAnalisisErrores({})
    setAccordionOpen({ metabolismo: true })
    setModalOpen(true)
  }, [])

  const cerrarModal = useCallback(() => setModalOpen(false), [])

  const handleAnalisisChange = useCallback((e) => {
    const { name, value } = e.target
    setAnalisisActual((prev) => ({ ...prev, [name]: value }))
    if (analisisErrores[name]) setAnalisisErrores((p) => { const n = { ...p }; delete n[name]; return n })
  }, [analisisErrores])

  const toggleAccordion = useCallback((key) => {
    setAccordionOpen((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const guardarAnalisis = useCallback(() => {
    const errs = {}
    if (!analisisActual.fechaAnalisis)             errs.fechaAnalisis     = 'La fecha es obligatoria'
    if (!analisisActual.laboratorioNombre.trim())  errs.laboratorioNombre = 'El laboratorio es obligatorio'
    if (Object.keys(errs).length) { setAnalisisErrores(errs); return }

    const entry = { id: genId(), ...analisisActual }
    setAnalisisMedicos((prev) =>
      [entry, ...prev].sort((a, b) => b.fechaAnalisis.localeCompare(a.fechaAnalisis))
    )
    setModalOpen(false)
    if (save.phase === 'saved') dispatchSave({ type: 'RESET' })
  }, [analisisActual, save.phase])

  const eliminarAnalisis = useCallback((id) => {
    setAnalisisMedicos((prev) => prev.filter((a) => a.id !== id))
    if (save.phase === 'saved') dispatchSave({ type: 'RESET' })
  }, [save.phase])

  // ── Guardar en Dexie ───────────────────────────────────────────────────────
  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault()
    const errs = validar(base)
    if (Object.keys(errs).length > 0) { setErrores(errs); return }
    dispatchSave({ type: 'SAVING' })

    const payload = {
      ...base,
      peso:           numVal(base.peso),
      altura:         numVal(base.altura),
      evoluciones,
      analisisMedicos,
      // Mantiene campo heredado sin modificar para compatibilidad con otros módulos
      laboratorio:    pacienteDB?.laboratorio ?? {},
      sincronizado:   0,
      actualizadoEn:  new Date().toISOString(),
    }

    try {
      await db.pacientes.update(pacienteId, payload)
      await outbox.encolar('UPDATE', 'pacientes', pacienteId, { id: pacienteId, ...payload })
      await outbox.registrarSync()
      dispatchSave({ type: 'SAVED', id: pacienteId })
      onSaved?.({ id: pacienteId, ...payload })
      setTimeout(() => onClose?.(), 1400)
    } catch (err) {
      dispatchSave({ type: 'ERROR', message: err?.message ?? 'Error desconocido' })
    }
  }, [base, evoluciones, analisisMedicos, pacienteDB, pacienteId, onSaved, onClose])

  // ── Tecla Escape: cerrar workspace ────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (modalOpen) { cerrarModal(); return }
        onClose?.()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose, modalOpen, cerrarModal])

  const isSaving = save.phase === 'saving'
  const nombre   = [base.nombre, base.apellido].filter(Boolean).join(' ')

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <main
      className="epf-workspace"
      aria-label="Edición de Historia Clínica"
    >
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header className="epf-header">
        <div className="epf-header__left">
          <div className="epf-sparkles-badge" aria-hidden="true">
            <Sparkles size={18} strokeWidth={2} />
          </div>
          <div>
            <h2 className="epf-header__title">Edición de Historia Clínica</h2>
            {nombre && <p className="epf-header__subtitle">{nombre}</p>}
          </div>
        </div>
        <div className="epf-header__right">
          <SyncChip
            sincronizado={sincronizado}
            pendiente={outboxStats.pendiente}
            error={outboxStats.error}
            savePhase={save.phase}
          />
          <button
            type="submit"
            form="epf-form"
            className={`epf-save-btn${isSaving ? ' epf-save-btn--loading' : ''}`}
            disabled={isSaving}
          >
            {isSaving
              ? <><Loader2 size={16} className="epf-spin" /><span>Guardando…</span></>
              : <><Save size={16} /><span>Guardar cambios</span></>
            }
          </button>
          <button type="button" className="epf-close-btn" onClick={onClose} aria-label="Cerrar editor">
            <X size={20} strokeWidth={2} />
          </button>
        </div>
      </header>

      <div className="epf-header__rule" aria-hidden="true" />

      {/* ── CUERPO: 1/3 + 2/3 ─────────────────────────────────────────────── */}
      <form id="epf-form" onSubmit={handleSubmit} noValidate className={`epf-body${modalOpen ? ' epf-body--with-analisis' : ''}`}>

        {/* ── COLUMNA IZQUIERDA — Datos del paciente (1/3) ─────────────────── */}
        <div className="epf-col epf-col--left">
          <ColHeader icon="🗂️" title="Datos del Paciente" subtitle="Información clínica base" />

          {/* Datos personales */}
          <Section label="Datos personales">
            <div className="epf-grid epf-grid--2">
              <BaseField id="nombre" name="nombre" label="Nombre *"
                value={base.nombre} onChange={handleBaseChange} error={errores.nombre}
                autoComplete="given-name" required />
              <BaseField id="apellido" name="apellido" label="Apellido"
                value={base.apellido} onChange={handleBaseChange} autoComplete="family-name" />
            </div>
            <div className="epf-grid epf-grid--2">
              <BaseField id="email" name="email" label="Email" type="email"
                value={base.email} onChange={handleBaseChange} error={errores.email}
                inputMode="email" autoComplete="email" />
              <BaseField id="telefono" name="telefono" label="Teléfono" type="tel"
                value={base.telefono} onChange={handleBaseChange}
                inputMode="tel" autoComplete="tel" />
            </div>
          </Section>

          {/* Datos físicos + IMC */}
          <Section label="Datos físicos">
            <div className="epf-grid epf-grid--2">
              <BaseField id="fechaNacimiento" name="fechaNacimiento" label="Fecha de nacimiento"
                type="date" value={base.fechaNacimiento} onChange={handleBaseChange} />
              <div className="epf-field">
                <label className="epf-label" htmlFor="genero">Género</label>
                <select id="genero" name="genero" className="epf-input epf-input--select"
                  value={base.genero} onChange={handleBaseChange}>
                  {GENEROS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            {edad !== null && (
              <div className="epf-age-inline">
                <span aria-hidden="true">🎂</span>
                <span><strong>{edad}</strong> años</span>
              </div>
            )}
            <div className="epf-grid epf-grid--2">
              <BaseField id="peso" name="peso" label="Peso inicio (kg)" type="number"
                min="0" max="500" step="0.1" inputMode="decimal" placeholder="70"
                value={base.peso} onChange={handleBaseChange} error={errores.peso} />
              <BaseField id="altura" name="altura" label="Altura inicio (cm)" type="number"
                min="0" max="300" step="0.5" inputMode="decimal" placeholder="170"
                value={base.altura} onChange={handleBaseChange} error={errores.altura} />
            </div>

            {imc && (
              <div className="epf-imc-badge">
                <div className="epf-imc-badge__row">
                  <div className="epf-imc-badge__icon" aria-hidden="true">⚖️</div>
                  <div className="epf-imc-badge__data">
                    <span className="epf-imc-badge__label">IMC calculado</span>
                    <span className="epf-imc-badge__value">{imc} kg/m²</span>
                  </div>
                  {imcInfo && (
                    <span
                      className="epf-imc-badge__tag"
                      style={{ background: imcInfo.color + '18', color: imcInfo.color, borderColor: imcInfo.color + '40' }}
                    >
                      {imcInfo.label}
                    </span>
                  )}
                </div>
                <ImcMeter imc={imc} />
              </div>
            )}
          </Section>

          {/* Objetivos y salud */}
          <Section label="Objetivos y salud">
            <div className="epf-field">
              <label className="epf-label" htmlFor="objetivo">Objetivo nutricional</label>
              <select id="objetivo" name="objetivo" className="epf-input epf-input--select"
                value={base.objetivo} onChange={handleBaseChange}>
                {OBJETIVOS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <BaseField id="condicionesMedicas" name="condicionesMedicas"
              label="Condiciones médicas" tag="textarea" rows={2}
              placeholder="Diabetes tipo 2, hipertensión…"
              value={base.condicionesMedicas} onChange={handleBaseChange} />
            <BaseField id="alergias" name="alergias"
              label="Alergias / intolerancias" tag="textarea" rows={2}
              placeholder="Lactosa, gluten…"
              value={base.alergias} onChange={handleBaseChange} />
          </Section>

          {/* Notas clínicas */}
          <Section label="Notas clínicas">
            <BaseField id="notas" name="notas" label="Observaciones" tag="textarea" rows={3}
              placeholder="Observaciones adicionales…"
              value={base.notas} onChange={handleBaseChange} />
          </Section>

          {save.phase === 'error' && (
            <div role="alert" className="epf-error-global">
              <AlertCircle size={16} aria-hidden="true" />
              <span>{save.error ?? 'No se pudo guardar. Intentá de nuevo.'}</span>
            </div>
          )}
        </div>

        {/* ── COLUMNA CENTRAL — Evolución Antropométrica (2/3) ─────────────── */}
        <div className="epf-col epf-col--center">
          <ColHeader icon="📈" title="Evolución Antropométrica" subtitle="Registro histórico de mediciones" />

          {/* Tabla de evolución */}
          <div className="epf-evo-wrap">
            {evoluciones.length === 0 ? (
              <div className="epf-evo-empty">
                <span className="epf-evo-empty__icon">📏</span>
                <p className="epf-evo-empty__text">Sin mediciones registradas. Agregá la primera abajo.</p>
              </div>
            ) : (
              <div className="epf-evo-table-wrap">
                <table className="epf-evo-table" aria-label="Historial de mediciones">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Peso (kg)</th>
                      <th>Cintura (cm)</th>
                      <th>Abdomen (cm)</th>
                      <th>Muslo (cm)</th>
                      <th aria-label="Acciones" />
                    </tr>
                  </thead>
                  <tbody>
                    {evoluciones.map((m) => (
                      <tr key={m.id} className="epf-evo-row">
                        <td className="epf-evo-td epf-evo-td--fecha">{fmtFecha(m.fecha)}</td>
                        <td className="epf-evo-td epf-evo-td--num">{m.peso ?? '—'}</td>
                        <td className="epf-evo-td epf-evo-td--num">{m.perimetroCintura ?? '—'}</td>
                        <td className="epf-evo-td epf-evo-td--num">{m.perimetroAbdomen ?? '—'}</td>
                        <td className="epf-evo-td epf-evo-td--num">{m.perimetroMuslo ?? '—'}</td>
                        <td className="epf-evo-td epf-evo-td--action">
                          <button
                            type="button"
                            className="epf-evo-del"
                            onClick={() => eliminarMedicion(m.id)}
                            aria-label={`Eliminar medición del ${fmtFecha(m.fecha)}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Microformulario nueva medición */}
            <div className="epf-evo-add">
              <p className="epf-evo-add__title">
                <Plus size={13} aria-hidden="true" />
                Nueva medición
              </p>
              <div className="epf-evo-add__grid">
                <div className="epf-field">
                  <label className="epf-label" htmlFor="med-fecha">
                    Fecha *
                  </label>
                  <input
                    id="med-fecha"
                    name="fecha"
                    type="date"
                    className={`epf-input${medErrores.fecha ? ' epf-input--error' : ''}`}
                    value={nuevaMedicion.fecha}
                    onChange={handleMedicionChange}
                    aria-describedby={medErrores.fecha ? 'med-fecha-err' : undefined}
                  />
                  {medErrores.fecha && (
                    <span id="med-fecha-err" className="epf-field-error" role="alert">
                      {medErrores.fecha}
                    </span>
                  )}
                </div>
                <div className="epf-field">
                  <label className="epf-label" htmlFor="med-peso">Peso (kg)</label>
                  <input id="med-peso" name="peso" type="number" min="0" max="500" step="0.1"
                    inputMode="decimal" placeholder="70.5" className="epf-input"
                    value={nuevaMedicion.peso} onChange={handleMedicionChange} />
                </div>
                <div className="epf-field">
                  <label className="epf-label" htmlFor="med-cintura">Cintura (cm)</label>
                  <input id="med-cintura" name="perimetroCintura" type="number" min="0" max="300" step="0.5"
                    inputMode="decimal" placeholder="85" className="epf-input"
                    value={nuevaMedicion.perimetroCintura} onChange={handleMedicionChange} />
                </div>
                <div className="epf-field">
                  <label className="epf-label" htmlFor="med-abdomen">Abdomen (cm)</label>
                  <input id="med-abdomen" name="perimetroAbdomen" type="number" min="0" max="300" step="0.5"
                    inputMode="decimal" placeholder="90" className="epf-input"
                    value={nuevaMedicion.perimetroAbdomen} onChange={handleMedicionChange} />
                </div>
                <div className="epf-field">
                  <label className="epf-label" htmlFor="med-muslo">Muslo (cm)</label>
                  <input id="med-muslo" name="perimetroMuslo" type="number" min="0" max="200" step="0.5"
                    inputMode="decimal" placeholder="55" className="epf-input"
                    value={nuevaMedicion.perimetroMuslo} onChange={handleMedicionChange} />
                </div>
                <div className="epf-field epf-field--btn-cell">
                  <button type="button" className="epf-evo-add-btn" onClick={agregarMedicion}>
                    <Plus size={15} /> Agregar
                  </button>
                </div>
              </div>
            </div>

            {/* Resumen de análisis cargados */}
            {analisisMedicos.length > 0 && (
              <div className="epf-analisis-list">
                <p className="epf-analisis-list__title">
                  <FlaskConical size={13} aria-hidden="true" />
                  Análisis registrados ({analisisMedicos.length})
                </p>
                {analisisMedicos.map((a) => (
                  <div key={a.id} className="epf-analisis-chip">
                    <span className="epf-analisis-chip__date">{fmtFecha(a.fechaAnalisis)}</span>
                    <span className="epf-analisis-chip__lab">{a.laboratorioNombre}</span>
                    <button
                      type="button"
                      className="epf-analisis-chip__del"
                      onClick={() => eliminarAnalisis(a.id)}
                      aria-label={`Eliminar análisis del ${fmtFecha(a.fechaAnalisis)}`}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Botón premium análisis médicos (sticky pie) ─────────────────── */}
          <div className="epf-evo-footer">
            <button type="button" className="epf-analysis-btn" onClick={modalOpen ? cerrarModal : abrirModal}>
              <span className="epf-analysis-btn__icon" aria-hidden="true">
                <FlaskConical size={18} strokeWidth={2} />
              </span>
              <span className="epf-analysis-btn__content">
                <span className="epf-analysis-btn__label">
                  {modalOpen ? 'Cerrar panel de análisis' : 'Agregar análisis médicos'}
                </span>
                <span className="epf-analysis-btn__sub">
                  Laboratorio · fecha · valores clínicos
                </span>
              </span>
              <span className="epf-analysis-btn__arrow" aria-hidden="true">{modalOpen ? '✕' : '→'}</span>
            </button>
          </div>
        </div>

        {/* ── COLUMNA DERECHA — Panel Análisis Médicos (workspace inline) ──────── */}
        {modalOpen && (
          <div className="epf-col epf-col--right">
            {/* Header panel */}
            <div className="epf-modal-header">
              <div className="epf-modal-header__left">
                <span className="epf-modal-header__icon" aria-hidden="true">
                  <FlaskConical size={20} />
                </span>
                <div>
                  <h3 className="epf-modal-header__title">Análisis médicos</h3>
                  <p className="epf-modal-header__sub">Completá los valores del laboratorio</p>
                </div>
              </div>
              <button type="button" className="epf-close-btn" onClick={cerrarModal} aria-label="Cerrar panel de análisis">
                <X size={18} />
              </button>
            </div>

            <div className="epf-modal-rule" aria-hidden="true" />

            {/* Cuerpo modal */}
            <div className="epf-modal-body">
              {/* Campos obligatorios */}
              <div className="epf-modal-req">
                <p className="epf-modal-req__label">Datos del análisis</p>
                <div className="epf-modal-req__grid">
                  <div className="epf-field">
                    <label className="epf-label" htmlFor="an-fecha">Fecha de análisis *</label>
                    <input
                      id="an-fecha"
                      name="fechaAnalisis"
                      type="date"
                      className={`epf-input${analisisErrores.fechaAnalisis ? ' epf-input--error' : ''}`}
                      value={analisisActual.fechaAnalisis}
                      onChange={handleAnalisisChange}
                    />
                    {analisisErrores.fechaAnalisis && (
                      <span className="epf-field-error" role="alert">{analisisErrores.fechaAnalisis}</span>
                    )}
                  </div>
                  <div className="epf-field">
                    <label className="epf-label" htmlFor="an-lab">Laboratorio *</label>
                    <input
                      id="an-lab"
                      name="laboratorioNombre"
                      type="text"
                      placeholder="Ej: Lab. Central Posadas"
                      className={`epf-input${analisisErrores.laboratorioNombre ? ' epf-input--error' : ''}`}
                      value={analisisActual.laboratorioNombre}
                      onChange={handleAnalisisChange}
                    />
                    {analisisErrores.laboratorioNombre && (
                      <span className="epf-field-error" role="alert">{analisisErrores.laboratorioNombre}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Accordion de grupos */}
              <div className="epf-accordion">
                {ANALISIS_GROUPS.map((group) => {
                  const open = !!accordionOpen[group.key]
                  return (
                    <div
                      key={group.key}
                      className={`epf-accordion-item${open ? ' epf-accordion-item--open' : ''}`}
                      style={{ '--group-color': group.color, '--group-bg': group.bg, '--group-border': group.border }}
                    >
                      <button
                        type="button"
                        className="epf-accordion-trigger"
                        onClick={() => toggleAccordion(group.key)}
                        aria-expanded={open}
                      >
                        <span className="epf-accordion-trigger__dot" aria-hidden="true" />
                        <span className="epf-accordion-trigger__label">{group.label}</span>
                        <span className="epf-accordion-trigger__count">
                          {group.fields.filter((f) => analisisActual[f.key] !== '').length}/{group.fields.length}
                        </span>
                        {open
                          ? <ChevronUp size={15} aria-hidden="true" className="epf-accordion-trigger__chevron" />
                          : <ChevronDown size={15} aria-hidden="true" className="epf-accordion-trigger__chevron" />
                        }
                      </button>
                      {open && (
                        <div className="epf-accordion-body">
                          <div className="epf-accordion-fields">
                            {group.fields.map((field) => (
                              <ModalLabField
                                key={field.key}
                                field={field}
                                value={analisisActual[field.key]}
                                onChange={handleAnalisisChange}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Footer panel */}
            <div className="epf-modal-footer">
              <button type="button" className="epf-modal-cancel" onClick={cerrarModal}>
                Cancelar
              </button>
              <button type="button" className="epf-modal-save" onClick={guardarAnalisis}>
                <Plus size={15} aria-hidden="true" /> Guardar análisis
              </button>
            </div>
          </div>
        )}
      </form>
    </main>
  )
}

// ─── ImcMeter ─────────────────────────────────────────────────────────────────

function ImcMeter({ imc }) {
  const MIN = 14, MAX = 40
  const pct = Math.min(100, Math.max(0, ((Number(imc) - MIN) / (MAX - MIN)) * 100))
  return (
    <div className="epf-imc-meter" aria-hidden="true">
      <div className="epf-imc-meter__track">
        <div className="epf-imc-meter__cursor" style={{ left: `${pct.toFixed(1)}%` }} />
      </div>
      <div className="epf-imc-meter__labels">
        <span>14</span>
        <span>18.5</span>
        <span>25</span>
        <span>30</span>
        <span>40</span>
      </div>
    </div>
  )
}

// ─── ModalLabField ────────────────────────────────────────────────────────────

function ModalLabField({ field, value, onChange }) {
  return (
    <div className="epf-modal-lab-field">
      <label className="epf-modal-lab-field__label" htmlFor={`an-${field.key}`}>
        {field.label}
      </label>
      <div className="epf-lab-field__input-row">
        <input
          id={`an-${field.key}`}
          name={field.key}
          type="number"
          min="0"
          step={field.step ?? '1'}
          inputMode="decimal"
          className="epf-lab-input"
          value={value}
          onChange={onChange}
          placeholder="—"
          aria-label={`${field.label} en ${field.unit}`}
        />
        <span className="epf-lab-field__unit">{field.unit}</span>
      </div>
      <span className="epf-lab-field__ref">ref: {field.ref}</span>
    </div>
  )
}

// ─── ColHeader ────────────────────────────────────────────────────────────────

function ColHeader({ icon, title, subtitle }) {
  return (
    <div className="epf-col-header">
      <span className="epf-col-header__icon" aria-hidden="true">{icon}</span>
      <div>
        <p className="epf-col-header__title">{title}</p>
        <p className="epf-col-header__subtitle">{subtitle}</p>
      </div>
    </div>
  )
}

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({ label, children }) {
  return (
    <fieldset className="epf-section">
      <legend className="epf-section__legend">{label}</legend>
      {children}
    </fieldset>
  )
}

// ─── BaseField ────────────────────────────────────────────────────────────────

function BaseField({ id, name, label, tag = 'input', error, ...rest }) {
  const Tag = tag
  return (
    <div className={`epf-field${error ? ' epf-field--error' : ''}`}>
      <label className="epf-label" htmlFor={id}>{label}</label>
      <Tag
        id={id}
        name={name}
        className={[
          'epf-input',
          error              ? 'epf-input--error'    : '',
          tag === 'textarea' ? 'epf-input--textarea' : '',
        ].filter(Boolean).join(' ')}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        {...rest}
      />
      {error && (
        <span id={`${id}-err`} className="epf-field-error" role="alert">{error}</span>
      )}
    </div>
  )
}

// ─── SyncChip ─────────────────────────────────────────────────────────────────

function SyncChip({ sincronizado, pendiente, error, savePhase }) {
  if (savePhase === 'saving') return (
    <span className="epf-sync-chip epf-sync-chip--saving">
      <Loader2 size={11} className="epf-spin" /> Guardando…
    </span>
  )
  if (savePhase === 'saved' && !error && !pendiente) return (
    <span className="epf-sync-chip epf-sync-chip--saved">
      <CheckCircle2 size={11} /> Guardado
    </span>
  )
  if (error > 0)     return <span className="epf-sync-chip epf-sync-chip--error">⚠ Error de sync</span>
  if (pendiente > 0) return <span className="epf-sync-chip epf-sync-chip--pending">↑ Sync pendiente</span>
  if (sincronizado)  return <span className="epf-sync-chip epf-sync-chip--synced">✓ Sincronizado</span>
  return                    <span className="epf-sync-chip epf-sync-chip--local">◌ Solo local</span>
}
