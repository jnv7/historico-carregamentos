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
    kind: 'electric',
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

  it('starts without details when the optional section is left alone', async () => {
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

    expect(onAdd.mock.calls[0][0]).toMatchObject({ batteryStartPct: null, odometerKm: null })
  })

  it('starts with the details filled in before the charge begins', async () => {
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

    await user.click(screen.getByText('Adicionar detalhes (opcional)'))
    await user.type(screen.getByLabelText('Bateria inicial (%)'), '20')
    await user.type(screen.getByLabelText('Quilometragem (km)'), '12345')
    await user.selectOptions(screen.getByLabelText('Tipo de carregador'), 'public_dc')
    await user.click(screen.getByRole('button', { name: /Começar carregamento/ }))

    expect(onAdd).toHaveBeenCalledTimes(1)
    expect(onAdd.mock.calls[0][0]).toMatchObject({
      batteryStartPct: 20,
      odometerKm: 12345,
      chargerType: 'public_dc',
      isLive: true,
    })
  })

  it('does not start when a detail is invalid', async () => {
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

    await user.click(screen.getByText('Adicionar detalhes (opcional)'))
    await user.type(screen.getByLabelText('Bateria inicial (%)'), '150')
    await user.click(screen.getByRole('button', { name: /Começar carregamento/ }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'A bateria inicial tem de estar entre 0 e 100%.',
    )
    expect(onAdd).not.toHaveBeenCalled()
  })

  it('shows the details already known on the in-progress card', () => {
    render(
      <LiveScreen
        carId={DEFAULT_CAR_ID}
        tariffs={[]}
        sessions={[{ ...makeLiveSession(), batteryStartPct: 20, odometerKm: 12345 }]}
        onAdd={() => {}}
        onUpdate={() => {}}
      />,
    )

    expect(screen.getByText('20%')).toBeInTheDocument()
    expect(screen.getByText(/12\s?345 km/)).toBeInTheDocument()
  })

  it('edits the details without finishing the charge', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    render(
      <LiveScreen
        carId={DEFAULT_CAR_ID}
        tariffs={[]}
        sessions={[{ ...makeLiveSession(), batteryStartPct: 20 }]}
        onAdd={() => {}}
        onUpdate={onUpdate}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Editar detalhes' }))
    const dialog = screen.getByRole('dialog', { name: 'Detalhes do carregamento' })
    const battery = within(dialog).getByLabelText('Bateria inicial (%)')
    await user.clear(battery)
    await user.type(battery, '25')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))

    expect(onUpdate).toHaveBeenCalledWith(
      'live-1',
      expect.objectContaining({ batteryStartPct: 25 }),
    )
    expect(onUpdate.mock.calls[0][1]).not.toHaveProperty('isLive')
    expect(onUpdate.mock.calls[0][1]).not.toHaveProperty('endAt')
  })

  it('discards the changes when editing is cancelled', async () => {
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

    await user.click(screen.getByRole('button', { name: 'Editar detalhes' }))
    const dialog = screen.getByRole('dialog', { name: 'Detalhes do carregamento' })
    await user.type(within(dialog).getByLabelText('Bateria inicial (%)'), '25')
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

    expect(onUpdate).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('pre-fills the finish form with the known details and leaves energy empty', async () => {
    const user = userEvent.setup()
    render(
      <LiveScreen
        carId={DEFAULT_CAR_ID}
        tariffs={[]}
        sessions={[{ ...makeLiveSession(), odometerKm: 12345 }]}
        onAdd={() => {}}
        onUpdate={() => {}}
      />,
    )

    await user.click(screen.getByRole('button', { name: /Terminar carregamento/ }))
    const dialog = screen.getByRole('dialog', { name: 'Terminar carregamento' })

    expect(within(dialog).getByLabelText('Quilometragem (km)')).toHaveValue(12345)
    expect(within(dialog).getByLabelText(/Energia carregada/)).toHaveValue(null)
  })
})
