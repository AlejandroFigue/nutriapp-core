/**
 * PacienteForm — Formulario de alta / edición de paciente.
 *
 * Diseño: panel de alta gama montado dentro del Drawer de Pacientes.
 *   · Campos con bordes que cambian de color al hacer foco (CSS :focus-within)
 *   · Secciones con tarjetas visuales y separadores con degradado
 *   · Botón de guardado con degradado + transición de escala
 *   · SyncChip compacto integrado en el footer
 *
 * Flujo offline-first (inalterado):
 *   1. Escritura inmediata en IndexedDB (sincronizado: 0)
 *   2. Item encolado en outbox → registrarSync() pide Background Sync al SW
 *   3. Cuando hay red el SW hace flush → sincronizado: 1 en DB
 *   4. liveQuery en el componente padre actualiza la lista solo
 *
 * Props:
 *   pacienteId?: string   — UUID del paciente existente (modo edición)
 *   onSaved?: (p) => void — Callback con el objeto guardado; lo usa el padre
 *                           para cerrar el drawer y actualizar la UI.
 *
 * Nota de schema v3:
 *   En la versión 3 de la DB, la PK de `pacientes` es un UUID string (no
 *   auto-increment). Por eso la creación usa genId() explícitamente.
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
import { db, outbox, genId } from '@/db/database'

// ─── Hook utilitario: liveQuery → useSyncExternalStore ───────────────────────

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
  { value: '',                    label: 'Seleccionar…' },
  { value: 'femenino',            label: 'Femenino' },
  { value: 'masculino',           label: 'Masculino' },
  { value: 'otro',                label: 'Otro' },
  { value: 'prefiero-no-decir',   label: 'Prefiero no decir' },
]

const OBJETIVOS = [
  { value: '',         label: 'Seleccionar…' },
  { value: 'bajar',    label: 'Bajar de peso' },
  { value: 'mantener', label: 'Mantener peso' },
  { value: 'subir',    label: 'Subir de peso' },
  { value: 'musculo',  label: 'Ganar músculo' },
  { value: 'salud',    label: 'Mejorar salud general' },
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

// ─── Validación pura (sin librerías externas) ─────────────────────────────────

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

// ─── Reducer de estado del guardado ──────────────────────────────────────────
// idle → saving → saved | error

function saveReducer(state, action) {
  switch (action.type) {
    case 'RESET':  return { phase: 'idle',   error: null }
    case 'SAVING': return { phase: 'saving', error: null }
    case 'SAVED':  return { phase: 'saved',  error: null, pacienteId: action.id }
    case 'ERROR':  return { phase: 'error',  error: action.message }
    default:       return state
  }
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function PacienteForm({ pacienteId, onSaved }) {
  const esEdicion = pacienteId != null

  // Carga reactiva del paciente en modo edición
  const pacienteDB = useDexieLive(
    () => esEdicion ? db.pacientes.get(pacienteId) : Promise.resolve(null),
    [pacienteId, esEdicion],
    null,
  )

  const [fields,     setFields]     = useState(FORM_VACIO)
  const [errores,    setErrores]    = useState({})
  const [save,       dispatchSave]  = useReducer(saveReducer, { phase: 'idle', error: null })

  // Poblar el form cuando se carga el paciente (modo edición)
  useEffect(() => {
    if (!pacienteDB) return
    setFields({
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
  }, [pacienteDB])

  // Stats del outbox para el chip de sync
  const outboxStats = useDexieLive(
    () => {
      const id = save.pacienteId ?? pacienteId
      if (id == null) return Promise.resolve({ pendiente: 0, error: 0 })
      return db.outbox
        .where('tabla').equals('pacientes')
        .toArray()
        .then((rows) => {
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

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleChange = useCallback((e) => {
    const { name, value } = e.target
    setFields((prev) => ({ ...prev, [name]: value }))
    // Limpiar error del campo al editar
    if (errores[name]) {
      setErrores((prev) => { const n = { ...prev }; delete n[name]; return n })
    }
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
      peso:          fields.peso   !== '' ? Number(fields.peso)   : null,
      altura:        fields.altura !== '' ? Number(fields.altura) : null,
      sincronizado:  0,
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
        // ── Creación optimista (v3: UUID explícito, PK no es auto-increment) ─
        payload.id        = genId()
        payload.creadoEn  = new Date().toISOString()
        await db.pacientes.add(payload)
        await outbox.encolar('CREATE', 'pacientes', payload.id, payload)
        id = payload.id
      }

      await outbox.registrarSync()

      dispatchSave({ type: 'SAVED', id })
      onSaved?.({ id, ...payload })

      // Reset solo en creación (en edición el drawer se cierra vía onSaved)
      if (!esEdicion) {
        setFields(FORM_VACIO)
        setErrores({})
      }
    } catch (err) {
      dispatchSave({ type: 'ERROR', message: err?.message ?? 'Error desconocido' })
    }
  }, [fields, esEdicion, pacienteId, onSaved])

  // ─── Derived ──────────────────────────────────────────────────────────────

  const isSaving = save.phase === 'saving'
  const hasError = save.phase === 'error'

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="pf-wrapper">

      {/* Chip de sync en modo edición — justo debajo del drawer header */}
      {esEdicion && (
        <div className="pf-sync-row">
          <SyncChip
            sincronizado={sincronizado}
            pendiente={outboxStats.pendiente}
            error={outboxStats.error}
          />
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        noValidate
        className="pf-form"
        aria-label={esEdicion ? 'Editar paciente' : 'Nuevo paciente'}
      >

        {/* ── Sección: Datos personales ── */}
        <Section icon="👤" title="Datos personales">
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
        </Section>

        {/* ── Sección: Datos físicos ── */}
        <Section icon="📏" title="Datos físicos">
          <div className="pf-grid pf-grid--3">
            <Field
              id="fechaNacimiento" name="fechaNacimiento" label="Nacimiento"
              type="date" value={fields.fechaNacimiento} onChange={handleChange}
            />
            <div className="pf-field">
              <label className="pf-label" htmlFor="genero">Género</label>
              <select
                id="genero" name="genero"
                className="pf-input pf-input--select"
                value={fields.genero} onChange={handleChange}
              >
                {GENEROS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            {/* Placeholder de alineación */}
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
        </Section>

        {/* ── Sección: Objetivos y salud ── */}
        <Section icon="🎯" title="Objetivos y salud">
          <div className="pf-field">
            <label className="pf-label" htmlFor="objetivo">Objetivo nutricional</label>
            <select
              id="objetivo" name="objetivo"
              className="pf-input pf-input--select"
              value={fields.objetivo} onChange={handleChange}
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
        </Section>

        {/* ── Sección: Notas clínicas ── */}
        <Section icon="📝" title="Notas clínicas">
          <Field
            id="notas" name="notas" label="Observaciones" tag="textarea"
            value={fields.notas} onChange={handleChange}
            placeholder="Observaciones adicionales…" rows={3}
          />
        </Section>

        {/* ── Error global ── */}
        {hasError && (
          <div role="alert" className="pf-error-global">
            <IconAlert aria-hidden="true" />
            <span>{save.error ?? 'No se pudo guardar. Intentá de nuevo.'}</span>
          </div>
        )}

        {/* ── Footer: botón de guardado ── */}
        <div className="pf-footer">
          <button
            type="submit"
            className={`pf-submit${isSaving ? ' pf-submit--loading' : ''}`}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <IconSpinner aria-hidden="true" />
                <span>Guardando…</span>
              </>
            ) : (
              <>
                <IconSave aria-hidden="true" />
                <span>{esEdicion ? 'Guardar cambios' : 'Crear paciente'}</span>
              </>
            )}
          </button>

          {/* Indicador de estado inline */}
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

// ─── Sub-componente: Section ──────────────────────────────────────────────────

function Section({ icon, title, children }) {
  return (
    <fieldset className="pf-section">
      <legend className="pf-section__legend">
        <span className="pf-section__icon" aria-hidden="true">{icon}</span>
        <span className="pf-section__title">{title}</span>
      </legend>
      {children}
    </fieldset>
  )
}

// ─── Sub-componente: Field ────────────────────────────────────────────────────

/**
 * Campo genérico con label + input/textarea + error inline.
 * El color del label y el borde del input cambian juntos via CSS :focus-within.
 */
function Field({
  id, name, label, tag = 'input', error, children,
  ...inputProps
}) {
  const Tag = tag
  return (
    <div className={`pf-field${error ? ' pf-field--error' : ''}`}>
      <label className="pf-label" htmlFor={id}>
        {label}
      </label>
      <Tag
        id={id}
        name={name}
        className={[
          'pf-input',
          error              ? 'pf-input--error'    : '',
          tag === 'textarea' ? 'pf-input--textarea' : '',
        ].filter(Boolean).join(' ')}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        {...inputProps}
      >
        {children}
      </Tag>
      {error && (
        <span id={`${id}-err`} className="pf-field-error" role="alert">
          <IconAlertTiny aria-hidden="true" />
          {error}
        </span>
      )}
    </div>
  )
}

// ─── Sub-componente: SyncChip ─────────────────────────────────────────────────

function SyncChip({ sincronizado, pendiente, error }) {
  if (error > 0)     return <span className="sync-chip sync-chip--error">⚠ Error de sync</span>
  if (pendiente > 0) return <span className="sync-chip sync-chip--pending">↑ Sync pendiente</span>
  if (sincronizado)  return <span className="sync-chip sync-chip--synced">✓ Sincronizado</span>
  return                    <span className="sync-chip sync-chip--local">◌ Solo local</span>
}

// ─── Sub-componente: SaveIndicator ───────────────────────────────────────────

function SaveIndicator({ phase, sincronizado, outboxPendiente, outboxError }) {
  if (phase === 'idle') return null

  if (phase === 'saving') return (
    <span className="save-indicator save-indicator--saving" aria-live="polite">
      Guardando en IndexedDB…
    </span>
  )

  if (phase === 'error') return (
    <span className="save-indicator save-indicator--error" aria-live="assertive">
      Error al guardar
    </span>
  )

  // phase === 'saved'
  if (outboxError > 0) return (
    <span className="save-indicator save-indicator--error" aria-live="polite">
      Error de sincronización
    </span>
  )
  if (outboxPendiente > 0 || !sincronizado) return (
    <span className="save-indicator save-indicator--local" aria-live="polite">
      Guardado · sync pendiente
    </span>
  )
  return (
    <span className="save-indicator save-indicator--synced" aria-live="polite">
      Guardado y sincronizado
    </span>
  )
}

// ─── Micro-íconos ─────────────────────────────────────────────────────────────

const IconSpinner = () => (
  <svg className="icon-spin" width="16" height="16" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
)

const IconSave = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
)

const IconAlert = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)

const IconAlertTiny = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)
