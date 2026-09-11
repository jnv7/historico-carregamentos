import { describe, expect, it } from 'vitest'
import { deriveFuelField } from './fuelCalc'

describe('deriveFuelField', () => {
  it('does nothing until two different fields have been edited', () => {
    const fields = { liters: '40', pricePerLiter: '', cost: '' }
    expect(deriveFuelField(fields, ['liters'])).toEqual(fields)
  })

  it('computes the total cost from the two most recently edited fields (litres, price/litre)', () => {
    const fields = { liters: '40', pricePerLiter: '1.5', cost: '' }
    const result = deriveFuelField(fields, ['liters', 'pricePerLiter'])
    expect(result.cost).toBe('60')
  })

  it('computes the price per litre from the two most recently edited fields (litres, cost)', () => {
    const fields = { liters: '40', pricePerLiter: '', cost: '60' }
    const result = deriveFuelField(fields, ['liters', 'cost'])
    expect(result.pricePerLiter).toBe('1.5')
  })

  it('computes the litres from the two most recently edited fields (price/litre, cost)', () => {
    const fields = { liters: '', pricePerLiter: '1.5', cost: '60' }
    const result = deriveFuelField(fields, ['pricePerLiter', 'cost'])
    expect(result.liters).toBe('40')
  })

  it('overwrites a stale derived value, not just an empty one', () => {
    const fields = { liters: '40', pricePerLiter: '1.5', cost: '999' }
    const result = deriveFuelField(fields, ['liters', 'pricePerLiter'])
    expect(result.cost).toBe('60')
  })

  it('shifts which field is derived when the edited pair changes', () => {
    const fields = { liters: '40', pricePerLiter: '1.5', cost: '60' }
    // litres and cost are now the two most recently edited, so price/litre gets derived instead.
    const result = deriveFuelField({ ...fields, liters: '50' }, ['pricePerLiter', 'cost', 'liters'])
    expect(result.pricePerLiter).toBe(String(Math.round((60 / 50) * 1000) / 1000))
  })

  it('does nothing when the source fields are not valid positive numbers', () => {
    const fields = { liters: '40', pricePerLiter: 'abc', cost: '' }
    expect(deriveFuelField(fields, ['liters', 'pricePerLiter'])).toEqual(fields)
  })
})
