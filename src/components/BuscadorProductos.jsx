/**
 * BuscadorProductos.jsx — Buscador de alimentos con panel flotante blur
 *
 * Características:
 *   · Input con debounce 280 ms, búsqueda en `productos` (v3) + `alimentos` (v1)
 *   · Panel flotante posicionado en capa superior con backdrop-filter: blur(22px)
 *   · Sección sticky del panel con encabezado translúcido
 *   · Row inline de cantidad con spinner ± tras seleccionar un resultado
 *   · Cálculo de macros proporcional a la cantidad elegida
 *   · onAgregar(item) devuelve objeto normalizado con todos los macros
 *   · Cierre al hacer click fuera del componente
 *   · Sin dependencias externas — iconos SVG inline
 *
 * Props:
 *   pacienteId  {string}   ID del paciente activo (contexto)
 *   comida      {string}   Nombre de la comida activa (ej. 'desayuno') — aparece en labels
 *   onAgregar   {Function} Callback(item) al confirmar la adición
 *   placeholder {string}   Texto de placeholder del input
 *   autoFocus   {boolean}  Autofocus al montar
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import db from '@/db/database'

// ═══════════════════════════════════════════════════════════════════════════
// CSS — inyectado una sola vez; auto-contenido
// ═══════════════════════════════════════════════════════════════════════════

const BP_CSS = `

/* ── Wrapper ─────────────────────────────────────────────────────────────── */
.bp { position: relative; width: 100%; }

/* ── Campo de búsqueda ───────────────────────────────────────────────────── */
.bp-field {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 11px var(--space-4);
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
  transition:
    border-color var(--transition-fast),
    box-shadow   var(--transition-fast);
  cursor: text;
}
.bp-field--focus {
  border-color: var(--color-primary-light);
  box-shadow: 0 0 0 3px rgba(76,175,80,.14);
}
.bp-icon {
  color: var(--color-text-low);
  flex-shrink: 0;
  display: flex;
  pointer-events: none;
}
.bp-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: var(--text-sm);
  color: var(--color-text-high);
  min-width: 0;
  /* Suprimir ícono nativo de búsqueda en WebKit */
  -webkit-appearance: none;
  appearance: none;
}
.bp-input::-webkit-search-cancel-button { display: none; }
.bp-input::placeholder { color: var(--color-text-disabled); }

.bp-spinner {
  width: 15px;
  height: 15px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.65s linear infinite;
  flex-shrink: 0;
}

.bp-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: var(--radius-full);
  border: none;
  background: var(--color-surface-raised);
  color: var(--color-text-mid);
  cursor: pointer;
  flex-shrink: 0;
  transition: background var(--transition-fast), color var(--transition-fast);
}
.bp-clear:hover { background: var(--color-border); color: var(--color-text-high); }

/* ═══════════════════════════════════════════════════════════════════════════
   PANEL FLOTANTE — capa superior con desenfoque de fondo elegante
   ═══════════════════════════════════════════════════════════════════════════ */
.bp-panel {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 10px);
  z-index: var(--z-overlay);

  /* El trío mágico: blur + saturación + capa translúcida */
  background: rgba(255,255,255,.90);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);

  border-radius: var(--radius-xl);
  border: 1px solid rgba(255,255,255,.60);
  box-shadow:
    0  2px  6px rgba(0,0,0,.04),
    0  8px  24px rgba(0,0,0,.09),
    0 24px  56px rgba(0,0,0,.08),
    inset 0 1.5px 0 rgba(255,255,255,.85);

  overflow: hidden;
  max-height: 380px;
  overflow-y: auto;
  overscroll-behavior: contain;

  animation: bp-drop 220ms cubic-bezier(.34,1.15,.64,1) both;

  /* Scrollbar estilizada */
  scrollbar-width: thin;
  scrollbar-color: var(--color-border) transparent;
}
.bp-panel::-webkit-scrollbar       { width: 4px; }
.bp-panel::-webkit-scrollbar-track { background: transparent; }
.bp-panel::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 2px; }

/* Dark mode */
.dark .bp-panel {
  background: rgba(22,22,24,.90);
  border-color: rgba(255,255,255,.10);
  box-shadow:
    0  2px  6px rgba(0,0,0,.30),
    0  8px  24px rgba(0,0,0,.40),
    0 24px  56px rgba(0,0,0,.38),
    inset 0 1.5px 0 rgba(255,255,255,.06);
}

@keyframes bp-drop {
  from { opacity: 0; transform: translateY(-10px) scale(.97); }
  to   { opacity: 1; transform: translateY(0)    scale(1);    }
}

/* ── Encabezado sticky de sección ────────────────────────────────────────── */
.bp-section-hdr {
  position: sticky;
  top: 0;
  padding: 7px var(--space-4);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: .10em;
  text-transform: uppercase;
  color: var(--color-primary);
  background: rgba(255,255,255,.75);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(46,125,50,.10);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}
.dark .bp-section-hdr {
  background: rgba(22,22,24,.75);
  border-bottom-color: rgba(102,187,106,.10);
}
.bp-section-hdr__count {
  background: var(--color-primary-surface);
  color: var(--color-primary);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .03em;
}
.dark .bp-section-hdr__count { background: rgba(46,125,50,.20); }

/* ── Row de cantidad del producto seleccionado ───────────────────────────── */
.bp-sel-row {
  padding: var(--space-3) var(--space-4);
  background: rgba(46,125,50,.06);
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
  border-bottom: 1px solid rgba(46,125,50,.10);
  animation: bp-drop 160ms ease both;
}
.dark .bp-sel-row {
  background: rgba(46,95,50,.18);
  border-bottom-color: rgba(102,187,106,.12);
}
.bp-sel-row__name {
  flex: 1;
  min-width: 0;
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.bp-sel-row__preview {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-primary);
  white-space: nowrap;
}

/* Spinner de cantidad */
.bp-qty-wrap {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}
.bp-qty-btn {
  width: 29px;
  height: 29px;
  border-radius: var(--radius-full);
  border: 1.5px solid var(--color-primary-light);
  background: var(--color-surface);
  color: var(--color-primary);
  font-size: 1rem;
  font-weight: 800;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition:
    background 150ms ease,
    transform  200ms cubic-bezier(.34,1.56,.64,1);
}
.bp-qty-btn:hover  { background: var(--color-primary-surface); transform: scale(1.12); }
.bp-qty-btn:active { transform: scale(.90); }
.bp-qty-input {
  width: 58px;
  text-align: center;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-1) var(--space-2);
  font-size: var(--text-sm);
  font-weight: 700;
  background: var(--color-surface);
  color: var(--color-text-high);
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}
.bp-qty-input:focus {
  border-color: var(--color-primary-light);
  box-shadow: 0 0 0 2px rgba(76,175,80,.14);
}
.bp-qty-unit {
  font-size: var(--text-sm);
  color: var(--color-text-mid);
  font-weight: 500;
  flex-shrink: 0;
}

/* Botón Agregar */
.bp-add-btn {
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 8px 16px;
  border-radius: var(--radius-full);
  border: none;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%);
  color: #fff;
  font-size: var(--text-sm);
  font-weight: 700;
  letter-spacing: -.01em;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 3px 10px rgba(46,125,50,.28);
  flex-shrink: 0;
  transition:
    transform   230ms cubic-bezier(.34,1.56,.64,1),
    box-shadow  230ms ease;
}
/* Destello de luz interna */
.bp-add-btn::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg,rgba(255,255,255,0) 0%,rgba(255,255,255,.16) 50%,rgba(255,255,255,0) 100%);
  opacity: 0;
  transition: opacity 200ms ease;
}
.bp-add-btn:hover { transform: scale(1.04) translateY(-1px); box-shadow: 0 7px 20px rgba(46,125,50,.38); }
.bp-add-btn:hover::after { opacity: 1; }
.bp-add-btn:active { transform: scale(.97); }
.bp-add-btn:disabled { opacity: .50; cursor: not-allowed; pointer-events: none; }

/* ── Items de resultado ───────────────────────────────────────────────────── */
.bp-list { list-style: none; padding: 0; margin: 0; }

.bp-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 11px var(--space-4);
  cursor: pointer;
  border-bottom: 1px solid rgba(0,0,0,.04);
  transition: background var(--transition-fast);
  -webkit-tap-highlight-color: transparent;
  outline: none;
}
.dark .bp-item { border-bottom-color: rgba(255,255,255,.04); }
.bp-item:last-child { border-bottom: none; }
.bp-item:hover,
.bp-item:focus { background: rgba(46,125,50,.07); }
.dark .bp-item:hover,
.dark .bp-item:focus { background: rgba(102,187,106,.08); }
.bp-item--active { background: rgba(46,125,50,.10); }
.dark .bp-item--active { background: rgba(102,187,106,.11); }

/* Ícono emoji de categoría */
.bp-item__ico {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  background: var(--color-primary-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  flex-shrink: 0;
  transition: transform 200ms cubic-bezier(.34,1.56,.64,1);
}
.bp-item:hover .bp-item__ico { transform: scale(1.08); }

/* Info del alimento */
.bp-item__info { flex: 1; min-width: 0; }
.bp-item__name {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-high);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 3px;
}
.bp-item__pills {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  align-items: center;
}
.bp-pill {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: var(--radius-full);
  background: var(--color-surface-raised);
  color: var(--color-text-mid);
  white-space: nowrap;
  letter-spacing: .01em;
}
.bp-pill--cat {
  background: var(--color-primary-surface);
  color: var(--color-primary);
}
.dark .bp-pill--cat { background: rgba(46,125,50,.20); }

/* Calorías */
.bp-item__kcal {
  flex-shrink: 0;
  text-align: right;
}
.bp-item__kcal-val {
  font-size: var(--text-sm);
  font-weight: 800;
  color: var(--color-primary);
  display: block;
}
.bp-item__kcal-ref {
  font-size: 9px;
  color: var(--color-text-disabled);
  font-weight: 500;
  letter-spacing: .02em;
}

/* ── Estado vacío ─────────────────────────────────────────────────────────── */
.bp-empty {
  padding: var(--space-8) var(--space-4);
  text-align: center;
}
.bp-empty__ico { font-size: 2.2rem; display: block; margin-bottom: var(--space-2); }
.bp-empty__title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-mid);
  margin-bottom: 4px;
}
.bp-empty__sub {
  font-size: 11px;
  color: var(--color-text-low);
}
`

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/** Devuelve un emoji representativo según la categoría del alimento */
function emojiCategoria(cat = '') {
  const c = cat.toLowerCase()
  if (c.includes('fruta'))                                      return '🍎'
  if (c.includes('verdura') || c.includes('vegetal'))           return '🥦'
  if (c.includes('carne') || c.includes('proteín'))             return '🥩'
  if (c.includes('pollo') || c.includes('ave'))                 return '🍗'
  if (c.includes('pescado') || c.includes('mariscos'))          return '🐟'
  if (c.includes('lácte') || c.includes('leche') || c.includes('yogur')) return '🥛'
  if (c.includes('queso'))                                      return '🧀'
  if (c.includes('huevo'))                                      return '🥚'
  if (c.includes('cereal') || c.includes('pan') || c.includes('grano')) return '🌾'
  if (c.includes('pasta') || c.includes('arroz'))               return '🍝'
  if (c.includes('legumbre') || c.includes('leguminosa'))       return '🫘'
  if (c.includes('nuez') || c.includes('semilla') || c.includes('fruto seco')) return '🥜'
  if (c.includes('aceite') || c.includes('grasa'))              return '🫒'
  if (c.includes('bebida') || c.includes('jugo') || c.includes('infusión')) return '🥤'
  if (c.includes('snack') || c.includes('golosina'))            return '🍪'
  if (c.includes('suplemento'))                                 return '💊'
  if (c.includes('azúcar') || c.includes('dulce'))              return '🍯'
  return '🥗'
}

/**
 * Calcula los macros proporcionales a la cantidad elegida.
 * `porcion` es la unidad base en la que se expresan los valores nutricionales.
 */
function calcMacros(producto, cantidad) {
  const base   = parseFloat(producto.porcion ?? 100)
  const cant   = parseFloat(cantidad)
  if (!cant || !base) return { calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0 }
  const f = cant / base
  const r = (v) => Math.round((parseFloat(v ?? 0) * f) * 10) / 10
  return {
    calorias:      r(producto.calorias),
    proteinas:     r(producto.proteinas),
    carbohidratos: r(producto.carbohidratos),
    grasas:        r(producto.grasas),
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ÍCONOS SVG
// ═══════════════════════════════════════════════════════════════════════════

const IcoSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)

const IcoX = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
    <line x1="18" y1="6"  x2="6" y2="18"/>
    <line x1="6"  y1="6" x2="18" y2="18"/>
  </svg>
)

const IcoCheck = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export default function BuscadorProductos({
  pacienteId,
  comida,
  onAgregar,
  placeholder = 'Buscar alimento o producto…',
  autoFocus   = false,
}) {
  const [query,        setQuery]        = useState('')
  const [resultados,   setResultados]   = useState([])
  const [buscando,     setBuscando]     = useState(false)
  const [showPanel,    setShowPanel]    = useState(false)
  const [seleccionado, setSeleccionado] = useState(null)
  const [cantidad,     setCantidad]     = useState('100')
  const [isFocused,    setIsFocused]    = useState(false)
  const [agregando,    setAgregando]    = useState(false)

  const inputRef   = useRef(null)
  const wrapperRef = useRef(null)
  const timerRef   = useRef(null)

  // ── Inyección de CSS ──────────────────────────────────────────────────
  useEffect(() => {
    const ID = 'bp-styles'
    if (document.getElementById(ID)) return
    const el = document.createElement('style')
    el.id   = ID
    el.textContent = BP_CSS
    document.head.appendChild(el)
  }, [])

  // ── Cierre al click fuera del componente ──────────────────────────────
  useEffect(() => {
    function handler(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowPanel(false)
        setSeleccionado(null)
        setIsFocused(false)
      }
    }
    document.addEventListener('mousedown',  handler)
    document.addEventListener('touchstart', handler, { passive: true })
    return () => {
      document.removeEventListener('mousedown',  handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [])

  // ── Búsqueda en Dexie ──────────────────────────────────────────────────
  const buscar = useCallback(async (q) => {
    const term = q.trim().toLowerCase()
    if (term.length < 2) {
      setResultados([])
      setShowPanel(false)
      setBuscando(false)
      return
    }
    try {
      const [prods, alis] = await Promise.all([
        db.productos
          .filter(p => (p.nombre ?? '').toLowerCase().includes(term))
          .limit(15)
          .toArray(),
        db.alimentos
          .filter(a => (a.nombre ?? '').toLowerCase().includes(term))
          .limit(10)
          .toArray(),
      ])

      // Normalizar alimentos al formato unificado
      const alisNorm = alis.map(a => ({
        ...a,
        _fuente:  'alimentos',
        categoria: a.categorias?.[0] ?? 'General',
        porcion:   a.porcion ?? 100,
      }))

      // Deduplicar por nombre (productos tienen prioridad)
      const seen = new Map()
      for (const p of prods)    seen.set(p.nombre?.toLowerCase() ?? '', { ...p, _fuente: 'productos' })
      for (const a of alisNorm) if (!seen.has(a.nombre?.toLowerCase() ?? '')) seen.set(a.nombre?.toLowerCase() ?? '', a)

      const merged = [...seen.values()].slice(0, 20)
      setResultados(merged)
      setShowPanel(merged.length > 0)
    } catch (err) {
      console.error('[BuscadorProductos] Error en búsqueda:', err)
      setResultados([])
    } finally {
      setBuscando(false)
    }
  }, [])

  // ── Handlers de input ──────────────────────────────────────────────────
  function handleInput(e) {
    const q = e.target.value
    setQuery(q)
    setSeleccionado(null)
    clearTimeout(timerRef.current)
    if (!q.trim() || q.trim().length < 2) {
      setResultados([])
      setShowPanel(false)
      setBuscando(false)
      return
    }
    setBuscando(true)
    timerRef.current = setTimeout(() => buscar(q), 280)
  }

  function handleClear() {
    setQuery('')
    setResultados([])
    setShowPanel(false)
    setSeleccionado(null)
    setBuscando(false)
    clearTimeout(timerRef.current)
    inputRef.current?.focus()
  }

  function handleFocus() {
    setIsFocused(true)
    if (resultados.length > 0) setShowPanel(true)
  }

  // ── Selección de producto ──────────────────────────────────────────────
  function handleSelect(prod) {
    setSeleccionado(prod)
    setCantidad(String(prod.porcion ?? 100))
  }

  // ── Spinner ± de cantidad ──────────────────────────────────────────────
  function ajustarCantidad(delta) {
    setCantidad(prev => {
      const v = Math.max(1, (parseFloat(prev) || 0) + delta)
      return String(Math.round(v * 10) / 10)
    })
  }

  // ── Confirmar adición ──────────────────────────────────────────────────
  async function handleAgregar() {
    if (!seleccionado || !cantidad || parseFloat(cantidad) <= 0) return
    setAgregando(true)
    try {
      const macros = calcMacros(seleccionado, cantidad)
      await onAgregar?.({
        productoId:     seleccionado.id ?? `${seleccionado._fuente}-${seleccionado.nombre}`,
        nombre:         seleccionado.nombre,
        cantidad:       parseFloat(cantidad),
        unidad:         seleccionado.unidad ?? 'g',
        ...macros,
        _fuente:        seleccionado._fuente ?? 'productos',
      })
      // Reset completo
      setQuery('')
      setResultados([])
      setShowPanel(false)
      setSeleccionado(null)
      setCantidad('100')
    } catch (err) {
      console.error('[BuscadorProductos] Error al agregar:', err)
    } finally {
      setAgregando(false)
    }
  }

  // ── Preview de macros en tiempo real ──────────────────────────────────
  const macrosPreview = seleccionado ? calcMacros(seleccionado, cantidad) : null
  const unidadDisplay = seleccionado?.unidad ?? 'g'
  const comidaLabel   = comida
    ? comida.charAt(0).toUpperCase() + comida.slice(1)
    : 'la comida'

  return (
    <div className="bp" ref={wrapperRef}>

      {/* ── Campo de búsqueda ────────────────────────────────────────── */}
      <div className={`bp-field${isFocused || showPanel ? ' bp-field--focus' : ''}`}
           onClick={() => inputRef.current?.focus()}>
        <span className="bp-icon" aria-hidden="true"><IcoSearch /></span>

        <input
          ref={inputRef}
          className="bp-input"
          type="search"
          inputMode="search"
          value={query}
          onChange={handleInput}
          onFocus={handleFocus}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
          aria-label="Buscar alimento"
          aria-expanded={showPanel}
          aria-haspopup="listbox"
          aria-autocomplete="list"
        />

        {buscando && <div className="bp-spinner" aria-hidden="true" />}

        {query && !buscando && (
          <button
            className="bp-clear"
            onClick={handleClear}
            aria-label="Limpiar búsqueda"
            type="button"
          >
            <IcoX />
          </button>
        )}
      </div>

      {/* ── Panel flotante de resultados ─────────────────────────────── */}
      {showPanel && (
        <div
          className="bp-panel"
          role="listbox"
          aria-label={`Resultados de búsqueda para ${comidaLabel}`}
        >

          {/* Row de cantidad (aparece cuando hay selección) */}
          {seleccionado && (
            <div className="bp-sel-row" role="form" aria-label="Configurar cantidad">
              <div className="bp-sel-row__name">
                {emojiCategoria(seleccionado.categoria ?? seleccionado.categorias?.[0])}
                {' '}{seleccionado.nombre}
              </div>

              {/* Spinner ± */}
              <div className="bp-qty-wrap">
                <button
                  className="bp-qty-btn"
                  type="button"
                  onClick={() => ajustarCantidad(-10)}
                  aria-label="Reducir 10"
                >−</button>
                <input
                  className="bp-qty-input"
                  type="number"
                  min="1"
                  step="1"
                  value={cantidad}
                  onChange={e => setCantidad(e.target.value)}
                  aria-label="Cantidad"
                />
                <button
                  className="bp-qty-btn"
                  type="button"
                  onClick={() => ajustarCantidad(10)}
                  aria-label="Aumentar 10"
                >+</button>
                <span className="bp-qty-unit">{unidadDisplay}</span>
              </div>

              {/* Preview de kcal en tiempo real */}
              {macrosPreview && (
                <span className="bp-sel-row__preview" aria-live="polite">
                  {macrosPreview.calorias} kcal
                </span>
              )}

              <button
                className="bp-add-btn"
                type="button"
                onClick={handleAgregar}
                disabled={!cantidad || parseFloat(cantidad) <= 0 || agregando}
                aria-label={`Agregar ${seleccionado.nombre} a ${comidaLabel}`}
              >
                <IcoCheck />
                {agregando ? 'Agregando…' : 'Agregar'}
              </button>
            </div>
          )}

          {/* Lista de resultados */}
          {resultados.length > 0 ? (
            <>
              <div className="bp-section-hdr">
                <span>Resultados{comida ? ` · ${comidaLabel}` : ''}</span>
                <span className="bp-section-hdr__count">{resultados.length}</span>
              </div>

              <ul className="bp-list" role="presentation">
                {resultados.map((prod, idx) => {
                  const isActive = seleccionado?.nombre === prod.nombre
                  const cat      = prod.categoria ?? prod.categorias?.[0] ?? ''
                  return (
                    <li
                      key={prod.id ?? idx}
                      className={`bp-item${isActive ? ' bp-item--active' : ''}`}
                      role="option"
                      aria-selected={isActive}
                      tabIndex={0}
                      onClick={() => handleSelect(prod)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleSelect(prod)
                        }
                      }}
                    >
                      {/* Ícono emoji */}
                      <div className="bp-item__ico" aria-hidden="true">
                        {emojiCategoria(cat)}
                      </div>

                      {/* Info */}
                      <div className="bp-item__info">
                        <div className="bp-item__name">{prod.nombre}</div>
                        <div className="bp-item__pills">
                          {cat && (
                            <span className="bp-pill bp-pill--cat">{cat}</span>
                          )}
                          {prod.proteinas     != null && <span className="bp-pill">P {prod.proteinas}g</span>}
                          {prod.carbohidratos != null && <span className="bp-pill">C {prod.carbohidratos}g</span>}
                          {prod.grasas        != null && <span className="bp-pill">G {prod.grasas}g</span>}
                        </div>
                      </div>

                      {/* Calorías */}
                      <div className="bp-item__kcal">
                        {prod.calorias != null ? (
                          <>
                            <span className="bp-item__kcal-val">{prod.calorias}</span>
                            <span className="bp-item__kcal-ref">
                              kcal/{prod.porcion ?? 100}{prod.unidad ?? 'g'}
                            </span>
                          </>
                        ) : (
                          <span className="bp-item__kcal-ref">sin datos</span>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </>
          ) : (
            !buscando && query.trim().length >= 2 && (
              <div className="bp-empty" role="status">
                <span className="bp-empty__ico" aria-hidden="true">🔍</span>
                <p className="bp-empty__title">Sin resultados para "{query}"</p>
                <p className="bp-empty__sub">Verificá la ortografía o probá con otro término</p>
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}
