import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Tariff } from '../../domain/types'
import { TariffEditor } from './TariffEditor'

describe('TariffEditor', () => {
  it('shows a message and no rows when there are no tariffs', () => {
    render(<TariffEditor tariffs={[]} onChange={() => {}} />)
    expect(screen.getByText(/Sem tarifas configuradas/)).toBeInTheDocument()
  })

  it('adds a new tariff up to the maximum of 3', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const tariffs: Tariff[] = [
      { id: '1', label: 'A', pricePerKwh: 0.1, ranges: [{ start: '00:00', end: '23:59' }] },
      { id: '2', label: 'B', pricePerKwh: 0.2, ranges: [{ start: '00:00', end: '23:59' }] },
    ]
    render(<TariffEditor tariffs={tariffs} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: '+ Tarifa' }))

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0]).toHaveLength(3)
  })

  it('disables adding a 4th tariff', () => {
    const tariffs: Tariff[] = Array.from({ length: 3 }, (_, i) => ({
      id: String(i),
      label: `T${i}`,
      pricePerKwh: 0.1,
      ranges: [{ start: '00:00', end: '23:59' }],
    }))
    render(<TariffEditor tariffs={tariffs} onChange={() => {}} />)
    expect(screen.getByRole('button', { name: '+ Tarifa' })).toBeDisabled()
  })

  it('updates a tariff price', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const tariffs: Tariff[] = [
      { id: '1', label: 'Vazio', pricePerKwh: 0.1, ranges: [{ start: '22:00', end: '08:00' }] },
    ]
    render(<TariffEditor tariffs={tariffs} onChange={onChange} />)

    const priceInput = screen.getByLabelText('€/kWh')
    await user.clear(priceInput)
    await user.type(priceInput, '0.15')

    const lastCall = onChange.mock.calls.at(-1)![0] as Tariff[]
    expect(lastCall[0].pricePerKwh).toBe(0.15)
  })

  it('shows a blank price field for a freshly added tariff, not a literal 0 to type after', async () => {
    const user = userEvent.setup()
    const tariffs: Tariff[] = [
      { id: '1', label: 'Tarifa 1', pricePerKwh: 0, ranges: [{ start: '00:00', end: '23:59' }] },
    ]
    render(<TariffEditor tariffs={tariffs} onChange={() => {}} />)

    const priceInput = screen.getByLabelText('€/kWh')
    expect(priceInput).toHaveValue(null)

    await user.type(priceInput, '0.1521')
    expect(priceInput).toHaveValue(0.1521)
  })

  it('removes a tariff', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const tariffs: Tariff[] = [
      { id: '1', label: 'Vazio', pricePerKwh: 0.1, ranges: [{ start: '22:00', end: '08:00' }] },
    ]
    render(<TariffEditor tariffs={tariffs} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Remover tarifa' }))

    expect(onChange).toHaveBeenCalledWith([])
  })
})
