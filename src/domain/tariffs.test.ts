import { describe, expect, it } from 'vitest'
import { findTariffForDate, inferCost } from './tariffs'
import type { Tariff } from './types'

const vazio: Tariff = {
  id: 'vazio',
  label: 'Vazio',
  pricePerKwh: 0.1,
  ranges: [{ start: '22:00', end: '08:00' }],
}

const ponta: Tariff = {
  id: 'ponta',
  label: 'Ponta',
  pricePerKwh: 0.25,
  ranges: [{ start: '09:00', end: '12:00' }],
}

const cheias: Tariff = {
  id: 'cheias',
  label: 'Cheias',
  pricePerKwh: 0.18,
  ranges: [
    { start: '08:00', end: '09:00' },
    { start: '12:00', end: '22:00' },
  ],
}

const tariffs = [vazio, ponta, cheias]

describe('findTariffForDate', () => {
  it('finds a tariff for a plain daytime range', () => {
    const date = new Date(2024, 0, 1, 10, 30)
    expect(findTariffForDate(tariffs, date)?.id).toBe('ponta')
  })

  it('matches a range that wraps past midnight, before midnight', () => {
    const date = new Date(2024, 0, 1, 23, 0)
    expect(findTariffForDate(tariffs, date)?.id).toBe('vazio')
  })

  it('matches a range that wraps past midnight, after midnight', () => {
    const date = new Date(2024, 0, 1, 5, 0)
    expect(findTariffForDate(tariffs, date)?.id).toBe('vazio')
  })

  it('is exclusive of the end boundary', () => {
    const date = new Date(2024, 0, 1, 8, 0)
    expect(findTariffForDate(tariffs, date)?.id).toBe('cheias')
  })

  it('returns null when no tariff matches', () => {
    expect(findTariffForDate([], new Date())).toBeNull()
  })
})

describe('inferCost', () => {
  it('multiplies the matching tariff price by the energy used, rounded to cents', () => {
    const startAt = new Date(2024, 0, 1, 23, 0)
    expect(inferCost(tariffs, startAt, 10.333)).toBeCloseTo(1.03, 5)
  })

  it('returns null when there are no tariffs configured', () => {
    expect(inferCost([], new Date(), 10)).toBeNull()
  })
})
