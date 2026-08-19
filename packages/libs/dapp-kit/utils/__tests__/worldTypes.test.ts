import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getMvrCache } from '../mvr/mvrCache.generated'
import { getEveWorldPackageId, getWorldType } from '../mvr/worldTypes'

// The generated snapshot types its maps as `{}`; index them as records here.
const testnet = getMvrCache('testnet') as {
  packages: Record<string, string>
  types: Record<string, string>
}

const RAW_ADDR =
  '0x2ff3e06b96eb830bdcffbc6cae9b8fe43f005c3b94cef05d9ec23057df16f107'

describe('worldTypes MVR-name resolution', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  // Resolve against the committed snapshot rather than hardcoded addresses, so
  // these stay correct across regenerations.
  describe('when VITE_EVE_WORLD_PACKAGE_ID is an MVR name', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_EVE_WORLD_PACKAGE_ID', '@evefrontier/world-test')
    })

    it('getWorldType returns the type-origin tag from the snapshot', () => {
      const expected =
        testnet.types['@evefrontier/world-test::fuel::FuelConfig']
      expect(getWorldType('fuel::FuelConfig')).toBe(expected)
      expect(getWorldType('fuel::FuelConfig')).toMatch(
        /^0x[0-9a-f]+::fuel::FuelConfig$/,
      )
    })

    it('getEveWorldPackageId returns the latest package id from the snapshot', () => {
      const expected = testnet.packages['@evefrontier/world-test']
      expect(getEveWorldPackageId()).toBe(expected)
    })
  })

  // Fail-loud contract: a name with no snapshot entry throws rather than
  // silently building a filter that matches nothing.
  describe('when the MVR name has no snapshot entry', () => {
    beforeEach(() => {
      vi.stubEnv(
        'VITE_EVE_WORLD_PACKAGE_ID',
        '@evefrontier/world-does-not-exist',
      )
    })

    it('getWorldType throws', () => {
      expect(() => getWorldType('fuel::FuelConfig')).toThrow(
        /No MVR resolution/,
      )
    })

    it('getEveWorldPackageId throws', () => {
      expect(() => getEveWorldPackageId()).toThrow(/No MVR package resolution/)
    })
  })

  // Mainnet has no snapshot entries (the @evefrontier/world* names are not
  // registered on mainnet), so resolution there fails with a network-specific
  // message rather than the misleading "regenerate the cache" one.
  describe('when the target network has no snapshot entries (mainnet)', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_EVE_WORLD_PACKAGE_ID', '@evefrontier/world-test')
    })

    it('getWorldType throws an unsupported-network error', () => {
      expect(() => getWorldType('fuel::FuelConfig', 'mainnet')).toThrow(
        /not resolvable on "mainnet"/,
      )
    })

    it('getEveWorldPackageId throws an unsupported-network error', () => {
      expect(() => getEveWorldPackageId('mainnet')).toThrow(
        /not resolvable on "mainnet"/,
      )
    })
  })

  // A raw 0x env is treated as already-canonical and interpolated verbatim.
  describe('when VITE_EVE_WORLD_PACKAGE_ID is a raw 0x address', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_EVE_WORLD_PACKAGE_ID', RAW_ADDR)
    })

    it('getWorldType interpolates the address verbatim', () => {
      expect(getWorldType('fuel::FuelConfig')).toBe(
        `${RAW_ADDR}::fuel::FuelConfig`,
      )
    })

    it('getEveWorldPackageId returns the address unchanged', () => {
      expect(getEveWorldPackageId()).toBe(RAW_ADDR)
    })
  })
})
