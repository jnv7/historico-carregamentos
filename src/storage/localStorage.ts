const RECOVERY_PREFIX = 'historico-carregamentos:recovered:'

export interface UnreadableData {
  key: string
  raw: string
  /** Where an untouched copy of the raw data was kept, or null if it couldn't be saved. */
  preservedAs: string | null
}

const unreadable = new Map<string, UnreadableData>()

/**
 * Reads and parses a JSON value. When the stored data can't be parsed (or fails
 * `isValid`), the raw text is copied to a separate "recovered" key before the
 * fallback is returned, so the next save can never silently destroy it.
 */
export function readJson<T>(key: string, fallback: T, isValid?: (value: unknown) => boolean): T {
  let raw: string | null
  try {
    raw = localStorage.getItem(key)
  } catch {
    return fallback
  }
  if (raw === null) return fallback

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isValid || isValid(parsed)) return parsed as T
  } catch {
    // fall through to preserve the unreadable data
  }

  unreadable.set(key, { key, raw, preservedAs: preserveRaw(key, raw) })
  return fallback
}

export function writeJson(key: string, value: unknown): void {
  // If the unreadable data couldn't be copied aside, writing would destroy the only copy.
  if (unreadable.get(key)?.preservedAs === null) return
  localStorage.setItem(key, JSON.stringify(value))
}

/** Data found unreadable since the app started (the raw text is still available to download). */
export function getUnreadableData(): UnreadableData[] {
  return [...unreadable.values()]
}

function preserveRaw(key: string, raw: string): string | null {
  try {
    // Reuse an existing copy of the same data instead of piling up duplicates on each reload.
    for (let i = 0; i < localStorage.length; i += 1) {
      const existingKey = localStorage.key(i)
      if (existingKey?.startsWith(`${RECOVERY_PREFIX}${key}:`)) {
        if (localStorage.getItem(existingKey) === raw) return existingKey
      }
    }
    const recoveryKey = `${RECOVERY_PREFIX}${key}:${new Date().toISOString()}`
    localStorage.setItem(recoveryKey, raw)
    return recoveryKey
  } catch {
    return null
  }
}

/** Test-only: forgets the in-memory record of unreadable data. */
export function resetUnreadableData(): void {
  unreadable.clear()
}
