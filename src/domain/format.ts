const currencyFormatter = new Intl.NumberFormat('pt-PT', {
  style: 'currency',
  currency: 'EUR',
})

const dateFormatter = new Intl.DateTimeFormat('pt-PT', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const timeFormatter = new Intl.DateTimeFormat('pt-PT', {
  hour: '2-digit',
  minute: '2-digit',
})

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value)
}

export function formatDate(isoDate: string): string {
  return dateFormatter.format(new Date(isoDate))
}

export function formatTime(isoDate: string): string {
  return timeFormatter.format(new Date(isoDate))
}

export function formatDateTime(isoDate: string): string {
  return `${formatDate(isoDate)} ${formatTime(isoDate)}`
}

/** Capitalizes only the first letter, leaving the rest as-is (unlike CSS text-transform: capitalize). */
export function capitalizeFirst(text: string): string {
  return text.length === 0 ? text : text[0].toUpperCase() + text.slice(1)
}

export function formatEnergy(kWh: number): string {
  return `${kWh.toLocaleString('pt-PT', { maximumFractionDigits: 2 })} kWh`
}

export function formatLiters(liters: number): string {
  return `${liters.toLocaleString('pt-PT', { maximumFractionDigits: 2 })} L`
}

/** Formats a duration in milliseconds as "1h 23m" (or "23m" when under an hour). */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / 60000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes}m`
  return `${hours}h ${minutes}m`
}
