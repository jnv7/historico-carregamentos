import { useEffect, useMemo, useState } from 'react'
import changelog from 'virtual:changelog'
import { TabBar, type TabId } from './components/TabBar'
import { effectiveBatteryCapacity } from './domain/batteryCapacity'
import { shouldShowBackupReminder } from './domain/backupReminder'
import { DEFAULT_CAR_ID } from './domain/types'
import { entriesToShow } from './domain/whatsNew'
import { CalendarScreen } from './features/sessions/CalendarScreen'
import { LiveScreen } from './features/live/LiveScreen'
import { ReminderBanner } from './features/settings/ReminderBanner'
import { SettingsScreen } from './features/settings/SettingsScreen'
import { UnreadableDataBanner } from './features/settings/UnreadableDataBanner'
import { StatsScreen } from './features/stats/StatsScreen'
import { WhatsNewModal } from './features/whatsNew/WhatsNewModal'
import { useFuelEntries } from './hooks/useFuelEntries'
import { useSessions } from './hooks/useSessions'
import { useSettings } from './hooks/useSettings'
import { loadLastSeenVersion, saveLastSeenVersion } from './storage/appVersionRepository'
import { getUnreadableData } from './storage/localStorage'

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
  // Read after the hooks above have loaded everything from storage.
  const [unreadableData] = useState(() => getUnreadableData())
  const [unreadableDismissed, setUnreadableDismissed] = useState(false)

  const [whatsNew, setWhatsNew] = useState(() =>
    entriesToShow(changelog, loadLastSeenVersion(), sessions.length > 0 || fuelEntries.length > 0),
  )

  // Marked as seen as soon as the app opens, so the popup only ever shows once.
  useEffect(() => {
    if (changelog.builtFrom) saveLastSeenVersion(changelog.builtFrom)
  }, [])

  const batteryCapacityKwh = useMemo(
    () => effectiveBatteryCapacity(settings.batteryCapacityKwh, sessions),
    [settings.batteryCapacityKwh, sessions],
  )

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
      {unreadableData.length > 0 && !unreadableDismissed && (
        <UnreadableDataBanner
          items={unreadableData}
          onDismiss={() => setUnreadableDismissed(true)}
        />
      )}
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
            fullyElectric={settings.fullyElectric}
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
            fullyElectric={settings.fullyElectric}
            sessions={sessions}
            onAdd={addSession}
            onUpdate={updateSession}
          />
        )}
        {tab === 'stats' && (
          <StatsScreen
            sessions={sessions}
            fuelEntries={fuelEntries}
            batteryCapacityKwh={batteryCapacityKwh}
            fullyElectric={settings.fullyElectric}
          />
        )}
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

      {whatsNew.length > 0 && <WhatsNewModal entries={whatsNew} onClose={() => setWhatsNew([])} />}
    </>
  )
}
