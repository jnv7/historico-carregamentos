import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CAR_ID, type ChargingSession, type FuelEntry } from '../../domain/types'
import { CalendarScreen } from './CalendarScreen'

function makeSession(overrides: Partial<ChargingSession> = {}): ChargingSession {
  const today = new Date()
  return {
    id: 'existing-session',
    carId: DEFAULT_CAR_ID,
    kind: 'electric',
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

function makeFuelEntry(overrides: Partial<FuelEntry> = {}): FuelEntry {
  const today = new Date()
  return {
    id: 'existing-fuel',
    carId: DEFAULT_CAR_ID,
    kind: 'fuel',
    startAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 0).toISOString(),
    liters: 35,
    cost: 55,
    odometerKm: null,
    location: null,
    notes: null,
    createdAt: today.toISOString(),
    updatedAt: today.toISOString(),
    ...overrides,
  }
}

function renderCalendar(overrides: Partial<Parameters<typeof CalendarScreen>[0]> = {}) {
  const onAddSession = vi.fn()
  const onUpdateSession = vi.fn()
  const onDeleteSession = vi.fn()
  const onAddFuelEntry = vi.fn()
  const onUpdateFuelEntry = vi.fn()
  const onDeleteFuelEntry = vi.fn()

  render(
    <CalendarScreen
      carId={DEFAULT_CAR_ID}
      tariffs={[]}
      sessions={[]}
      fuelEntries={[]}
      onAddSession={onAddSession}
      onUpdateSession={onUpdateSession}
      onDeleteSession={onDeleteSession}
      onAddFuelEntry={onAddFuelEntry}
      onUpdateFuelEntry={onUpdateFuelEntry}
      onDeleteFuelEntry={onDeleteFuelEntry}
      {...overrides}
    />,
  )

  return {
    onAddSession,
    onUpdateSession,
    onDeleteSession,
    onAddFuelEntry,
    onUpdateFuelEntry,
    onDeleteFuelEntry,
  }
}

describe('CalendarScreen', () => {
  beforeEach(() => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('shows today selected by default with no entries message', () => {
    renderCalendar()
    expect(screen.getByText('Sem registos neste dia.')).toBeInTheDocument()
  })

  it('lists both charging sessions and fuel entries for the selected day, sorted by time', () => {
    const session = makeSession()
    const fuel = makeFuelEntry()
    renderCalendar({ sessions: [session], fuelEntries: [fuel] })

    const cards = screen.getAllByText(/⚡|⛽/)
    expect(cards[0]).toHaveTextContent('⚡')
    expect(cards[1]).toHaveTextContent('⛽')
    expect(screen.getByText(/8 kWh/)).toBeInTheDocument()
    expect(screen.getByText(/35 L/)).toBeInTheDocument()
  })

  it('adds a new charging session for the selected day', async () => {
    const user = userEvent.setup()
    const { onAddSession } = renderCalendar()

    await user.click(screen.getByRole('button', { name: /⚡ Carregamento/ }))
    const dialog = screen.getByRole('dialog', { name: 'Novo carregamento' })
    await user.type(within(dialog).getByLabelText(/Energia carregada/), '5')
    await user.click(within(dialog).getByRole('button', { name: 'Adicionar' }))

    expect(onAddSession).toHaveBeenCalledTimes(1)
    expect(onAddSession.mock.calls[0][0].energyKwh).toBe(5)
  })

  it('adds a new fuel entry for the selected day', async () => {
    const user = userEvent.setup()
    const { onAddFuelEntry } = renderCalendar()

    await user.click(screen.getByRole('button', { name: /⛽ Abastecimento/ }))
    const dialog = screen.getByRole('dialog', { name: 'Novo abastecimento' })
    await user.type(within(dialog).getByLabelText('Litros'), '40')
    await user.type(within(dialog).getByLabelText('Total (€)'), '60')
    await user.click(within(dialog).getByRole('button', { name: 'Adicionar' }))

    expect(onAddFuelEntry).toHaveBeenCalledTimes(1)
    expect(onAddFuelEntry.mock.calls[0][0]).toMatchObject({ kind: 'fuel', liters: 40, cost: 60 })
  })

  it('opens the edit form pre-filled for an existing charging session', async () => {
    const user = userEvent.setup()
    const { onUpdateSession } = renderCalendar({ sessions: [makeSession()] })

    await user.click(screen.getByRole('button', { name: 'Editar carregamento' }))
    const dialog = screen.getByRole('dialog', { name: 'Editar carregamento' })
    expect(within(dialog).getByLabelText(/Energia carregada/)).toHaveValue(8)

    await user.click(within(dialog).getByRole('button', { name: 'Guardar alterações' }))
    expect(onUpdateSession).toHaveBeenCalledWith(
      'existing-session',
      expect.objectContaining({ energyKwh: 8 }),
    )
  })

  it('opens the edit form pre-filled for an existing fuel entry', async () => {
    const user = userEvent.setup()
    const { onUpdateFuelEntry } = renderCalendar({ fuelEntries: [makeFuelEntry()] })

    await user.click(screen.getByRole('button', { name: 'Editar abastecimento' }))
    const dialog = screen.getByRole('dialog', { name: 'Editar abastecimento' })
    expect(within(dialog).getByLabelText(/Litros/)).toHaveValue(35)

    await user.click(within(dialog).getByRole('button', { name: 'Guardar alterações' }))
    expect(onUpdateFuelEntry).toHaveBeenCalledWith(
      'existing-fuel',
      expect.objectContaining({ liters: 35 }),
    )
  })

  it('deletes a charging session after confirmation', async () => {
    const user = userEvent.setup()
    const { onDeleteSession } = renderCalendar({ sessions: [makeSession()] })

    await user.click(screen.getByRole('button', { name: 'Apagar carregamento' }))
    expect(onDeleteSession).toHaveBeenCalledWith('existing-session')
  })

  it('deletes a fuel entry after confirmation', async () => {
    const user = userEvent.setup()
    const { onDeleteFuelEntry } = renderCalendar({ fuelEntries: [makeFuelEntry()] })

    await user.click(screen.getByRole('button', { name: 'Apagar abastecimento' }))
    expect(onDeleteFuelEntry).toHaveBeenCalledWith('existing-fuel')
  })
})
