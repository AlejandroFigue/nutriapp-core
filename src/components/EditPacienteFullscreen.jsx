/**
 * EditPacienteFullscreen — Historia Clínica completa, pantalla entera.
 *
 * Estructura visual:
 *   ┌─ HEADER fijo ─────────────────────────────────────────────────────────┐
 *   │  ✦ Sparkles   Edición de Historia Clínica   [SyncChip] [Guardar] [✕] │
 *   └───────────────────────────────────────────────────────────────────────┘
 *   ┌─ COLUMNA IZQUIERDA ──────────┬─ COLUMNA DERECHA (Analíticas) ─────────┐
 *   │  Datos personales            │  Metabolismo                           │
 *   │  Datos físicos + IMC         │  Hemograma & Hierro                    │
 *   │  Objetivos y salud           │  Perfil Lipídico                       │
 *   │  Notas clínicas              │  Función Renal / Hepática              │
 *   │                              │  Perfil Tiroideo                       │
 *   │                              │  Vitaminas & Minerales                 │
 *   └──────────────────────────────┴────────────────────────────────────────┘
 *
 * Persistencia:
 *   Los campos de laboratorio se almacenan en `paciente.laboratorio` como
 *   objeto plano en IndexedDB — no requiere migración de Dexie porque
 *   IndexedDB persiste campos arbitrarios sin necesidad de nuevos índices.
 *
 * Props:
 *   pacienteId : string          — UUID del paciente a editar
 *   isOpen     : boolean         — controla la animación de entrada/salida
 *   onClose    : () => void      — callback para cerrar
 *   onSaved    : (p) => void     — callback tras guardar exitosamente
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
import { Sparkles, X, Save, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'
import { db, outbox } from '@/db/database'

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

// ─── Constantes del formulario ────────────────────────────────────────────────

const GENEROS = [
  { value: '',                   label: 'Seleccionar…' },
  { value: 'femenino',           label: 'Femenino' },
  { value: 'masculino',          label: 'Masculino' },
  { value: 'otro',               label: 'Otro' },
  { value: 'prefiero-no-decir',  label: 'Prefiero no decir' },
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

const LABORATORIO_VACIO = {
  // Metabolismo
  glucemia:      '',
  hba1c:         '',
  // Hemograma & Hierro
  hemoglobina:   '',
  ferritina:     '',
  hierroSerico:  '',
  // Perfil Lipídico
  colesterolTotal: '',
  trigliceridos:   '',
  hdl:             '',
  ldl:             '',
  // Función Renal
  urea:          '',
  creatinina:    '',
  // Función Hepática
  got:           '',
  gpt:           '',
  // Perfil Tiroideo
  tsh:           '',
  t4:            '',
  // Vitaminas & Minerales
  vitaminaD:     '',
  vitaminaB12:   '',
  calcio:        '',
  magnesio:      '',
}

// ─── Definición de grupos de laboratorio ─────────────────────────────────────

const LAB_GROUPS = [
  {
    key: 'metabolismo',
    label: 'Metabolismo',
    color: '#8B5CF6',
    bg: '#F5F3FF',
    border: '#DDD6FE',
    fields: [
      { key: 'glucemia',  label: 'Glucemia en ayunas',          unit: 'mg/dL', ref: '70 – 99' },
      { key: 'hba1c',     label: 'Hemoglobina Glicosilada (HbA1c)', unit: '%', ref: '< 5.7',  step: '0.1' },
    ],
  },
  {
    key: 'hemograma',
    label: 'Hemograma & Hierro',
    color: '#EF4444',
    bg: '#FFF5F5',
    border: '#FECACA',
    fields: [
      { key: 'hemoglobina',  label: 'Hemoglobina',   unit: 'g/dL',   ref: '♀ 12–16 / ♂ 13.5–17.5', step: '0.1' },
      { key: 'ferritina',    label: 'Ferritina',      unit: 'ng/mL',  ref: '12 – 300' },
      { key: 'hierroSerico', label: 'Hierro sérico',  unit: 'µg/dL',  ref: '60 – 170' },
    ],
  },
  {
    key: 'lipidos',
    label: 'Perfil Lipídico',
    color: '#F59E0B',
    bg: '#FFFBEB',
    border: '#FDE68A',
    fields: [
      { key: 'colesterolTotal', label: 'Colesterol Total', unit: 'mg/dL', ref: '< 200' },
      { key: 'trigliceridos',   label: 'Triglicéridos',    unit: 'mg/dL', ref: '< 150' },
      { key: 'hdl',             label: 'HDL',              unit: 'mg/dL', ref: '♀ > 55 / ♂ > 45' },
      { key: 'ldl',             label: 'LDL',              unit: 'mg/dL', ref: '< 100' },
    ],
  },
  {
    key: 'renal',
    label: 'Función Renal',
    color: '#10B981',
    bg: '#F0FDF4',
    border: '#BBF7D0',
    fields: [
      { key: 'urea',       label: 'Urea',       unit: 'mg/dL', ref: '10 – 50' },
      { key: 'creatinina', label: 'Creatinina', unit: 'mg/dL', ref: '♀ 0.5–1.1 / ♂ 0.7–1.3', step: '0.01' },
    ],
  },
  {
    key: 'hepatica',
    label: 'Función Hepática',
    color: '#F97316',
    bg: '#FFF7ED',
    border: '#FED7AA',
    fields: [
      { key: 'got', label: 'GOT (AST)', unit: 'U/L', ref: '< 40' },
      { key: 'gpt', label: 'GPT (ALT)', unit: 'U/L', ref: '< 41' },
    ],
  },
  {
    key: 'tiroides',
    label: 'Perfil Tiroideo',
    color: '#6366F1',
    bg: '#EEF2FF',
    border: '#C7D2FE',
    fields: [
      { key: 'tsh', label: 'TSH',      unit: 'mUI/L', ref: '0.4 – 4.0', step: '0.01' },
      { key: 't4',  label: 'T4 libre', unit: 'ng/dL',  ref: '0.8 – 1.8', step: '0.01' },
    ],
  },
  {
    key: 'micronutrientes',
    label: 'Vitaminas & Minerales',
    color: '#EC4899',
    bg: '#FDF2F8',
    border: '#FBCFE8',
    fields: [
      { key: 'vitaminaD',   label: 'Vitamina D',   unit: 'ng/mL',  ref: '> 30' },
      { key: 'vitaminaB12', label: 'Vitamina B12', unit: 'pg/mL',  ref: '> 200' },
      { key: 'calcio',      label: 'Calcio',        unit: 'mg/dL', ref: '8.5 – 10.5', step: '0.1' },
      { key: 'magnesio',    label: 'Magnesio',      unit: 'mg/dL', ref: '1.7 – 2.2',  step: '0.01' },
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

// ─── Componente principal ─────────────────────────────────────────────────────

export default function EditPacienteFullscreen({ pacienteId, isOpen, onClose, onSaved }) {
  // Carga reactiva del paciente desde IndexedDB
  const pacienteDB = useDexieLive(
    () => db.pacientes.get(pacienteId),
    [pacienteId],
    null,
  )

  const [base, setBase]       = useState(FORM_BASE_VACIO)
  const [lab, setLab]         = useState(LABORATORIO_VACIO)
  const [errores, setErrores] = useState({})
  const [save, dispatchSave]  = useReducer(saveReducer, { phase: 'idle', error: null })

  // Poblar formulario cuando carga el paciente
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
    const l = pacienteDB.laboratorio ?? {}
    setLab(
      Object.fromEntries(
        Object.keys(LABORATORIO_VACIO).map((k) => [
          k, l[k] != null ? String(l[k]) : '',
        ])
      )
    )
  }, [pacienteDB])

  // Stats del outbox para el SyncChip
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

  // IMC calculado en tiempo real
  const imc      = calcIMC(base.peso, base.altura)
  const imcInfo  = imcLabel(imc)

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleBaseChange = useCallback((e) => {
    const { name, value } = e.target
    setBase((prev) => ({ ...prev, [name]: value }))
    if (errores[name]) setErrores((p) => { const n = { ...p }; delete n[name]; return n })
    if (save.phase === 'saved') dispatchSave({ type: 'RESET' })
  }, [errores, save.phase])

  const handleLabChange = useCallback((e) => {
    const { name, value } = e.target
    setLab((prev) => ({ ...prev, [name]: value }))
    if (save.phase === 'saved') dispatchSave({ type: 'RESET' })
  }, [save.phase])

  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault()

    const errs = validar(base)
    if (Object.keys(errs).length > 0) { setErrores(errs); return }

    dispatchSave({ type: 'SAVING' })

    const labPayload = Object.fromEntries(
      Object.entries(lab).map(([k, v]) => [k, numVal(v)])
    )

    const payload = {
      ...base,
      peso:          numVal(base.peso),
      altura:        numVal(base.altura),
      laboratorio:   labPayload,
      sincronizado:  0,
      actualizadoEn: new Date().toISOString(),
    }

    try {
      await db.pacientes.update(pacienteId, payload)
      await outbox.encolar('UPDATE', 'pacientes', pacienteId, { id: pacienteId, ...payload })
      await outbox.registrarSync()
      dispatchSave({ type: 'SAVED', id: pacienteId })
      onSaved?.({ id: pacienteId, ...payload })
    } catch (err) {
      dispatchSave({ type: 'ERROR', message: err?.message ?? 'Error desconocido' })
    }
  }, [base, lab, pacienteId, onSaved])

  // ─── Bloqueo de scroll del body mientras está abierto ─────────────────────

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [isOpen])

  // ─── Cerrar con Escape ────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const isSaving = save.phase === 'saving'
  const nombre   = [base.nombre, base.apellido].filter(Boolean).join(' ')

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className={`epf-overlay${isOpen ? ' epf-overlay--open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Edición de Historia Clínica"
    >
      {/* ── HEADER ── */}
      <header className="epf-header">
        {/* Izquierda: logo + título */}
        <div className="epf-header__left">
          <div className="epf-sparkles-badge" aria-hidden="true">
            <Sparkles size={18} strokeWidth={2} />
          </div>
          <div>
            <h2 className="epf-header__title">Edición de Historia Clínica</h2>
            {nombre && (
              <p className="epf-header__subtitle">{nombre}</p>
            )}
          </div>
        </div>

        {/* Derecha: sync + guardar + cerrar */}
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
            {isSaving ? (
              <><Loader2 size={16} className="epf-spin" /><span>Guardando…</span></>
            ) : (
              <><Save size={16} /><span>Guardar cambios</span></>
            )}
          </button>
          <button
            type="button"
            className="epf-close-btn"
            onClick={onClose}
            aria-label="Cerrar editor"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>
      </header>

      {/* ── DIVIDER ── */}
      <div className="epf-header__rule" aria-hidden="true" />

      {/* ── CUERPO: dos columnas ── */}
      <form
        id="epf-form"
        onSubmit={handleSubmit}
        noValidate
        className="epf-body"
      >
        {/* Columna izquierda — Datos base */}
        <div className="epf-col epf-col--left">

          <ColHeader icon="🗂️" title="Datos del Paciente" subtitle="Información clínica base" />

          {/* Datos personales */}
          <LabSection label="Datos personales">
            <div className="epf-grid epf-grid--2">
              <BaseField id="nombre" name="nombre" label="Nombre *"
                value={base.nombre} onChange={handleBaseChange} error={errores.nombre}
                autoComplete="given-name" required />
              <BaseField id="apellido" name="apellido" label="Apellido"
                value={base.apellido} onChange={handleBaseChange}
                autoComplete="family-name" />
            </div>
            <div className="epf-grid epf-grid--2">
              <BaseField id="email" name="email" label="Email" type="email"
                value={base.email} onChange={handleBaseChange} error={errores.email}
                inputMode="email" autoComplete="email" />
              <BaseField id="telefono" name="telefono" label="Teléfono" type="tel"
                value={base.telefono} onChange={handleBaseChange}
                inputMode="tel" autoComplete="tel" />
            </div>
          </LabSection>

          {/* Datos físicos */}
          <LabSection label="Datos físicos">
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
            <div className="epf-grid epf-grid--2">
              <BaseField id="peso" name="peso" label="Peso (kg)" type="number"
                min="0" max="500" step="0.1" inputMode="decimal" placeholder="70"
                value={base.peso} onChange={handleBaseChange} error={errores.peso} />
              <BaseField id="altura" name="altura" label="Altura (cm)" type="number"
                min="0" max="300" step="0.5" inputMode="decimal" placeholder="170"
                value={base.altura} onChange={handleBaseChange} error={errores.altura} />
            </div>
            {/* IMC calculado */}
            {imc && (
              <div className="epf-imc-badge">
                <span className="epf-imc-badge__label">IMC calculado</span>
                <span className="epf-imc-badge__value">{imc}</span>
                {imcInfo && (
                  <span
                    className="epf-imc-badge__tag"
                    style={{ background: imcInfo.color + '18', color: imcInfo.color }}
                  >
                    {imcInfo.label}
                  </span>
                )}
              </div>
            )}
          </LabSection>

          {/* Objetivos y salud */}
          <LabSection label="Objetivos y salud">
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
          </LabSection>

          {/* Notas clínicas */}
          <LabSection label="Notas clínicas">
            <BaseField id="notas" name="notas" label="Observaciones" tag="textarea" rows={3}
              placeholder="Observaciones adicionales…"
              value={base.notas} onChange={handleBaseChange} />
          </LabSection>

          {/* Error global */}
          {save.phase === 'error' && (
            <div role="alert" className="epf-error-global">
              <AlertCircle size={16} aria-hidden="true" />
              <span>{save.error ?? 'No se pudo guardar. Intentá de nuevo.'}</span>
            </div>
          )}
        </div>

        {/* Columna derecha — Analíticas de Laboratorio */}
        <div className="epf-col epf-col--right">

          <ColHeader icon="🧬" title="Analíticas de Laboratorio" subtitle="Valores médicos de referencia" />

          {LAB_GROUPS.map((group) => (
            <LabGroupPanel key={group.key} group={group} values={lab} onChange={handleLabChange} />
          ))}
        </div>
      </form>
    </div>
  )
}

// ─── LabGroupPanel ────────────────────────────────────────────────────────────

function LabGroupPanel({ group, values, onChange }) {
  return (
    <div
      className="epf-lab-group"
      style={{ '--group-color': group.color, '--group-bg': group.bg, '--group-border': group.border }}
    >
      <div className="epf-lab-group__header">
        <div className="epf-lab-group__dot" />
        <span className="epf-lab-group__label">{group.label}</span>
      </div>
      <div className="epf-lab-group__fields">
        {group.fields.map((field) => (
          <LabField
            key={field.key}
            field={field}
            value={values[field.key]}
            onChange={onChange}
          />
        ))}
      </div>
    </div>
  )
}

// ─── LabField ─────────────────────────────────────────────────────────────────

function LabField({ field, value, onChange }) {
  return (
    <div className="epf-lab-field">
      <label className="epf-lab-field__label" htmlFor={`lab-${field.key}`}>
        {field.label}
      </label>
      <div className="epf-lab-field__input-row">
        <input
          id={`lab-${field.key}`}
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

// ─── LabSection ──────────────────────────────────────────────────────────────

function LabSection({ label, children }) {
  return (
    <fieldset className="epf-section">
      <legend className="epf-section__legend">{label}</legend>
      {children}
    </fieldset>
  )
}

// ─── BaseField ───────────────────────────────────────────────────────────────

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
        <span id={`${id}-err`} className="epf-field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}

// ─── SyncChip ─────────────────────────────────────────────────────────────────

function SyncChip({ sincronizado, pendiente, error, savePhase }) {
  if (savePhase === 'saving') return (
    <span className="epf-sync-chip epf-sync-chip--saving">
      <Loader2 size={11} className="epf-spin" />
      Guardando…
    </span>
  )
  if (savePhase === 'saved' && !error && !pendiente) return (
    <span className="epf-sync-chip epf-sync-chip--saved">
      <CheckCircle2 size={11} />
      Guardado
    </span>
  )
  if (error > 0)     return <span className="epf-sync-chip epf-sync-chip--error">⚠ Error de sync</span>
  if (pendiente > 0) return <span className="epf-sync-chip epf-sync-chip--pending">↑ Sync pendiente</span>
  if (sincronizado)  return <span className="epf-sync-chip epf-sync-chip--synced">✓ Sincronizado</span>
  return                    <span className="epf-sync-chip epf-sync-chip--local">◌ Solo local</span>
}
