import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../../storage/settingsRepository'
import { SettingsScreen } from './SettingsScreen'

describe('SettingsScreen', () => {
  it('updates the car name', async () => {
    const user = userEvent.setup()
    const onSettingsChange = vi.fn()
    render(
      <SettingsScreen
        settings={DEFAULT_SETTINGS}
        sessions={[]}
        onSettingsChange={onSettingsChange}
        onRestoreSessions={() => {}}
        onDeleteAll={() => {}}
      />,
    )

    const input = screen.getByLabelText('Nome do carro')
    await user.type(input, '!')

    expect(onSettingsChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ carName: `${DEFAULT_SETTINGS.carName}!` }),
    )
  })

  it('renders the tariff editor and backup section', () => {
    render(
      <SettingsScreen
        settings={DEFAULT_SETTINGS}
        sessions={[]}
        onSettingsChange={() => {}}
        onRestoreSessions={() => {}}
        onDeleteAll={() => {}}
      />,
    )

    expect(screen.getByText('Tarifas')).toBeInTheDocument()
    expect(screen.getByText('Cópia de segurança')).toBeInTheDocument()
  })
})
