function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function toDateInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function toTimeInputValue(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Combines a "YYYY-MM-DD" date input value and an "HH:mm" time input value into a local Date. */
export function combineDateAndTime(dateValue: string, timeValue: string): Date {
  const [year, month, day] = dateValue.split('-').map(Number)
  const [hours, minutes] = (timeValue || '00:00').split(':').map(Number)
  return new Date(year, month - 1, day, hours, minutes)
}
