import { useEffect } from 'react'
import { useNutricionStore, selectMacrosDia } from '@/store/useNutricionStore'
import { useShallow } from 'zustand/react/shallow'

const TIPOS_COMIDA = ['desayuno', 'almuerzo', 'merienda', 'cena', 'snack']

export default function Plan() {
  const fechaActiva  = useNutricionStore((s) => s.fechaActiva)
  const registrosDia = useNutricionStore((s) => s.registrosDia)
  const planDia      = useNutricionStore((s) => s.planDia)
  const cargando     = useNutricionStore((s) => s.cargando)
  const cargarDiario = useNutricionStore((s) => s.cargarDiario)
  const macros       = useNutricionStore(useShallow(selectMacrosDia))

  useEffect(() => {
    cargarDiario(fechaActiva)
  }, [fechaActiva, cargarDiario])

  const registrosPorTipo = TIPOS_COMIDA.reduce((acc, tipo) => {
    acc[tipo] = registrosDia.filter((r) => r.tipoComida === tipo)
    return acc
  }, {})

  return (
    <main style={{ padding: 'var(--space-4)' }}>
      <header style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>
          Plan del Día
        </h1>
        <time dateTime={fechaActiva} style={{ color: 'var(--color-text-mid)' }}>
          {new Date(fechaActiva + 'T12:00:00').toLocaleDateString('es-AR', {
            weekday: 'long', day: 'numeric', month: 'long',
          })}
        </time>
      </header>

      {/* Resumen de macros */}
      <section aria-label="Resumen nutricional" style={{ marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-mid)', marginBottom: 'var(--space-2)' }}>
          CONSUMIDO HOY
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-2)' }}>
          {[
            { label: 'Calorías', value: macros.calorias, unidad: 'kcal' },
            { label: 'Proteínas', value: macros.proteinas, unidad: 'g' },
            { label: 'Carbos', value: macros.carbohidratos, unidad: 'g' },
            { label: 'Grasas', value: macros.grasas, unidad: 'g' },
          ].map(({ label, value, unidad }) => (
            <div
              key={label}
              style={{
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-3)',
                textAlign: 'center',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <span style={{ display: 'block', fontSize: 'var(--text-xl)', fontWeight: 700 }}>
                {Math.round(value)}
              </span>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-mid)' }}>
                {label} ({unidad})
              </span>
            </div>
          ))}
        </div>

        {planDia && (
          <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--color-text-mid)' }}>
            Objetivo: {planDia.configuracion?.caloriasObjetivo ?? '—'} kcal
          </p>
        )}
      </section>

      {/* Comidas del día */}
      {cargando ? (
        <p style={{ color: 'var(--color-text-low)' }}>Cargando…</p>
      ) : (
        <section aria-label="Comidas del día">
          {TIPOS_COMIDA.map((tipo) => (
            <details key={tipo} open={registrosPorTipo[tipo].length > 0} style={{ marginBottom: 'var(--space-3)' }}>
              <summary style={{
                cursor: 'pointer',
                padding: 'var(--space-3) var(--space-4)',
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                textTransform: 'capitalize',
                userSelect: 'none',
              }}>
                {tipo}
                <span style={{ marginLeft: 'var(--space-2)', color: 'var(--color-text-low)', fontWeight: 400 }}>
                  ({registrosPorTipo[tipo].length} ítem{registrosPorTipo[tipo].length !== 1 ? 's' : ''})
                </span>
              </summary>

              {registrosPorTipo[tipo].length === 0 ? (
                <p style={{ padding: 'var(--space-3)', color: 'var(--color-text-low)', fontSize: 'var(--text-sm)' }}>
                  Sin registros
                </p>
              ) : (
                <ul style={{ paddingBlock: 'var(--space-2)' }}>
                  {registrosPorTipo[tipo].map((r) => (
                    <li key={r.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: 'var(--space-2) var(--space-4)',
                      fontSize: 'var(--text-sm)',
                    }}>
                      <span>{r.nombreAlimento ?? `Alimento #${r.alimentoId}`}</span>
                      <span style={{ color: 'var(--color-text-mid)' }}>
                        {r.cantidad}{r.unidad} · {Math.round(r.calorias ?? 0)} kcal
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </details>
          ))}
        </section>
      )}
    </main>
  )
}
