/**
 * database.js — IndexedDB de NutriApp Profesional (Dexie 4)
 *
 * Historial de versiones:
 *   v1  Esquema original  (alimentos, registros, planes, progreso, usuario, outbox)
 *   v2  Tabla pacientes   (parche; PK auto-increment entero)
 *   v3  Esquema completo multi-paciente:
 *         · pacientes, historias, turnos  → nuevas
 *         · planes   → PK cambia a UUID, agrega pacienteId
 *         · productos → reemplaza alimentos como catálogo principal
 *         · outbox   → PK UUID, campos renombrados (tabla/accion/datos)
 *       Las tablas v1 alimentos / registros / progreso / usuario se mantienen
 *       intactas para no romper código existente.
 *
 * NOTA sobre $$id:
 *   Dexie no soporta el prefijo $$. La semántica equivalente — UUID generado
 *   en cliente, sin auto-increment — se implementa con `id` como primer campo
 *   (PK no numérico) y la función exportada `genId()`.
 */
import Dexie from 'dexie'

const db = new Dexie('NutriAppDB')

// ─── v1: esquema original ─────────────────────────────────────────────────────

db.version(1).stores({
  /**
   * Catálogo de alimentos (legado — v3 introduce `productos` como reemplazo).
   * *categorias → multi-entry index para filtrar por categoría.
   * [fuente+fuenteId] → índice compuesto para upsert sin duplicados.
   */
  alimentos: '++id, nombre, *categorias, codigoBarras, fuente, [fuente+fuenteId]',

  /**
   * Diario de comidas del usuario local.
   * [fecha+tipoComida] → todos los items de un momento del día en una query.
   */
  registros: '++id, fecha, tipoComida, alimentoId, [fecha+tipoComida], sincronizado',

  /** Plan nutricional diario — un registro por fecha (constraint &fecha). */
  planes: '++id, &fecha',

  /** Progreso corporal (peso, medidas…). */
  progreso: '++id, fecha, tipo, [fecha+tipo]',

  /** Perfil del usuario. PK fija 'local' (registro único). */
  usuario: '&id',

  /** Cola outbox v1 (entidad / entidadId / estado). */
  outbox: '++id, estado, entidad, entidadId, timestamp',
})

// ─── v2: tabla pacientes (parche — PK entero auto-increment) ─────────────────

db.version(2).stores({
  pacientes: '++id, nombre, apellido, email, sincronizado, creadoEn',
})

// ─── v3: esquema completo multi-paciente ──────────────────────────────────────

db.version(3).stores({
  /**
   * PACIENTES — ficha clínica de cada paciente gestionado por el profesional.
   * PK: UUID string generado en cliente con genId().
   * Índices: nombre (búsqueda), email (unicidad lógica), sincronizado (pendientes).
   */
  pacientes: 'id, nombre, email, telefono, sincronizado',

  /**
   * HISTORIAS — evolución clínica por paciente (peso, IMC, medidas, etc.).
   * [pacienteId+fecha] → obtener toda la historia de un paciente en rango de fechas.
   */
  historias: 'id, pacienteId, fecha, imc, sincronizado, [pacienteId+fecha]',

  /**
   * TURNOS — agenda de citas del profesional.
   * [pacienteId+fecha] → todos los turnos de un paciente en un día.
   * estado → filtrar confirmados / pendientes / cancelados.
   */
  turnos: 'id, pacienteId, fecha, hora, estado, sincronizado, [pacienteId+fecha]',

  /**
   * PLANES — plan nutricional por paciente (reemplaza planes v1 que era por fecha).
   * [pacienteId+fecha] → el plan vigente de un paciente en una fecha determinada.
   */
  planes: 'id, pacienteId, fecha, sincronizado, [pacienteId+fecha]',

  /**
   * PRODUCTOS — catálogo de alimentos/suplementos (reemplaza `alimentos` v1).
   * categoria → filtros por grupo alimentario.
   */
  productos: 'id, nombre, categoria',

  /**
   * OUTBOX v3 — cola de sincronización diferida (patrón at-least-once).
   * Campos renombrados respecto a v1: tabla/accion/datos en lugar de entidad/tipo/payload.
   * estado sigue indexado para filtrar pendientes / errores en O(log n).
   */
  outbox: 'id, tabla, accion, timestamp, estado',

}).upgrade(async (tx) => {
  /**
   * Limpieza de tablas con cambios de schema incompatibles.
   *
   * · planes   — PK cambia de auto-increment entero a UUID string;
   *              los registros v1/v2 (sin pacienteId) quedarían huérfanos.
   * · outbox   — PK y nombres de campos cambian completamente.
   * · pacientes — PK cambia de entero a UUID; no hay datos de producción.
   *
   * alimentos / registros / progreso / usuario no se tocan.
   */
  await Promise.all([
    tx.table('planes').clear(),
    tx.table('outbox').clear(),
    tx.table('pacientes').clear(),
  ])
})

// ─── Seed en primera instalación ─────────────────────────────────────────────

db.on('populate', async (tx) => {
  await tx.table('usuario').add({
    id: 'local',
    nombre: '',
    email: '',
    creadoEn: new Date().toISOString(),
    configuracion: {
      caloriasObjetivo: 2000,
      proteinas:        150,   // g
      carbohidratos:    200,   // g
      grasas:           65,    // g
      agua:             2000,  // ml
      unidadPeso:       'kg',
      idioma:           'es',
    },
  })
})

// ─── Generador de IDs ─────────────────────────────────────────────────────────

/**
 * Genera un UUID v4 estándar usando la Crypto API del browser/Node.
 * Úsalo como PK en pacientes, historias, turnos, planes, productos y outbox.
 *
 * @returns {string} UUID v4 (ej: "550e8400-e29b-41d4-a716-446655440000")
 */
export const genId = () => crypto.randomUUID()

// ─── Background Sync ──────────────────────────────────────────────────────────

/**
 * Registra el tag 'sync-outbox' en el Service Worker.
 * Si Background Sync API no está disponible (iOS < 16.4, HTTP) falla
 * silenciosamente — el flush ocurrirá cuando el usuario vuelva a abrir la app.
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
 *   const id = await db.pacientes.add({ id: genId(), nombre: 'Ana', … })
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
//
// Mantiene la interfaz de la v1 para que useNutricionStore y PacienteForm
// puedan llamar outbox.encolar() / outbox.flush() / outbox.registrarSync()
// sin cambios. Internamente delega en queueSyncTask y el nuevo schema.
//
// ─────────────────────────────────────────────────────────────────────────────

class Outbox {
  /** @returns {Dexie.Table} */
  get tabla() {
    return db.outbox
  }

  /**
   * Compatibilidad con código v1/v2.
   * Delega en queueSyncTask mapeando los argumentos al nuevo schema.
   *
   * @param {'CREATE'|'UPDATE'|'DELETE'} tipo
   * @param {string}        entidad    Nombre de la tabla afectada
   * @param {number|string} entidadId  PK del registro
   * @param {object|null}   payload    Datos completos
   * @returns {Promise<string>} UUID del ítem en outbox
   */
  async encolar(tipo, entidad, entidadId, payload) {
    const datos = payload
      ? { ...payload, id: payload.id ?? entidadId }
      : { id: entidadId }
    return queueSyncTask(entidad, tipo, datos)
  }

  /**
   * Items pendientes de procesar, ordenados por antigüedad.
   * @returns {Promise<object[]>}
   */
  async pendientes() {
    return this.tabla
      .where('estado').anyOf(['pendiente', 'procesando'])
      .sortBy('timestamp')
  }

  /**
   * Items que superaron MAX_INTENTOS (requieren revisión manual).
   * @returns {Promise<object[]>}
   */
  async fallidos() {
    return this.tabla
      .where('estado').equals('error')
      .sortBy('timestamp')
  }

  /** Marca el ítem como en proceso (evita doble-procesamiento concurrente). */
  async procesando(id) {
    return this.tabla.update(id, { estado: 'procesando' })
  }

  /** Marca el ítem como completado exitosamente. */
  async completar(id) {
    return this.tabla.update(id, { estado: 'completado' })
  }

  /**
   * Marca el ítem como fallido e incrementa intentos.
   * Después de MAX_INTENTOS pasa a 'error' para revisión manual.
   */
  async fallar(id, mensajeError = '') {
    const item = await this.tabla.get(id)
    if (!item) return
    const intentos    = (item.intentos ?? 0) + 1
    const MAX_INTENTOS = 5
    return this.tabla.update(id, {
      estado:      intentos >= MAX_INTENTOS ? 'error' : 'pendiente',
      intentos,
      ultimoError: mensajeError,
    })
  }

  /**
   * Procesa todos los ítems pendientes con la función apiFn provista.
   * Si apiFn rechaza, el ítem se marca como fallido y se continúa con el siguiente.
   * Expone tanto las propiedades v3 (tabla/accion/datos) como alias v1
   * (entidad/tipo/payload) para máxima compatibilidad.
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
          // Schema v3
          ...item,
          datos: datosParseados,
          // Aliases v1 para compatibilidad con código existente
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

  /**
   * Registra Background Sync en el SW.
   * Alias público para compatibilidad con código que llama outbox.registrarSync().
   */
  async registrarSync() {
    await registrarBackgroundSync()
  }

  /**
   * Elimina ítems completados con más de `diasAntiguedad` días.
   * Llamar periódicamente para no inflar el IndexedDB.
   *
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
