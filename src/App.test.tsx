import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts on the calendar tab', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /\+ Carregamento/ })).toBeInTheDocument()
  })

  it('navigates between tabs', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /Live/ }))
    expect(screen.getByText('Carregamento ao vivo')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Estatísticas/ }))
    expect(screen.getByRole('heading', { name: 'Estatísticas' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Definições/ }))
    expect(screen.getByLabelText('Nome do carro')).toBeInTheDocument()
  })

  it('adding a session in the calendar makes it show up in stats', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /\+ Carregamento/ }))
    await user.type(screen.getByLabelText(/Energia carregada/), '7')
    await user.click(screen.getByRole('button', { name: 'Adicionar' }))

    await user.click(screen.getByRole('button', { name: /Estatísticas/ }))
    expect(screen.getByText('7 kWh')).toBeInTheDocument()
  })
})
