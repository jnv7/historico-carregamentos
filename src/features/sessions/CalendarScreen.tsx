import { useMemo, useState } from 'react'
import { Modal } from '../../components/Modal'
import { dayKey, getMonthGrid, groupSessionsByDay } from '../../domain/calendar'
import { capitalizeFirst, formatCurrency, formatEnergy, formatTime } from '../../domain/format'
import type { ChargingSession, Tariff } from '../../domain/types'
import type { NewChargingSession } from '../../hooks/useSessions'
import { SessionForm } from './SessionForm'
import styles from './CalendarScreen.module.css'

const WEEKDAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

const monthLabelFormatter = new Intl.DateTimeFormat('pt-PT', { month: 'long', year: 'numeric' })

export interface CalendarScreenProps {
  carId: string
  tariffs: Tariff[]
  sessions: ChargingSession[]
  onAdd: (session: NewChargingSession) => void
  onUpdate: (id: string, changes: Partial<ChargingSession>) => void
  onDelete: (id: string) => void
}

export function CalendarScreen({
  carId,
  tariffs,
  sessions,
  onAdd,
  onUpdate,
  onDelete,
}: CalendarScreenProps) {
  const today = useMemo(() => new Date(), [])
  const [monthCursor, setMonthCursor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  )
  const [selectedDay, setSelectedDay] = useState(() => dayKey(today))
  const [formOpen, setFormOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<ChargingSession | null>(null)

  const weeks = useMemo(
    () => getMonthGrid(monthCursor.getFullYear(), monthCursor.getMonth()),
    [monthCursor],
  )
  const sessionsByDay = useMemo(() => groupSessionsByDay(sessions), [sessions])
  const selectedSessions = (sessionsByDay.get(selectedDay) ?? [])
    .slice()
    .sort((a, b) => a.startAt.localeCompare(b.startAt))

  function goToMonth(offset: number) {
    setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1))
  }

  function openAddForm() {
    setEditingSession(null)
    setFormOpen(true)
  }

  function openEditForm(session: ChargingSession) {
    setEditingSession(session)
    setFormOpen(true)
  }

  function handleSubmit(values: NewChargingSession) {
    if (editingSession) {
      onUpdate(editingSession.id, values)
    } else {
      onAdd(values)
    }
    setFormOpen(false)
    setEditingSession(null)
  }

  function handleDelete(session: ChargingSession) {
    if (window.confirm('Apagar este registo de carregamento?')) {
      onDelete(session.id)
    }
  }

  const selectedDate = useMemo(() => {
    const [y, m, d] = selectedDay.split('-').map(Number)
    return new Date(y, m - 1, d)
  }, [selectedDay])

  // Defaults the quick-add form to the current time of day, on the selected calendar day.
  const formDefaultStartAt = useMemo(
    () =>
      new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        today.getHours(),
        today.getMinutes(),
      ),
    [selectedDate, today],
  )

  return (
    <div>
      <div className={styles.monthHeader}>
        <button
          type="button"
          className={styles.navBtn}
          onClick={() => goToMonth(-1)}
          aria-label="Mês anterior"
        >
          ‹
        </button>
        <strong>{capitalizeFirst(monthLabelFormatter.format(monthCursor))}</strong>
        <button
          type="button"
          className={styles.navBtn}
          onClick={() => goToMonth(1)}
          aria-label="Mês seguinte"
        >
          ›
        </button>
      </div>

      <div className={styles.weekdays}>
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className={styles.weekday}>
            {label}
          </div>
        ))}
      </div>

      <div className={styles.grid}>
        {weeks.flat().map((date) => {
          const key = dayKey(date)
          const outside = date.getMonth() !== monthCursor.getMonth()
          const isToday = key === dayKey(today)
          const isSelected = key === selectedDay
          const hasSessions = sessionsByDay.has(key)
          const classNames = [
            styles.day,
            outside ? styles.outside : '',
            isToday ? styles.today : '',
            isSelected ? styles.selected : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <button
              key={key}
              type="button"
              className={classNames}
              onClick={() => setSelectedDay(key)}
              aria-current={isToday ? 'date' : undefined}
              aria-pressed={isSelected}
            >
              {date.getDate()}
              {hasSessions && <span className={styles.dot} aria-hidden="true" />}
            </button>
          )
        })}
      </div>

      <div className={styles.dayPanel}>
        <div className="row-between">
          <h3>
            {capitalizeFirst(
              new Intl.DateTimeFormat('pt-PT', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              }).format(selectedDate),
            )}
          </h3>
          <button type="button" className="btn btn-primary" onClick={openAddForm}>
            + Carregamento
          </button>
        </div>

        {selectedSessions.length === 0 && <p className="muted">Sem carregamentos registados.</p>}

        <div className="stack">
          {selectedSessions.map((session) => (
            <div key={session.id} className={`card ${styles.sessionCard}`}>
              <div>
                <div>
                  <strong>{formatTime(session.startAt)}</strong> · {formatEnergy(session.energyKwh)}
                </div>
                <div className="muted">
                  {session.cost != null ? formatCurrency(session.cost) : 'custo desconhecido'}
                </div>
              </div>
              <div className={styles.sessionActions}>
                <button
                  type="button"
                  className={styles.iconBtn}
                  aria-label="Editar carregamento"
                  onClick={() => openEditForm(session)}
                >
                  ✎
                </button>
                <button
                  type="button"
                  className={styles.iconBtn}
                  aria-label="Apagar carregamento"
                  onClick={() => handleDelete(session)}
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {formOpen && (
        <Modal
          title={editingSession ? 'Editar carregamento' : 'Novo carregamento'}
          onClose={() => {
            setFormOpen(false)
            setEditingSession(null)
          }}
        >
          <SessionForm
            carId={carId}
            tariffs={tariffs}
            initialSession={editingSession ?? undefined}
            defaultStartAt={formDefaultStartAt}
            submitLabel={editingSession ? 'Guardar alterações' : 'Adicionar'}
            onSubmit={handleSubmit}
            onCancel={() => {
              setFormOpen(false)
              setEditingSession(null)
            }}
          />
        </Modal>
      )}
    </div>
  )
}
