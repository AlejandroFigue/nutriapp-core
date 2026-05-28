/**
 * syncService.js — NutriApp Profesional
 *
 * Sincronización atómica del outbox Dexie → FastAPI /api/sync.
 * El token Google (ID token) vive en sessionStorage: expira con la pestaña,
 * nunca toca localStorage para reducir la superficie XSS.
 */
import db from '@/db/database'

const TOKEN_KEY = 'nutriapp:gtoken'

// Tablas que el servidor acepta en /api/sync (ver MAPA_MODELOS en main.py)
const TABLAS_SINCRONIZABLES = new Set(['pacientes', 'historias', 'turnos', 'planes'])

// ─── Token Google ─────────────────────────────────────────────────────────────

export const guardarToken  = (idToken) => sessionStorage.setItem(TOKEN_KEY, idToken)
export const leerToken     = ()          => sessionStorage.getItem(TOKEN_KEY)
export const borrarToken   = ()          => sessionStorage.removeItem(TOKEN_KEY)

// ─── Sincronización ───────────────────────────────────────────────────────────

/**
 * Envía todos los ítems pendientes del outbox al servidor en un único lote
 * atómico. Si el servidor confirma éxito, limpia los ítems de la cola local.
 *
 * @throws {Error} Si no hay token, la red falla, o el servidor rechaza el lote.
 * @returns {Promise<{status: string, synced_ids: string[], processed_items: number}>}
 */
export async function sincronizar() {
  const token = leerToken()
  if (!token) throw new Error('Sin sesión: iniciá sesión con Google antes de sincronizar')

  // 1 — Leer pendientes del outbox, filtrar solo tablas que el servidor conoce
  const pendientes = await db.outbox
    .where('estado').anyOf(['pendiente', 'procesando'])
    .sortBy('timestamp')

  const cola = pendientes
    .filter((item) => TABLAS_SINCRONIZABLES.has(item.tabla))
    .map((item) => ({
      id:        item.id,
      tabla:     item.tabla,
      accion:    item.accion,
      datos:     item.datos ? JSON.parse(item.datos) : {},
      timestamp: item.timestamp,
    }))

  if (cola.length === 0) {
    return { status: 'noop', synced_ids: [], processed_items: 0 }
  }

  // 2 — Enviar lote atómico al servidor
  const res = await fetch('/api/sync', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ queue: cola }),
  })

  if (!res.ok) {
    const detalle = await res.text().catch(() => res.statusText)
    throw new Error(`Error del servidor (${res.status}): ${detalle}`)
  }

  const resultado = await res.json()

  // 3 — Limpiar cola local solo si el servidor confirmó éxito
  const outboxIds = pendientes.map((i) => i.id)
  await db.outbox.where('id').anyOf(outboxIds).delete()

  return resultado
}
