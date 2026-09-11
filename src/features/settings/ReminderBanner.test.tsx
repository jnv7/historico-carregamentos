import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ReminderBanner } from './ReminderBanner'

describe('ReminderBanner', () => {
  it('calls onGoToBackup and onDismiss on their respective buttons', async () => {
    const user = userEvent.setup()
    const onGoToBackup = vi.fn()
    const onDismiss = vi.fn()
    render(<ReminderBanner onGoToBackup={onGoToBackup} onDismiss={onDismiss} />)

    await user.click(screen.getByRole('button', { name: 'Fazer backup' }))
    expect(onGoToBackup).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Mais tarde' }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
