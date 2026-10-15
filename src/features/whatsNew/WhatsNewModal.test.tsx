import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { WhatsNewModal } from './WhatsNewModal'

const entries = [
  { hash: 'aaa1111', date: '2026-10-20T10:00:00+01:00', items: ['Primeira.', 'Segunda.'] },
  { hash: 'bbb2222', date: '2026-10-19T10:00:00+01:00', items: ['Terceira.'] },
]

describe('WhatsNewModal', () => {
  it('lists every sentence of every entry', () => {
    render(<WhatsNewModal entries={entries} onClose={() => {}} />)

    const dialog = screen.getByRole('dialog', { name: 'Novidades' })
    expect(
      within(dialog)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['Primeira.', 'Segunda.', 'Terceira.'])
  })

  it('closes with the OK button', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<WhatsNewModal entries={entries} onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: 'OK' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes with the ✕ button', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<WhatsNewModal entries={entries} onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: 'Fechar' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
