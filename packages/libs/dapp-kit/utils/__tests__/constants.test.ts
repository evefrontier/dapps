import { afterEach, describe, expect, it } from 'vitest'
import {
  getEveCoinType,
  getSuiGraphqlEndpoint,
  setActiveEventTransport,
  TenantId,
} from '../constants'

describe('constants', () => {
  // ============================================================================
  // getSuiGraphqlEndpoint
  // ============================================================================

  describe('getSuiGraphqlEndpoint', () => {
    // Endpoint selection depends on the active transport; reset to the default
    // (grpc → standard endpoint) after each case.
    afterEach(() => {
      setActiveEventTransport('grpc')
    })

    it("returns the standard testnet URL for 'testnet' (grpc default)", () => {
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

    it('defaults to the standard testnet URL when called with no argument', () => {
      expect(getSuiGraphqlEndpoint()).toBe(
        'https://graphql.testnet.sui.io/graphql',
      )
    })

    it('falls back to the standard testnet URL for an unknown network string', () => {
      expect(getSuiGraphqlEndpoint('unknown-net')).toBe(
        'https://graphql.testnet.sui.io/graphql',
      )
    })

    it('uses the cockroach endpoint when the active transport is sse', () => {
      setActiveEventTransport('sse')
      expect(getSuiGraphqlEndpoint('testnet')).toBe(
        'https://graphql-cockroach.testnet.sui.io/graphql',
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
        '0x5a575ae8d55c0ee9a4486a5a7d227e682679ef3e34fe19ff3cac6bd17a04ccd6::EVE::EVE',
      ],
      [
        TenantId.STILLNESS,
        '0xc663658ff707985246bc7b5c605a458ec2caea28bfc35c253eb526dcf961643e::EVE::EVE',
      ],
    ])('returns the EVE coin type for tenant %s', (tenantId, expected) => {
      expect(getEveCoinType(tenantId)).toBe(expected)
    })
  })
})
