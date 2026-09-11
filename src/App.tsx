import { useMemo, useState } from 'react'
import { TabBar, type TabId } from './components/TabBar'
import { shouldShowBackupReminder } from './domain/backupReminder'
import { DEFAULT_CAR_ID } from './domain/types'
import { CalendarScreen } from './features/sessions/CalendarScreen'
import { LiveScreen } from './features/live/LiveScreen'
import { ReminderBanner } from './features/settings/ReminderBanner'
import { SettingsScreen } from './features/settings/SettingsScreen'
import { StatsScreen } from './features/stats/StatsScreen'
import { useFuelEntries } from './hooks/useFuelEntries'
import { useSessions } from './hooks/useSessions'
import { useSettings } from './hooks/useSettings'

export default function App() {
  const [tab, setTab] = useState<TabId>('calendar')
  const { settings, updateSettings } = useSettings()
  const {
    sessions,
    addSession,
    updateSession,
    deleteSession,
    deleteAllSessions,
    replaceAllSessions,
  } = useSessions()
  const {
    fuelEntries,
    addFuelEntry,
    updateFuelEntry,
    deleteFuelEntry,
    deleteAllFuelEntries,
    replaceAllFuelEntries,
  } = useFuelEntries()
  const [bannerDismissed, setBannerDismissed] = useState(false)

  const allEntries = useMemo(() => [...sessions, ...fuelEntries], [sessions, fuelEntries])

  const showReminder = useMemo(
    () => !bannerDismissed && shouldShowBackupReminder(settings, allEntries),
    [bannerDismissed, settings, allEntries],
  )

  function handleDeleteAll() {
    deleteAllSessions()
    deleteAllFuelEntries()
  }

  return (
    <>
      {showReminder && (
        <ReminderBanner
          onGoToBackup={() => {
            setTab('settings')
            setBannerDismissed(true)
          }}
          onDismiss={() => setBannerDismissed(true)}
        />
      )}

      <main className="screen">
        {tab === 'calendar' && (
          <CalendarScreen
            carId={DEFAULT_CAR_ID}
            tariffs={settings.tariffs}
            sessions={sessions}
            fuelEntries={fuelEntries}
            onAddSession={addSession}
            onUpdateSession={updateSession}
            onDeleteSession={deleteSession}
            onAddFuelEntry={addFuelEntry}
            onUpdateFuelEntry={updateFuelEntry}
            onDeleteFuelEntry={deleteFuelEntry}
          />
        )}
        {tab === 'live' && (
          <LiveScreen
            carId={DEFAULT_CAR_ID}
            tariffs={settings.tariffs}
            sessions={sessions}
            onAdd={addSession}
            onUpdate={updateSession}
          />
        )}
        {tab === 'stats' && <StatsScreen sessions={sessions} fuelEntries={fuelEntries} />}
        {tab === 'settings' && (
          <SettingsScreen
            settings={settings}
            sessions={sessions}
            fuelEntries={fuelEntries}
            onSettingsChange={updateSettings}
            onRestoreSessions={replaceAllSessions}
            onRestoreFuelEntries={replaceAllFuelEntries}
            onDeleteAll={handleDeleteAll}
          />
        )}
      </main>

      <TabBar active={tab} onChange={setTab} />
    </>
  )
}
