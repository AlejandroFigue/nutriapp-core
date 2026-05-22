import Dexie from 'dexie'

// ─── Schema ───────────────────────────────────────────────────────────────────

const db = new Dexie('NutriAppDB')

db.version(1).stores({
  /**
   * Catálogo de alimentos (local + sincronizado desde API externa).
   * *categorias → índice multi-entrada para filtrar por categoría.
   * [fuente+fuenteId] → índice compuesto para upsert desde fuente externa
   *   sin duplicar registros.
   */
  alimentos: '++id, nombre, *categorias, codigoBarras, fuente, [fuente+fuenteId]',

  /**
   * Diario de comidas.
   * [fecha+tipoComida] → índice compuesto para traer todos los registros
   *   de un día y tipo de comida en una sola query.
   * sincronizado → permite filtrar pendientes de sync sin outbox.
   */
  registros: '++id, fecha, tipoComida, alimentoId, [fecha+tipoComida], sincronizado',

  /**
   * Plan nutricional diario (objetivos de macros y calorías por día).
   * &fecha → único: un plan por día.
   */
  planes: '++id, &fecha',

  /**
   * Registro de progreso corporal (peso, medidas, etc.).
   * [fecha+tipo] → índice compuesto para obtener todos los valores
   *   de un tipo en un rango de fechas.
   */
  progreso: '++id, fecha, tipo, [fecha+tipo]',

  /**
   * Perfil del usuario. Registro único con id fijo 'local'.
   * &id → PK único (no autoincrement).
   */
  usuario: '&id',

  /**
   * Cola de sincronización diferida (outbox pattern).
   * estado → filtra pendientes/error para el flush.
   * timestamp → ordena por antigüedad al procesar.
   */
  outbox: '++id, estado, entidad, entidadId, timestamp',
})

/**
 * v2 — agrega la tabla de pacientes (profesional gestiona múltiples pacientes).
 * Solo se declaran tablas nuevas/modificadas; el resto persiste de v1.
 */
db.version(2).stores({
  pacientes:
    '++id, nombre, apellido, email, sincronizado, creadoEn',
})

// Seed inicial en primera instalación
db.on('populate', async (tx) => {
  await tx.table('usuario').add({
    id: 'local',
    nombre: '',
    email: '',
    creadoEn: new Date().toISOString(),
    configuracion: {
      caloriasObjetivo: 2000,
      proteinas: 150,   // g
      carbohidratos: 200, // g
      grasas: 65,       // g
      agua: 2000,       // ml
      unidadPeso: 'kg',
      idioma: 'es',
    },
  })
})

// ─── Outbox ───────────────────────────────────────────────────────────────────

/**
 * Gestiona la cola de operaciones pendientes de sincronizar con el servidor.
 * Implementa el patrón Outbox para garantizar entrega at-least-once
 * cuando la conexión se recupera.
 *
 * Flujo:
 *   agregarRegistro() → outbox.encolar('CREATE', 'registros', id, payload)
 *                     → outbox.registrarSync()    ← pide Background Sync al SW
 *   [reconexión]      → SW dispara 'sync-outbox' → postMessage FLUSH_OUTBOX
 *                     → app llama outbox.flush(apiFn)
 */
class Outbox {
  /** @returns {Dexie.Table} */
  get tabla() {
    return db.outbox
  }

  /**
   * Agrega una operación a la cola.
   * @param {'CREATE'|'UPDATE'|'DELETE'} tipo
   * @param {string} entidad  Nombre de la tabla Dexie afectada
   * @param {number|string} entidadId  PK del registro afectado
   * @param {object|null} payload  Datos completos para reenviar al servidor
   * @returns {Promise<number>} id del item en outbox
   */
  async encolar(tipo, entidad, entidadId, payload) {
    return this.tabla.add({
      tipo,
      entidad,
      entidadId,
      payload: payload ? JSON.stringify(payload) : null,
      timestamp: Date.now(),
      estado: 'pendiente',
      intentos: 0,
      ultimoError: null,
    })
  }

  /** @returns {Promise<object[]>} Items en estado 'pendiente', orden cronológico */
  async pendientes() {
    return this.tabla
      .where('estado')
      .equals('pendiente')
      .sortBy('timestamp')
  }

  /** @returns {Promise<object[]>} Items en estado 'error' (reintentos manuales) */
  async fallidos() {
    return this.tabla
      .where('estado')
      .equals('error')
      .sortBy('timestamp')
  }

  /** Marca un item como en proceso (evita doble procesamiento) */
  async procesando(id) {
    return this.tabla.update(id, { estado: 'procesando' })
  }

  /** Marca un item como completado */
  async completar(id) {
    return this.tabla.update(id, { estado: 'completado' })
  }

  /**
   * Marca un item como fallido e incrementa el contador de intentos.
   * Después de MAX_INTENTOS queda en 'error' para revisión manual.
   */
  async fallar(id, mensajeError = '') {
    const item = await this.tabla.get(id)
    if (!item) return
    const intentos = (item.intentos ?? 0) + 1
    const MAX_INTENTOS = 5
    return this.tabla.update(id, {
      estado: intentos >= MAX_INTENTOS ? 'error' : 'pendiente',
      intentos,
      ultimoError: mensajeError,
    })
  }

  /**
   * Procesa todos los items pendientes usando la función `apiFn` provista.
   * `apiFn` recibe el item y debe retornar una Promise; si rechaza, el item
   * se marca como fallido y se continúa con el siguiente.
   *
   * @param {(item: object) => Promise<void>} apiFn  Función que llama al servidor
   * @returns {Promise<{completados: number, fallidos: number}>}
   */
  async flush(apiFn) {
    const items = await this.pendientes()
    let completados = 0
    let fallidos = 0

    for (const item of items) {
      try {
        await this.procesando(item.id)
        await apiFn({
          ...item,
          payload: item.payload ? JSON.parse(item.payload) : null,
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
   * Registra el tag de Background Sync en el Service Worker.
   * Si la API no está disponible (iOS < 16.4, contexto no seguro) falla
   * silenciosamente — el flush ocurrirá la próxima vez que la app esté online
   * y el usuario interactúe.
   */
  async registrarSync() {
    if (!('serviceWorker' in navigator) || !('SyncManager' in window)) return
    try {
      const registration = await navigator.serviceWorker.ready
      await registration.sync.register('sync-outbox')
    } catch {
      // Background Sync no disponible en este entorno
    }
  }

  /** Limpia items completados con más de N días de antigüedad */
  async limpiar(diasAntiguedad = 30) {
    const corte = Date.now() - diasAntiguedad * 24 * 60 * 60 * 1000
    return this.tabla
      .where('estado')
      .equals('completado')
      .and((item) => item.timestamp < corte)
      .delete()
  }
}

export const outbox = new Outbox()
export { db }
export default db
