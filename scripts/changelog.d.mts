export interface GitCommit {
  hash: string
  date: string
  subject: string
  body: string
  files: string[]
}

export interface ChangelogEntry {
  hash: string
  date: string
  items: string[]
}

export interface Changelog {
  builtFrom: string | null
  entries: ChangelogEntry[]
}

export function readGitLog(cwd: string): string | null
export function parseGitLog(raw: string): GitCommit[]
export function isUserFacing(commit: GitCommit): boolean
export function popupItems(commit: GitCommit): string[]
export function buildChangelog(commits: GitCommit[]): Changelog
export function toMarkdown(commits: GitCommit[]): string
