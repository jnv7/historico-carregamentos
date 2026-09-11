import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TabBar } from './TabBar'

describe('TabBar', () => {
  it('marks the active tab as current', () => {
    render(<TabBar active="stats" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: /Estatísticas/ })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('button', { name: /Registos/ })).not.toHaveAttribute('aria-current')
  })

  it('calls onChange with the selected tab id', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TabBar active="calendar" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: /Live/ }))

    expect(onChange).toHaveBeenCalledWith('live')
  })
})
