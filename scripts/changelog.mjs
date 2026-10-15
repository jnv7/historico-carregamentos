import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const FIELD = '\x1f'
const RECORD = '\x1e'
const MAX_COMMITS = 300
const MAX_ENTRIES = 50
const MAX_ITEM_LENGTH = 120
const NOVELTY_PREFIX = /^Novidade:\s*/i

/** Raw `git log` output, or null when git is not available (e.g. a download without history). */
export function readGitLog(cwd) {
  try {
    return execFileSync(
      'git',
      [
        'log',
        '--no-merges',
        `-n${MAX_COMMITS}`,
        `--format=${RECORD}%H${FIELD}%cI${FIELD}%s${FIELD}%b${FIELD}`,
        '--name-only',
      ],
      { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    )
  } catch {
    return null
  }
}

/** Turns the git output into [{ hash, date, subject, body, files }], newest first. */
export function parseGitLog(raw) {
  return raw
    .split(RECORD)
    .slice(1)
    .map((chunk) => {
      const [hash, date, subject, body, filesBlock = ''] = chunk.split(FIELD)
      return {
        hash,
        date,
        subject: subject.trim(),
        body: body.trim(),
        files: filesBlock
          .split('\n')
          .map((file) => file.trim())
          .filter(Boolean),
      }
    })
}

function bodyLines(commit) {
  return commit.body.split('\n').map((line) => line.trim())
}

function isAppFile(file) {
  if (file.endsWith('.test.ts') || file.endsWith('.test.tsx') || file.startsWith('src/test/')) {
    return false
  }
  return file.startsWith('src/') || file.startsWith('public/') || file === 'index.html'
}

/** True when the commit changes something the person using the app can see. */
export function isUserFacing(commit) {
  const lines = bodyLines(commit)
  if (lines.some((line) => /^Novidade:\s*nenhuma\s*$/i.test(line))) return false
  if (lines.some((line) => NOVELTY_PREFIX.test(line))) return true
  return commit.files.some(isAppFile)
}

/** The short sentences the popup shows for a commit. */
export function popupItems(commit) {
  const written = bodyLines(commit)
    .filter((line) => NOVELTY_PREFIX.test(line))
    .map((line) => line.replace(NOVELTY_PREFIX, '').trim())
    .filter(Boolean)
  const items = written.length > 0 ? written : [commit.subject]
  return items.map((item) =>
    item.length > MAX_ITEM_LENGTH ? `${item.slice(0, MAX_ITEM_LENGTH - 1)}…` : item,
  )
}

/** Data for the popup: { builtFrom, entries: [{ hash, date, items }] }. */
export function buildChangelog(commits) {
  return {
    // The newest commit even if it is not user-facing: it identifies this build.
    builtFrom: commits[0]?.date ?? null,
    entries: commits
      .filter(isUserFacing)
      .slice(0, MAX_ENTRIES)
      .map((commit) => ({
        hash: commit.hash.slice(0, 7),
        date: commit.date,
        items: popupItems(commit),
      })),
  }
}

/** The full CHANGELOG.md. */
export function toMarkdown(commits) {
  const lines = [
    '# Changelog',
    '',
    'Gerado automaticamente a partir do histórico do git. Não editar à mão.',
  ]
  let currentDay = null
  for (const commit of commits.filter(isUserFacing)) {
    const day = commit.date.slice(0, 10)
    if (day !== currentDay) {
      lines.push('', `## ${day}`, '')
      currentDay = day
    }
    lines.push(`- ${commit.subject}`)
    for (const line of bodyLines(commit)) {
      if (line === '' || /^[A-Za-z-]+:\s/.test(line)) continue
      lines.push(`  ${line}`)
    }
  }
  return `${lines.join('\n')}\n`
}

// Run with `node scripts/changelog.mjs` to write CHANGELOG.md in the project root.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const raw = readGitLog(process.cwd())
  writeFileSync('CHANGELOG.md', toMarkdown(parseGitLog(raw ?? '')))
  console.log('CHANGELOG.md gerado.')
}
