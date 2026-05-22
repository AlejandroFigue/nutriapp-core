import { useEffect, useState } from 'react'
import db from '@/db/database'

const TIPOS = ['peso', 'cintura', 'cadera', 'cuello', 'grasa_corporal']

export default function Progreso() {
  const [registros, setRegistros] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    db.progreso
      .orderBy('fecha')
      .reverse()
      .limit(90)
      .toArray()
      .then((data) => setRegistros(data))
      .finally(() => setCargando(false))
  }, [])

  const porTipo = TIPOS.reduce((acc, tipo) => {
    acc[tipo] = registros.filter((r) => r.tipo === tipo)
    return acc
  }, {})

  const ultimo = (tipo) => porTipo[tipo]?.[0]

  return (
    <main style={{ padding: 'var(--space-4)' }}>
      <header style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>Mi Progreso</h1>
      </header>

      {cargando ? (
        <p style={{ color: 'var(--color-text-low)' }}>Cargando…</p>
      ) : (
        <>
          {/* Último registro por tipo */}
          <section aria-label="Últimas mediciones" style={{ marginBottom: 'var(--space-8)' }}>
            <h2 style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-mid)', marginBottom: 'var(--space-3)' }}>
              ÚLTIMA MEDICIÓN
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)' }}>
              {TIPOS.map((tipo) => {
                const r = ultimo(tipo)
                return (
                  <div
                    key={tipo}
                    style={{
                      background: 'var(--color-surface)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-4)',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    <span style={{
                      display: 'block',
                      fontSize: 'var(--text-xs)',
                      color: 'var(--color-text-mid)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: 'var(--space-1)',
                    }}>
                      {tipo.replace('_', ' ')}
                    </span>
                    <span style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>
                      {r ? `${r.valor} ${r.unidad ?? ''}` : '—'}
                    </span>
                    {r && (
                      <time
                        dateTime={r.fecha}
                        style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-text-low)', marginTop: 'var(--space-1)' }}
                      >
                        {new Date(r.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                      </time>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          {/* Historial reciente */}
          <section aria-label="Historial">
            <h2 style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-mid)', marginBottom: 'var(--space-3)' }}>
              HISTORIAL (ÚLTIMOS 90 DÍAS)
            </h2>
            {registros.length === 0 ? (
              <p style={{ color: 'var(--color-text-low)', fontSize: 'var(--text-sm)' }}>
                Aún no hay registros. Empieza a trackear tu progreso.
              </p>
            ) : (
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {registros.map((r) => (
                  <li
                    key={r.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: 'var(--space-3) var(--space-4)',
                      background: 'var(--color-surface)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--text-sm)',
                    }}
                  >
                    <span style={{ textTransform: 'capitalize' }}>{r.tipo.replace('_', ' ')}</span>
                    <span style={{ fontWeight: 600 }}>{r.valor} {r.unidad ?? ''}</span>
                    <time dateTime={r.fecha} style={{ color: 'var(--color-text-low)' }}>
                      {new Date(r.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  )
}
