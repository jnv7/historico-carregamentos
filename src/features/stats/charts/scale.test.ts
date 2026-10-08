import { describe, expect, it } from 'vitest'
import { niceTicks } from './scale'

describe('niceTicks', () => {
  it('starts bars at zero with round steps', () => {
    expect(niceTicks(3, 87, true)).toEqual([0, 50, 100])
    expect(niceTicks(0, 42, true)).toEqual([0, 20, 40, 60])
  })

  it('fits a line range without forcing zero', () => {
    expect(niceTicks(1.62, 1.88, false)).toEqual([1.6, 1.7, 1.8, 1.9])
  })

  it('gives a flat or empty series some room', () => {
    expect(niceTicks(0, 0, true)).toEqual([0, 0.5, 1])
    const ticks = niceTicks(15, 15, false)
    expect(ticks[0]).toBeLessThan(15)
    expect(ticks[ticks.length - 1]).toBeGreaterThan(15)
  })
})
