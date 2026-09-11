import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_CAR_ID } from '../domain/types'
import { loadFuelEntries } from '../storage/fuelEntriesRepository'
import { useFuelEntries, type NewFuelEntry } from './useFuelEntries'

const baseEntry: NewFuelEntry = {
  carId: DEFAULT_CAR_ID,
  kind: 'fuel',
  startAt: '2024-01-01T10:00:00.000Z',
  liters: 30,
  cost: 45,
  odometerKm: null,
  location: null,
  notes: null,
}

describe('useFuelEntries', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts empty when nothing was persisted', () => {
    const { result } = renderHook(() => useFuelEntries())
    expect(result.current.fuelEntries).toEqual([])
  })

  it('adds a fuel entry, assigning an id, and persists it', () => {
    const { result } = renderHook(() => useFuelEntries())

    act(() => {
      result.current.addFuelEntry(baseEntry)
    })

    expect(result.current.fuelEntries).toHaveLength(1)
    expect(result.current.fuelEntries[0].id).toBeTruthy()
    expect(result.current.fuelEntries[0].liters).toBe(30)
    expect(loadFuelEntries()).toHaveLength(1)
  })

  it('updates an existing fuel entry', () => {
    const { result } = renderHook(() => useFuelEntries())
    let id = ''
    act(() => {
      id = result.current.addFuelEntry(baseEntry).id
    })

    act(() => {
      result.current.updateFuelEntry(id, { liters: 40 })
    })

    expect(result.current.fuelEntries[0].liters).toBe(40)
    expect(loadFuelEntries()[0].liters).toBe(40)
  })

  it('deletes a fuel entry', () => {
    const { result } = renderHook(() => useFuelEntries())
    let id = ''
    act(() => {
      id = result.current.addFuelEntry(baseEntry).id
    })

    act(() => {
      result.current.deleteFuelEntry(id)
    })

    expect(result.current.fuelEntries).toEqual([])
    expect(loadFuelEntries()).toEqual([])
  })

  it('deletes all fuel entries', () => {
    const { result } = renderHook(() => useFuelEntries())
    act(() => {
      result.current.addFuelEntry(baseEntry)
      result.current.addFuelEntry(baseEntry)
    })

    act(() => {
      result.current.deleteAllFuelEntries()
    })

    expect(result.current.fuelEntries).toEqual([])
    expect(loadFuelEntries()).toEqual([])
  })

  it('replaces all fuel entries, e.g. after restoring a backup', () => {
    const { result } = renderHook(() => useFuelEntries())
    const restored = [{ ...baseEntry, id: 'x', createdAt: 'now', updatedAt: 'now' }]

    act(() => {
      result.current.replaceAllFuelEntries(restored)
    })

    expect(result.current.fuelEntries).toEqual(restored)
    expect(loadFuelEntries()).toEqual(restored)
  })
})
