import { useState } from 'react'
import { updateAndReload } from '../../utils/appUpdate'

export function AppUpdateSection() {
  const [updating, setUpdating] = useState(false)

  function handleClick() {
    setUpdating(true)
    void updateAndReload()
  }

  return (
    <div className="stack">
      <h3>Aplicação</h3>
      <p style={{ color: 'var(--text-muted)' }}>
        Versão de {new Date(__APP_BUILD_TIME__).toLocaleString('pt-PT')}. Recarregar procura uma
        versão nova sem apagar os teus dados.
      </p>
      <button type="button" className="btn" onClick={handleClick} disabled={updating}>
        {updating ? 'A atualizar…' : 'Procurar atualizações e recarregar'}
      </button>
    </div>
  )
}
