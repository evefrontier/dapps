import { type ApiTier, VALID_TIERS } from '@evefrontier/wallet-core/jwt'
import {
  TENANT_CONFIG,
  type TenantId,
  type WorldPackage,
  type WorldTypeKey,
  getWorldPackageId as walletCoreGetWorldPackageId,
  getWorldType as walletCoreGetWorldType,
} from '@evefrontier/wallet-core/tenant'

/**
 * World types and package ids are resolved by @evefrontier/wallet-core from its
 * embedded MVR snapshot, per world tier (`@evefrontier/world-<package>-<tier>`).
 * Each type is pinned to the package version in which it was first defined (its
 * type-origin), which is what on-chain type tags carry.
 */

const isApiTier = (value: string): value is ApiTier =>
  (VALID_TIERS as readonly string[]).includes(value)

/**
 * The world tier to resolve against: VITE_EVE_WORLD_TIER when set, otherwise the
 * tenant's tier from TENANT_CONFIG.
 *
 * @param tenant - Tenant id (e.g. from `?tenant=`); used when no env tier is set
 * @returns The world tier
 * @throws If VITE_EVE_WORLD_TIER is not a valid tier, or there is no env tier
 *   and the tenant is unknown
 * @category Utilities - Config
 */
export function getWorldTier(tenant?: string): ApiTier {
  const envTier = import.meta.env.VITE_EVE_WORLD_TIER
  if (envTier) {
    if (!isApiTier(envTier)) {
      throw new Error(
        `Invalid VITE_EVE_WORLD_TIER "${envTier}". Expected one of: ${VALID_TIERS.join(', ')}.`,
      )
    }
    return envTier
  }

  const config = tenant ? TENANT_CONFIG[tenant as TenantId] : undefined
  if (!config) {
    throw new Error(
      `No world tier for tenant "${tenant ?? ''}". Set VITE_EVE_WORLD_TIER or use a known tenant.`,
    )
  }
  return config.worldTier
}

/**
 * Resolve a world Move type to its fully-qualified, type-origin tag.
 *
 * @param key - Package-qualified key, e.g. `core::entity_key::EntityKey`
 * @param tenant - Tenant whose tier to use when VITE_EVE_WORLD_TIER is unset
 * @returns The type tag, e.g. `0x…::entity_key::EntityKey`
 * @throws If the tier cannot be determined or has no MVR resolution
 * @category Utilities - Config
 */
export const getWorldType = (key: WorldTypeKey, tenant?: string): string =>
  walletCoreGetWorldType(getWorldTier(tenant), key)

/**
 * A world package's id (type-origin) for the resolved tier.
 *
 * @param pkg - World package, e.g. `core` or `inventory`
 * @param tenant - Tenant whose tier to use when VITE_EVE_WORLD_TIER is unset
 * @throws If the tier cannot be determined or has no MVR resolution
 * @category Utilities - Config
 */
export const getWorldPackageId = (pkg: WorldPackage, tenant?: string): string =>
  walletCoreGetWorldPackageId(getWorldTier(tenant), pkg)

/** Type string for the core ObjectRegistry. @category Utilities - Config */
export const getObjectRegistryType = (tenant?: string): string =>
  getWorldType('core::object_registry::ObjectRegistry', tenant)
