import { describe, expect, it } from 'vitest'
import {
  capitalizeFirst,
  formatCurrency,
  formatDuration,
  formatEnergy,
  formatConsumption,
  formatLiters,
  formatUnitPrice,
} from './format'

describe('formatCurrency', () => {
  it('formats a value as EUR using Portuguese conventions', () => {
    expect(formatCurrency(12.5)).toContain('12,50')
    expect(formatCurrency(12.5)).toContain('€')
  })
})

describe('formatEnergy', () => {
  it('formats energy with a kWh suffix', () => {
    expect(formatEnergy(10)).toBe('10 kWh')
    expect(formatEnergy(10.333)).toBe('10,33 kWh')
  })
})

describe('formatLiters', () => {
  it('formats litres with an L suffix', () => {
    expect(formatLiters(35)).toBe('35 L')
    expect(formatLiters(35.678)).toBe('35,68 L')
  })
})

describe('capitalizeFirst', () => {
  it('capitalizes only the first letter of a multi-word string', () => {
    expect(capitalizeFirst('sexta-feira, 11 de setembro')).toBe('Sexta-feira, 11 de setembro')
  })

  it('handles an empty string', () => {
    expect(capitalizeFirst('')).toBe('')
  })
})

describe('formatDuration', () => {
  it('formats sub-hour durations as minutes only', () => {
    expect(formatDuration(45 * 60_000)).toBe('45m')
  })

  it('formats durations over an hour as hours and minutes', () => {
    expect(formatDuration(90 * 60_000)).toBe('1h 30m')
  })

  it('clamps negative durations to zero', () => {
    expect(formatDuration(-1000)).toBe('0m')
  })
})

describe('efficiency formatting', () => {
  it('formats unit prices with up to 3 decimals', () => {
    expect(formatUnitPrice(0.1534, 'kWh')).toBe('0,153 €/kWh')
    expect(formatUnitPrice(1.8, 'L')).toBe('1,80 €/L')
  })

  it('formats consumption per 100 km with 1 decimal', () => {
    expect(formatConsumption(15.24, 'kWh')).toBe('15,2 kWh/100 km')
    expect(formatConsumption(6, 'L')).toBe('6 L/100 km')
  })
})
