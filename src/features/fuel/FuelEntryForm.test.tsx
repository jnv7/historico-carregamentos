import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FuelEntryForm } from './FuelEntryForm'

describe('FuelEntryForm', () => {
  it('requires enough fields to know both litres and total cost', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<FuelEntryForm carId="car-1" onSubmit={onSubmit} onCancel={() => {}} />)

    await user.click(screen.getByRole('button', { name: /Guardar/ }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/litros/i)

    await user.type(screen.getByLabelText('Litros'), '35')
    await user.click(screen.getByRole('button', { name: /Guardar/ }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/custo total/i)

    await user.type(screen.getByLabelText('Total (€)'), '55.5')
    await user.click(screen.getByRole('button', { name: /Guardar/ }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const submitted = onSubmit.mock.calls[0][0]
    expect(submitted.kind).toBe('fuel')
    expect(submitted.liters).toBe(35)
    expect(submitted.cost).toBe(55.5)
    expect(submitted.odometerKm).toBeNull()
  })

  it('computes the total cost when litres and price per litre are given', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<FuelEntryForm carId="car-1" onSubmit={onSubmit} onCancel={() => {}} />)

    await user.type(screen.getByLabelText('Litros'), '40')
    await user.type(screen.getByLabelText('€/L'), '1.5')

    expect(screen.getByLabelText('Total (€)')).toHaveValue(60)

    await user.click(screen.getByRole('button', { name: /Guardar/ }))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ liters: 40, cost: 60 })
  })

  it('computes the litres when price per litre and total cost are given', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<FuelEntryForm carId="car-1" onSubmit={onSubmit} onCancel={() => {}} />)

    await user.type(screen.getByLabelText('€/L'), '1.5')
    await user.type(screen.getByLabelText('Total (€)'), '60')

    expect(screen.getByLabelText('Litros')).toHaveValue(40)

    await user.click(screen.getByRole('button', { name: /Guardar/ }))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ liters: 40, cost: 60 })
  })

  it('includes optional details when filled in', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<FuelEntryForm carId="car-1" onSubmit={onSubmit} onCancel={() => {}} />)

    await user.type(screen.getByLabelText('Litros'), '35')
    await user.type(screen.getByLabelText('Total (€)'), '55.5')
    await user.click(screen.getByText('Mais detalhes (opcional)'))
    await user.type(screen.getByLabelText(/Quilometragem/), '12345')
    await user.click(screen.getByRole('button', { name: /Guardar/ }))

    expect(onSubmit.mock.calls[0][0].odometerKm).toBe(12345)
  })

  it('calls onCancel without submitting', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    const onCancel = vi.fn()
    render(<FuelEntryForm carId="car-1" onSubmit={onSubmit} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: /Cancelar/ }))

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
