import { describe, expect, it } from 'vitest'
import {
  buildChangelog,
  isUserFacing,
  parseGitLog,
  popupItems,
  toMarkdown,
  type GitCommit,
} from './changelog.mjs'

const F = '\x1f'
const R = '\x1e'

interface FakeCommit {
  hash: string
  date: string
  subject: string
  body?: string
  files: string[]
}

/** Builds text in the same shape `git log` produces with the script's format. */
function fakeLog(commits: FakeCommit[]): string {
  return commits
    .map(
      (c) =>
        `${R}${c.hash}${F}${c.date}${F}${c.subject}${F}${c.body ?? ''}${F}\n\n${c.files.join('\n')}\n`,
    )
    .join('')
}

function commit(overrides: Partial<GitCommit>): GitCommit {
  return {
    hash: 'abcdef1234567',
    date: '2026-10-20T10:00:00+01:00',
    subject: 'Adiciona algo',
    body: '',
    files: ['src/App.tsx'],
    ...overrides,
  }
}

describe('parseGitLog', () => {
  it('returns nothing for an empty log', () => {
    expect(parseGitLog('')).toEqual([])
  })

  it('reads hash, date, subject, body and files of each commit', () => {
    const commits = parseGitLog(
      fakeLog([
        {
          hash: 'aaa',
          date: '2026-10-20T10:00:00+01:00',
          subject: 'Primeiro',
          body: 'Detalhe\nOutra linha',
          files: ['src/a.ts', 'README.md'],
        },
        { hash: 'bbb', date: '2026-10-19T09:00:00+01:00', subject: 'Segundo', files: ['src/b.ts'] },
      ]),
    )
    expect(commits).toEqual([
      {
        hash: 'aaa',
        date: '2026-10-20T10:00:00+01:00',
        subject: 'Primeiro',
        body: 'Detalhe\nOutra linha',
        files: ['src/a.ts', 'README.md'],
      },
      {
        hash: 'bbb',
        date: '2026-10-19T09:00:00+01:00',
        subject: 'Segundo',
        body: '',
        files: ['src/b.ts'],
      },
    ])
  })
})

describe('isUserFacing', () => {
  it('counts a change to an app file', () => {
    expect(isUserFacing(commit({ files: ['src/App.tsx'] }))).toBe(true)
  })

  it('ignores commits that only touch tests and docs', () => {
    expect(isUserFacing(commit({ files: ['src/App.test.tsx', 'README.md'] }))).toBe(false)
  })

  it('counts a commit with a written novelty even if it only touches docs', () => {
    expect(isUserFacing(commit({ files: ['README.md'], body: 'Novidade: Algo' }))).toBe(true)
  })

  it('hides a commit marked "Novidade: nenhuma"', () => {
    expect(isUserFacing(commit({ files: ['src/App.tsx'], body: 'Novidade: nenhuma' }))).toBe(false)
  })
})

describe('popupItems', () => {
  it('falls back to the subject', () => {
    expect(popupItems(commit({ subject: 'Corrige o cálculo' }))).toEqual(['Corrige o cálculo'])
  })

  it('uses every "Novidade:" line without the prefix', () => {
    const body = 'Texto livre\nNovidade: Primeira\nNovidade: Segunda'
    expect(popupItems(commit({ body }))).toEqual(['Primeira', 'Segunda'])
  })

  it('shortens sentences longer than 120 characters', () => {
    const [item] = popupItems(commit({ subject: 'a'.repeat(200) }))
    expect(item).toHaveLength(120)
    expect(item.endsWith('…')).toBe(true)
  })
})

describe('buildChangelog', () => {
  it('dates the build by the newest commit even when it is not user-facing', () => {
    const changelog = buildChangelog([
      commit({ date: '2026-10-21T10:00:00+01:00', files: ['src/App.test.tsx'] }),
      commit({ date: '2026-10-20T10:00:00+01:00', files: ['src/App.tsx'] }),
    ])
    expect(changelog.builtFrom).toBe('2026-10-21T10:00:00+01:00')
    expect(changelog.entries.map((e) => e.date)).toEqual(['2026-10-20T10:00:00+01:00'])
  })

  it('shortens the hash to 7 characters', () => {
    expect(buildChangelog([commit({})]).entries[0].hash).toBe('abcdef1')
  })

  it('has no build date without commits', () => {
    expect(buildChangelog([])).toEqual({ builtFrom: null, entries: [] })
  })
})

describe('toMarkdown', () => {
  const commits = [
    commit({ hash: '1', date: '2026-10-21T12:00:00+01:00', subject: 'Terceiro' }),
    commit({
      hash: '2',
      date: '2026-10-21T09:00:00+01:00',
      subject: 'Segundo',
      body: 'Mais pormenor',
    }),
    commit({ hash: '3', date: '2026-10-20T09:00:00+01:00', subject: 'Primeiro' }),
  ]

  it('groups commits by day, newest first', () => {
    const markdown = toMarkdown(commits)
    expect(markdown.match(/^## /gm)).toHaveLength(2)
    expect(markdown.indexOf('## 2026-10-21')).toBeLessThan(markdown.indexOf('## 2026-10-20'))
    expect(markdown).toContain('- Terceiro')
    expect(markdown).toContain('- Segundo\n  Mais pormenor')
  })

  it('leaves trailers out of the description', () => {
    const markdown = toMarkdown([
      commit({
        subject: 'Com trailers',
        body: 'Pormenor\nNovidade: Frase\nCo-Authored-By: Alguém <a@b.c>',
      }),
    ])
    expect(markdown).toContain('  Pormenor')
    expect(markdown).not.toContain('Co-Authored-By')
    expect(markdown).not.toContain('Novidade')
  })
})
