import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNutricionStore } from '@/store/useNutricionStore'

const TIPOS_COMIDA = ['desayuno', 'almuerzo', 'merienda', 'cena', 'snack']

const FORM_INICIAL = {
  alimentoId: '',
  nombreAlimento: '',
  tipoComida: 'almuerzo',
  cantidad: '',
  unidad: 'g',
  calorias: '',
  proteinas: '',
  carbohidratos: '',
  grasas: '',
}

export default function Registrar() {
  const [form, setForm] = useState(FORM_INICIAL)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  const agregarRegistro = useNutricionStore((s) => s.agregarRegistro)
  const navigate = useNavigate()

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!form.nombreAlimento.trim() || !form.cantidad) {
      setError('Nombre del alimento y cantidad son obligatorios.')
      return
    }

    setGuardando(true)
    try {
      await agregarRegistro({
        ...form,
        cantidad: Number(form.cantidad),
        calorias: Number(form.calorias) || 0,
        proteinas: Number(form.proteinas) || 0,
        carbohidratos: Number(form.carbohidratos) || 0,
        grasas: Number(form.grasas) || 0,
      })
      navigate('/plan')
    } catch (err) {
      setError('No se pudo guardar el registro. Intenta de nuevo.')
      console.error(err)
    } finally {
      setGuardando(false)
    }
  }

  const fieldStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-1)',
  }

  const inputStyle = {
    padding: 'var(--space-3)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    background: 'var(--color-surface)',
    color: 'var(--color-text-high)',
    fontSize: 'var(--text-base)',
    width: '100%',
  }

  const labelStyle = {
    fontSize: 'var(--text-sm)',
    fontWeight: 500,
    color: 'var(--color-text-mid)',
  }

  return (
    <main style={{ padding: 'var(--space-4)', maxWidth: '480px', margin: '0 auto' }}>
      <header style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>
          Registrar Comida
        </h1>
      </header>

      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

        <div style={fieldStyle}>
          <label htmlFor="tipoComida" style={labelStyle}>Tipo de comida</label>
          <select id="tipoComida" name="tipoComida" value={form.tipoComida} onChange={handleChange} style={inputStyle}>
            {TIPOS_COMIDA.map((t) => (
              <option key={t} value={t} style={{ textTransform: 'capitalize' }}>{t}</option>
            ))}
          </select>
        </div>

        <div style={fieldStyle}>
          <label htmlFor="nombreAlimento" style={labelStyle}>Nombre del alimento *</label>
          <input
            id="nombreAlimento"
            name="nombreAlimento"
            type="text"
            value={form.nombreAlimento}
            onChange={handleChange}
            placeholder="Ej: Pechuga de pollo"
            autoComplete="off"
            required
            style={inputStyle}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-3)' }}>
          <div style={fieldStyle}>
            <label htmlFor="cantidad" style={labelStyle}>Cantidad *</label>
            <input
              id="cantidad"
              name="cantidad"
              type="number"
              min="0"
              step="0.1"
              value={form.cantidad}
              onChange={handleChange}
              placeholder="150"
              required
              style={inputStyle}
            />
          </div>
          <div style={fieldStyle}>
            <label htmlFor="unidad" style={labelStyle}>Unidad</label>
            <select id="unidad" name="unidad" value={form.unidad} onChange={handleChange} style={inputStyle}>
              <option value="g">g</option>
              <option value="ml">ml</option>
              <option value="unidad">unidad</option>
            </select>
          </div>
        </div>

        <fieldset style={{ border: 'none', padding: 0 }}>
          <legend style={{ ...labelStyle, marginBottom: 'var(--space-3)', display: 'block' }}>
            Información nutricional (por cantidad ingresada)
          </legend>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            {[
              { name: 'calorias', label: 'Calorías (kcal)' },
              { name: 'proteinas', label: 'Proteínas (g)' },
              { name: 'carbohidratos', label: 'Carbohidratos (g)' },
              { name: 'grasas', label: 'Grasas (g)' },
            ].map(({ name, label }) => (
              <div key={name} style={fieldStyle}>
                <label htmlFor={name} style={labelStyle}>{label}</label>
                <input
                  id={name}
                  name={name}
                  type="number"
                  min="0"
                  step="0.1"
                  value={form[name]}
                  onChange={handleChange}
                  placeholder="0"
                  style={inputStyle}
                />
              </div>
            ))}
          </div>
        </fieldset>

        {error && (
          <p role="alert" style={{ color: 'var(--color-error)', fontSize: 'var(--text-sm)' }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={guardando}
          style={{
            padding: 'var(--space-4)',
            background: 'var(--color-primary)',
            color: 'var(--color-primary-on)',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            fontSize: 'var(--text-base)',
            opacity: guardando ? 0.7 : 1,
            transition: 'opacity var(--transition-fast)',
          }}
        >
          {guardando ? 'Guardando…' : 'Guardar registro'}
        </button>
      </form>
    </main>
  )
}
