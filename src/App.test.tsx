import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { loadLastSeenVersion, saveLastSeenVersion } from './storage/appVersionRepository'
import { resetUnreadableData } from './storage/localStorage'

const BUILT_FROM = '2026-10-20T10:00:00+01:00'

vi.mock('virtual:changelog', () => ({
  default: {
    builtFrom: '2026-10-20T10:00:00+01:00',
    entries: [
      { hash: 'abc1234', date: '2026-10-20T10:00:00+01:00', items: ['Novidade de teste.'] },
    ],
  },
}))

function storeOneSession() {
  const session = {
    id: 's1',
    carId: 'default-car',
    kind: 'electric',
    startAt: '2026-10-01T10:00:00.000Z',
    endAt: null,
    energyKwh: 10,
    cost: null,
    batteryStartPct: null,
    batteryEndPct: null,
    odometerKm: null,
    location: null,
    chargerType: null,
    notes: null,
    isLive: false,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
  }
  localStorage.setItem('historico-carregamentos:sessions', JSON.stringify([session]))
}

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

  describe('what is new popup', () => {
    it('stays hidden on a fresh install but records the version', () => {
      render(<App />)

      expect(screen.queryByRole('dialog', { name: 'Novidades' })).not.toBeInTheDocument()
      expect(loadLastSeenVersion()).toBe(BUILT_FROM)
    })

    it('shows up for someone with data who has not seen this version', () => {
      storeOneSession()
      render(<App />)

      const dialog = screen.getByRole('dialog', { name: 'Novidades' })
      expect(dialog).toHaveTextContent('Novidade de teste.')
    })

    it('stays hidden once this version was seen', () => {
      storeOneSession()
      saveLastSeenVersion(BUILT_FROM)
      render(<App />)

      expect(screen.queryByRole('dialog', { name: 'Novidades' })).not.toBeInTheDocument()
    })

    it('closes with OK', async () => {
      const user = userEvent.setup()
      storeOneSession()
      render(<App />)

      await user.click(screen.getByRole('button', { name: 'OK' }))

      expect(screen.queryByRole('dialog', { name: 'Novidades' })).not.toBeInTheDocument()
    })

    it('only shows once, even if the app is opened again without closing it', () => {
      storeOneSession()
      render(<App />)
      expect(screen.getByRole('dialog', { name: 'Novidades' })).toBeInTheDocument()
      cleanup()

      render(<App />)

      expect(screen.queryByRole('dialog', { name: 'Novidades' })).not.toBeInTheDocument()
    })
  })
})
