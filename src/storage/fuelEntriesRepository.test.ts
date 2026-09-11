import { beforeEach, describe, expect, it } from 'vitest'
import type { FuelEntry } from '../domain/types'
import { loadFuelEntries, saveFuelEntries } from './fuelEntriesRepository'

function makeEntry(overrides: Partial<FuelEntry> = {}): FuelEntry {
  return {
    id: '1',
    carId: 'default-car',
    kind: 'fuel',
    startAt: '2024-01-01T10:00:00.000Z',
    liters: 30,
    cost: 45,
    odometerKm: null,
    location: null,
    notes: null,
    createdAt: '2024-01-01T10:00:00.000Z',
    updatedAt: '2024-01-01T10:00:00.000Z',
    ...overrides,
  }
}

describe('fuelEntriesRepository', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns an empty array when nothing was saved yet', () => {
    expect(loadFuelEntries()).toEqual([])
  })

  it('persists and reloads fuel entries', () => {
    const entries = [makeEntry(), makeEntry({ id: '2' })]

    saveFuelEntries(entries)

    expect(loadFuelEntries()).toEqual(entries)
  })

  it('falls back to an empty array when stored data is corrupted', () => {
    localStorage.setItem('historico-carregamentos:fuel-entries', '{not json')

    expect(loadFuelEntries()).toEqual([])
  })
})
