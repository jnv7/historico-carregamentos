import { describe, expect, it } from 'vitest'
import { combineDateAndTime, toDateInputValue, toTimeInputValue } from './datetime'

describe('toDateInputValue / toTimeInputValue', () => {
  it('pads single-digit values', () => {
    const date = new Date(2024, 2, 5, 8, 4)
    expect(toDateInputValue(date)).toBe('2024-03-05')
    expect(toTimeInputValue(date)).toBe('08:04')
  })
})

describe('combineDateAndTime', () => {
  it('combines date and time input strings into a local Date', () => {
    const date = combineDateAndTime('2024-03-05', '08:04')
    expect(date.getFullYear()).toBe(2024)
    expect(date.getMonth()).toBe(2)
    expect(date.getDate()).toBe(5)
    expect(date.getHours()).toBe(8)
    expect(date.getMinutes()).toBe(4)
  })

  it('defaults to midnight when time is missing', () => {
    const date = combineDateAndTime('2024-03-05', '')
    expect(date.getHours()).toBe(0)
    expect(date.getMinutes()).toBe(0)
  })
})
