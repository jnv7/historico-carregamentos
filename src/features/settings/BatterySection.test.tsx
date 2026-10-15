import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ChargingSession } from '../../domain/types'
import { DEFAULT_SETTINGS } from '../../storage/settingsRepository'
import { BatterySection } from './BatterySection'

function charge(energyKwh: number, start: number, end: number): ChargingSession {
  return {
    id: Math.random().toString(),
    carId: 'default-car',
    kind: 'electric',
    startAt: '2024-01-01T10:00:00.000Z',
    endAt: null,
    energyKwh,
    cost: null,
    batteryStartPct: start,
    batteryEndPct: end,
    odometerKm: null,
    location: null,
    chargerType: null,
    notes: null,
    isLive: false,
    createdAt: '2024-01-01T10:00:00.000Z',
    updatedAt: '2024-01-01T10:00:00.000Z',
  }
}

const threeCharges = [charge(10, 20, 40), charge(15, 20, 50), charge(30, 20, 80)]

describe('BatterySection', () => {
  it('saves the capacity typed by the user', async () => {
    const user = userEvent.setup()
    const onSettingsChange = vi.fn()
    render(
      <BatterySection
        settings={DEFAULT_SETTINGS}
        sessions={[]}
        onSettingsChange={onSettingsChange}
      />,
    )

    await user.type(screen.getByLabelText('Capacidade útil (kWh)'), '52')

    expect(onSettingsChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ batteryCapacityKwh: 52 }),
    )
  })

  it('clears the capacity when the field is emptied', async () => {
    const user = userEvent.setup()
    const onSettingsChange = vi.fn()
    render(
      <BatterySection
        settings={{ ...DEFAULT_SETTINGS, batteryCapacityKwh: 52 }}
        sessions={[]}
        onSettingsChange={onSettingsChange}
      />,
    )

    await user.clear(screen.getByLabelText('Capacidade útil (kWh)'))

    expect(onSettingsChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ batteryCapacityKwh: null }),
    )
  })

  it('shows the estimate when there are enough charges', () => {
    render(
      <BatterySection
        settings={DEFAULT_SETTINGS}
        sessions={threeCharges}
        onSettingsChange={() => {}}
      />,
    )

    expect(screen.getByText(/Estimada pelos teus carregamentos: 50 kWh/)).toBeInTheDocument()
  })

  it('explains how to get an estimate when there are too few charges', () => {
    render(<BatterySection settings={DEFAULT_SETTINGS} sessions={[]} onSettingsChange={() => {}} />)

    expect(screen.getByText(/Para estimar, regista a bateria inicial e final/)).toBeInTheDocument()
  })
})
