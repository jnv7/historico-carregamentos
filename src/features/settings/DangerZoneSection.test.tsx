import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DangerZoneSection } from './DangerZoneSection'

describe('DangerZoneSection', () => {
  it('requires a confirmation step before deleting all data', async () => {
    const user = userEvent.setup()
    const onDeleteAll = vi.fn()
    render(<DangerZoneSection onDeleteAll={onDeleteAll} />)

    await user.click(screen.getByRole('button', { name: 'Apagar todos os dados' }))
    expect(onDeleteAll).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(onDeleteAll).toHaveBeenCalledTimes(1)
  })
})
