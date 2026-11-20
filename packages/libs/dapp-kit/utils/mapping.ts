import { bcs } from '@mysten/sui/bcs'
import { deriveObjectID } from '@mysten/sui/utils'
import { getSingletonObjectByType } from '../graphql/client'
import { State } from '../types'
import { getObjectRegistryType, getWorldType, type TenantId } from './constants'

/**
 * Convert raw status variant string to State enum
 *
 * @category Utilities - Mapping
 */
export function parseStatus(statusVariant: string | undefined): State {
  if (!statusVariant) return State.NULL

  switch (statusVariant.toUpperCase()) {
    case 'ONLINE':
      return State.ONLINE
    case 'OFFLINE':
      return State.ANCHORED
    case 'ANCHORED':
      return State.ANCHORED
    case 'UNANCHORED':
      return State.UNANCHORED
    case 'DESTROYED':
      return State.DESTROYED
    default:
      return State.NULL
  }
}

// Cache for the ObjectRegistry address, keyed by its type tag
const objectRegistryAddressCache: Record<string, string> = {}

/**
 * Fetches the core ObjectRegistry singleton address from the chain.
 * Each world tier has its own core package and registry; the tier comes from
 * VITE_EVE_WORLD_TIER or the tenant (see {@link getWorldTier}).
 * Caches the result per registry type to avoid repeated queries.
 *
 * @param tenant - Tenant whose tier to use when VITE_EVE_WORLD_TIER is unset
 * @category Utilities - Mapping
 */
export async function getRegistryAddress(tenant?: string): Promise<string> {
  const registryType = getObjectRegistryType(tenant)
  if (objectRegistryAddressCache[registryType]) {
    return objectRegistryAddressCache[registryType]
  }

  const result = await getSingletonObjectByType(registryType)

  const address = result.data?.objects?.nodes?.[0]?.address
  if (!address) {
    throw new Error(`ObjectRegistry not found for type: ${registryType}`)
  }

  objectRegistryAddressCache[registryType] = address
  return address
}

/**
 * Derives an entity's object ID from its in-game ID and tenant, mirroring core
 * `object_registry::derive_id` (a derived object over `EntityKey { id, tenant }`).
 *
 * @param itemId - The in-game item ID
 * @param tenant - The tenant identifier (e.g. "utopia", "stillness")
 * @returns The derived Sui object ID
 *
 * @category Utilities - Mapping
 */
export async function getObjectId(
  itemId: string,
  tenant: string | TenantId,
): Promise<string> {
  const registryAddress = await getRegistryAddress(tenant)

  const key = bcs
    .struct('EntityKey', {
      id: bcs.u64(),
      tenant: bcs.string(),
    })
    .serialize({ id: BigInt(itemId), tenant })
    .toBytes()

  return deriveObjectID(
    registryAddress,
    getWorldType('core::entity_key::EntityKey', tenant),
    key,
  )
}
