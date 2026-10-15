import type changelogData from 'virtual:changelog'

export type Changelog = typeof changelogData
export type ChangelogEntry = Changelog['entries'][number]

export const MAX_ENTRIES_SHOWN = 5

/**
 * Changes made before this instant are never announced. Someone who already had the app when the
 * popup was introduced has no "last seen" version, and should only be told about what is new.
 */
export const FIRST_ANNOUNCED_AT = '2026-10-15T00:00:00+01:00'

/**
 * Changes not seen yet, newest first. `hasExistingData` tells a fresh install apart
 * from someone who was already using the app before this feature existed.
 */
export function entriesToShow(
  changelog: Changelog,
  lastSeenVersion: string | null,
  hasExistingData: boolean,
): ChangelogEntry[] {
  const { builtFrom, entries } = changelog
  if (builtFrom === null || entries.length === 0) return []
  if (lastSeenVersion === builtFrom) return []
  if (lastSeenVersion === null && !hasExistingData) return []

  const firstAnnounced = Date.parse(FIRST_ANNOUNCED_AT)
  const lastSeen = lastSeenVersion === null ? firstAnnounced : Date.parse(lastSeenVersion)
  if (Number.isNaN(lastSeen)) return entries.slice(0, 1)

  // Compared as instants: the dates may carry different time zone offsets.
  return entries
    .filter((entry) => Date.parse(entry.date) > Math.max(lastSeen, firstAnnounced))
    .slice(0, MAX_ENTRIES_SHOWN)
}
