/**
 * AiAdviceGenerator.tsx
 *
 * Generador de textos educativos para pacientes.
 * Ofrece plantillas rápidas y campo libre; la función `generateSimpleExplanation`
 * produce explicaciones empáticas y sin tecnicismos.
 *
 * Props:
 *   · onAppendAdvice(text) — el padre lo persiste en el plan de dieta
 *
 * CSS inyectado una sola vez via useEffect (id="aag-styles").
 */

import { useState, useEffect, useCallback } from 'react'

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  onAppendAdvice: (text: string) => void
}

// ─── Plantillas rápidas ───────────────────────────────────────────────────────

const QUICK_TEMPLATES = [
  { id: 'sodio',    label: 'Reducción de Sodio',      topic: 'sodio' },
  { id: 'hierro',   label: 'Importancia del Hierro',   topic: 'hierro' },
  { id: 'proteina', label: 'Beneficios de la Proteína', topic: 'proteina' },
] as const

// ─── Motor de explicaciones ───────────────────────────────────────────────────

const EXPLANATIONS: Record<string, string> = {
  sodio: `Reducir la sal puede parecer un desafío al principio, sobre todo si estás acostumbrada a cocinar con condimentos fuertes. ¡La buena noticia es que el paladar se adapta en pocas semanas! Consumir menos sodio ayuda a que tu corazón trabaje con más calma, tu presión sanguínea se mantenga estable y tu cuerpo retenga menos líquidos. Un truco sencillo para empezar: reemplazá la sal por hierbas aromáticas como orégano, romero, ajo en polvo o un toque de limón fresco. Pequeños cambios que tu cuerpo va a agradecer día a día.`,

  hierro: `El hierro es como el combustible de tu sangre: sin él, te cansás más rápido, te cuesta concentrarte y podés sentirte sin energía aunque hayas dormido bien. Lo reconfortante es que podés obtenerlo de alimentos que quizás ya tenés en casa, como carne roja magra, lentejas, espinaca, huevo y pollo. Un tip muy valioso: acompañá esos alimentos con vitamina C, como un chorrito de limón o una naranja, porque ayuda a que tu cuerpo absorba el hierro mucho mejor. ¡Así aprovechás cada comida al máximo!`,

  proteina: `La proteína es el material con el que tu cuerpo construye y repara todo: los músculos, la piel, las defensas y mucho más. Cuando comés suficiente proteína en cada comida, te sentís más saciada por más tiempo, es más difícil que piques entre horas y tu cuerpo mantiene su fuerza. La encontrás en carnes, huevo, lácteos, legumbres como los garbanzos y las lentejas, y también en frutos secos. Lo ideal es distribuirla a lo largo del día, un poco en cada comida principal, en lugar de consumirla toda de una sola vez.`,
}

function generateSimpleExplanation(topic: string): string {
  const key = topic.toLowerCase().trim()
  for (const [k, text] of Object.entries(EXPLANATIONS)) {
    if (key.includes(k)) return text
  }
  return `Cuando hablamos de "${topic}" en tu alimentación, estamos pensando en tu bienestar de manera integral. Cada pequeño cambio que hacés en lo que comés es una forma concreta de cuidarte, y no tenés que hacerlo solo ni todo de golpe. Lo importante es ir de a poco, con paciencia y sin presión. Consultá cualquier duda con tu nutricionista, porque juntos van a encontrar el camino más cómodo y sostenible para vos. ¡Estás haciendo algo muy valioso por tu salud!`
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const COMPONENT_CSS = `
/* ══ Wrapper ══════════════════════════════════════════════════════════════ */
.aag {
  font-family: var(--font-sans);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  animation: aag-in 280ms cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes aag-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ══ Header ═══════════════════════════════════════════════════════════════ */
.aag__header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.aag__icon {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, #8B5CF6, #3B82F6);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 14px rgba(139,92,246,0.28);
}
.aag__title {
  font-size: var(--text-base);
  font-weight: 800;
  color: var(--color-text-high);
  letter-spacing: -0.015em;
  line-height: 1.2;
}
.aag__subtitle {
  font-size: var(--text-xs);
  color: var(--color-text-low);
  margin-top: 1px;
}

/* ══ Sección label ════════════════════════════════════════════════════════ */
.aag__section-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-low);
  margin-bottom: var(--space-2);
}

/* ══ Chips de plantillas ══════════════════════════════════════════════════ */
.aag__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.aag__chip {
  padding: 6px 14px;
  border-radius: var(--radius-full);
  border: 1.5px solid var(--color-border);
  background: var(--color-surface);
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-mid);
  cursor: pointer;
  letter-spacing: 0.01em;
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast),
    transform var(--transition-fast);
}
.aag__chip:hover {
  border-color: #8B5CF6;
  color: #7C3AED;
  background: rgba(139,92,246,0.07);
  transform: translateY(-1px);
}
.aag__chip:active { transform: scale(0.96); }
.aag__chip--active {
  border-color: #8B5CF6;
  background: rgba(139,92,246,0.10);
  color: #7C3AED;
  font-weight: 700;
}

/* ══ Input personalizado ══════════════════════════════════════════════════ */
.aag__custom {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}
.aag__input {
  flex: 1;
  height: 38px;
  padding: 0 var(--space-3);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  color: var(--color-text-high);
  background: var(--color-surface);
  outline: none;
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}
.aag__input::placeholder { color: var(--color-text-low); }
.aag__input:focus {
  border-color: #8B5CF6;
  box-shadow: 0 0 0 3px rgba(139,92,246,0.12);
}
.aag__generate-btn {
  height: 38px;
  padding: 0 var(--space-4);
  border-radius: var(--radius-md);
  border: none;
  background: linear-gradient(135deg, #8B5CF6, #3B82F6);
  color: white;
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  letter-spacing: 0.01em;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  transition:
    filter var(--transition-fast),
    transform var(--transition-fast);
}
.aag__generate-btn:hover { filter: brightness(1.1); }
.aag__generate-btn:active { transform: scale(0.96); }
.aag__generate-btn:disabled {
  opacity: 0.45;
  cursor: default;
  pointer-events: none;
}

/* ══ Resultado generado ═══════════════════════════════════════════════════ */
.aag__result {
  border-radius: var(--radius-lg);
  border: 1.5px solid rgba(139,92,246,0.30);
  background: rgba(245,243,255,0.65);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  animation: aag-result-in 260ms cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes aag-result-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

.aag__result-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.aag__result-icon {
  width: 22px;
  height: 22px;
  border-radius: var(--radius-sm);
  background: linear-gradient(135deg, #8B5CF6, #3B82F6);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.aag__result-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  background: linear-gradient(135deg, #8B5CF6, #3B82F6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.aag__result-text {
  font-size: var(--text-sm);
  color: var(--color-text-high);
  line-height: 1.75;
}

.aag__result-textarea {
  width: 100%;
  resize: none;
  border: 1.5px solid #8B5CF6;
  border-radius: var(--radius-md);
  padding: var(--space-3);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  line-height: 1.75;
  background: rgba(139,92,246,0.04);
  color: var(--color-text-high);
  outline: none;
  min-height: 110px;
  box-sizing: border-box;
  transition: box-shadow var(--transition-fast);
}
.aag__result-textarea:focus {
  box-shadow: 0 0 0 3px rgba(139,92,246,0.15);
}

/* ══ Botones de acción ════════════════════════════════════════════════════ */
.aag__actions {
  display: flex;
  gap: var(--space-2);
}
.aag__btn {
  flex: 1;
  padding: 7px var(--space-2);
  border-radius: var(--radius-md);
  border: 1.5px solid var(--color-border);
  background: transparent;
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  color: var(--color-text-mid);
  letter-spacing: 0.01em;
  line-height: 1.4;
  transition:
    background var(--transition-fast),
    color var(--transition-fast),
    border-color var(--transition-fast),
    transform var(--transition-fast);
}
.aag__btn:active { transform: scale(0.96); }

.aag__btn--apply {
  background: linear-gradient(135deg, #8B5CF6, #3B82F6);
  border-color: transparent;
  color: #fff;
}
.aag__btn--apply:hover { filter: brightness(1.08); }

.aag__btn--edit:hover {
  border-color: #8B5CF6;
  color: #7C3AED;
  background: rgba(139,92,246,0.07);
}
.aag__btn--discard:hover {
  border-color: var(--color-error, #D97B7B);
  color: var(--color-error, #D97B7B);
  background: rgba(220,38,38,0.05);
}

/* ══ Dark mode ════════════════════════════════════════════════════════════ */
.dark .aag__chip { background: var(--color-surface-raised); }
.dark .aag__chip--active { background: rgba(139,92,246,0.18); }
.dark .aag__result {
  background: rgba(30,20,55,0.60);
  border-color: rgba(139,92,246,0.22);
}
.dark .aag__result-textarea { background: rgba(139,92,246,0.08); }
.dark .aag__input { background: var(--color-surface-raised); }
`

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AiAdviceGenerator({ onAppendAdvice }: Props) {
  const [customTopic,      setCustomTopic]      = useState('')
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null)
  const [generatedText,    setGeneratedText]    = useState<string | null>(null)
  const [isEditing,        setIsEditing]        = useState(false)
  const [editText,         setEditText]         = useState('')

  // Inyectar CSS una sola vez
  useEffect(() => {
    if (document.getElementById('aag-styles')) return
    const tag = document.createElement('style')
    tag.id          = 'aag-styles'
    tag.textContent = COMPONENT_CSS
    document.head.appendChild(tag)
  }, [])

  const applyGeneration = useCallback((topic: string) => {
    const text = generateSimpleExplanation(topic)
    setGeneratedText(text)
    setEditText(text)
    setIsEditing(false)
  }, [])

  const handleTemplateClick = useCallback(
    (t: typeof QUICK_TEMPLATES[number]) => {
      setActiveTemplateId(t.id)
      setCustomTopic('')
      applyGeneration(t.topic)
    },
    [applyGeneration],
  )

  const handleCustomGenerate = useCallback(() => {
    if (!customTopic.trim()) return
    setActiveTemplateId(null)
    applyGeneration(customTopic.trim())
  }, [customTopic, applyGeneration])

  const handleApply = useCallback(() => {
    if (generatedText === null) return
    onAppendAdvice(editText)
    setGeneratedText(null)
    setEditText('')
    setIsEditing(false)
    setActiveTemplateId(null)
    setCustomTopic('')
  }, [generatedText, editText, onAppendAdvice])

  const handleDiscard = useCallback(() => {
    setGeneratedText(null)
    setEditText('')
    setIsEditing(false)
    setActiveTemplateId(null)
  }, [])

  const handleEdit     = useCallback(() => setIsEditing(true),  [])
  const handleSaveEdit = useCallback(() => setIsEditing(false), [])

  return (
    <div className="aag" role="region" aria-label="Generador de textos educativos">

      {/* ── Header ── */}
      <div className="aag__header">
        <div className="aag__icon" aria-hidden="true">
          <IconGemini size={17} />
        </div>
        <div>
          <div className="aag__title">Textos Educativos</div>
          <div className="aag__subtitle">Generá explicaciones para tu paciente</div>
        </div>
      </div>

      {/* ── Plantillas rápidas ── */}
      <div>
        <p className="aag__section-label">Plantillas de explicación</p>
        <div className="aag__chips" role="group" aria-label="Plantillas rápidas de explicación">
          {QUICK_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`aag__chip${activeTemplateId === t.id ? ' aag__chip--active' : ''}`}
              onClick={() => handleTemplateClick(t)}
              aria-pressed={activeTemplateId === t.id}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tema personalizado ── */}
      <div className="aag__custom">
        <input
          type="text"
          className="aag__input"
          placeholder="Escribí un tema personalizado…"
          value={customTopic}
          onChange={(e) => { setCustomTopic(e.target.value); setActiveTemplateId(null) }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleCustomGenerate() }}
          aria-label="Tema personalizado de explicación"
        />
        <button
          type="button"
          className="aag__generate-btn"
          onClick={handleCustomGenerate}
          disabled={!customTopic.trim()}
          aria-label="Generar explicación personalizada"
        >
          <IconSparkleSmall />
          Generar
        </button>
      </div>

      {/* ── Resultado generado ── */}
      {generatedText !== null && (
        <div className="aag__result" role="article" aria-label="Texto educativo generado por IA">

          <div className="aag__result-header">
            <div className="aag__result-icon" aria-hidden="true">
              <IconGemini size={13} />
            </div>
            <span className="aag__result-label">Sugerido por IA</span>
          </div>

          {isEditing ? (
            <textarea
              className="aag__result-textarea"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={5}
              aria-label="Editar texto educativo"
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
            />
          ) : (
            <p className="aag__result-text">{editText}</p>
          )}

          <div className="aag__actions">
            <button
              type="button"
              className="aag__btn aag__btn--apply"
              onClick={handleApply}
              aria-label="Aplicar texto al plan de dieta"
            >
              Aplicar
            </button>
            <button
              type="button"
              className="aag__btn aag__btn--edit"
              onClick={isEditing ? handleSaveEdit : handleEdit}
              aria-label={isEditing ? 'Guardar edición' : 'Editar texto generado'}
            >
              {isEditing ? 'Guardar' : 'Editar'}
            </button>
            <button
              type="button"
              className="aag__btn aag__btn--discard"
              onClick={handleDiscard}
              aria-label="Descartar texto generado"
            >
              Descartar
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

// ─── Íconos SVG inline ────────────────────────────────────────────────────────

function IconGemini({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="white"
      aria-hidden="true"
    >
      <path d="M12 2 L13.5 8.5 L20 10 L13.5 11.5 L12 18 L10.5 11.5 L4 10 L10.5 8.5 Z" />
      <path d="M19 2 L19.8 4.2 L22 5 L19.8 5.8 L19 8 L18.2 5.8 L16 5 L18.2 4.2 Z" />
    </svg>
  )
}

function IconSparkleSmall() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
         aria-hidden="true">
      <path d="M12 2 L13.5 8.5 L20 10 L13.5 11.5 L12 18 L10.5 11.5 L4 10 L10.5 8.5 Z" />
    </svg>
  )
}
