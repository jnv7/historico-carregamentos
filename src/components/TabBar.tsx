import styles from './TabBar.module.css'

export type TabId = 'calendar' | 'live' | 'stats' | 'settings'

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'calendar', label: 'Registos', icon: '🗓️' },
  { id: 'live', label: 'Live', icon: '⚡' },
  { id: 'stats', label: 'Estatísticas', icon: '📊' },
  { id: 'settings', label: 'Definições', icon: '⚙️' },
]

interface TabBarProps {
  active: TabId
  onChange: (tab: TabId) => void
}

export function TabBar({ active, onChange }: TabBarProps) {
  return (
    <nav className={styles.bar} aria-label="Navegação principal">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`${styles.tab} ${tab.id === active ? styles.active : ''}`}
          aria-current={tab.id === active ? 'page' : undefined}
          onClick={() => onChange(tab.id)}
        >
          <span className={styles.icon} aria-hidden="true">
            {tab.icon}
          </span>
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
