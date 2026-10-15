import type { ChargerType } from './types'

export const CHARGER_TYPE_LABELS: Record<ChargerType, string> = {
  home: 'Casa',
  public_ac: 'Público AC',
  public_dc: 'Público DC (rápido)',
  other: 'Outro',
}
