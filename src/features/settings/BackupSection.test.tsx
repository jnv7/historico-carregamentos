import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../../storage/settingsRepository'
import { createBackup } from '../../storage/backup'
import { BackupSection } from './BackupSection'

vi.mock('../../utils/download', () => ({
  downloadTextFile: vi.fn(),
}))

import { downloadTextFile } from '../../utils/download'

describe('BackupSection', () => {
  beforeEach(() => {
    vi.mocked(downloadTextFile).mockClear()
  })

  it('exports a backup file and records the backup time', async () => {
    const user = userEvent.setup()
    const onSettingsChange = vi.fn()
    render(
      <BackupSection
        settings={DEFAULT_SETTINGS}
        sessions={[]}
        onSettingsChange={onSettingsChange}
        onRestoreSessions={() => {}}
        onDeleteAll={() => {}}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Exportar dados' }))

    expect(downloadTextFile).toHaveBeenCalledTimes(1)
    expect(onSettingsChange.mock.calls[0][0].backupReminder.lastBackupAt).toBeTruthy()
  })

  it('imports a valid backup file and restores sessions and settings', async () => {
    const user = userEvent.setup()
    const onSettingsChange = vi.fn()
    const onRestoreSessions = vi.fn()
    const backup = createBackup({ ...DEFAULT_SETTINGS, carName: 'Restaurado' }, [])
    const file = new File([JSON.stringify(backup)], 'backup.json', { type: 'application/json' })

    render(
      <BackupSection
        settings={DEFAULT_SETTINGS}
        sessions={[]}
        onSettingsChange={onSettingsChange}
        onRestoreSessions={onRestoreSessions}
        onDeleteAll={() => {}}
      />,
    )

    const input = screen.getByLabelText('Selecionar ficheiro de backup')
    await user.upload(input, file)

    expect(await screen.findByText('Dados importados com sucesso.')).toBeInTheDocument()
    expect(onRestoreSessions).toHaveBeenCalledWith([])
    expect(onSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({ carName: 'Restaurado' }),
    )
  })

  it('shows an error for an invalid backup file', async () => {
    const user = userEvent.setup()
    const file = new File(['not a valid backup'], 'backup.json', { type: 'application/json' })

    render(
      <BackupSection
        settings={DEFAULT_SETTINGS}
        sessions={[]}
        onSettingsChange={() => {}}
        onRestoreSessions={() => {}}
        onDeleteAll={() => {}}
      />,
    )

    const input = screen.getByLabelText('Selecionar ficheiro de backup')
    await user.upload(input, file)

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('reveals the interval field once reminders are enabled', async () => {
    const user = userEvent.setup()
    const onSettingsChange = vi.fn()
    render(
      <BackupSection
        settings={DEFAULT_SETTINGS}
        sessions={[]}
        onSettingsChange={onSettingsChange}
        onRestoreSessions={() => {}}
        onDeleteAll={() => {}}
      />,
    )

    expect(screen.queryByLabelText('A cada quantos dias')).not.toBeInTheDocument()
    await user.click(screen.getByLabelText(/Lembrar-me de fazer backup/))
    expect(onSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({ backupReminder: expect.objectContaining({ enabled: true }) }),
    )
  })

  it('requires a confirmation step before deleting all data', async () => {
    const user = userEvent.setup()
    const onDeleteAll = vi.fn()
    render(
      <BackupSection
        settings={DEFAULT_SETTINGS}
        sessions={[]}
        onSettingsChange={() => {}}
        onRestoreSessions={() => {}}
        onDeleteAll={onDeleteAll}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Apagar todos os dados' }))
    expect(onDeleteAll).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(onDeleteAll).toHaveBeenCalledTimes(1)
  })
})
