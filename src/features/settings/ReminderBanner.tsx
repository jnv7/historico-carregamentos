export interface ReminderBannerProps {
  onGoToBackup: () => void
  onDismiss: () => void
}

export function ReminderBanner({ onGoToBackup, onDismiss }: ReminderBannerProps) {
  return (
    <div
      role="status"
      className="row-between"
      style={{
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
        padding: '10px 16px',
        gap: 10,
      }}
    >
      <span>Já lá vai algum tempo desde a última cópia de segurança.</span>
      <div className="row" style={{ flexShrink: 0 }}>
        <button type="button" className="btn" onClick={onDismiss}>
          Mais tarde
        </button>
        <button type="button" className="btn btn-primary" onClick={onGoToBackup}>
          Fazer backup
        </button>
      </div>
    </div>
  )
}
