export type ChargerType = 'home' | 'public_ac' | 'public_dc' | 'other'

/** A time-of-day window used to match a tariff, in local "HH:mm" 24h format. Wraps past midnight when end < start. */
export interface TariffTimeRange {
  start: string
  end: string
}

export interface Tariff {
  id: string
  label: string
  pricePerKwh: number
  ranges: TariffTimeRange[]
}

export interface BackupReminderSettings {
  enabled: boolean
  intervalDays: number
  lastBackupAt: string | null
}

export interface CarSettings {
  carName: string
  tariffs: Tariff[]
  backupReminder: BackupReminderSettings
}

export interface ChargingSession {
  id: string
  carId: string
  kind: 'electric'
  /** ISO datetime. The only fields that are always required are startAt and energyKwh. */
  startAt: string
  endAt: string | null
  energyKwh: number
  /** Explicit cost in EUR. When null, cost is inferred from tariffs active at startAt. */
  cost: number | null
  batteryStartPct: number | null
  batteryEndPct: number | null
  odometerKm: number | null
  location: string | null
  chargerType: ChargerType | null
  notes: string | null
  /** True while a "live" session has been started but not yet finished. */
  isLive: boolean
  createdAt: string
  updatedAt: string
}

export interface FuelEntry {
  id: string
  carId: string
  kind: 'fuel'
  /** ISO datetime. Date, litres and cost are all required — there's no tariff to infer cost from. */
  startAt: string
  liters: number
  cost: number
  odometerKm: number | null
  location: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type EntryKind = ChargingSession['kind'] | FuelEntry['kind']

/** A charging session or a fuel fill-up — the two kinds of entries shown together on the calendar. */
export type VehicleEntry = ChargingSession | FuelEntry

export const DEFAULT_CAR_ID = 'default-car'
