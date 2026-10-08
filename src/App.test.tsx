import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { resetUnreadableData } from './storage/localStorage'

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
    resetUnreadableData()
  })

  it('warns about unreadable stored data and keeps a copy of it', () => {
    localStorage.setItem('historico-carregamentos:sessions', '{not json')
    render(<App />)

    expect(screen.getByRole('alert')).toHaveTextContent('não puderam ser lidos')
    expect(screen.getByRole('button', { name: 'Descarregar cópia' })).toBeInTheDocument()
    const copies = Object.keys(localStorage).filter((k) =>
      k.startsWith('historico-carregamentos:recovered:historico-carregamentos:sessions:'),
    )
    expect(copies.map((k) => localStorage.getItem(k))).toEqual(['{not json'])
  })

  it('starts on the calendar tab', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /⚡ Carregamento/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /⛽ Abastecimento/ })).toBeInTheDocument()
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

  it('adding a charging session in the calendar makes it show up in stats', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /⚡ Carregamento/ }))
    await user.type(screen.getByLabelText(/Energia carregada/), '7')
    await user.click(screen.getByRole('button', { name: 'Adicionar' }))

    await user.click(screen.getByRole('button', { name: /Estatísticas/ }))
    await user.click(screen.getByRole('button', { name: 'Elétrico' }))
    expect(screen.getByText('7 kWh')).toBeInTheDocument()
  })

  it('adding a fuel entry in the calendar makes it show up in stats', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /⛽ Abastecimento/ }))
    await user.type(screen.getByLabelText('Litros'), '40')
    await user.type(screen.getByLabelText('Total (€)'), '60')
    await user.click(screen.getByRole('button', { name: 'Adicionar' }))

    await user.click(screen.getByRole('button', { name: /Estatísticas/ }))
    await user.click(screen.getByRole('button', { name: 'Combustível' }))
    expect(screen.getByText('40 L')).toBeInTheDocument()
  })
})
