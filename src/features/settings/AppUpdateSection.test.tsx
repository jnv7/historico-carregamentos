import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CarSettings } from '../../domain/types'
import { DEFAULT_SETTINGS } from '../../storage/settingsRepository'
import { AppUpdateSection } from './AppUpdateSection'

vi.mock('../../utils/appUpdate', () => ({ updateAndReload: vi.fn() }))
vi.mock('../../utils/download', () => ({ downloadTextFile: vi.fn() }))

import { updateAndReload } from '../../utils/appUpdate'
import { downloadTextFile } from '../../utils/download'

function renderSection(askBeforeUpdate: boolean) {
  const onSettingsChange = vi.fn()
  const settings: CarSettings = {
    ...DEFAULT_SETTINGS,
    backupReminder: { ...DEFAULT_SETTINGS.backupReminder, askBeforeUpdate },
  }
  render(
    <AppUpdateSection
      settings={settings}
      sessions={[]}
      fuelEntries={[]}
      onSettingsChange={onSettingsChange}
    />,
  )
  return { onSettingsChange }
}

describe('AppUpdateSection', () => {
  beforeEach(() => {
    vi.mocked(updateAndReload).mockClear()
    vi.mocked(downloadTextFile).mockClear()
  })

  it('updates straight away when the backup prompt is turned off', async () => {
    const user = userEvent.setup()
    renderSection(false)

    await user.click(screen.getByRole('button', { name: 'Procurar atualizações e recarregar' }))

    expect(updateAndReload).toHaveBeenCalledTimes(1)
  })

  it('offers a backup before updating and only updates once confirmed', async () => {
    const user = userEvent.setup()
    const { onSettingsChange } = renderSection(true)

    await user.click(screen.getByRole('button', { name: 'Procurar atualizações e recarregar' }))
    expect(updateAndReload).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Exportar dados' }))
    expect(downloadTextFile).toHaveBeenCalledTimes(1)
    expect(onSettingsChange.mock.calls[0][0].backupReminder.lastBackupAt).toBeTruthy()
    expect(updateAndReload).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Atualizar agora' }))
    expect(updateAndReload).toHaveBeenCalledTimes(1)
  })

  it('can skip the backup or cancel', async () => {
    const user = userEvent.setup()
    renderSection(true)

    await user.click(screen.getByRole('button', { name: 'Procurar atualizações e recarregar' }))
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(updateAndReload).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Procurar atualizações e recarregar' }))
    await user.click(screen.getByRole('button', { name: 'Atualizar sem cópia' }))
    expect(updateAndReload).toHaveBeenCalledTimes(1)
  })
})
