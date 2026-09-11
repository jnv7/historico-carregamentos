import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Tariff } from '../../domain/types'
import { SessionForm } from './SessionForm'

const tariffs: Tariff[] = [
  { id: 'vazio', label: 'Vazio', pricePerKwh: 0.1, ranges: [{ start: '00:00', end: '23:59' }] },
]

describe('SessionForm', () => {
  it('requires energy but submits with only date + energy filled in', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<SessionForm carId="car-1" tariffs={[]} onSubmit={onSubmit} onCancel={() => {}} />)

    await user.click(screen.getByRole('button', { name: /Guardar/ }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/energia/i)

    await user.type(screen.getByLabelText(/Energia carregada/), '12.5')
    await user.click(screen.getByRole('button', { name: /Guardar/ }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const submitted = onSubmit.mock.calls[0][0]
    expect(submitted.energyKwh).toBe(12.5)
    expect(submitted.location).toBeNull()
    expect(submitted.chargerType).toBeNull()
    expect(submitted.notes).toBeNull()
  })

  it('infers cost from tariffs when the cost field is left blank', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<SessionForm carId="car-1" tariffs={tariffs} onSubmit={onSubmit} onCancel={() => {}} />)

    await user.type(screen.getByLabelText(/Energia carregada/), '10')
    await user.click(screen.getByRole('button', { name: /Guardar/ }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0].cost).toBe(1)
  })

  it('lets the user override the inferred cost', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<SessionForm carId="car-1" tariffs={tariffs} onSubmit={onSubmit} onCancel={() => {}} />)

    await user.type(screen.getByLabelText(/Energia carregada/), '10')
    await user.type(screen.getByLabelText(/^Custo/), '9.99')
    await user.click(screen.getByRole('button', { name: /Guardar/ }))

    expect(onSubmit.mock.calls[0][0].cost).toBe(9.99)
  })

  it('calls onCancel without submitting', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    const onCancel = vi.fn()
    render(<SessionForm carId="car-1" tariffs={[]} onSubmit={onSubmit} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: /Cancelar/ }))

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
