/**
 * database.js — NutriApp Profesional (Dexie 4.x)
 *
 * Cadena de versiones inmutable — NUNCA modificar una versión ya deployada:
 *
 *   v1  Baseline inicial
 *   v2  Esquema profesional completo con índices compuestos
 *   v3  Seed idempotente de productos de Posadas, Misiones
 *   v4  Índice `origen` + re-verificación del seed
 *
 * UpgradeError guard:
 *   Si la apertura de la DB falla por inconsistencia de esquema o versión,
 *   se elimina la base de datos y se recarga la página para reinicializar.
 *
 * Campos de costo regional (Posadas, CP 3300):
 *   precioRef        ARS del paquete de referencia
 *   cantidadRefGramo Peso/volumen de ese paquete en g o ml
 *   origen           Punto de venta donde se relevó el precio
 */

import Dexie from 'dexie'

// ── Seed de productos — Posadas, Misiones ─────────────────────────────────────

export const PRODUCTOS_SEED_POSADAS = [
  // Almacén — Hipermercado Libertad / ChangoMás
  { id: 'seed-arroz-blanco',     nombre: 'Arroz blanco',       categoria: 'cereales',  precioRef: 1200, cantidadRefGramo: 1000, origen: 'Hipermercado Libertad' },
  { id: 'seed-arroz-integral',   nombre: 'Arroz integral',     categoria: 'cereales',  precioRef: 1400, cantidadRefGramo: 1000, origen: 'Hipermercado Libertad' },
  { id: 'seed-avena',            nombre: 'Avena',              categoria: 'cereales',  precioRef:  950, cantidadRefGramo:  500, origen: 'Hipermercado Libertad' },
  { id: 'seed-fideos',           nombre: 'Fideos',             categoria: 'cereales',  precioRef:  800, cantidadRefGramo:  500, origen: 'Hipermercado Libertad' },
  { id: 'seed-harina',           nombre: 'Harina',             categoria: 'cereales',  precioRef:  700, cantidadRefGramo: 1000, origen: 'Hipermercado Libertad' },
  { id: 'seed-pan-lactal',       nombre: 'Pan lactal',         categoria: 'panaderia', precioRef:  900, cantidadRefGramo:  400, origen: 'Hipermercado Libertad' },
  { id: 'seed-leche-entera',     nombre: 'Leche entera',       categoria: 'lacteos',   precioRef: 1100, cantidadRefGramo: 1000, origen: 'Hipermercado Libertad' },
  { id: 'seed-leche-descremada', nombre: 'Leche descremada',   categoria: 'lacteos',   precioRef: 1150, cantidadRefGramo: 1000, origen: 'Hipermercado Libertad' },
  { id: 'seed-yogur-natural',    nombre: 'Yogur natural',      categoria: 'lacteos',   precioRef:  750, cantidadRefGramo:  190, origen: 'Hipermercado Libertad' },
  { id: 'seed-yogur-griego',     nombre: 'Yogur griego',       categoria: 'lacteos',   precioRef:  980, cantidadRefGramo:  150, origen: 'Hipermercado Libertad' },
  { id: 'seed-aceite',           nombre: 'Aceite',             categoria: 'grasas',    precioRef: 1800, cantidadRefGramo: 1000, origen: 'Hipermercado Libertad' },
  { id: 'seed-azucar',           nombre: 'Azúcar',             categoria: 'varios',    precioRef:  900, cantidadRefGramo: 1000, origen: 'Hipermercado Libertad' },
  { id: 'seed-pure-tomates',     nombre: 'Puré de tomates',    categoria: 'varios',    precioRef:  600, cantidadRefGramo:  520, origen: 'Hipermercado Libertad' },
  { id: 'seed-atun',             nombre: 'Atún',               categoria: 'proteinas', precioRef: 1100, cantidadRefGramo:  170, origen: 'Hipermercado Libertad' },
  { id: 'seed-frutos-secos',     nombre: 'Frutos secos',       categoria: 'snacks',    precioRef: 2400, cantidadRefGramo:  250, origen: 'Hipermercado Libertad' },
  // Frescos — Mercado Central de Misiones (+30 % minorista incluido)
  { id: 'seed-pechuga-pollo',    nombre: 'Pechuga de pollo',   categoria: 'proteinas', precioRef: 2990, cantidadRefGramo: 1000, origen: 'Mercado Central Misiones' },
  { id: 'seed-pollo',            nombre: 'Pollo',              categoria: 'proteinas', precioRef: 2470, cantidadRefGramo: 1000, origen: 'Mercado Central Misiones' },
  { id: 'seed-carne-molida',     nombre: 'Carne molida',       categoria: 'proteinas', precioRef: 3380, cantidadRefGramo: 1000, origen: 'Mercado Central Misiones' },
  { id: 'seed-salmon',           nombre: 'Salmón',             categoria: 'proteinas', precioRef: 5200, cantidadRefGramo: 1000, origen: 'Mercado Central Misiones' },
  { id: 'seed-huevos',           nombre: 'Huevos',             categoria: 'proteinas', precioRef: 1950, cantidadRefGramo:  600, origen: 'Mercado Central Misiones' },
  { id: 'seed-tomate',           nombre: 'Tomate',             categoria: 'verduras',  precioRef: 1300, cantidadRefGramo: 1000, origen: 'Mercado Central Misiones' },
  { id: 'seed-lechuga',          nombre: 'Lechuga',            categoria: 'verduras',  precioRef:  780, cantidadRefGramo:  300, origen: 'Mercado Central Misiones' },
  { id: 'seed-zanahoria',        nombre: 'Zanahoria',          categoria: 'verduras',  precioRef:  780, cantidadRefGramo: 1000, origen: 'Mercado Central Misiones' },
  { id: 'seed-zapallo',          nombre: 'Zapallo',            categoria: 'verduras',  precioRef:  520, cantidadRefGramo: 1000, origen: 'Mercado Central Misiones' },
  { id: 'seed-vegetales',        nombre: 'Vegetales mixtos',   categoria: 'verduras',  precioRef:  900, cantidadRefGramo: 1000, origen: 'Mercado Central Misiones' },
  { id: 'seed-manzana',          nombre: 'Manzana',            categoria: 'frutas',    precioRef: 1170, cantidadRefGramo: 1000, origen: 'Mercado Central Misiones' },
  { id: 'seed-banana',           nombre: 'Banana',             categoria: 'frutas',    precioRef:  910, cantidadRefGramo: 1000, origen: 'Mercado Central Misiones' },
  { id: 'seed-naranja',          nombre: 'Naranja',            categoria: 'frutas',    precioRef:  845, cantidadRefGramo: 1000, origen: 'Mercado Central Misiones' },
]

// ── Instancia Dexie ───────────────────────────────────────────────────────────

const NOMBRE_DB = 'NutriAppDB'
const db = new Dexie(NOMBRE_DB)

// ── v1: Baseline inicial ──────────────────────────────────────────────────────
db.version(1).stores({
  pacientes:  'id, nombre, email, telefono',
  historias:  'id, pacienteId, fecha',
  turnos:     'id, pacienteId, fecha, hora, estado',
  planes:     'id, pacienteId, fecha',
  plantillas: 'id, nombre_plantilla',
  productos:  'id, nombre, categoria',
  outbox:     'id, tabla, accion, timestamp, estado',
})

// ── v2: Esquema profesional completo ─────────────────────────────────────────
db.version(2).stores({
  pacientes:  'id, nombre, email, telefono, sincronizado',
  historias:  'id, pacienteId, fecha, imc, sincronizado, [pacienteId+fecha]',
  turnos:     'id, pacienteId, fecha, hora, estado, sincronizado, [pacienteId+fecha]',
  planes:     'id, pacienteId, fecha, sincronizado, [pacienteId+fecha]',
  plantillas: 'id, nombre_plantilla',
  productos:  'id, nombre, categoria',
  outbox:     'id, tabla, accion, datos, timestamp, estado',
})

// ── v3: Seed idempotente ──────────────────────────────────────────────────────
db.version(3).upgrade(async (tx) => {
  const count = await tx.table('productos').count()
  if (count === 0) {
    await tx.table('productos').bulkAdd(PRODUCTOS_SEED_POSADAS)
  }
})

// ── v4: Índice `origen` + re-verificación de seed ────────────────────────────
db.version(4).stores({
  productos: 'id, nombre, categoria, origen',
}).upgrade(async (tx) => {
  const count = await tx.table('productos').count()
  if (count === 0) {
    await tx.table('productos').bulkAdd(PRODUCTOS_SEED_POSADAS)
  }
})

// ── v5: Historial de sugerencias clínicas aplicadas ───────────────────────────
db.version(5).stores({
  clinicalSuggestions: 'id, pacienteId, suggestionId, status, appliedAt, [pacienteId+status]',
})

// Instalaciones nuevas — populate reemplaza los hooks de upgrade
db.on('populate', async () => {
  await db.productos.bulkAdd(PRODUCTOS_SEED_POSADAS)
})

// ── UpgradeError guard ────────────────────────────────────────────────────────
// Si la apertura falla por esquema corrupto o conflicto de versión,
// se elimina la base de datos local y se recarga la página.
db.open().catch(async (err) => {
  const isFatal =
    err.name === 'UpgradeError'      ||
    err.name === 'InvalidStateError' ||
    err.name === 'VersionError'      ||
    String(err.message).includes('UpgradeError')

  if (!isFatal) return

  console.warn(
    '[NutriAppDB] Error de versión — eliminando base de datos y reinicializando…',
    err.message,
  )

  try {
    await Dexie.delete(NOMBRE_DB)
  } catch {
    try { indexedDB.deleteDatabase(NOMBRE_DB) } catch { /* noop */ }
  }

  window.location.reload()
})

// ── Generador de IDs ──────────────────────────────────────────────────────────

export const genId = () => crypto.randomUUID()

// ── Background Sync ───────────────────────────────────────────────────────────

async function registrarBackgroundSync() {
  if (!('serviceWorker' in navigator) || !('SyncManager' in window)) return
  try {
    const reg = await navigator.serviceWorker.ready
    await reg.sync.register('sync-outbox')
  } catch {
    // Background Sync no disponible (HTTP, Safari, o SW no registrado aún)
  }
}

// ── queueSyncTask ─────────────────────────────────────────────────────────────

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

// ── Clase Outbox ──────────────────────────────────────────────────────────────

class Outbox {
  get tabla() {
    return db.outbox
  }

  async encolar(tipo, entidad, entidadId, payload) {
    const datos = payload
      ? { ...payload, id: payload.id ?? entidadId }
      : { id: entidadId }
    return queueSyncTask(entidad, tipo, datos)
  }

  async pendientes() {
    return this.tabla
      .where('estado').anyOf(['pendiente', 'procesando'])
      .sortBy('timestamp')
  }

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

  async registrarSync() {
    await registrarBackgroundSync()
  }

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
