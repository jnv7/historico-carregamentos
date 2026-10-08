import { useState } from 'react'

export interface DangerZoneSectionProps {
  onDeleteAll: () => void
}

export function DangerZoneSection({ onDeleteAll }: DangerZoneSectionProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  function handleDeleteAll() {
    onDeleteAll()
    setConfirmingDelete(false)
  }

  return (
    <div className="stack">
      <h3>Zona perigosa</h3>
      {!confirmingDelete ? (
        <button type="button" className="btn btn-danger" onClick={() => setConfirmingDelete(true)}>
          Apagar todos os dados
        </button>
      ) : (
        <div className="card stack">
          <p>
            Tens a certeza? Esta ação apaga todos os carregamentos e abastecimentos e não pode ser
            desfeita.
          </p>
          <div className="row">
            <button
              type="button"
              className="btn"
              style={{ flex: 1 }}
              onClick={() => setConfirmingDelete(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-danger"
              style={{ flex: 1 }}
              onClick={handleDeleteAll}
            >
              Confirmar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
