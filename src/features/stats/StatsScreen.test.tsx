import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DEFAULT_CAR_ID, type ChargingSession } from '../../domain/types'
import { StatsScreen } from './StatsScreen'

function makeSession(overrides: Partial<ChargingSession>): ChargingSession {
  return {
    id: Math.random().toString(),
    carId: DEFAULT_CAR_ID,
    startAt: '2024-01-01T10:00:00.000Z',
    endAt: null,
    energyKwh: 10,
    cost: null,
    batteryStartPct: null,
    batteryEndPct: null,
    odometerKm: null,
    location: null,
    chargerType: null,
    notes: null,
    isLive: false,
    createdAt: '2024-01-01T10:00:00.000Z',
    updatedAt: '2024-01-01T10:00:00.000Z',
    ...overrides,
  }
}

describe('StatsScreen', () => {
  it('shows an empty state with no sessions', () => {
    render(<StatsScreen sessions={[]} />)
    expect(screen.getByText(/Ainda não há carregamentos/)).toBeInTheDocument()
  })

  it('shows totals for the given sessions', () => {
    const sessions = [
      makeSession({ energyKwh: 10, cost: 2 }),
      makeSession({ energyKwh: 20, cost: 4 }),
    ]
    render(<StatsScreen sessions={sessions} />)

    expect(screen.getByText('2')).toBeInTheDocument() // count
    expect(screen.getByText('30 kWh')).toBeInTheDocument()
    expect(screen.getByText(/6,00/)).toBeInTheDocument() // total cost
  })

  it('shows cost per km when odometer readings allow it', () => {
    const sessions = [
      makeSession({ startAt: '2024-01-01T10:00:00.000Z', odometerKm: 1000, cost: 5 }),
      makeSession({ startAt: '2024-01-10T10:00:00.000Z', odometerKm: 1500, cost: 5 }),
    ]
    render(<StatsScreen sessions={sessions} />)

    expect(screen.getByText('Custo médio por km')).toBeInTheDocument()
  })
})
