import { Modal } from '../../components/Modal'
import type { ChangelogEntry } from '../../domain/whatsNew'

export interface WhatsNewModalProps {
  entries: ChangelogEntry[]
  onClose: () => void
}

export function WhatsNewModal({ entries, onClose }: WhatsNewModalProps) {
  const items = entries.flatMap((entry) =>
    entry.items.map((item, index) => ({ key: `${entry.hash}-${index}`, item })),
  )

  return (
    <Modal title="Novidades" onClose={onClose}>
      <div className="stack">
        <p className="muted">Desde a última vez que abriste a app:</p>
        <ul>
          {items.map(({ key, item }) => (
            <li key={key}>{item}</li>
          ))}
        </ul>
        <button type="button" className="btn btn-primary" onClick={onClose}>
          OK
        </button>
      </div>
    </Modal>
  )
}
