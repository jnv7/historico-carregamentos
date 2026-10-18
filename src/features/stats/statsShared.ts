export type StatsFilter = 'all' | 'electric' | 'fuel'
export type Period = 'month' | 'total'

/** Same identity colors as the rest of the app: ⚡ cyan, ⛽ amber. */
export const ELECTRIC_COLOR = 'var(--accent)'
export const FUEL_COLOR = 'var(--fuel)'

export const SELECTED_BUTTON_STYLE = {
  background: 'var(--accent)',
  color: '#032027',
  borderColor: 'transparent',
} as const

export const TABLE_CELL_STYLE = { padding: '8px 10px', fontVariantNumeric: 'tabular-nums' } as const
