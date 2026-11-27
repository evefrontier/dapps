import { fromFixed } from '@evefrontier/dapp-kit'

/**
 * The locale numbers are shown in: the viewer's in a browser, so `1.000,00`
 * in German; en-US elsewhere (tests, scripts), so output is stable.
 */
export const displayLocale = (): string =>
  typeof window !== 'undefined' && typeof navigator !== 'undefined'
    ? (navigator.languages?.[0] ?? navigator.language ?? 'en-US')
    : 'en-US'

/** MW from a fixed-point value, up to two decimals: `150000` → `15`, `2500` → `0.25`. */
export const mw = (raw: bigint | string): string =>
  fromFixed(raw).toLocaleString(displayLocale(), { maximumFractionDigits: 2 })

/** A plain number from a fixed-point value, up to two decimals, with grouping: `900000` → `90`. */
export const decimal = (raw: bigint | string): string =>
  fromFixed(raw).toLocaleString(displayLocale(), { maximumFractionDigits: 2 })

/** Whole units from a fixed-point value, with grouping. */
export const units = (raw: bigint | string): string =>
  Math.round(fromFixed(raw)).toLocaleString(displayLocale())

/** kg from a fixed-point value, two decimals, with grouping: `998198` → `99.82`, `10000000` → `1,000.00`. */
export const kg = (raw: bigint | string): string =>
  fromFixed(raw).toLocaleString(displayLocale(), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

/** A burn rate from a fixed-point value per hour, one decimal, with grouping: `400000` → `40.0`. */
export const burnRate = (raw: bigint | string): string =>
  fromFixed(raw).toLocaleString(displayLocale(), {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })

/** A fuel amount (fixed point, see `normalizeFuel`) in its unit's style: whole units, or kg to two decimals. */
export const fuelAmount = (
  raw: bigint | string,
  unit: 'units' | 'kg',
): string => (unit === 'kg' ? kg(raw) : units(raw))

/** m³ from hundredths of a m³, up to two decimals, with grouping: `250` → `2.5`. */
export const m3 = (raw: bigint | string): string =>
  (Number(raw) / 100).toLocaleString(displayLocale(), {
    maximumFractionDigits: 2,
  })

/** A count with grouping. */
export const count = (n: number | bigint | string): string =>
  Number(n).toLocaleString(displayLocale())

/** `3 h 05 m` from milliseconds. */
export const hoursMinutes = (ms: number): string => {
  const minutes = Math.round(ms / 60_000)
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} m`
}

/**
 * A countdown from milliseconds, floored so it never runs ahead: `2 h 03 m`
 * from an hour up, `12 m 05 s` below it, so a once-a-second clock visibly
 * ticks. `0 m 00 s` once it has run out.
 */
export const timeLeft = (ms: number): string => {
  const seconds = Math.max(0, Math.floor(ms / 1_000))
  const pad = (n: number) => String(n).padStart(2, '0')
  if (seconds >= 3_600) {
    return `${Math.floor(seconds / 3_600)} h ${pad(Math.floor((seconds % 3_600) / 60))} m`
  }
  return `${Math.floor(seconds / 60)} m ${pad(seconds % 60)} s`
}

/** `just now`, `14 min ago`, `3 h ago` or `2 d ago`. */
export const ago = (ms: number): string => {
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 48) return `${hours} h ago`
  return `${Math.floor(hours / 24)} d ago`
}

/** A component id shown as its last six digits: `#070928`. */
export const shortCode = (id: string): string => `#${id.slice(-6)}`

/** Host and path of a URL, for display; the input as-is when it does not parse. */
export const hostOf = (url: string): string => {
  try {
    const u = new URL(url)
    return u.host + (u.pathname === '/' ? '' : u.pathname)
  } catch {
    return url
  }
}
