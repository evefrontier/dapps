import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { State } from '../../types'
import { parseStatus } from '../mapping'

// Dev deployment of world-contracts core, and its ObjectRegistry on testnet
const DEV_CORE_PACKAGE_ID =
  '0x0a4f1548929e834800da94990c419bc1ca63a836eeed517aada08788e2f00bca'
const DEV_REGISTRY_ADDRESS =
  '0x100844bbe57bc5301b5d76bd27fe764bcf6d6e6df7232b405af15f41c66bc4a2'

// Mock the GraphQL client (only for getObjectId/getRegistryAddress tests)
vi.mock('../../graphql/client', () => ({
  getSingletonObjectByType: vi.fn(),
}))

import { getSingletonObjectByType } from '../../graphql/client'

describe('mapping utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('VITE_EVE_WORLD_TIER', 'dev')
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
  // getRegistryAddress Tests
  // ============================================================================
  describe('getRegistryAddress', () => {
    const mockRegistryAddress =
      '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
    const expectedType = `${DEV_CORE_PACKAGE_ID}::object_registry::ObjectRegistry`

    beforeEach(() => {
      vi.resetModules()
    })

    it('fetches the core registry address from GraphQL', async () => {
      vi.mocked(getSingletonObjectByType).mockResolvedValueOnce({
        data: {
          objects: {
            nodes: [{ address: mockRegistryAddress }],
          },
        },
      })

      const { getRegistryAddress } = await import('../mapping')
      const address = await getRegistryAddress()

      expect(getSingletonObjectByType).toHaveBeenCalledWith(expectedType)
      expect(address).toBe(mockRegistryAddress)
    })

    it('caches the registry address after first fetch', async () => {
      vi.mocked(getSingletonObjectByType).mockResolvedValueOnce({
        data: {
          objects: {
            nodes: [{ address: mockRegistryAddress }],
          },
        },
      })

      const { getRegistryAddress } = await import('../mapping')

      await getRegistryAddress()
      const address = await getRegistryAddress()

      expect(getSingletonObjectByType).toHaveBeenCalledTimes(1)
      expect(address).toBe(mockRegistryAddress)
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

      await expect(getRegistryAddress()).rejects.toThrow(
        `ObjectRegistry not found for type: ${expectedType}`,
      )
    })

    it('throws error when GraphQL response has no data', async () => {
      vi.mocked(getSingletonObjectByType).mockResolvedValueOnce({})

      const { getRegistryAddress } = await import('../mapping')

      await expect(getRegistryAddress()).rejects.toThrow(
        `ObjectRegistry not found for type: ${expectedType}`,
      )
    })
  })

  // ============================================================================
  // getObjectId Tests (mocked)
  // ============================================================================
  describe('getObjectId', () => {
    beforeEach(() => {
      vi.resetModules()

      vi.mocked(getSingletonObjectByType).mockResolvedValue({
        data: {
          objects: {
            nodes: [{ address: DEV_REGISTRY_ADDRESS }],
          },
        },
      })
    })

    it('derives a real entity id from its EntityKey', async () => {
      const { getObjectId } = await import('../mapping')

      const objectId = await getObjectId('1000000070926', 'johannk-ws-ccp')

      expect(getSingletonObjectByType).toHaveBeenCalledWith(
        `${DEV_CORE_PACKAGE_ID}::object_registry::ObjectRegistry`,
      )
      expect(objectId).toBe(
        '0x08c7bf9636c37ecff92482a62340e5a1a2e8561da687a1c0a6e97758e67ae331',
      )
    })

    it('produces different ids for different tenants', async () => {
      const { getObjectId } = await import('../mapping')

      const a = await getObjectId('12345', 'tauceti')
      const b = await getObjectId('12345', 'utopia')

      expect(a).not.toBe(b)
    })

    it('caches the registry address per tier', async () => {
      const { getObjectId } = await import('../mapping')

      await getObjectId('12345', 'tauceti')
      await getObjectId('67890', 'utopia')

      expect(getSingletonObjectByType).toHaveBeenCalledTimes(1)
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

      await expect(getObjectId('12345', 'tauceti')).rejects.toThrow(
        `ObjectRegistry not found for type: ${DEV_CORE_PACKAGE_ID}::object_registry::ObjectRegistry`,
      )
    })

    it("uses the tenant's tier when VITE_EVE_WORLD_TIER is unset", async () => {
      vi.stubEnv('VITE_EVE_WORLD_TIER', '')
      const { getObjectId } = await import('../mapping')

      // stillness runs the live tier, which has no world packages registered yet
      await expect(getObjectId('12345', 'stillness')).rejects.toThrow(
        'MVR cache has no type-origin entry',
      )
    })
  })
})
