import { useEffect, useState, type FormEvent } from 'react'
import { Modal } from '../../components/Modal'
import { CHARGER_TYPE_LABELS } from '../../domain/chargerTypes'
import { formatDateTime, formatDuration } from '../../domain/format'
import type { ChargingSession, Tariff } from '../../domain/types'
import type { NewChargingSession } from '../../hooks/useSessions'
import { SessionForm } from '../sessions/SessionForm'
import { draftFromSession, EMPTY_LIVE_DETAILS_DRAFT, parseLiveDetailsDraft } from './liveDetails'
import { LiveDetailsFields } from './LiveDetailsFields'
import { findLiveSession } from './liveSession'

export interface LiveScreenProps {
  carId: string
  tariffs: Tariff[]
  sessions: ChargingSession[]
  onAdd: (session: NewChargingSession) => void
  onUpdate: (id: string, changes: Partial<ChargingSession>) => void
}

export function LiveScreen({ carId, tariffs, sessions, onAdd, onUpdate }: LiveScreenProps) {
  const liveSession = findLiveSession(sessions)
  const [now, setNow] = useState(() => new Date())
  const [finishOpen, setFinishOpen] = useState(false)
  const [startDraft, setStartDraft] = useState(EMPTY_LIVE_DETAILS_DRAFT)
  const [startError, setStartError] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editDraft, setEditDraft] = useState(EMPTY_LIVE_DETAILS_DRAFT)
  const [editError, setEditError] = useState<string | null>(null)

  useEffect(() => {
    if (!liveSession) return
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [liveSession])

  function handleStart() {
    const result = parseLiveDetailsDraft(startDraft)
    if (!result.ok) {
      setStartError(result.error)
      return
    }
    setStartError(null)
    onAdd({
      carId,
      kind: 'electric',
      startAt: new Date().toISOString(),
      endAt: null,
      energyKwh: 0,
      cost: null,
      batteryEndPct: null,
      ...result.details,
      isLive: true,
    })
    setStartDraft(EMPTY_LIVE_DETAILS_DRAFT)
  }

  function handleEditOpen() {
    if (!liveSession) return
    setEditDraft(draftFromSession(liveSession))
    setEditError(null)
    setEditOpen(true)
  }

  function handleEditSubmit(event: FormEvent) {
    event.preventDefault()
    if (!liveSession) return
    const result = parseLiveDetailsDraft(editDraft)
    if (!result.ok) {
      setEditError(result.error)
      return
    }
    onUpdate(liveSession.id, result.details)
    setEditOpen(false)
  }

  function handleFinishSubmit(values: NewChargingSession) {
    if (!liveSession) return
    onUpdate(liveSession.id, { ...values, endAt: new Date().toISOString(), isLive: false })
    setFinishOpen(false)
  }

  if (!liveSession) {
    return (
      <div className="stack">
        <h2>Carregamento ao vivo</h2>
        <p className="muted">
          Começa agora e preenche o resto quando terminares. Se já souberes alguns detalhes, podes
          indicá-los já.
        </p>
        <details>
          <summary>Adicionar detalhes (opcional)</summary>
          <div style={{ marginTop: 12 }}>
            <LiveDetailsFields draft={startDraft} onChange={setStartDraft} />
          </div>
        </details>
        {startError && (
          <p className="muted" role="alert" style={{ color: 'var(--danger)' }}>
            {startError}
          </p>
        )}
        <button type="button" className="btn btn-primary" onClick={handleStart}>
          ▶ Começar carregamento
        </button>
      </div>
    )
  }

  const elapsedMs = now.getTime() - new Date(liveSession.startAt).getTime()

  return (
    <div className="stack">
      <h2>Carregamento em curso</h2>
      <div className="card">
        <div className="muted">Início</div>
        <div>
          <strong>{formatDateTime(liveSession.startAt)}</strong>
        </div>
        <div className="muted" style={{ marginTop: 10 }}>
          Duração
        </div>
        <div>
          <strong data-testid="live-duration">{formatDuration(elapsedMs)}</strong>
        </div>
        {liveSession.batteryStartPct != null && (
          <>
            <div className="muted" style={{ marginTop: 10 }}>
              Bateria inicial
            </div>
            <div>
              <strong>{liveSession.batteryStartPct}%</strong>
            </div>
          </>
        )}
        {liveSession.odometerKm != null && (
          <>
            <div className="muted" style={{ marginTop: 10 }}>
              Quilometragem
            </div>
            <div>
              <strong>{liveSession.odometerKm.toLocaleString('pt-PT')} km</strong>
            </div>
          </>
        )}
        {liveSession.chargerType != null && (
          <>
            <div className="muted" style={{ marginTop: 10 }}>
              Tipo de carregador
            </div>
            <div>
              <strong>{CHARGER_TYPE_LABELS[liveSession.chargerType]}</strong>
            </div>
          </>
        )}
        {liveSession.location != null && (
          <>
            <div className="muted" style={{ marginTop: 10 }}>
              Local
            </div>
            <div>
              <strong>{liveSession.location}</strong>
            </div>
          </>
        )}
        {liveSession.notes != null && (
          <>
            <div className="muted" style={{ marginTop: 10 }}>
              Notas
            </div>
            <div>
              <strong>{liveSession.notes}</strong>
            </div>
          </>
        )}
      </div>
      <button type="button" className="btn" onClick={handleEditOpen}>
        Editar detalhes
      </button>
      <button type="button" className="btn btn-danger" onClick={() => setFinishOpen(true)}>
        ■ Terminar carregamento
      </button>

      {editOpen && (
        <Modal title="Detalhes do carregamento" onClose={() => setEditOpen(false)}>
          <form onSubmit={handleEditSubmit} className="stack" aria-label="Detalhes do carregamento">
            <LiveDetailsFields draft={editDraft} onChange={setEditDraft} />
            {editError && (
              <p className="muted" role="alert" style={{ color: 'var(--danger)' }}>
                {editError}
              </p>
            )}
            <div className="row">
              <button
                type="button"
                className="btn"
                style={{ flex: 1 }}
                onClick={() => setEditOpen(false)}
              >
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                Guardar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {finishOpen && (
        <Modal title="Terminar carregamento" onClose={() => setFinishOpen(false)}>
          <SessionForm
            carId={carId}
            tariffs={tariffs}
            initialSession={liveSession}
            submitLabel="Terminar"
            onSubmit={handleFinishSubmit}
            onCancel={() => setFinishOpen(false)}
          />
        </Modal>
      )}
    </div>
  )
}
