/**
 * costos.js — Estimación de costos alimentarios
 * Región: Posadas, Misiones (CP 3300)
 *
 * Fórmula: (precioRef / cantidadRefGramo) × porcion
 */

function normalizar(str) {
  return (str ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

/**
 * Parsea el texto libre de una comida y estima el costo
 * cruzando los ingredientes con el catálogo de productos.
 *
 * Detecta patrones de cantidad: (200g), 150g, 1.5kg, 200ml, etc.
 * Unidades: g, kg (×1000), ml, l (×1000).
 *
 * @param {string}   texto     - Contenido del textarea de una comida
 * @param {object[]} productos - Catálogo de productos con precioRef y cantidadRefGramo
 * @returns {{ total: number, items: object[] }}
 */
export function parsearCostoTexto(texto, productos) {
  if (!texto || !productos || !productos.length) return { total: 0, items: [] }

  const lineas = texto.split('\n').map(l => l.trim()).filter(Boolean)
  const items  = []

  for (const linea of lineas) {
    // Extraer cantidad y unidad
    const matchQty = linea.match(/\(?(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l)\b\)?/i)
    if (!matchQty) continue

    let porcion  = parseFloat(matchQty[1].replace(',', '.'))
    const unit   = matchQty[2].toLowerCase()
    if (unit === 'kg' || unit === 'l') porcion *= 1000

    // Extraer nombre del alimento (texto antes de la cantidad)
    const qtyIdx    = linea.indexOf(matchQty[0])
    let nombreBruto = linea
      .substring(0, qtyIdx)
      .replace(/^[•\-\*\s]+/, '')
      .replace(/[—–\-]\s*$/, '')
      .replace(/\[.*\]/, '')
      .trim()

    if (!nombreBruto) continue

    const nombreNorm = normalizar(nombreBruto)

    // Buscar el producto con nombre normalizado más específico (mayor longitud)
    let mejorMatch = null
    let mejorLen   = 0

    for (const prod of productos) {
      if (!prod.precioRef || !prod.cantidadRefGramo) continue
      const prodNorm = normalizar(prod.nombre)
      if (nombreNorm.includes(prodNorm) && prodNorm.length > mejorLen) {
        mejorMatch = prod
        mejorLen   = prodNorm.length
      }
    }

    if (!mejorMatch) continue

    const costo = (mejorMatch.precioRef / mejorMatch.cantidadRefGramo) * porcion
    items.push({
      nombre:  mejorMatch.nombre,
      porcion,
      costo,
      origen:  mejorMatch.origen ?? 'Almacén',
    })
  }

  const total = items.reduce((s, i) => s + i.costo, 0)
  return { total, items }
}

/**
 * Calcula el costo total del menú diario (las 4 comidas)
 * y proyecta el presupuesto mensual (×30).
 *
 * @param {object}   plan      - Objeto de plan con campos desayuno/almuerzo/merienda/cena
 * @param {object[]} productos - Catálogo con precios
 * @returns {{ costoDiario: number, costoMensual: number, desglose: object }}
 */
export function calcularCostoMenu(plan, productos) {
  if (!plan || !productos || !productos.length) {
    return { costoDiario: 0, costoMensual: 0, desglose: {} }
  }

  const comidas   = ['desayuno', 'almuerzo', 'merienda', 'cena']
  const desglose  = {}
  let   costoDiario = 0

  for (const comida of comidas) {
    const { total } = parsearCostoTexto(plan[comida] ?? '', productos)
    desglose[comida] = total
    costoDiario     += total
  }

  return {
    costoDiario,
    costoMensual: costoDiario * 30,
    desglose,
  }
}
