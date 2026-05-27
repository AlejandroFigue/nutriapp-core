/**
 * database.js — NutriApp Profesional (Dexie)
 *
 * v2: Esquema unificado multi-paciente para consultorio profesional.
 *     Stores: pacientes, historias, turnos, planes, plantillas, productos, outbox
 *
 * NOTA sobre $$id:
 *   Dexie no soporta el prefijo $$. La semántica equivalente — UUID generado
 *   en cliente, sin auto-increment — se implementa con `id` como primer campo
 *   (PK no numérico) y la función exportada `genId()`.
 *
 * ADVERTENCIA DE MIGRACIÓN:
 *   Si ya existe una NutriAppDB en versión 3 en el navegador, Dexie lanzará
 *   un VersionError. Limpiar IndexedDB en DevTools → Application → Storage
 *   antes de correr esta versión por primera vez.
 */
import Dexie from 'dexie'

const db = new Dexie('NutriAppDB')

// ── v2: esquema profesional completo ─────────────────────────────────────────

db.version(2).stores({
  /**
   * PACIENTES — ficha clínica de cada paciente del profesional.
   * PK: UUID string asignado en cliente con genId().
   */
  pacientes: 'id, nombre, email, telefono, sincronizado',

  /**
   * HISTORIAS — evolución clínica por paciente (peso, IMC, medidas…).
   * [pacienteId+fecha] → consultas de historia en rango de fechas.
   */
  historias: 'id, pacienteId, fecha, imc, sincronizado, [pacienteId+fecha]',

  /**
   * TURNOS — agenda de citas del profesional.
   * [pacienteId+fecha] → todos los turnos de un paciente en un día.
   */
  turnos: 'id, pacienteId, fecha, hora, estado, sincronizado, [pacienteId+fecha]',

  /**
   * PLANES — plan nutricional por paciente y fecha.
   * [pacienteId+fecha] → plan vigente de un paciente.
   */
  planes: 'id, pacienteId, fecha, sincronizado, [pacienteId+fecha]',

  /**
   * PLANTILLAS — plantillas de planes reutilizables.
   * PK: UUID string.
   */
  plantillas: 'id, nombre_plantilla',

  /**
   * PRODUCTOS — catálogo de alimentos y suplementos.
   */
  productos: 'id, nombre, categoria',

  /**
   * OUTBOX — cola de sincronización diferida (patrón at-least-once).
   * `estado` indexado para filtrar pendientes / errores en Outbox.pendientes().
   */
  outbox: 'id, tabla, accion, datos, timestamp, estado',
})

// ─── Generador de IDs ─────────────────────────────────────────────────────────

/**
 * Genera un UUID v4 usando la Crypto API del browser.
 * Úsalo como PK en todas las tablas.
 *
 * @returns {string} UUID v4 (ej: "550e8400-e29b-41d4-a716-446655440000")
 */
export const genId = () => crypto.randomUUID()

// ─── Background Sync ──────────────────────────────────────────────────────────

/**
 * Registra el tag 'sync-outbox' en el Service Worker.
 * Falla silenciosamente si Background Sync no está disponible.
 */
async function registrarBackgroundSync() {
  if (!('serviceWorker' in navigator) || !('SyncManager' in window)) return
  try {
    const reg = await navigator.serviceWorker.ready
    await reg.sync.register('sync-outbox')
  } catch {
    // Background Sync no disponible en este entorno
  }
}

// ─── queueSyncTask — API pública del outbox ───────────────────────────────────

/**
 * Encola una operación para sincronizar con el servidor y registra
 * Background Sync para procesarla cuando la red esté disponible.
 *
 * Es la función central del patrón Outbox: toda mutación offline-first
 * debe llamarla después de escribir en IndexedDB.
 *
 * @param {string}                     tabla   Tabla afectada ('pacientes', 'turnos'…)
 * @param {'CREATE'|'UPDATE'|'DELETE'} accion  Tipo de operación
 * @param {object}                     datos   Payload completo del registro
 * @returns {Promise<string>}  UUID del ítem creado en outbox
 *
 * @example
 *   const id = genId()
 *   await db.pacientes.add({ id, nombre: 'Ana', … })
 *   await queueSyncTask('pacientes', 'CREATE', { id, nombre: 'Ana', … })
 */
export async function queueSyncTask(tabla, accion, datos) {
  const id = genId()
  await db.outbox.add({
    id,
    tabla,
    accion,
    datos:       JSON.stringify(datos),
    timestamp:   Date.now(),
    estado:      'pendiente',
    intentos:    0,
    ultimoError: null,
  })
  await registrarBackgroundSync()
  return id
}

// ─── Clase Outbox ─────────────────────────────────────────────────────────────

class Outbox {
  /** @returns {Dexie.Table} */
  get tabla() {
    return db.outbox
  }

  /**
   * Compatibilidad con código existente que llama outbox.encolar().
   * Mapea los argumentos al nuevo schema y delega en queueSyncTask.
   */
  async encolar(tipo, entidad, entidadId, payload) {
    const datos = payload
      ? { ...payload, id: payload.id ?? entidadId }
      : { id: entidadId }
    return queueSyncTask(entidad, tipo, datos)
  }

  /** Items pendientes de procesar, ordenados por antigüedad. */
  async pendientes() {
    return this.tabla
      .where('estado').anyOf(['pendiente', 'procesando'])
      .sortBy('timestamp')
  }

  /** Items que superaron MAX_INTENTOS y requieren revisión manual. */
  async fallidos() {
    return this.tabla
      .where('estado').equals('error')
      .sortBy('timestamp')
  }

  async procesando(id) {
    return this.tabla.update(id, { estado: 'procesando' })
  }

  async completar(id) {
    return this.tabla.update(id, { estado: 'completado' })
  }

  async fallar(id, mensajeError = '') {
    const item = await this.tabla.get(id)
    if (!item) return
    const intentos     = (item.intentos ?? 0) + 1
    const MAX_INTENTOS = 5
    return this.tabla.update(id, {
      estado:      intentos >= MAX_INTENTOS ? 'error' : 'pendiente',
      intentos,
      ultimoError: mensajeError,
    })
  }

  /**
   * Procesa todos los ítems pendientes con la función apiFn provista.
   * Si apiFn rechaza, el ítem se marca como fallido y se continúa.
   *
   * @param {(item: object) => Promise<void>} apiFn
   * @returns {Promise<{completados: number, fallidos: number}>}
   */
  async flush(apiFn) {
    const items = await this.pendientes()
    let completados = 0
    let fallidos    = 0

    for (const item of items) {
      try {
        await this.procesando(item.id)
        const datosParseados = item.datos ? JSON.parse(item.datos) : null
        await apiFn({
          ...item,
          datos:     datosParseados,
          // Aliases de compatibilidad
          entidad:   item.tabla,
          tipo:      item.accion,
          entidadId: datosParseados?.id ?? null,
          payload:   datosParseados,
        })
        await this.completar(item.id)
        completados++
      } catch (err) {
        await this.fallar(item.id, err?.message ?? 'Error desconocido')
        fallidos++
      }
    }

    return { completados, fallidos }
  }

  /** Alias público para compatibilidad. */
  async registrarSync() {
    await registrarBackgroundSync()
  }

  /**
   * Elimina ítems completados con más de `diasAntiguedad` días.
   * @param {number} diasAntiguedad  Default: 30
   */
  async limpiar(diasAntiguedad = 30) {
    const corte = Date.now() - diasAntiguedad * 24 * 60 * 60 * 1000
    return this.tabla
      .where('estado').equals('completado')
      .and((item) => item.timestamp < corte)
      .delete()
  }
}

export const outbox = new Outbox()
export { db }
export default db
