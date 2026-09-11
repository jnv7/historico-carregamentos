export interface FuelFieldsInput {
  liters: string
  pricePerLiter: string
  cost: string
}

export type FuelField = keyof FuelFieldsInput

const ALL_FIELDS: FuelField[] = ['liters', 'pricePerLiter', 'cost']

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function parsePositive(value: string): number | null {
  if (value.trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

/**
 * Recomputes whichever of litres / price-per-litre / total cost is NOT among the two most
 * recently edited fields — so filling in (or adjusting) any two fields keeps the third
 * permanently in sync, and switching which field you're editing shifts which one is derived.
 * `editOrder` lists field names in the order they were last edited, most recent last.
 */
export function deriveFuelField(fields: FuelFieldsInput, editOrder: FuelField[]): FuelFieldsInput {
  const recentlyEdited = editOrder.slice(-2)
  if (recentlyEdited.length < 2) return fields
  const derivedField = ALL_FIELDS.find((f) => !recentlyEdited.includes(f))
  if (!derivedField) return fields

  const liters = parsePositive(fields.liters)
  const pricePerLiter = parsePositive(fields.pricePerLiter)
  const cost = parsePositive(fields.cost)

  if (derivedField === 'liters' && pricePerLiter !== null && cost !== null) {
    return { ...fields, liters: String(round(cost / pricePerLiter, 2)) }
  }
  if (derivedField === 'pricePerLiter' && liters !== null && cost !== null) {
    return { ...fields, pricePerLiter: String(round(cost / liters, 3)) }
  }
  if (derivedField === 'cost' && liters !== null && pricePerLiter !== null) {
    return { ...fields, cost: String(round(liters * pricePerLiter, 2)) }
  }
  return fields
}
