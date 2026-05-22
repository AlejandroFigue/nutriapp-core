import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import db, { outbox } from '@/db/database'

const fechaHoy = () => new Date().toISOString().slice(0, 10)

export const useNutricionStore = create(
  subscribeWithSelector((set, get) => ({

    // ─── Estado ──────────────────────────────────────────────────────────────
    fechaActiva: fechaHoy(),
    registrosDia: [],   // Entradas del diario para fechaActiva
    planDia: null,      // Objetivos nutricionales del día
    cargando: false,

    // ─── Navegación temporal ──────────────────────────────────────────────
    setFechaActiva: async (fecha) => {
      set({ fechaActiva: fecha })
      await get().cargarDiario(fecha)
    },

    // ─── Lectura ──────────────────────────────────────────────────────────
    cargarDiario: async (fecha) => {
      const f = fecha ?? get().fechaActiva
      set({ cargando: true })
      try {
        const [registros, plan] = await Promise.all([
          db.registros.where('fecha').equals(f).toArray(),
          db.planes.where('fecha').equals(f).first(),
        ])
        set({ registrosDia: registros, planDia: plan ?? null })
      } finally {
        set({ cargando: false })
      }
    },

    // ─── Mutaciones (escriben local + encolan en outbox) ──────────────────

    agregarRegistro: async (registro) => {
      const payload = {
        ...registro,
        fecha: get().fechaActiva,
        sincronizado: 0,
        creadoEn: new Date().toISOString(),
      }
      const id = await db.registros.add(payload)
      await outbox.encolar('CREATE', 'registros', id, { ...payload, id })
      await outbox.registrarSync()
      await get().cargarDiario()
    },

    eliminarRegistro: async (id) => {
      await db.registros.delete(id)
      await outbox.encolar('DELETE', 'registros', id, null)
      await outbox.registrarSync()
      await get().cargarDiario()
    },

    actualizarRegistro: async (id, cambios) => {
      await db.registros.update(id, { ...cambios, sincronizado: 0 })
      await outbox.encolar('UPDATE', 'registros', id, { id, ...cambios })
      await outbox.registrarSync()
      await get().cargarDiario()
    },

    // ─── Sincronización ───────────────────────────────────────────────────
    // Disparado desde main.jsx al recibir postMessage del SW ('FLUSH_OUTBOX')
    // o desde OfflineBanner cuando la red se recupera.
    flushOutbox: async () => {
      const { completados, fallidos } = await outbox.flush(async (item) => {
        // TODO: reemplazar con el cliente HTTP real una vez definida la API REST
        // Ejemplo de integración:
        //   const { tipo, entidad, payload } = item
        //   if (tipo === 'CREATE') await api.post(`/${entidad}`, payload)
        //   if (tipo === 'UPDATE') await api.put(`/${entidad}/${item.entidadId}`, payload)
        //   if (tipo === 'DELETE') await api.delete(`/${entidad}/${item.entidadId}`)
        throw new Error('API client pendiente de implementar')
      })
      console.info(`[Outbox] Flush completado — OK: ${completados}, Error: ${fallidos}`)
    },
  }))
)

// ─── Selectores ───────────────────────────────────────────────────────────────

/**
 * Suma de macros y calorías del día activo.
 * Usar con useShallow para estabilidad referencial:
 *   import { useShallow } from 'zustand/react/shallow'
 *   const macros = useNutricionStore(useShallow(selectMacrosDia))
 */
export const selectMacrosDia = (state) =>
  state.registrosDia.reduce(
    (acc, r) => ({
      calorias:      acc.calorias      + (r.calorias      ?? 0),
      proteinas:     acc.proteinas     + (r.proteinas     ?? 0),
      carbohidratos: acc.carbohidratos + (r.carbohidratos ?? 0),
      grasas:        acc.grasas        + (r.grasas        ?? 0),
    }),
    { calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0 }
  )
