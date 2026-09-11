import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DateTimeFields } from './DateTimeFields'

describe('DateTimeFields', () => {
  it('calls onDateChange and onTimeChange as the user edits the fields', async () => {
    const user = userEvent.setup()
    const onDateChange = vi.fn()
    const onTimeChange = vi.fn()
    render(
      <DateTimeFields
        idPrefix="entry"
        dateValue="2024-01-01"
        timeValue="10:00"
        onDateChange={onDateChange}
        onTimeChange={onTimeChange}
      />,
    )

    await user.clear(screen.getByLabelText(/Data/))
    await user.type(screen.getByLabelText(/Data/), '2024-02-03')
    expect(onDateChange).toHaveBeenCalled()

    await user.clear(screen.getByLabelText(/Hora/))
    await user.type(screen.getByLabelText(/Hora/), '11:30')
    expect(onTimeChange).toHaveBeenCalled()
  })
})
