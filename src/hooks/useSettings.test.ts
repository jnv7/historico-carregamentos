import { renderHook, act } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useSettings } from './useSettings'
import { DEFAULT_SETTINGS, loadSettings } from '../storage/settingsRepository'

describe('useSettings', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts with the persisted (or default) settings', () => {
    const { result } = renderHook(() => useSettings())
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS)
  })

  it('updates state and persists to storage', () => {
    const { result } = renderHook(() => useSettings())

    act(() => {
      result.current.updateSettings({ ...DEFAULT_SETTINGS, carName: 'Renault Zoe' })
    })

    expect(result.current.settings.carName).toBe('Renault Zoe')
    expect(loadSettings().carName).toBe('Renault Zoe')
  })
})
