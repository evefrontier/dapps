import { TENANT_CONFIG, TenantId } from '@evefrontier/wallet-core/tenant'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getObjectRegistryType,
  getWorldPackageId,
  getWorldTier,
  getWorldType,
} from '../mvr/worldTypes'

// Dev deployment of world-contracts core, from the embedded MVR snapshot
const DEV_CORE_PACKAGE_ID =
  '0x0a4f1548929e834800da94990c419bc1ca63a836eeed517aada08788e2f00bca'

describe('world type resolution', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('getWorldTier', () => {
    it('prefers VITE_EVE_WORLD_TIER over the tenant', () => {
      vi.stubEnv('VITE_EVE_WORLD_TIER', 'dev')
      expect(getWorldTier(TenantId.STILLNESS)).toBe('dev')
    })

    it("falls back to the tenant's world tier", () => {
      vi.stubEnv('VITE_EVE_WORLD_TIER', '')
      expect(getWorldTier(TenantId.UTOPIA)).toBe(
        TENANT_CONFIG[TenantId.UTOPIA].worldTier,
      )
    })

    it('throws on an invalid VITE_EVE_WORLD_TIER', () => {
      vi.stubEnv('VITE_EVE_WORLD_TIER', 'staging')
      expect(() => getWorldTier()).toThrow(
        'Invalid VITE_EVE_WORLD_TIER "staging"',
      )
    })

    it('throws for an unknown tenant with no env tier', () => {
      vi.stubEnv('VITE_EVE_WORLD_TIER', '')
      expect(() => getWorldTier('my-local-tenant')).toThrow(
        'No world tier for tenant "my-local-tenant"',
      )
    })
  })

  describe('with the dev tier', () => {
    it('resolves core types to the dev core package', () => {
      vi.stubEnv('VITE_EVE_WORLD_TIER', 'dev')
      expect(getWorldType('core::entity_key::EntityKey')).toBe(
        `${DEV_CORE_PACKAGE_ID}::entity_key::EntityKey`,
      )
      expect(getObjectRegistryType()).toBe(
        `${DEV_CORE_PACKAGE_ID}::object_registry::ObjectRegistry`,
      )
    })

    it('resolves package ids', () => {
      vi.stubEnv('VITE_EVE_WORLD_TIER', 'dev')
      expect(getWorldPackageId('core')).toBe(DEV_CORE_PACKAGE_ID)
    })
  })

  it('throws for a tenant whose tier is not in the MVR snapshot', () => {
    vi.stubEnv('VITE_EVE_WORLD_TIER', '')
    // stillness runs the live tier, which has no world packages registered yet
    expect(() =>
      getWorldType('core::entity_key::EntityKey', TenantId.STILLNESS),
    ).toThrow('MVR cache has no type-origin entry')
  })
})
