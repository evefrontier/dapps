import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Assemblies, State } from '../../types'
import { getAssemblyType, parseStatus } from '../mapping'

// Mock env vars for testing
const TEST_EVE_WORLD_PACKAGE_ID =
  '0x2ff3e06b96eb830bdcffbc6cae9b8fe43f005c3b94cef05d9ec23057df16f107'

// Mock the GraphQL client (only for getObjectId/getRegistryAddress tests)
vi.mock('../../graphql/client', () => ({
  getSingletonObjectByType: vi.fn(),
}))

import { TENANT_CONFIG, TenantId } from '@evefrontier/wallet-core/tenant'
import { getSingletonObjectByType } from '../../graphql/client'

describe('mapping utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Stub environment variables for tests
    vi.stubEnv('VITE_EVE_WORLD_PACKAGE_ID', TEST_EVE_WORLD_PACKAGE_ID)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  // ============================================================================
  // parseStatus Tests
  // ============================================================================
  describe('parseStatus', () => {
    it("returns State.ONLINE for 'ONLINE' status", () => {
      expect(parseStatus('ONLINE')).toBe(State.ONLINE)
    })

    it("returns State.ONLINE for lowercase 'online' status", () => {
      expect(parseStatus('online')).toBe(State.ONLINE)
    })

    it("returns State.ANCHORED for 'OFFLINE' status", () => {
      expect(parseStatus('OFFLINE')).toBe(State.ANCHORED)
    })

    it("returns State.ANCHORED for 'ANCHORED' status", () => {
      expect(parseStatus('ANCHORED')).toBe(State.ANCHORED)
    })

    it("returns State.UNANCHORED for 'UNANCHORED' status", () => {
      expect(parseStatus('UNANCHORED')).toBe(State.UNANCHORED)
    })

    it('returns State.NULL for undefined status', () => {
      expect(parseStatus(undefined)).toBe(State.NULL)
    })

    it('returns State.NULL for empty string', () => {
      expect(parseStatus('')).toBe(State.NULL)
    })
  })

  // ============================================================================
  // getAssemblyType Tests
  // ============================================================================
  describe('getAssemblyType', () => {
    it('returns SmartStorageUnit for storage_unit type', () => {
      expect(
        getAssemblyType(
          `${TEST_EVE_WORLD_PACKAGE_ID}::storage_unit::StorageUnit<...>`,
        ),
      ).toBe(Assemblies.SmartStorageUnit)
    })

    it('returns SmartTurret for turret type', () => {
      expect(
        getAssemblyType(`${TEST_EVE_WORLD_PACKAGE_ID}::turret::Turret<...>`),
      ).toBe(Assemblies.SmartTurret)
    })

    it('returns SmartGate for gate type', () => {
      expect(
        getAssemblyType(`${TEST_EVE_WORLD_PACKAGE_ID}::gate::Gate<...>`),
      ).toBe(Assemblies.SmartGate)
    })

    it('returns NetworkNode for network_node type', () => {
      expect(
        getAssemblyType(
          `${TEST_EVE_WORLD_PACKAGE_ID}::network_node::NetworkNode<...>`,
        ),
      ).toBe(Assemblies.NetworkNode)
    })

    it('returns Assembly as default for unknown type', () => {
      expect(getAssemblyType('unknown::type::Unknown')).toBe(
        Assemblies.Assembly,
      )
    })

    it('handles type strings with different package IDs', () => {
      expect(
        getAssemblyType('0xabc123::storage_unit::StorageUnit<SomeType>'),
      ).toBe(Assemblies.SmartStorageUnit)
    })
  })

  // ============================================================================
  // getRegistryAddress Tests
  // ============================================================================
  describe('getRegistryAddress', () => {
    const mockAssemblyRegistryAddress =
      '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
    const mockCharacterRegistryAddress =
      '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321'

    const defaultTenant = TenantId.UTOPIA

    beforeEach(() => {
      vi.resetModules()
    })

    it('fetches assembly registry address from GraphQL', async () => {
      vi.mocked(getSingletonObjectByType).mockResolvedValueOnce({
        data: {
          objects: {
            nodes: [{ address: mockAssemblyRegistryAddress }],
          },
        },
      })

      const { getRegistryAddress } = await import('../mapping')
      const address = await getRegistryAddress(defaultTenant)

      const expectedType = `${TENANT_CONFIG[defaultTenant].packageId}::object_registry::ObjectRegistry`
      expect(getSingletonObjectByType).toHaveBeenCalledWith(expectedType)
      expect(address).toBe(mockAssemblyRegistryAddress)
    })

    it('fetches character registry address from GraphQL', async () => {
      vi.mocked(getSingletonObjectByType).mockResolvedValueOnce({
        data: {
          objects: {
            nodes: [{ address: mockCharacterRegistryAddress }],
          },
        },
      })

      const { getRegistryAddress } = await import('../mapping')
      const address = await getRegistryAddress(defaultTenant)

      const expectedType = `${TENANT_CONFIG[defaultTenant].packageId}::object_registry::ObjectRegistry`
      expect(getSingletonObjectByType).toHaveBeenCalledWith(expectedType)
      expect(address).toBe(mockCharacterRegistryAddress)
    })

    it('caches assembly registry address after first fetch', async () => {
      vi.mocked(getSingletonObjectByType).mockResolvedValueOnce({
        data: {
          objects: {
            nodes: [{ address: mockAssemblyRegistryAddress }],
          },
        },
      })

      const { getRegistryAddress } = await import('../mapping')

      const address = await getRegistryAddress(defaultTenant)

      expect(getSingletonObjectByType).toHaveBeenCalledTimes(1)
      expect(address).toBe(mockAssemblyRegistryAddress)
    })

    it('throws error when registry address is not found', async () => {
      vi.mocked(getSingletonObjectByType).mockResolvedValueOnce({
        data: {
          objects: {
            nodes: [],
          },
        },
      })

      const { getRegistryAddress } = await import('../mapping')

      const expectedType = `${TENANT_CONFIG[defaultTenant].packageId}::object_registry::ObjectRegistry`
      await expect(getRegistryAddress(defaultTenant)).rejects.toThrow(
        `ObjectRegistry not found for type: ${expectedType}`,
      )
    })

    it('throws error when GraphQL response has no data', async () => {
      vi.mocked(getSingletonObjectByType).mockResolvedValueOnce({})

      const { getRegistryAddress } = await import('../mapping')

      const expectedType = `${TENANT_CONFIG[defaultTenant].packageId}::object_registry::ObjectRegistry`
      await expect(getRegistryAddress(defaultTenant)).rejects.toThrow(
        `ObjectRegistry not found for type: ${expectedType}`,
      )
    })

    it('falls back to getEveWorldPackageId for an unknown tenant string', async () => {
      vi.mocked(getSingletonObjectByType).mockResolvedValueOnce({
        data: {
          objects: {
            nodes: [{ address: mockAssemblyRegistryAddress }],
          },
        },
      })

      const { getRegistryAddress } = await import('../mapping')
      const address = await getRegistryAddress('my-local-tenant')

      const expectedType = `${TEST_EVE_WORLD_PACKAGE_ID}::object_registry::ObjectRegistry`
      expect(getSingletonObjectByType).toHaveBeenCalledWith(expectedType)
      expect(address).toBe(mockAssemblyRegistryAddress)
    })
  })

  // ============================================================================
  // getObjectId Tests (mocked)
  // ============================================================================
  describe('getObjectId', () => {
    const mockRegistryAddress =
      '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'

    beforeEach(() => {
      vi.resetModules()

      vi.mocked(getSingletonObjectByType).mockResolvedValue({
        data: {
          objects: {
            nodes: [{ address: mockRegistryAddress }],
          },
        },
      })
    })

    it('fetches registry address and derives object ID', async () => {
      const { getObjectId } = await import('../mapping')
      const itemId = '12345'

      const objectId = await getObjectId(itemId, 'tauceti')

      const expectedType = `${TENANT_CONFIG[TenantId.TAUCETI].packageId}::object_registry::ObjectRegistry`
      expect(getSingletonObjectByType).toHaveBeenCalledWith(expectedType)
      expect(typeof objectId).toBe('string')
      expect(objectId.startsWith('0x')).toBe(true)
    })

    it('uses the tenant-specific package ID for the registry lookup', async () => {
      const { getObjectId } = await import('../mapping')

      await getObjectId('12345', 'tauceti')

      const expectedType = `${TENANT_CONFIG[TenantId.TAUCETI].packageId}::object_registry::ObjectRegistry`
      expect(getSingletonObjectByType).toHaveBeenCalledWith(expectedType)
    })

    it('uses utopia package ID for utopia tenant', async () => {
      const { getObjectId } = await import('../mapping')

      await getObjectId('12345', 'utopia')

      const expectedType = `${TENANT_CONFIG[TenantId.UTOPIA].packageId}::object_registry::ObjectRegistry`
      expect(getSingletonObjectByType).toHaveBeenCalledWith(expectedType)
    })

    it('propagates errors when registry address not found', async () => {
      vi.mocked(getSingletonObjectByType).mockResolvedValueOnce({
        data: {
          objects: {
            nodes: [],
          },
        },
      })

      const { getObjectId } = await import('../mapping')

      const expectedType = `${TENANT_CONFIG[TenantId.TAUCETI].packageId}::object_registry::ObjectRegistry`
      await expect(getObjectId('12345', 'tauceti')).rejects.toThrow(
        `ObjectRegistry not found for type: ${expectedType}`,
      )
    })

    it('caches registry address per tenant across multiple calls', async () => {
      const { getObjectId } = await import('../mapping')

      await getObjectId('12345', 'tauceti')
      await getObjectId('67890', 'tauceti')
      await getObjectId('11111', 'tauceti')

      // Should only fetch registry once per tenant (cached)
      expect(getSingletonObjectByType).toHaveBeenCalledTimes(1)
    })

    it('warns and uses fallback package ID for an unknown tenant string', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const { getObjectId } = await import('../mapping')
      const objectId = await getObjectId('12345', 'my-local-tenant')

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('my-local-tenant'),
      )
      const expectedType = `${TEST_EVE_WORLD_PACKAGE_ID}::object_registry::ObjectRegistry`
      expect(getSingletonObjectByType).toHaveBeenCalledWith(expectedType)
      expect(typeof objectId).toBe('string')
      expect(objectId.startsWith('0x')).toBe(true)
    })

    it('fetches registry separately for different tenants', async () => {
      vi.mocked(getSingletonObjectByType).mockResolvedValue({
        data: {
          objects: {
            nodes: [{ address: mockRegistryAddress }],
          },
        },
      })

      const { getObjectId } = await import('../mapping')

      await getObjectId('12345', 'tauceti')
      await getObjectId('12345', 'utopia')

      // Each tenant fetches its own registry
      expect(getSingletonObjectByType).toHaveBeenCalledTimes(2)
    })
  })
})
