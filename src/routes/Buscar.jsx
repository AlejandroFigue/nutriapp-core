import { useState, useDeferredValue } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import db from '@/db/database'

const MIN_CHARS = 2

async function buscarAlimentos(query) {
  if (query.length < MIN_CHARS) return []
  return db.alimentos
    .where('nombre')
    .startsWithIgnoreCase(query.trim())
    .limit(50)
    .toArray()
}

export default function Buscar() {
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const navigate = useNavigate()

  const { data: resultados = [], isFetching } = useQuery({
    queryKey: ['alimentos', deferredQuery],
    queryFn: () => buscarAlimentos(deferredQuery),
    enabled: deferredQuery.length >= MIN_CHARS,
    staleTime: Infinity, // datos locales de Dexie, nunca stale
    gcTime: Infinity,
  })

  const sinResultados = deferredQuery.length >= MIN_CHARS && !isFetching && resultados.length === 0

  return (
    <main style={{ padding: 'var(--space-4)' }}>
      <header style={{ marginBottom: 'var(--space-4)' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, marginBottom: 'var(--space-3)' }}>
          Buscar Alimento
        </h1>

        <div style={{ position: 'relative' }}>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Escribe al menos 2 caracteres…"
            aria-label="Buscar alimento en la base de datos local"
            autoComplete="off"
            autoFocus
            style={{
              width: '100%',
              padding: 'var(--space-3) var(--space-4)',
              paddingInlineEnd: isFetching ? 'var(--space-10)' : 'var(--space-4)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              color: 'var(--color-text-high)',
              fontSize: 'var(--text-base)',
            }}
          />
          {isFetching && (
            <span
              aria-hidden
              style={{
                position: 'absolute',
                insetInlineEnd: 'var(--space-3)',
                insetBlockStart: '50%',
                transform: 'translateY(-50%)',
                width: '18px',
                height: '18px',
                border: '2px solid var(--color-border)',
                borderTopColor: 'var(--color-primary)',
                borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
                display: 'block',
              }}
            />
          )}
        </div>
      </header>

      {query.length > 0 && query.length < MIN_CHARS && (
        <p style={{ color: 'var(--color-text-low)', fontSize: 'var(--text-sm)' }}>
          Escribe al menos {MIN_CHARS} caracteres para buscar.
        </p>
      )}

      {sinResultados && (
        <p style={{ color: 'var(--color-text-low)', fontSize: 'var(--text-sm)' }}>
          No se encontraron alimentos con "{deferredQuery}".
        </p>
      )}

      {resultados.length > 0 && (
        <ul
          role="listbox"
          aria-label="Resultados de búsqueda"
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}
        >
          {resultados.map((alimento) => (
            <li
              key={alimento.id}
              role="option"
              aria-selected="false"
              onClick={() => navigate('/registrar', { state: { alimento } })}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 'var(--space-3) var(--space-4)',
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-sm)',
                cursor: 'pointer',
                transition: 'background var(--transition-fast)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-raised)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-surface)'}
            >
              <div>
                <span style={{ fontWeight: 500 }}>{alimento.nombre}</span>
                {alimento.categorias?.length > 0 && (
                  <span style={{
                    display: 'block',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-text-low)',
                    marginTop: '2px',
                  }}>
                    {alimento.categorias.join(' · ')}
                  </span>
                )}
              </div>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-mid)', whiteSpace: 'nowrap' }}>
                {alimento.calorias ?? '—'} kcal/100g
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
