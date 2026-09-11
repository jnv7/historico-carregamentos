/** Returns a YYYY-MM-DD key for a date, in local time. */
export function dayKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Builds a full calendar grid for the given month (0-indexed), starting on Monday,
 * including the leading/trailing days from adjacent months needed to fill whole weeks.
 */
export function getMonthGrid(year: number, month: number): Date[][] {
  const firstOfMonth = new Date(year, month, 1)
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7 // 0 = Monday
  const gridStart = new Date(year, month, 1 - firstWeekday)

  const lastOfMonth = new Date(year, month + 1, 0)
  const lastWeekday = (lastOfMonth.getDay() + 6) % 7
  const trailingDays = 6 - lastWeekday
  const totalDays = firstWeekday + lastOfMonth.getDate() + trailingDays

  const days: Date[] = []
  for (let i = 0; i < totalDays; i += 1) {
    days.push(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i))
  }

  const weeks: Date[][] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }
  return weeks
}

/** Groups any dated items (charging sessions, fuel entries, ...) by their local calendar day. */
export function groupByDay<T extends { startAt: string }>(items: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const item of items) {
    const key = dayKey(new Date(item.startAt))
    const existing = map.get(key)
    if (existing) {
      existing.push(item)
    } else {
      map.set(key, [item])
    }
  }
  return map
}
