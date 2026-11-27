import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  ago,
  burnRate,
  count,
  decimal,
  displayLocale,
  fuelAmount,
  hostOf,
  hoursMinutes,
  kg,
  m3,
  mw,
  shortCode,
  timeLeft,
  units,
} from '../format'

describe('format', () => {
  it('turns fixed-point MW into up to two decimals', () => {
    expect(mw('150000')).toBe('15')
    expect(mw(2500n)).toBe('0.25')
    expect(mw('0')).toBe('0')
  })

  it('turns hundredths of a m³ into m³ with up to two decimals', () => {
    expect(m3('100000')).toBe('1,000')
    expect(m3('250')).toBe('2.5')
    expect(m3(10n)).toBe('0.1')
    expect(m3('1234500')).toBe('12,345')
  })

  it('turns fixed-point fuel into whole units with separators', () => {
    expect(units('10000000')).toBe('1,000')
    expect(units(15_000n)).toBe('2')
  })

  it('formats counts with separators', () => {
    expect(count('12400')).toBe('12,400')
  })

  it('writes hours and zero-padded minutes', () => {
    expect(hoursMinutes(3 * 3_600_000 + 5 * 60_000)).toBe('3 h 05 m')
    expect(hoursMinutes(0)).toBe('0 h 00 m')
  })

  it('counts down in hours and minutes, then minutes and seconds, floored', () => {
    expect(timeLeft(2 * 3_600_000 + 3 * 60_000 + 59_999)).toBe('2 h 03 m')
    expect(timeLeft(3_600_000)).toBe('1 h 00 m')
    expect(timeLeft(3_599_999)).toBe('59 m 59 s')
    expect(timeLeft(12 * 60_000 + 5_500)).toBe('12 m 05 s')
    expect(timeLeft(0)).toBe('0 m 00 s')
    expect(timeLeft(-5_000)).toBe('0 m 00 s')
  })

  it('turns fixed-point kg into up to two decimals with separators', () => {
    expect(kg(998_198n)).toBe('99.82')
    expect(kg('10000000')).toBe('1,000.00')
    expect(burnRate(400_000n)).toBe('40.0')
    expect(burnRate('36000000000')).toBe('3,600,000.0')
    expect(fuelAmount(998_198n, 'kg')).toBe('99.82')
    expect(fuelAmount(998_198n, 'units')).toBe('100')
  })

  it('says how long ago, from minutes to days', () => {
    expect(ago(30_000)).toBe('just now')
    expect(ago(14 * 60_000)).toBe('14 min ago')
    expect(ago(3 * 3_600_000)).toBe('3 h ago')
    expect(ago(50 * 3_600_000)).toBe('2 d ago')
  })

  it('shows a component id as its last six digits', () => {
    expect(shortCode('1000000070928')).toBe('#070928')
  })

  it('shows a URL as host and path', () => {
    expect(hostOf('https://kestrel.example/halcyon')).toBe(
      'kestrel.example/halcyon',
    )
    expect(hostOf('https://kestrel.example/')).toBe('kestrel.example')
    expect(hostOf('not a url')).toBe('not a url')
  })
})

describe('displayLocale', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('is en-US outside a browser', () => {
    expect(displayLocale()).toBe('en-US')
    expect(kg('10000000')).toBe('1,000.00')
  })

  it("formats in the viewer's locale in a browser", () => {
    vi.stubGlobal('window', {})
    vi.stubGlobal('navigator', { languages: ['de-DE'], language: 'de-DE' })
    expect(displayLocale()).toBe('de-DE')
    expect(kg('10000000')).toBe('1.000,00')
    expect(burnRate('400000')).toBe('40,0')
    expect(mw(2500n)).toBe('0,25')
    expect(units('12345678')).toBe('1.235')
    expect(m3('1234500')).toBe('12.345')
    expect(count(1234)).toBe('1.234')
    expect(decimal('900000')).toBe('90')
  })
})
