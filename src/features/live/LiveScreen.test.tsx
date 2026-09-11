import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_CAR_ID, type ChargingSession } from '../../domain/types'
import { LiveScreen } from './LiveScreen'

function makeLiveSession(): ChargingSession {
  const startAt = new Date(Date.now() - 5 * 60_000).toISOString()
  return {
    id: 'live-1',
    carId: DEFAULT_CAR_ID,
    startAt,
    endAt: null,
    energyKwh: 0,
    cost: null,
    batteryStartPct: null,
    batteryEndPct: null,
    odometerKm: null,
    location: null,
    chargerType: null,
    notes: null,
    isLive: true,
    createdAt: startAt,
    updatedAt: startAt,
  }
}

describe('LiveScreen', () => {
  it('shows a start button when there is no live session', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()
    render(
      <LiveScreen
        carId={DEFAULT_CAR_ID}
        tariffs={[]}
        sessions={[]}
        onAdd={onAdd}
        onUpdate={() => {}}
      />,
    )

    await user.click(screen.getByRole('button', { name: /Começar carregamento/ }))

    expect(onAdd).toHaveBeenCalledTimes(1)
    expect(onAdd.mock.calls[0][0]).toMatchObject({ isLive: true, energyKwh: 0 })
  })

  it('shows the in-progress state with elapsed duration when a live session exists', () => {
    render(
      <LiveScreen
        carId={DEFAULT_CAR_ID}
        tariffs={[]}
        sessions={[makeLiveSession()]}
        onAdd={() => {}}
        onUpdate={() => {}}
      />,
    )

    expect(screen.getByText('Carregamento em curso')).toBeInTheDocument()
    expect(screen.getByTestId('live-duration')).toHaveTextContent(/5m/)
  })

  it('finishes a live session with the entered energy and marks it as no longer live', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    render(
      <LiveScreen
        carId={DEFAULT_CAR_ID}
        tariffs={[]}
        sessions={[makeLiveSession()]}
        onAdd={() => {}}
        onUpdate={onUpdate}
      />,
    )

    await user.click(screen.getByRole('button', { name: /Terminar carregamento/ }))
    const dialog = screen.getByRole('dialog', { name: 'Terminar carregamento' })
    await user.type(within(dialog).getByLabelText(/Energia carregada/), '15')
    await user.click(within(dialog).getByRole('button', { name: 'Terminar' }))

    expect(onUpdate).toHaveBeenCalledTimes(1)
    const [id, changes] = onUpdate.mock.calls[0]
    expect(id).toBe('live-1')
    expect(changes).toMatchObject({ energyKwh: 15, isLive: false })
    expect(changes.endAt).not.toBeNull()
  })
})
