import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CAR_ID, type ChargingSession } from '../../domain/types'
import { CalendarScreen } from './CalendarScreen'

function makeSession(overrides: Partial<ChargingSession> = {}): ChargingSession {
  const today = new Date()
  return {
    id: 'existing',
    carId: DEFAULT_CAR_ID,
    startAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0).toISOString(),
    endAt: null,
    energyKwh: 8,
    cost: 1.5,
    batteryStartPct: null,
    batteryEndPct: null,
    odometerKm: null,
    location: null,
    chargerType: null,
    notes: null,
    isLive: false,
    createdAt: today.toISOString(),
    updatedAt: today.toISOString(),
    ...overrides,
  }
}

describe('CalendarScreen', () => {
  beforeEach(() => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('shows today selected by default with no sessions message', () => {
    render(
      <CalendarScreen
        carId={DEFAULT_CAR_ID}
        tariffs={[]}
        sessions={[]}
        onAdd={() => {}}
        onUpdate={() => {}}
        onDelete={() => {}}
      />,
    )

    expect(screen.getByText('Sem carregamentos registados.')).toBeInTheDocument()
  })

  it('lists sessions for the selected day', () => {
    const session = makeSession()
    render(
      <CalendarScreen
        carId={DEFAULT_CAR_ID}
        tariffs={[]}
        sessions={[session]}
        onAdd={() => {}}
        onUpdate={() => {}}
        onDelete={() => {}}
      />,
    )

    expect(screen.getByText(/8 kWh/)).toBeInTheDocument()
  })

  it('opens the form and adds a new session for the selected day', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()
    render(
      <CalendarScreen
        carId={DEFAULT_CAR_ID}
        tariffs={[]}
        sessions={[]}
        onAdd={onAdd}
        onUpdate={() => {}}
        onDelete={() => {}}
      />,
    )

    await user.click(screen.getByRole('button', { name: /\+ Carregamento/ }))
    const dialog = screen.getByRole('dialog', { name: 'Novo carregamento' })
    await user.type(within(dialog).getByLabelText(/Energia carregada/), '5')
    await user.click(within(dialog).getByRole('button', { name: 'Adicionar' }))

    expect(onAdd).toHaveBeenCalledTimes(1)
    expect(onAdd.mock.calls[0][0].energyKwh).toBe(5)
  })

  it('opens the edit form pre-filled for an existing session', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    const session = makeSession()
    render(
      <CalendarScreen
        carId={DEFAULT_CAR_ID}
        tariffs={[]}
        sessions={[session]}
        onAdd={() => {}}
        onUpdate={onUpdate}
        onDelete={() => {}}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Editar carregamento' }))
    const dialog = screen.getByRole('dialog', { name: 'Editar carregamento' })
    expect(within(dialog).getByLabelText(/Energia carregada/)).toHaveValue(8)

    await user.click(within(dialog).getByRole('button', { name: 'Guardar alterações' }))
    expect(onUpdate).toHaveBeenCalledWith('existing', expect.objectContaining({ energyKwh: 8 }))
  })

  it('deletes a session after confirmation', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    const session = makeSession()
    render(
      <CalendarScreen
        carId={DEFAULT_CAR_ID}
        tariffs={[]}
        sessions={[session]}
        onAdd={() => {}}
        onUpdate={() => {}}
        onDelete={onDelete}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Apagar carregamento' }))
    expect(onDelete).toHaveBeenCalledWith('existing')
  })
})
