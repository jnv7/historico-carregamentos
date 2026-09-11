import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

describe('Modal', () => {
  it('renders the title and children', () => {
    render(
      <Modal title="Título" onClose={() => {}}>
        <p>Conteúdo</p>
      </Modal>,
    )
    expect(screen.getByRole('dialog', { name: 'Título' })).toBeInTheDocument()
    expect(screen.getByText('Conteúdo')).toBeInTheDocument()
  })

  it('calls onClose when the close button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Modal title="Título" onClose={onClose}>
        <p>Conteúdo</p>
      </Modal>,
    )

    await user.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when clicking the overlay but not when clicking inside the sheet', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Modal title="Título" onClose={onClose}>
        <p>Conteúdo</p>
      </Modal>,
    )

    await user.click(screen.getByText('Conteúdo'))
    expect(onClose).not.toHaveBeenCalled()

    await user.click(screen.getByRole('dialog').parentElement!)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
