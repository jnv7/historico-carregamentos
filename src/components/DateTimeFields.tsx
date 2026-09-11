export interface DateTimeFieldsProps {
  idPrefix: string
  dateValue: string
  timeValue: string
  onDateChange: (value: string) => void
  onTimeChange: (value: string) => void
}

/** The date + time inputs shared by every quick-entry form, kept visually consistent. */
export function DateTimeFields({
  idPrefix,
  dateValue,
  timeValue,
  onDateChange,
  onTimeChange,
}: DateTimeFieldsProps) {
  return (
    <div className="row">
      <div className="field" style={{ flex: 1 }}>
        <label htmlFor={`${idPrefix}-date`}>Data *</label>
        <input
          id={`${idPrefix}-date`}
          type="date"
          value={dateValue}
          onChange={(e) => onDateChange(e.target.value)}
        />
      </div>
      <div className="field" style={{ flex: 1 }}>
        <label htmlFor={`${idPrefix}-time`}>Hora</label>
        <input
          id={`${idPrefix}-time`}
          type="time"
          value={timeValue}
          onChange={(e) => onTimeChange(e.target.value)}
        />
      </div>
    </div>
  )
}
