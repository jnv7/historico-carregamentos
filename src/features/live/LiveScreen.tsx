import { useEffect, useState } from 'react'
import { Modal } from '../../components/Modal'
import { formatDateTime, formatDuration } from '../../domain/format'
import type { ChargingSession, Tariff } from '../../domain/types'
import type { NewChargingSession } from '../../hooks/useSessions'
import { SessionForm } from '../sessions/SessionForm'
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

  useEffect(() => {
    if (!liveSession) return
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [liveSession])

  function handleStart() {
    onAdd({
      carId,
      startAt: new Date().toISOString(),
      endAt: null,
      energyKwh: 0,
      cost: null,
      batteryStartPct: null,
      batteryEndPct: null,
      odometerKm: null,
      location: null,
      chargerType: null,
      notes: null,
      isLive: true,
    })
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
          Começa agora e preenche os detalhes só quando terminares — ideal para carregamentos fora
          de casa.
        </p>
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
      </div>
      <button type="button" className="btn btn-danger" onClick={() => setFinishOpen(true)}>
        ■ Terminar carregamento
      </button>

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
