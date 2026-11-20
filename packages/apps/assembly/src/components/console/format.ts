import { fromFixed } from '@evefrontier/dapp-kit'

/** MW from a fixed-point value, up to two decimals: `150000` → `15`, `2500` → `0.25`. */
export const mw = (raw: bigint | string): string =>
  (Math.round(fromFixed(raw) * 100) / 100).toString()

/** Whole units from a fixed-point value, with thousands separators. */
export const units = (raw: bigint | string): string =>
  Math.round(fromFixed(raw)).toLocaleString('en-US')

/** A count with thousands separators. */
export const count = (n: number | bigint | string): string =>
  Number(n).toLocaleString('en-US')

/** `3 h 05 m` from milliseconds. */
export const hoursMinutes = (ms: number): string => {
  const minutes = Math.round(ms / 60_000)
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} m`
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
