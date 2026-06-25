import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getCharacterOwnerCapType,
  getCharacterPlayerProfileType,
  getEnergyConfigType,
  getEveCoinType,
  getEveWorldPackageId,
  getFuelEfficiencyConfigType,
  getObjectRegistryType,
  getSuiGraphqlEndpoint,
  TenantId,
} from '../constants'

const TEST_PKG =
  '0x2ff3e06b96eb830bdcffbc6cae9b8fe43f005c3b94cef05d9ec23057df16f107'

describe('constants', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_EVE_WORLD_PACKAGE_ID', TEST_PKG)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  // ============================================================================
  // getSuiGraphqlEndpoint
  // ============================================================================

  describe('getSuiGraphqlEndpoint', () => {
    it("returns testnet URL for 'testnet'", () => {
      expect(getSuiGraphqlEndpoint('testnet')).toBe(
        'https://graphql.testnet.sui.io/graphql',
      )
    })

    it("returns devnet URL for 'devnet'", () => {
      expect(getSuiGraphqlEndpoint('devnet')).toBe(
        'https://graphql.devnet.sui.io/graphql',
      )
    })

    it("returns mainnet URL for 'mainnet'", () => {
      expect(getSuiGraphqlEndpoint('mainnet')).toBe(
        'https://graphql.mainnet.sui.io/graphql',
      )
    })

    it('defaults to testnet URL when called with no argument', () => {
      expect(getSuiGraphqlEndpoint()).toBe(
        'https://graphql.testnet.sui.io/graphql',
      )
    })

    it('falls back to testnet URL for an unknown network string', () => {
      expect(getSuiGraphqlEndpoint('unknown-net')).toBe(
        'https://graphql.testnet.sui.io/graphql',
      )
    })
  })

  // ============================================================================
  // getEveWorldPackageId
  // ============================================================================

  describe('getEveWorldPackageId', () => {
    it('returns the VITE_EVE_WORLD_PACKAGE_ID env var value', () => {
      expect(getEveWorldPackageId()).toBe(TEST_PKG)
    })

    it('throws a helpful error when the env var is unset', () => {
      vi.unstubAllEnvs()
      expect(() => getEveWorldPackageId()).toThrow(
        'Missing required environment variable: VITE_EVE_WORLD_PACKAGE_ID',
      )
    })
  })

  // ============================================================================
  // Type string generators
  // ============================================================================

  describe('getCharacterOwnerCapType', () => {
    it('returns the correct type string format', () => {
      expect(getCharacterOwnerCapType()).toBe(
        `${TEST_PKG}::access::OwnerCap<${TEST_PKG}::character::Character>`,
      )
    })
  })

  describe('getCharacterPlayerProfileType', () => {
    it('returns the correct type string format', () => {
      expect(getCharacterPlayerProfileType()).toBe(
        `${TEST_PKG}::character::PlayerProfile`,
      )
    })
  })

  describe('getObjectRegistryType', () => {
    it('returns the correct type string format', () => {
      expect(getObjectRegistryType()).toBe(
        `${TEST_PKG}::object_registry::ObjectRegistry`,
      )
    })
  })

  describe('getEnergyConfigType', () => {
    it('returns the correct type string format', () => {
      expect(getEnergyConfigType()).toBe(`${TEST_PKG}::energy::EnergyConfig`)
    })
  })

  describe('getFuelEfficiencyConfigType', () => {
    it('returns the correct type string format', () => {
      expect(getFuelEfficiencyConfigType()).toBe(
        `${TEST_PKG}::fuel::FuelConfig`,
      )
    })
  })

  // ============================================================================
  // getEveCoinType
  // ============================================================================

  describe('getEveCoinType', () => {
    it.each([
      [
        TenantId.TAUCETI,
        '0x6407060579895a8b30f7d30d2447046eb80ecc23f0c9acde09222b2a505583c9::EVE::EVE',
      ],
      [
        TenantId.TIAKI,
        '0x6407060579895a8b30f7d30d2447046eb80ecc23f0c9acde09222b2a505583c9::EVE::EVE',
      ],
      [
        TenantId.TESSERACT,
        '0x6407060579895a8b30f7d30d2447046eb80ecc23f0c9acde09222b2a505583c9::EVE::EVE',
      ],
      [
        TenantId.TETRA,
        '0x6407060579895a8b30f7d30d2447046eb80ecc23f0c9acde09222b2a505583c9::EVE::EVE',
      ],
      [
        TenantId.UTOPIA,
        '0xf0446b93345c1118f21239d7ac58fb82d005219b2016e100f074e4d17162a465::EVE::EVE',
      ],
      [
        TenantId.STILLNESS,
        '0xac361aa5ceb726bd974f885c9dea9e55dc9bc98fa1f5731c5965a810707bf0b8::EVE::EVE',
      ],
    ])('returns the EVE coin type for tenant %s', (tenantId, expected) => {
      expect(getEveCoinType(tenantId)).toBe(expected)
    })
  })
})
