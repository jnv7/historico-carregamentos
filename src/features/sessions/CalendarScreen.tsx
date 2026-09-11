import { useMemo, useState } from 'react'
import { Modal } from '../../components/Modal'
import { dayKey, getMonthGrid, groupByDay } from '../../domain/calendar'
import {
  capitalizeFirst,
  formatCurrency,
  formatEnergy,
  formatLiters,
  formatTime,
} from '../../domain/format'
import type {
  ChargingSession,
  EntryKind,
  FuelEntry,
  Tariff,
  VehicleEntry,
} from '../../domain/types'
import { FuelEntryForm } from '../fuel/FuelEntryForm'
import type { NewFuelEntry } from '../../hooks/useFuelEntries'
import type { NewChargingSession } from '../../hooks/useSessions'
import { SessionForm } from './SessionForm'
import styles from './CalendarScreen.module.css'

const WEEKDAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

const monthLabelFormatter = new Intl.DateTimeFormat('pt-PT', { month: 'long', year: 'numeric' })

interface FormState {
  kind: EntryKind
  entry: VehicleEntry | null
}

export interface CalendarScreenProps {
  carId: string
  tariffs: Tariff[]
  sessions: ChargingSession[]
  fuelEntries: FuelEntry[]
  onAddSession: (session: NewChargingSession) => void
  onUpdateSession: (id: string, changes: Partial<ChargingSession>) => void
  onDeleteSession: (id: string) => void
  onAddFuelEntry: (entry: NewFuelEntry) => void
  onUpdateFuelEntry: (id: string, changes: Partial<FuelEntry>) => void
  onDeleteFuelEntry: (id: string) => void
}

export function CalendarScreen({
  carId,
  tariffs,
  sessions,
  fuelEntries,
  onAddSession,
  onUpdateSession,
  onDeleteSession,
  onAddFuelEntry,
  onUpdateFuelEntry,
  onDeleteFuelEntry,
}: CalendarScreenProps) {
  const today = useMemo(() => new Date(), [])
  const [monthCursor, setMonthCursor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  )
  const [selectedDay, setSelectedDay] = useState(() => dayKey(today))
  const [formState, setFormState] = useState<FormState | null>(null)

  const weeks = useMemo(
    () => getMonthGrid(monthCursor.getFullYear(), monthCursor.getMonth()),
    [monthCursor],
  )

  const allEntries = useMemo<VehicleEntry[]>(
    () => [...sessions, ...fuelEntries],
    [sessions, fuelEntries],
  )
  const entriesByDay = useMemo(() => groupByDay(allEntries), [allEntries])
  const selectedEntries = (entriesByDay.get(selectedDay) ?? [])
    .slice()
    .sort((a, b) => a.startAt.localeCompare(b.startAt))

  function goToMonth(offset: number) {
    setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1))
  }

  function openAddForm(kind: EntryKind) {
    setFormState({ kind, entry: null })
  }

  function openEditForm(entry: VehicleEntry) {
    setFormState({ kind: entry.kind, entry })
  }

  function closeForm() {
    setFormState(null)
  }

  function handleSubmitSession(values: NewChargingSession) {
    if (formState?.entry) {
      onUpdateSession(formState.entry.id, values)
    } else {
      onAddSession(values)
    }
    closeForm()
  }

  function handleSubmitFuel(values: NewFuelEntry) {
    if (formState?.entry) {
      onUpdateFuelEntry(formState.entry.id, values)
    } else {
      onAddFuelEntry(values)
    }
    closeForm()
  }

  function handleDelete(entry: VehicleEntry) {
    const message =
      entry.kind === 'electric'
        ? 'Apagar este registo de carregamento?'
        : 'Apagar este abastecimento?'
    if (!window.confirm(message)) return
    if (entry.kind === 'electric') {
      onDeleteSession(entry.id)
    } else {
      onDeleteFuelEntry(entry.id)
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

  const modalTitle = formState
    ? formState.kind === 'electric'
      ? formState.entry
        ? 'Editar carregamento'
        : 'Novo carregamento'
      : formState.entry
        ? 'Editar abastecimento'
        : 'Novo abastecimento'
    : ''

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
          const dayEntries = entriesByDay.get(key) ?? []
          const hasElectric = dayEntries.some((e) => e.kind === 'electric')
          const hasFuel = dayEntries.some((e) => e.kind === 'fuel')
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
              {(hasElectric || hasFuel) && (
                <span className={styles.dots} aria-hidden="true">
                  {hasElectric && <span className={styles.dot} />}
                  {hasFuel && <span className={styles.dotFuel} />}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className={styles.dayPanel}>
        <h3>
          {capitalizeFirst(
            new Intl.DateTimeFormat('pt-PT', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            }).format(selectedDate),
          )}
        </h3>

        <div className="row" style={{ marginBottom: 14 }}>
          <button
            type="button"
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={() => openAddForm('electric')}
          >
            ⚡ Carregamento
          </button>
          <button
            type="button"
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={() => openAddForm('fuel')}
          >
            ⛽ Abastecimento
          </button>
        </div>

        {selectedEntries.length === 0 && <p className="muted">Sem registos neste dia.</p>}

        <div className="stack">
          {selectedEntries.map((entry) => (
            <div key={entry.id} className={`card ${styles.sessionCard}`}>
              <div>
                {entry.kind === 'electric' ? (
                  <>
                    <div>
                      <strong>{formatTime(entry.startAt)}</strong> · ⚡{' '}
                      {formatEnergy(entry.energyKwh)}
                    </div>
                    <div className="muted">
                      {entry.cost != null ? formatCurrency(entry.cost) : 'custo desconhecido'}
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <strong>{formatTime(entry.startAt)}</strong> · ⛽ {formatLiters(entry.liters)}
                    </div>
                    <div className="muted">{formatCurrency(entry.cost)}</div>
                  </>
                )}
              </div>
              <div className={styles.sessionActions}>
                <button
                  type="button"
                  className={styles.iconBtn}
                  aria-label={
                    entry.kind === 'electric' ? 'Editar carregamento' : 'Editar abastecimento'
                  }
                  onClick={() => openEditForm(entry)}
                >
                  ✎
                </button>
                <button
                  type="button"
                  className={styles.iconBtn}
                  aria-label={
                    entry.kind === 'electric' ? 'Apagar carregamento' : 'Apagar abastecimento'
                  }
                  onClick={() => handleDelete(entry)}
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {formState && (
        <Modal title={modalTitle} onClose={closeForm}>
          {formState.kind === 'electric' ? (
            <SessionForm
              carId={carId}
              tariffs={tariffs}
              initialSession={(formState.entry as ChargingSession | null) ?? undefined}
              defaultStartAt={formDefaultStartAt}
              submitLabel={formState.entry ? 'Guardar alterações' : 'Adicionar'}
              onSubmit={handleSubmitSession}
              onCancel={closeForm}
            />
          ) : (
            <FuelEntryForm
              carId={carId}
              initialEntry={(formState.entry as FuelEntry | null) ?? undefined}
              defaultStartAt={formDefaultStartAt}
              submitLabel={formState.entry ? 'Guardar alterações' : 'Adicionar'}
              onSubmit={handleSubmitFuel}
              onCancel={closeForm}
            />
          )}
        </Modal>
      )}
    </div>
  )
}
