/**
 * PacienteForm — formulario de alta / edición de paciente con actualización
 * optimista y mapa visual del estado de sincronización local→servidor.
 *
 * Flujo offline-first:
 *   1. Usuario envía el formulario
 *   2. Escritura inmediata en IndexedDB (sincronizado: 0)  ← siempre funciona offline
 *   3. UI refleja "Guardado localmente" sin esperar confirmación de red
 *   4. Item encolado en outbox → registrarSync() pide Background Sync al SW
 *   5. Cuando la red vuelve el SW dispara flush → sincronizado: 1 en DB
 *   6. SyncStatus (liveQuery) y el indicador inline se actualizan solos
 *
 * Props:
 *   pacienteId?: number   — si se provee, carga el registro existente (modo edición)
 *   onSaved?: (p) => void — callback con el objeto guardado (útil para redirigir)
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
import { db, outbox } from '@/db/database'

// ─── Hook utilitario: liveQuery ↔ useSyncExternalStore ───────────────────────

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

// ─── Constantes ───────────────────────────────────────────────────────────────

const GENEROS = [
  { value: '', label: 'Seleccionar…' },
  { value: 'femenino',   label: 'Femenino' },
  { value: 'masculino',  label: 'Masculino' },
  { value: 'otro',       label: 'Otro' },
  { value: 'prefiero-no-decir', label: 'Prefiero no decir' },
]

const OBJETIVOS = [
  { value: '',          label: 'Seleccionar…' },
  { value: 'bajar',     label: 'Bajar de peso' },
  { value: 'mantener',  label: 'Mantener peso' },
  { value: 'subir',     label: 'Subir de peso' },
  { value: 'musculo',   label: 'Ganar músculo' },
  { value: 'salud',     label: 'Mejorar salud general' },
]

const FORM_VACIO = {
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

// ─── Validación pura (sin librerías) ─────────────────────────────────────────

function validar(fields) {
  const errs = {}
  if (!fields.nombre.trim())
    errs.nombre = 'El nombre es obligatorio.'
  if (fields.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email))
    errs.email = 'Email inválido.'
  if (fields.peso && (isNaN(Number(fields.peso)) || Number(fields.peso) <= 0))
    errs.peso = 'Ingresá un peso válido (kg).'
  if (fields.altura && (isNaN(Number(fields.altura)) || Number(fields.altura) <= 0))
    errs.altura = 'Ingresá una altura válida (cm).'
  return errs
}

// ─── Estado de guardado local ─────────────────────────────────────────────────
// idle → saving → saved | error

function saveReducer(state, action) {
  switch (action.type) {
    case 'RESET':   return { phase: 'idle',   error: null }
    case 'SAVING':  return { phase: 'saving', error: null }
    case 'SAVED':   return { phase: 'saved',  error: null, pacienteId: action.id }
    case 'ERROR':   return { phase: 'error',  error: action.message }
    default:        return state
  }
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function PacienteForm({ pacienteId, onSaved }) {
  const esEdicion = pacienteId != null

  // Carga reactiva del paciente existente en modo edición
  const pacienteDB = useDexieLive(
    () => esEdicion ? db.pacientes.get(pacienteId) : Promise.resolve(null),
    [pacienteId, esEdicion],
    null,
  )

  const [fields,  setFields]  = useState(FORM_VACIO)
  const [errores, setErrores] = useState({})
  const [save,    dispatchSave] = useReducer(saveReducer, { phase: 'idle', error: null })

  // Inicializar el form cuando carga el paciente (modo edición)
  useEffect(() => {
    if (!pacienteDB) return
    setFields({
      nombre:             pacienteDB.nombre             ?? '',
      apellido:           pacienteDB.apellido           ?? '',
      email:              pacienteDB.email              ?? '',
      telefono:           pacienteDB.telefono           ?? '',
      fechaNacimiento:    pacienteDB.fechaNacimiento    ?? '',
      genero:             pacienteDB.genero             ?? '',
      peso:               pacienteDB.peso               != null ? String(pacienteDB.peso)   : '',
      altura:             pacienteDB.altura             != null ? String(pacienteDB.altura) : '',
      objetivo:           pacienteDB.objetivo           ?? '',
      condicionesMedicas: pacienteDB.condicionesMedicas ?? '',
      alergias:           pacienteDB.alergias           ?? '',
      notas:              pacienteDB.notas              ?? '',
    })
  }, [pacienteDB])

  // Conteo reactivo de items en outbox para este paciente
  const outboxStats = useDexieLive(
    () => {
      const id = save.pacienteId ?? pacienteId
      if (id == null) return Promise.resolve({ pendiente: 0, error: 0 })
      return db.outbox
        .where('entidadId').equals(id)
        .and((r) => r.entidad === 'pacientes')
        .toArray()
        .then((rows) => ({
          pendiente: rows.filter((r) => r.estado !== 'error' && r.estado !== 'completado').length,
          error:     rows.filter((r) => r.estado === 'error').length,
        }))
    },
    [save.pacienteId, pacienteId],
    { pendiente: 0, error: 0 },
  )

  // Estado de sync del registro guardado
  const sincronizado = pacienteDB?.sincronizado === 1

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleChange = useCallback((e) => {
    const { name, value } = e.target
    setFields((prev) => ({ ...prev, [name]: value }))
    // Limpiar error del campo al editar
    if (errores[name]) setErrores((prev) => { const n = { ...prev }; delete n[name]; return n })
    // Marcar como pendiente si ya se había guardado
    if (save.phase === 'saved') dispatchSave({ type: 'RESET' })
  }, [errores, save.phase])

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()

    const errs = validar(fields)
    if (Object.keys(errs).length > 0) {
      setErrores(errs)
      return
    }

    dispatchSave({ type: 'SAVING' })

    const payload = {
      ...fields,
      peso:    fields.peso    !== '' ? Number(fields.peso)   : null,
      altura:  fields.altura  !== '' ? Number(fields.altura) : null,
      sincronizado: 0,
      actualizadoEn: new Date().toISOString(),
    }

    try {
      let id

      if (esEdicion) {
        // ── Actualización optimista ──────────────────────────────────────────
        await db.pacientes.update(pacienteId, payload)
        await outbox.encolar('UPDATE', 'pacientes', pacienteId, { id: pacienteId, ...payload })
        id = pacienteId
      } else {
        // ── Creación optimista ───────────────────────────────────────────────
        payload.creadoEn = new Date().toISOString()
        id = await db.pacientes.add(payload)
        await outbox.encolar('CREATE', 'pacientes', id, { ...payload, id })
      }

      await outbox.registrarSync()

      dispatchSave({ type: 'SAVED', id })
      onSaved?.({ id, ...payload })

      // Resetear el form solo si es creación
      if (!esEdicion) {
        setFields(FORM_VACIO)
        setErrores({})
      }
    } catch (err) {
      dispatchSave({ type: 'ERROR', message: err?.message ?? 'Error desconocido' })
    }
  }, [fields, esEdicion, pacienteId, onSaved])

  // ─── Render ────────────────────────────────────────────────────────────────

  const isSaving  = save.phase === 'saving'
  const wasSaved  = save.phase === 'saved'
  const hasError  = save.phase === 'error'

  return (
    <div className="pf-wrapper">
      {/* ── Encabezado ── */}
      <header className="pf-header">
        <h2 className="pf-title">
          {esEdicion ? 'Editar paciente' : 'Nuevo paciente'}
        </h2>
        {esEdicion && (
          <SyncChip
            sincronizado={sincronizado}
            pendiente={outboxStats.pendiente}
            error={outboxStats.error}
          />
        )}
      </header>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="pf-form"
        aria-label={esEdicion ? 'Editar paciente' : 'Nuevo paciente'}
      >

        {/* ── Sección: Datos personales ── */}
        <fieldset className="pf-section">
          <legend className="pf-section__title">Datos personales</legend>

          <div className="pf-grid pf-grid--2">
            <Field
              id="nombre" name="nombre" label="Nombre *"
              value={fields.nombre} onChange={handleChange} error={errores.nombre}
              autoComplete="given-name" required
            />
            <Field
              id="apellido" name="apellido" label="Apellido"
              value={fields.apellido} onChange={handleChange}
              autoComplete="family-name"
            />
          </div>

          <div className="pf-grid pf-grid--2">
            <Field
              id="email" name="email" label="Email" type="email"
              value={fields.email} onChange={handleChange} error={errores.email}
              autoComplete="email" inputMode="email"
            />
            <Field
              id="telefono" name="telefono" label="Teléfono" type="tel"
              value={fields.telefono} onChange={handleChange}
              autoComplete="tel" inputMode="tel"
            />
          </div>
        </fieldset>

        {/* ── Sección: Datos físicos ── */}
        <fieldset className="pf-section">
          <legend className="pf-section__title">Datos físicos</legend>

          <div className="pf-grid pf-grid--3">
            <Field
              id="fechaNacimiento" name="fechaNacimiento" label="Fecha de nacimiento"
              type="date" value={fields.fechaNacimiento} onChange={handleChange}
            />
            <div className="pf-field">
              <label className="pf-label" htmlFor="genero">Género</label>
              <select
                id="genero" name="genero"
                className="pf-input"
                value={fields.genero}
                onChange={handleChange}
              >
                {GENEROS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            {/* placeholder para alineación */}
            <div aria-hidden="true" />
          </div>

          <div className="pf-grid pf-grid--2">
            <Field
              id="peso" name="peso" label="Peso (kg)" type="number"
              min="0" max="500" step="0.1"
              value={fields.peso} onChange={handleChange} error={errores.peso}
              inputMode="decimal" placeholder="70"
            />
            <Field
              id="altura" name="altura" label="Altura (cm)" type="number"
              min="0" max="300" step="0.5"
              value={fields.altura} onChange={handleChange} error={errores.altura}
              inputMode="decimal" placeholder="170"
            />
          </div>
        </fieldset>

        {/* ── Sección: Objetivos ── */}
        <fieldset className="pf-section">
          <legend className="pf-section__title">Objetivos y salud</legend>

          <div className="pf-field">
            <label className="pf-label" htmlFor="objetivo">Objetivo</label>
            <select
              id="objetivo" name="objetivo"
              className="pf-input"
              value={fields.objetivo}
              onChange={handleChange}
            >
              {OBJETIVOS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <Field
            id="condicionesMedicas" name="condicionesMedicas"
            label="Condiciones médicas" tag="textarea"
            value={fields.condicionesMedicas} onChange={handleChange}
            placeholder="Diabetes tipo 2, hipertensión…" rows={2}
          />

          <Field
            id="alergias" name="alergias"
            label="Alergias / intolerancias" tag="textarea"
            value={fields.alergias} onChange={handleChange}
            placeholder="Lactosa, gluten…" rows={2}
          />
        </fieldset>

        {/* ── Sección: Notas ── */}
        <fieldset className="pf-section">
          <legend className="pf-section__title">Notas clínicas</legend>
          <Field
            id="notas" name="notas" label="Notas" tag="textarea"
            value={fields.notas} onChange={handleChange}
            placeholder="Observaciones adicionales…" rows={3}
          />
        </fieldset>

        {/* ── Error global ── */}
        {hasError && (
          <p role="alert" className="pf-error-global">
            {save.error ?? 'No se pudo guardar. Intentá de nuevo.'}
          </p>
        )}

        {/* ── Footer: botón + indicador de estado ── */}
        <div className="pf-footer">
          <button
            type="submit"
            className="pf-submit"
            disabled={isSaving}
          >
            {isSaving
              ? 'Guardando…'
              : esEdicion
                ? 'Guardar cambios'
                : 'Crear paciente'}
          </button>

          {/* Indicador de estado de guardado / sync */}
          <SaveIndicator
            phase={save.phase}
            sincronizado={sincronizado && esEdicion}
            outboxPendiente={outboxStats.pendiente}
            outboxError={outboxStats.error}
          />
        </div>
      </form>
    </div>
  )
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

/**
 * Campo genérico de formulario con label, input/textarea/select y mensaje de error.
 * El patrón de inline styles + clase CSS permite rendimiento óptimo sin Tailwind.
 */
function Field({
  id, name, label, tag = 'input', error, children,
  ...inputProps
}) {
  const Tag = tag
  return (
    <div className="pf-field">
      <label className="pf-label" htmlFor={id}>
        {label}
      </label>
      <Tag
        id={id}
        name={name}
        className={`pf-input${error ? ' pf-input--error' : ''}${tag === 'textarea' ? ' pf-input--textarea' : ''}`}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        {...inputProps}
      >
        {children}
      </Tag>
      {error && (
        <span id={`${id}-err`} className="pf-field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}

/**
 * Chip de estado de sync visible en el encabezado (modo edición).
 * Refleja el campo `sincronizado` del registro y el outbox.
 */
function SyncChip({ sincronizado, pendiente, error }) {
  if (error > 0)    return <span className="sync-chip sync-chip--error">Error de sync</span>
  if (pendiente > 0) return <span className="sync-chip sync-chip--pending">Sync pendiente</span>
  if (sincronizado)  return <span className="sync-chip sync-chip--synced">Sincronizado</span>
  return                    <span className="sync-chip sync-chip--local">Local</span>
}

/**
 * Indicador de estado en el footer del formulario.
 * Transiciona entre los diferentes estados con CSS.
 */
function SaveIndicator({ phase, sincronizado, outboxPendiente, outboxError }) {
  if (phase === 'idle')   return null
  if (phase === 'saving') return (
    <span className="save-indicator save-indicator--saving" aria-live="polite">
      <IconSpinner /> Guardando…
    </span>
  )
  if (phase === 'error') return (
    <span className="save-indicator save-indicator--error" aria-live="assertive">
      <IconAlert /> Error al guardar
    </span>
  )

  // phase === 'saved'
  if (outboxError > 0) return (
    <span className="save-indicator save-indicator--error" aria-live="polite">
      <IconAlert /> Error de sincronización
    </span>
  )
  if (outboxPendiente > 0 || !sincronizado) return (
    <span className="save-indicator save-indicator--local" aria-live="polite">
      <IconLocal /> Guardado localmente · sync pendiente
    </span>
  )
  return (
    <span className="save-indicator save-indicator--synced" aria-live="polite">
      <IconCheck /> Sincronizado con el servidor
    </span>
  )
}

// ─── Micro-íconos ─────────────────────────────────────────────────────────────

const IconSpinner = () => (
  <svg className="icon-spin" width="13" height="13" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
)

const IconAlert = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)

const IconLocal = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
  </svg>
)

const IconCheck = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)
