import { useCallback, useState } from 'react'
import { createId } from '../domain/id'
import type { FuelEntry } from '../domain/types'
import { loadFuelEntries, saveFuelEntries } from '../storage/fuelEntriesRepository'

export type NewFuelEntry = Omit<FuelEntry, 'id' | 'createdAt' | 'updatedAt'>

export function useFuelEntries() {
  const [fuelEntries, setFuelEntries] = useState<FuelEntry[]>(() => loadFuelEntries())

  const addFuelEntry = useCallback((data: NewFuelEntry): FuelEntry => {
    const now = new Date().toISOString()
    const entry: FuelEntry = { ...data, id: createId(), createdAt: now, updatedAt: now }
    setFuelEntries((prev) => {
      const next = [...prev, entry]
      saveFuelEntries(next)
      return next
    })
    return entry
  }, [])

  const updateFuelEntry = useCallback((id: string, changes: Partial<FuelEntry>) => {
    setFuelEntries((prev) => {
      const next = prev.map((entry) =>
        entry.id === id ? { ...entry, ...changes, updatedAt: new Date().toISOString() } : entry,
      )
      saveFuelEntries(next)
      return next
    })
  }, [])

  const deleteFuelEntry = useCallback((id: string) => {
    setFuelEntries((prev) => {
      const next = prev.filter((entry) => entry.id !== id)
      saveFuelEntries(next)
      return next
    })
  }, [])

  const deleteAllFuelEntries = useCallback(() => {
    setFuelEntries([])
    saveFuelEntries([])
  }, [])

  const replaceAllFuelEntries = useCallback((next: FuelEntry[]) => {
    setFuelEntries(next)
    saveFuelEntries(next)
  }, [])

  return {
    fuelEntries,
    addFuelEntry,
    updateFuelEntry,
    deleteFuelEntry,
    deleteAllFuelEntries,
    replaceAllFuelEntries,
  }
}
