import type { UnreadableData } from '../../storage/localStorage'
import { downloadTextFile } from '../../utils/download'

export interface UnreadableDataBannerProps {
  items: UnreadableData[]
  onDismiss: () => void
}

export function UnreadableDataBanner({ items, onDismiss }: UnreadableDataBannerProps) {
  const notSaved = items.some((item) => item.preservedAs === null)

  function handleDownload() {
    const content = JSON.stringify(
      Object.fromEntries(items.map((item) => [item.key, item.raw])),
      null,
      2,
    )
    const date = new Date().toISOString().slice(0, 10)
    downloadTextFile(`dados-ilegiveis-${date}.json`, content)
  }

  return (
    <div
      role="alert"
      style={{
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--danger)',
        padding: '10px 16px',
      }}
    >
      <p style={{ margin: '0 0 8px' }}>
        Alguns dados guardados não puderam ser lidos.{' '}
        {notSaved
          ? 'Não há espaço para guardar uma cópia e as alterações não estão a ser gravadas — descarrega a cópia antes de continuar.'
          : 'Foi guardada uma cópia intacta no telemóvel; descarrega-a para a poderes recuperar.'}
      </p>
      <div className="row">
        <button type="button" className="btn btn-primary" onClick={handleDownload}>
          Descarregar cópia
        </button>
        {!notSaved && (
          <button type="button" className="btn" onClick={onDismiss}>
            Fechar
          </button>
        )}
      </div>
    </div>
  )
}
